import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { accelerationPercent, activeAcceleration } from '../src/domain/acceleration';
import { advanceReplay, createBattle, resolveRound, usePotion } from '../src/domain/engine';
import { initialGacha, flowerGacha } from '../src/content/gacha';
import { applyCommand, createInitialSave } from '../src/application/game';
import { assertSaveCompatibility } from '../src/platform/save';
import type { Battle } from '../src/domain/types';

function ready(battle: Battle): Battle {
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  return battle;
}
function fixture(round = 1): Battle {
  const battle = ready(createBattle(content, ['elaine', 'eos-standard', 'seris', 'noelle'], 'eos-standard', 'silent-cathedral', 1, 42, 'acceleration'));
  battle.round = round;
  for (const unit of battle.units) {
    unit.hp = unit.maxHp = 10000; unit.attack = 100; unit.defense = 0;
    unit.cooldowns = Object.fromEntries(content.characters.find(char => char.id === unit.characterId)!.skillIds.map(id => [id, 1000]));
  }
  return battle;
}
describe('Eos acceleration leader skill', () => {
  it.each([[1,100],[2,105],[5,120],[21,200],[41,300]])('uses turn %i attack on both sides without changing base stats', (round, amount) => {
    const battle = fixture(round), before = structuredClone(battle);
    const resolved = resolveRound(battle, content).battle;
    const attacks = resolved.events.filter(event => event.kind === 'attack');
    for (const side of ['party', 'enemy']) {
      const hits = attacks.filter(event => battle.units.find(unit => unit.uid === event.actorId)?.side === side);
      expect(hits.length).toBeGreaterThan(0); expect(hits.every(event => event.amount === amount)).toBe(true);
    }
    expect(battle).toEqual(before); expect(resolved.units.every(unit => unit.attack === 100)).toBe(true);
  });
  it('stacks with attack buffs before defense, while barriers still mitigate', () => {
    const battle = fixture(5), attacker = battle.units.find(unit => unit.characterId === 'seris')!;
    attacker.buffUntil = 20; attacker.buffStrength = 10;
    for (const unit of battle.units.filter(unit => unit.side === 'enemy')) unit.defense = 100;
    const result = resolveRound(battle, content).battle;
    expect(result.events.find(event => event.actorId === attacker.uid && event.kind === 'attack')!.amount).toBe(94);
    const barrier = fixture(5);
    for (const unit of barrier.units.filter(unit => unit.side === 'party')) { unit.barrier=10000; unit.barrierUntil=20; }
    expect(resolveRound(barrier, content).battle.events.filter(event => event.kind==='attack' && event.actorId!.startsWith('enemy:')).every(event => event.amount === 0)).toBe(true);
  });
  it('does not increase healing, potion recovery or maximum HP', () => {
    const heal = (round: number) => {
      const battle=fixture(round), healer=battle.units.find(unit=>unit.characterId==='elaine')!;
      healer.cooldowns={}; const target=battle.units.find(unit=>unit.characterId==='noelle')!; target.hp=1000;
      return resolveRound(battle,content).battle.events.find(event=>event.actorId===healer.uid&&event.skillId==='heal-14')!.amount;
    };
    expect(heal(21)).toBe(heal(1));
    const battle=fixture(21),target=battle.units[0]!;target.hp=100;
    expect(usePotion(battle,target.uid).units[0]!.hp).toBe(3100);
    expect(resolveRound(battle,content).battle.units.every(unit=>unit.maxHp===10000)).toBe(true);
  });
  it('persists and replays a boosted round exactly once, then resets on the next wave', () => {
    const battle=fixture(10);expect(resolveRound(JSON.parse(JSON.stringify(battle)),content)).toEqual(resolveRound(battle,content));
    const resolved=resolveRound(battle,content).battle,save=createInitialSave(content);save.ownedIds.push('eos-standard');save.partyIds=resolved.partyIds;save.leaderId=resolved.leaderId;save.battle=resolved;
    assertSaveCompatibility(JSON.parse(JSON.stringify(save)),content);
    const replayed=ready(JSON.parse(JSON.stringify(resolved)));
    expect(replayed.units).toEqual(resolved.units);expect(replayed.round).toBe(11);expect(accelerationPercent(replayed.round)).toBe(50);
    for(const unit of replayed.units) {if(unit.side==='enemy')unit.hp=1;else{unit.attack=100000;unit.speed=100;}}
    const nextWave=ready(resolveRound(replayed,content).battle);
    expect(nextWave.wave).toBe(1);expect(nextWave.round).toBe(1);expect(accelerationPercent(nextWave.round)).toBe(0);
  });
});


it('does not accelerate either side when Eos is only a party member or the leader is defeated',()=>{
  for(const state of ['non-leader','defeated'] as const){
    const battle=fixture(21);
    if(state==='non-leader')battle.leaderId='elaine';else battle.units.find(unit=>unit.characterId==='eos-standard')!.hp=0;
    expect(activeAcceleration(battle,content)).toBeUndefined();
    const hits=resolveRound(battle,content).battle.events.filter(event=>event.kind==='attack');
    expect(hits.length).toBeGreaterThan(0);expect(hits.every(event=>event.amount===100)).toBe(true);
  }
});
it('ends acceleration for both sides immediately when the leader falls during a round',()=>{
  const battle=fixture(5),leader=battle.units.find(unit=>unit.characterId==='eos-standard')!;
  leader.hp=50;for(const enemy of battle.units.filter(unit=>unit.side==='enemy'))enemy.speed=1000;
  const result=resolveRound(battle,content).battle;
  const hits=result.events.filter(event=>event.kind==='attack');
  expect(hits[0]!.targetIds).toEqual([leader.uid]);expect(hits[0]!.amount).toBe(50);
  expect(hits.slice(1).every(event=>event.amount===100)).toBe(true);
  expect(activeAcceleration(result,content)).toBeUndefined();
});
it('can summon base Eos from either collection and actually activate her leader skill through party selection',()=>{
  for(const collection of [initialGacha,flowerGacha]){
    let save=createInitialSave(content,6);save.drawCount=10;save.stones=5;
    save=applyCommand(save,{type:'draw',collectionId:collection.id},content);
    expect(save.lastGachaResult!.characterId).toBe('eos-standard');
    save=applyCommand(save,{type:'party',partyIds:['eos-standard','elaine','seris','noelle'],leaderId:'eos-standard'},content);
    save=applyCommand(save,{type:'depart',dungeonId:'silent-cathedral',potions:0},content);
    expect(activeAcceleration(save.battle!,content)).toEqual({percent:0,source:'エオス'});
    assertSaveCompatibility(JSON.parse(JSON.stringify(save)),content);
  }
  for(const id of ['eos-standard','eos']){
    const battle=ready(createBattle(content,[id,'elaine'],id,'silent-cathedral',0,42,'eos-forms'));
    battle.round=3;expect(activeAcceleration(battle,content)).toEqual({percent:10,source:'エオス'});
  }
});
