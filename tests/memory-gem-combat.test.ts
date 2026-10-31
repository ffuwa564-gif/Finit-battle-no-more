import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { gemSkill, type MemoryGem } from '../src/domain/memory-gems';
import { orderSkillReady, partyOrderOptions } from '../src/domain/party-orders';
import type { Battle } from '../src/domain/types';

const gem = (defId: string, variant: MemoryGem['variant'] = 'pure', id = 'test-gem'): MemoryGem => ({ id, defId, variant });
function ready(equipped: MemoryGem, characterId = 'seris'): Battle {
  let battle = createBattle(content, ['seris', 'liora', 'elaine', 'noelle'], 'liora', 'silent-cathedral', 0, 42, 'gem-combat');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  battle.memoryGems = { [characterId]: equipped };
  for (const unit of battle.units) {
    if (unit.side === 'enemy') { unit.hp = unit.maxHp = 100000; unit.attack = 1; unit.speed = 0; }
    else { unit.hp = unit.maxHp = 10000; unit.speed = unit.characterId === 'seris' ? 100 : 20; }
  }
  return battle;
}
function use(battle: Battle, equipped: MemoryGem) {
  battle.partyOrder = { kind: 'skill', skillId: gemSkill(equipped).id };
  return resolveRound(battle, content).battle;
}
function replay(battle: Battle) { while (battle.phase === 'playing') battle = advanceReplay(battle, content); return battle; }
const action = (battle: Battle) => battle.events.find(event => event.actionSelection && event.actorId === 'party:seris')!;

