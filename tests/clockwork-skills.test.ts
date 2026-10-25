import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { eventHpChanges } from '../src/platform/combat-feedback';
import { assertValidSave, assertSaveCompatibility } from '../src/platform/save';
import type { Battle, Unit } from '../src/domain/types';

function ready(party: string[]): Battle {
  let battle = createBattle(content, party, party[0]!, 'silent-cathedral', 0, 42, 'clockwork-skills');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  for (const enemy of battle.units.filter(unit => unit.side === 'enemy')) { enemy.hp = enemy.maxHp = 10000; enemy.attack = 0; enemy.speed = 0; }
  battle.units.find(unit => unit.characterId === party[0])!.speed = 100;
  return battle;
}
const ally = (battle: Battle, id: string): Unit => battle.units.find(unit => unit.side === 'party' && unit.characterId === id)!;
const firstAction = (battle: Battle, id: string) => resolveRound(battle, content).battle.events.find(event => event.actorId === `party:${id}`)!;

describe('clockwork-exclusive tactical skills', () => {
  it('trades Vespera HP for another attacker’s ultimate charge and displays the actual self cost', () => {
    const battle = ready(['vespera', 'nox', 'tikka']);
    const nox = ally(battle, 'nox'); nox.ultimateCharge = 65;
    const caster = ally(battle, 'vespera'); caster.barrier = 100; caster.barrierUntil = 4;
    const event = firstAction(battle, 'vespera');
    expect(event.skillId).toBe('overclock-24'); expect(event.kind).toBe('buff'); expect(event.targetIds).toEqual([nox.uid]);
    const after = event.unitsAfter!.find(unit => unit.uid === caster.uid)!;
    expect(after.hp).toBe(caster.hp - Math.floor(caster.maxHp * .1)); expect(after.barrier).toBe(100);
    expect(after.ultimateCharge).toBe(25); expect(after.cooldowns['overclock-24']).toBe(5);
    expect(event.unitsAfter!.find(unit => unit.uid === nox.uid)!.ultimateCharge).toBe(100);
    expect(eventHpChanges(event, battle.units)).toEqual([{ unitId: caster.uid, characterId: caster.characterId, side: 'party', amount: -Math.floor(caster.maxHp * .1) }]);
    expect(caster.hp).toBe(caster.maxHp); expect(nox.ultimateCharge).toBe(65);
  });
  it('skips overcharge at low HP, for full/near-full allies, and when alone', () => {
    const low = ready(['vespera', 'nox']); ally(low, 'vespera').hp = Math.floor(ally(low, 'vespera').maxHp * .2);
    expect(firstAction(low, 'vespera').skillId).not.toBe('overclock-24');
    for (const charge of [66, 100]) { const battle = ready(['vespera', 'nox']); ally(battle, 'nox').ultimateCharge = charge; expect(firstAction(battle, 'vespera').skillId).not.toBe('overclock-24'); }
    expect(firstAction(ready(['vespera']), 'vespera').skillId).not.toBe('overclock-24');
  });
  it('charges a living ally without automatically reserving or firing their ultimate', () => {
    const battle = ready(['vespera', 'nox']); ally(battle, 'nox').ultimateCharge = 65;
    const result = resolveRound(battle, content).battle;
    expect(result.events.some(event => event.ultimate)).toBe(false);
    expect(ally(result, 'nox').ultimateCharge).toBe(100); expect(ally(result, 'nox').ultimateQueued).toBeUndefined();
    let replay = result; while (replay.phase === 'playing') replay = advanceReplay(replay, content);
    const save = createInitialSave(content); save.ownedIds.push('vespera', 'nox'); save.partyIds = ['vespera', 'nox']; save.leaderId = 'vespera'; save.battle = replay;
    const queued = applyCommand(save, { type: 'ultimate', unitId: 'party:nox' }, content);
    expect(ally(queued.battle!, 'nox').ultimateQueued).toBe(true);
    assertValidSave(queued); assertSaveCompatibility(queued, content);
  });
  it('converts only the needed barrier into double healing, without overflowing HP', () => {
    const battle = ready(['miette', 'liora']);
    const target = ally(battle, 'liora'); target.hp = Math.floor(target.maxHp * .6); target.barrier = 100; target.barrierUntil = 5;
    const event = firstAction(battle, 'miette');
    expect(event.skillId).toBe('barrier-mend-18'); expect(event.kind).toBe('heal');
    const consumed = Math.min(100, Math.floor(target.maxHp * .15), Math.ceil((target.maxHp - target.hp) / 2));
    const after = event.unitsAfter!.find(unit => unit.uid === target.uid)!;
    expect(after.hp).toBe(Math.min(target.maxHp, target.hp + consumed * 2)); expect(after.barrier).toBe(100 - consumed); expect(after.barrierUntil).toBe(5);
    expect(event.amount).toBe(after.hp - target.hp);
    expect(event.unitsAfter!.find(unit => unit.characterId === 'miette')!.cooldowns['barrier-mend-18']).toBe(4);
  });
  it('never wastes recycling on expired shields or healthy allies and retains emergency healing priority', () => {
    const battle = ready(['miette', 'liora']); const target = ally(battle, 'liora'); target.barrier = 100; target.barrierUntil = 5;
    expect(firstAction(battle, 'miette').skillId).not.toBe('barrier-mend-18');
    target.hp = Math.floor(target.maxHp * .25);
    expect(firstAction(battle, 'miette').skillId).toBe('heal-18');
    ally(battle, 'miette').cooldowns['heal-18'] = 99;
    expect(firstAction(battle, 'miette').skillId).toBe('barrier-mend-18');
    ally(battle, 'miette').cooldowns = {};
    target.hp = Math.floor(target.maxHp * .7); target.barrierUntil = 0;
    expect(firstAction(battle, 'miette').skillId).not.toBe('barrier-mend-18');
    target.barrierUntil = 5; target.barrier = 1;
    expect(firstAction(battle, 'miette').amount).toBe(2);
  });
  it('jams normal skill cooldowns before the target acts, while leaving basic attacks possible', () => {
    const battle = ready(['tikka', 'liora']);
    const event = firstAction(battle, 'tikka'); expect(event.skillId).toBe('jam-14'); expect(event.amount).toBe(0);
    const target = event.unitsAfter!.find(unit => unit.uid === event.targetIds![0])!;
    const skills = content.characters.find(character => character.id === target.characterId)!.skillIds;
    for (const skill of skills) expect(target.cooldowns[skill]).toBe(3);
    const result = resolveRound(battle, content).battle;
    const action = result.events.find(event => event.actorId === target.uid && event.kind === 'attack')!;
    expect(action).toBeDefined(); expect(action.skillId).toBeUndefined();
    let next = result; while (next.phase === 'playing') next = advanceReplay(next, content);
    let second = resolveRound(next, content).battle;
    expect(second.events.find(event => event.actorId === target.uid && event.kind === 'attack')!.skillId).toBeUndefined();
    while (second.phase === 'playing') second = advanceReplay(second, content);
    expect(resolveRound(second, content).battle.events.find(event => event.actorId === target.uid && ['attack','area','heal','guard','buff','debuff'].includes(event.kind))!.skillId).toBeDefined();
  });
  it('does not shorten long cooldowns or jam targets that already have no ready skill', () => {
    const battle = ready(['tikka']);
    for (const unit of battle.units.filter(unit => unit.side === 'enemy')) for (const id of content.characters.find(character => character.id === unit.characterId)!.skillIds) unit.cooldowns[id] = 99;
    expect(firstAction(battle, 'tikka').skillId).not.toBe('jam-14');
    const target = battle.units.find(unit => unit.side === 'enemy')!;
    const ids = content.characters.find(character => character.id === target.characterId)!.skillIds;
    target.cooldowns[ids[0]!] = 0;
    const event = firstAction(battle, 'tikka');
    const after = event.unitsAfter!.find(unit => unit.uid === target.uid)!;
    expect(after.cooldowns[ids[0]!]).toBe(3); expect(after.cooldowns[ids[1]!]).toBe(99);
  });
  it('does not suppress scheduled boss strikes or rabbit bit fire', () => {
    for (const stage of [content.dungeons.find(stage => stage.bossBits)!, content.dungeons.find(stage => stage.bossStrike && !stage.bossClock)!]) {
      let battle = createBattle(content, ['tikka', 'liora'], 'liora', stage.id, 0, 42, 'jam-boss');
      while (battle.phase === 'playing') battle = advanceReplay(battle, content);
      while (battle.wave < stage.waves.length - 1) {
        battle.phase = 'playing'; battle.nextPhase = 'wave'; battle.events = []; battle.cursor = 0;
        battle = advanceReplay(battle, content);
        while (battle.phase === 'playing') battle = advanceReplay(battle, content);
      }
      battle.round = stage.bossStrike?.every ?? 2;
      for (const unit of battle.units) { unit.hp = unit.maxHp = 100000; if (unit.side === 'enemy') { unit.attack = 0; unit.speed = 0; } }
      ally(battle, 'tikka').speed = 100;
      const boss = battle.units.find(unit => unit.boss)!;
      if (stage.bossBits) boss.bits = { count: stage.bossBits.count, deployedRound: battle.round - 1, expiresRound: battle.round + 1 };
      const result = resolveRound(battle, content).battle;
      expect(result.events.find(event => event.actorId === 'party:tikka')!.skillId).toBe('jam-14');
      if (stage.bossBits) expect(result.events.some(event => event.bitAction === 'fire')).toBe(true);
      if (stage.bossStrike) expect(result.events.some(event => event.bossStrike)).toBe(true);
    }
  });
});
