import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { createBattle, advanceReplay, resolveRound, recruitCost, characterStats, usePotion } from '../src/domain/engine';
import { bossWindupStatus } from '../src/domain/boss-pressure';
import { partyOrderOptions } from '../src/domain/party-orders';
import type { Battle } from '../src/domain/types';
import { dungeonLock } from '../src/domain/events';
import { assertSaveCompatibility } from '../src/platform/save';
import { zakuroCharacter, zakuroDungeons } from '../src/content/zakuro';

function prepared() {
  const save = createInitialSave(content, 42);
  save.completedDungeonIds = content.chapters!.slice(0, 3).flatMap(chapter => chapter.dungeonIds);
  save.partyIds = ['selene', 'athena', 'seris-awakened', 'fortuna'];
  save.ownedIds = [...new Set([...save.ownedIds, ...save.partyIds])];
  save.leaderId = 'selene';
  save.novels = { seen: ['opening-desire-gate'] };
  return save;
}
function prepareRound(input: Battle): Battle {
  let b=structuredClone(input);
  const wounded=b.units.filter(u=>u.side==='party'&&u.hp>0).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
  if(wounded&&wounded.hp<wounded.maxHp*.45&&b.potionsRemaining&&!b.potionUsed)b=usePotion(b,wounded.uid);
  const pilot=b.units.find(u=>u.side==='party'&&u.characterId===b.partyIds[0])!;
  const foes=b.units.filter(u=>u.side==='enemy'&&u.hp>0),boss=foes.find(u=>u.boss);
  const strike=content.dungeons.find(d=>d.id===b.dungeonId)?.bossStrike;
  const phase=boss&&strike?bossWindupStatus(boss,strike,b.round).phase:undefined;
  const support=foes.find(u=>content.characters.find(c=>c.id===u.characterId)?.role==='healer');
  b.focusTargetId=(phase==='charging'?boss:support??foes.sort((a,c)=>a.hp-c.hp)[0])?.uid;
  const opts=partyOrderOptions(pilot,b,content).filter(o=>!o.disabled);
  const urgent=b.units.some(u=>u.side==='party'&&u.hp>0&&u.hp<u.maxHp*.4);
  const heal=opts.find(o=>o.template==='heal'||o.template==='mend_pair'),ultimate=opts.find(o=>o.id==='ultimate');
  const attack=opts.filter(o=>o.order?.kind==='skill'&&['attack','area','pierce','drain','shatter','dawn'].includes(o.template)).at(-1);
  for(const u of b.units.filter(u=>u.side==='party'&&u.hp>0&&u.uid!==pilot.uid&&u.ultimateCharge===100))if(content.characters.find(c=>c.id===u.characterId)!.role!=='healer'||b.units.some(a=>a.side==='party'&&a.hp>0&&a.hp<a.maxHp*.7))u.ultimateQueued=true;
  b.partyOrder=phase==='charging'?ultimate?.order??attack?.order??{kind:'attack'}:phase==='striking'?{kind:'guard'}:urgent&&heal?heal.order??undefined:ultimate?.order??attack?.order??undefined;
  return b;
}
describe('Zakuro and the ritual forest', () => {
  it('requires the prior chapter and confirmed stone expedition before the procession', () => {
    const save = prepared();
    expect(dungeonLock(zakuroDungeons[0], createInitialSave(content), content)).toBeTruthy();
    expect(dungeonLock(zakuroDungeons[0], save, content)).toBeNull();
    expect(dungeonLock(zakuroDungeons[1], save, content)).toBeTruthy();
    save.completedDungeonIds.push('ritual-stone-grove');
    expect(dungeonLock(zakuroDungeons[1], save, content)).toBeNull();
    expect(() => applyCommand(save, { type: 'novelStart', sceneId: 'zakuro-forest-encounter' }, content)).not.toThrow();
  });
  it('keeps ritual stones provisional until claim and loses them on retreat', () => {
    let save = applyCommand(prepared(), { type: 'depart', dungeonId: 'ritual-stone-grove', potions: 0 }, content);
    for (let step = 0; step < 1200 && save.battle?.phase !== 'reward' && save.battle?.phase !== 'failed'; step++) {
      if(save.battle!.phase==='ready')for(const u of save.battle!.units.filter(u=>u.side==='party')){u.attack=10000;u.speed=100;}
      save = applyCommand(save, { type: save.battle!.phase === 'playing' ? 'replay' : 'round' }, content);
    }
    expect(save.battle?.phase).toBe('reward');
    expect(save.battle?.pendingMaterials['ritual-stone:rare']).toBe(1);
    expect(save.materials['ritual-stone:rare']).toBeUndefined();
    const claimed = applyCommand(save, { type: 'claim' }, content);
    expect(claimed.materials['ritual-stone:rare']).toBe(1);
    expect(claimed.novels?.active?.sceneId).toBe('zakuro-forest-encounter');
    assertSaveCompatibility(claimed, content);
    const failure = applyCommand(prepared(), { type: 'depart', dungeonId: 'ritual-stone-grove', potions: 0 }, content);
    while (failure.battle!.phase === 'playing') failure.battle = advanceReplay(failure.battle!, content);
    failure.battle!.pendingMaterials['ritual-stone:rare'] = 1;
    const left = applyCommand(applyCommand(failure, { type: 'retreat' }, content), { type: 'leaveFailure' }, content);
    expect(left.materials['ritual-stone:rare']).toBeUndefined();
    expect(left.completedDungeonIds).not.toContain('ritual-stone-grove');
  });
  it('uses the same recruit definition and grants a material-based invitation without gacha', () => {
    const save = prepared();
    save.discoveredIds.push('zakuro');
    for (const cost of recruitCost(zakuroCharacter)) save.materials[cost.materialId] = cost.count;
    const recruited = applyCommand(save, { type: 'recruit', characterId: 'zakuro' }, content);
    expect(recruited.ownedIds).toContain('zakuro');
    const base = characterStats(zakuroCharacter);
    const boss = createBattle(content, save.partyIds, save.leaderId, 'zakuro-procession', 0, 42, 'same-character').units.find(unit => unit.characterId === 'zakuro')!;
    expect(boss.attack).toBe(Math.round(base.attack * 1.7));
    expect(boss.maxHp).toBe(Math.round(base.hp * 12));
    expect(boss.defense).toBe(base.defense);
    expect(boss.speed).toBe(base.speed);
    expect(recruitCost(zakuroCharacter)).toEqual([
      { materialId: 'pomegranate:common', count: 12 }, { materialId: 'pomegranate:rare', count: 3 }, { materialId: 'pomegranate:epic', count: 2 },
    ]);
    assertSaveCompatibility(recruited, content);
  });
  it('attacks without negotiation, can be cleared by an endgame party and yields a replayable epilogue', () => {
    let battle = createBattle(content, prepared().partyIds, 'selene', 'zakuro-procession', 5, 1, 'zakuro-clear');
    const lines: string[] = [], strikes: number[] = [];
    for (let step = 0; step < 1600 && !['reward', 'failed'].includes(battle.phase); step++) {
      for (const event of battle.events) {
        if (event.kind === 'dialogue') lines.push(event.text);
        if (event.bossStrike) strikes.push(battle.round);
      }
      battle = battle.phase === 'playing' ? advanceReplay(battle, content) : resolveRound(prepareRound(battle), content).battle;
    }
    expect(lines.some(line => line.includes('容赦'))).toBe(true);
    expect(strikes.length).toBeGreaterThan(0);
    expect(battle.phase).toBe('reward');
    expect(battle.pendingMaterials['pomegranate:rare']).toBeGreaterThanOrEqual(1);
    const save = prepared(); save.completedDungeonIds.push('ritual-stone-grove'); save.battle = battle;
    const claimed = applyCommand(save, { type: 'claim' }, content);
    expect(claimed.novels?.active?.sceneId).toBe('chapter-4-epilogue');
    expect(claimed.completedDungeonIds).toContain('zakuro-procession');
    assertSaveCompatibility(claimed, content);
  });
});