describe('memory gem combat integration', () => {
  it('adds exactly one equipped active skill without changing permanent stats or granting extra actions', () => {
    const equipped = gem('night-dew'); const battle = ready(equipped);
    const actor = battle.units[0]; const stats = { attack: actor.attack, defense: actor.defense, speed: actor.speed, maxHp: actor.maxHp };
    const option = partyOrderOptions(actor, battle, content).find(item => item.id === 'skill:' + gemSkill(equipped).id);
    expect(option?.disabled).toBe(false);
    const done = use(battle, equipped);
    expect(action(done).skillId).toBe(gemSkill(equipped).id);
    expect(done.events.filter(event => event.actionSelection && event.actorId === actor.uid)).toHaveLength(1);
    expect(done.units[0]).toMatchObject(stats);
    expect(done.units[0].cooldowns['memory:slot']).toBe(4);
    const foe = battle.units.find(unit => unit.side === 'enemy')!;
    expect(partyOrderOptions(foe, battle, content).some(item => item.id === 'skill:' + gemSkill(equipped).id)).toBe(false);
  });
  it('never lets AI select conditional gems through a generic attack or buff fallback', () => {
    for (const defId of ['shield-break', 'rewind-thread']) {
      const equipped = gem(defId);
      const battle = ready(equipped, defId === 'rewind-thread' ? 'noelle' : 'seris');
      const actor = battle.units.find(unit => unit.characterId === (defId === 'rewind-thread' ? 'noelle' : 'seris'))!;
      actor.speed = 200;
      // A supporter can own rewind even though the underlying presentation template is buff.
      const local = structuredClone(content);
      if (defId === 'rewind-thread') local.characters.find(character => character.id === 'noelle')!.role = 'supporter';
      const done = resolveRound(battle, local).battle;
      expect(done.events.some(event => event.actionSelection && event.actorId === actor.uid && event.skillId === gemSkill(equipped).id)).toBe(false);
    }
  });
  it('consumes an allied shield for a real attack and disables the skill without a shield', () => {
    const equipped = gem('shield-break'); const battle = ready(equipped); const actor = battle.units[0];
    expect(orderSkillReady(actor, battle, gemSkill(equipped))).toBe(false);
    const donor = battle.units.find(unit => unit.characterId === 'elaine')!;
    donor.barrier = 150; donor.barrierUntil = 3;
    const done = use(battle, equipped);
    expect(action(done).amount).toBeGreaterThan(0);
    expect(action(done).unitsAfter!.find(unit => unit.uid === donor.uid)!.barrier).toBeUndefined();
  });
  it('rewinds another ally innate skill only, never its own or memory cooldowns', () => {
    const equipped = gem('rewind-thread'); const battle = ready(equipped); const actor = battle.units[0];
    expect(orderSkillReady(actor, battle, gemSkill(equipped))).toBe(false);
    const ally = battle.units.find(unit => unit.characterId === 'liora')!;
    const skillId = content.characters.find(def => def.id === 'liora')!.skillIds[0];
    ally.cooldowns[skillId] = 9; ally.cooldowns['memory:slot'] = 9;
    actor.cooldowns['attack-14'] = 9;
    const done = use(battle, equipped); const snapshot = action(done).unitsAfter!;
    expect(snapshot.find(unit => unit.uid === ally.uid)!.cooldowns[skillId]).toBe(8);
    expect(snapshot.find(unit => unit.uid === ally.uid)!.cooldowns['memory:slot']).toBe(9);
    expect(snapshot[0].cooldowns['attack-14']).toBe(9);
  });
  it('keeps cooldown across instance swaps and does not expose another character gem', () => {
    const equipped = gem('night-dew'); let battle = replay(use(ready(equipped), equipped));
    const replacement = gem('dawn-crown', 'swift', 'second-gem');
    battle.memoryGems!.seris = replacement;
    expect(orderSkillReady(battle.units[0], battle, gemSkill(replacement))).toBe(false);
    battle.memoryGems!.liora = equipped;
    expect(orderSkillReady(battle.units[0], battle, gemSkill(equipped))).toBe(false);
  });
  it('replays one delayed 35% echo on the next round without recursive actions or duplicate replay damage', () => {
    const equipped = gem('echo-shard'); let battle = use(ready(equipped), equipped);
    const original = action(battle).amount!;
    expect(battle.memoryEchoes).toHaveLength(1);
    expect(battle.memoryEchoes![0].power).toBe(Math.max(1, Math.floor(original * .35)));
    battle = replay(battle); battle.partyOrder = { kind: 'guard' };
    const done = resolveRound(battle, content).battle;
    const echoes = done.events.filter(event => event.skillId === gemSkill(equipped).id);
    expect(echoes).toHaveLength(1); expect(echoes[0].amount).toBe(Math.max(1, Math.floor(original * .35)));
    expect(done.memoryEchoes).toBeUndefined();
    const hp = done.units.map(unit => unit.hp);
    expect(replay(done).units.map(unit => unit.hp)).toEqual(hp);
  });
  it('drops a delayed echo when its source died rather than firing from a defeated ally', () => {
    const equipped = gem('echo-shard'); let battle = replay(use(ready(equipped), equipped));
    battle.units[0].hp = 0;
    const done = resolveRound(battle, content).battle;
    expect(done.events.some(event => event.skillId === gemSkill(equipped).id)).toBe(false);
    expect(done.memoryEchoes).toBeUndefined();
  });
  it('lets an autonomous non-healer cleanse an afflicted ally with her equipped gem', () => {
    const equipped = gem('clear-tear'); const battle = ready(equipped, 'noelle');
    const actor = battle.units.find(unit => unit.characterId === 'noelle')!; actor.speed = 200;
    battle.units[0].ailments = { sleep: { turns: 2, sourceId: battle.units.find(unit => unit.side === 'enemy')!.uid } };
    const done = resolveRound(battle, content).battle;
    expect(done.events.find(event => event.actorId === actor.uid && event.actionSelection)?.skillId).toBe(gemSkill(equipped).id);
    expect(done.units[0].ailments).toBeUndefined();
  });
  it('steals active enemy empowerment without resurrecting an expired stronger ally buff', () => {
    const equipped = gem('hollow-lantern'); const battle = ready(equipped);
    const enemy = battle.units.find(unit => unit.side === 'enemy')!; enemy.buffStrength = 22; enemy.buffUntil = 3;
    const ally = battle.units.filter(unit => unit.side === 'party').sort((a,b) => b.attack-a.attack)[0];
    ally.buffStrength = 120; ally.buffUntil = 0;
    const done = use(battle, equipped); const snapshot = action(done).unitsAfter!;
    expect(snapshot.find(unit => unit.uid === enemy.uid)!.buffStrength).toBeUndefined();
    expect(snapshot.find(unit => unit.uid === ally.uid)!.buffStrength).toBe(22);
  });
});
