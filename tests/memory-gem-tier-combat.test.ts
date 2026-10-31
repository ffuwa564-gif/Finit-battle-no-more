import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { gemSkill, type MemoryGem } from '../src/domain/memory-gems';
import { orderSkillReady } from '../src/domain/party-orders';
import type { Battle } from '../src/domain/types';

const item = (defId: string, power: number, trait: NonNullable<MemoryGem['roll']>['trait'] = 'none', value = 0): MemoryGem => ({
  id: `tier-combat-${defId}`, defId, variant: 'pure', roll: { power, trait, value },
});
function ready(gem: MemoryGem, seed = 42): Battle {
  let battle = createBattle(content, ['seris', 'liora', 'elaine', 'noelle'], 'liora', 'silent-cathedral', 0, seed, 'tier-combat');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  battle.crystalRole = 'healer'; // Isolate the gem from the attacker's crystal resonance.
  battle.memoryGems = { seris: gem };
  for (const unit of battle.units) {
    unit.hp = unit.maxHp = unit.side === 'enemy' ? 100000 : 10000;
    unit.speed = unit.characterId === 'seris' ? 100 : unit.side === 'party' ? 20 : 0;
    unit.attack = unit.characterId === 'seris' ? 100 : 1;
  }
  battle.partyOrder = { kind: 'skill', skillId: gemSkill(gem).id };
  return battle;
}
const firstAction = (battle: Battle) => battle.events.find(event => event.actionSelection && event.actorId === 'party:seris')!;
const primary = (gem: MemoryGem, prepare?: (battle: Battle) => void) => {
  const battle = ready(gem); prepare?.(battle);
  return firstAction(resolveRound(battle, content).battle);
};

/** A controlled 20-round trace: no enemy dies and barrier damage does not wake sleep.
 * Every native actor still acts, charges and may spend an ultimate. Only the pilot's
 * gem/guard order is forced, so gem cooldowns and status wards remain real engine state.
 */
function trace(gem: MemoryGem, seed = 42, companionGems: string[] = [], usePilotUltimates = false) {
  let battle = ready(gem, seed);
  for (const [index, defId] of companionGems.entries()) {
    const characterId = battle.partyIds[index + 1];
    battle.memoryGems![characterId] = { ...gem, id: `trace-companion-${index}`, defId };
  }
  const onlyEnemy = battle.units.find(unit => unit.side === 'enemy')!;
  onlyEnemy.boss = true;
  for (const unit of battle.units.filter(unit => unit.side === 'enemy')) {
    if (unit.uid !== onlyEnemy.uid) unit.hp = 0;
  }
  const uses: number[] = [], skipped: number[] = [], ultimates: { actorId: string; round: number }[] = [];
  for (let step = 0; step < 20; step++) {
    const enemy = battle.units.find(unit => unit.uid === onlyEnemy.uid)!;
    enemy.barrier = 10000000; enemy.barrierUntil = 100;
    for (const unit of battle.units.filter(unit => unit.side === 'party')) {
      if (unit.characterId !== 'seris' && (unit.ultimateCharge ?? 0) === 100) unit.ultimateQueued = true;
      if (gem.defId === 'rewind-thread' && unit.characterId !== 'seris') {
        // Keep an outstanding native cooldown to exercise every eligible use.
        for (const id of content.characters.find(c => c.id === unit.characterId)!.skillIds) unit.cooldowns[id] = battle.round + 10;
        unit.cooldowns['memory:slot'] = 100;
      }
    }
    const actor = battle.units.find(unit => unit.characterId === 'seris')!;
    const skill = gemSkill(gem);
    battle.partyOrder = (companionGems.length || usePilotUltimates) && (actor.ultimateCharge ?? 0) === 100 ? { kind: 'ultimate' }
      : orderSkillReady(actor, battle, skill) ? { kind: 'skill', skillId: skill.id } : { kind: 'guard' };
    const completed = resolveRound(battle, content).battle;
    const use = completed.events.find(event => event.actionSelection && event.skillId === skill.id);
    if (use) uses.push(completed.round);
    if (completed.events.some(event => event.actorId === enemy.uid && event.statusAction === 'skip')) skipped.push(completed.round);
    ultimates.push(...completed.events.filter(event => event.ultimate).map(event => ({ actorId: event.actorId!, round: completed.round })));
    if (gem.defId === 'rewind-thread') for (const unit of completed.units.filter(unit => unit.side === 'party' && unit.characterId !== 'seris')) expect(unit.cooldowns['memory:slot']).toBe(100);
    battle = completed;
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    expect(battle.phase).toBe('ready');
  }
  return { uses, skipped, ultimates };
}

describe('tiered memory gems in the combat engine', () => {
  it.each(['shield-break', 'echo-shard', 'night-dew', 'dawn-crown'])('makes successive power tiers improve actual damage for %s', defId => {
    const damage = [100, 120, 160].map(power => primary(item(defId, power), battle => {
      if (defId === 'shield-break') {
        const donor = battle.units.find(unit => unit.characterId === 'liora')!;
        donor.barrier = 100; donor.barrierUntil = 3;
      }
    }).amount!);
    expect(damage[1]).toBeGreaterThan(damage[0]);
    expect(damage[2]).toBeGreaterThan(damage[1]);
  });

  it.each(['clear-tear', 'twin-tide'])('improves real healing for %s without changing native stats', defId => {
    const actions = [100, 120, 160].map(power => primary(item(defId, power), battle => {
      for (const unit of battle.units.filter(unit => unit.side === 'party' && unit.characterId !== 'seris')) unit.hp = 1;
    }));
    expect(actions[1].amount).toBeGreaterThan(actions[0].amount!);
    expect(actions[2].amount).toBeGreaterThan(actions[1].amount!);
    for (const event of actions) expect(event.unitsAfter!.find(unit => unit.characterId === 'seris')!.attack).toBe(100);
  });

  it('improves actual barrier and stolen-buff strength, not only display tiers', () => {
    const barriers = [100, 120, 160].map(power => {
      const event = primary(item('pale-ward', power));
      return event.unitsAfter!.find(unit => unit.uid === event.targetIds![0])!.barrier!;
    });
    expect(barriers[1]).toBeGreaterThan(barriers[0]); expect(barriers[2]).toBeGreaterThan(barriers[1]);
    const buffs = [100, 120, 160].map(power => primary(item('hollow-lantern', power), battle => {
      const enemy = battle.units.find(unit => unit.side === 'enemy')!;
      enemy.buffUntil = 3; enemy.buffStrength = 10;
    }).unitsAfter!.find(unit => unit.uid === 'party:seris')!.buffStrength!);
    expect(buffs[1]).toBeGreaterThan(buffs[0]); expect(buffs[2]).toBeGreaterThan(buffs[1]);
  });

  it.each(['rewind-thread', 'star-furnace', 'dream-lace'])('gives %s real cooldown improvements while retaining utility caps', defId => {
    const actions = [100, 120, 160].map(power => {
      const gem = item(defId, power);
      const battle = ready(gem);
      const ally = battle.units.find(unit => unit.characterId === 'liora')!;
      ally.attack = 1000;
      ally.cooldowns[content.characters.find(c => c.id === 'liora')!.skillIds[0]] = 9;
      ally.cooldowns['memory:slot'] = 9;
      const event = firstAction(resolveRound(battle, content).battle);
      const actorAfter = event.unitsAfter!.find(unit => unit.characterId === 'seris')!;
      const allyAfter = event.unitsAfter!.find(unit => unit.characterId === 'liora')!;
      if (defId === 'rewind-thread') {
        expect(allyAfter.cooldowns[content.characters.find(c => c.id === 'liora')!.skillIds[0]]).toBe(7);
        expect(allyAfter.cooldowns['memory:slot']).toBe(9);
      }
      if (defId === 'star-furnace') {
        expect(allyAfter.ultimateCharge).toBe(70);
        expect(actorAfter.hp).toBe(9000);
      }
      return actorAfter.cooldowns['memory:slot'] - battle.round;
    });
    expect(actions).toEqual(defId === 'dream-lace' ? [4, 4, 4] : [5, 4, 3]);
  });

  it.each(['execution', 'chain', 'mercy', 'bulwark'] as const)('applies upper %s tiers to real combat effects independently of power', trait => {
    const effects = [100, 120, 179].map(value => {
      const gem = item('night-dew', 100, trait, value);
      const battle = ready(gem);
      battle.units.find(unit => unit.side === 'enemy')!.hp = 25000;
      battle.units.find(unit => unit.characterId === 'noelle')!.hp = 1000;
      const completed = resolveRound(battle, content).battle;
      if (trait === 'execution') return firstAction(completed).amount!;
      if (trait === 'chain') return completed.events.find(event => event.skillId === gemSkill(gem).id && event.kind === 'attack' && !event.actionSelection)!.amount!;
      if (trait === 'mercy') return completed.events.find(event => event.skillId === gemSkill(gem).id && event.kind === 'heal')!.amount!;
      return completed.events.find(event => event.skillId === gemSkill(gem).id && event.kind === 'guard')!.unitsAfter!.find(unit => unit.characterId === 'noelle')!.barrier!;
    });
    expect(effects[1]).toBeGreaterThan(effects[0]); expect(effects[2]).toBeGreaterThan(effects[1]);
  });

  it('keeps the maximum T5 power/execution combination finite and stronger than legacy-best and minimum T4', () => {
    const damage = [100, 120, 179].map(value => primary(item('night-dew', value, 'execution', value), battle => {
      battle.units.find(unit => unit.side === 'enemy')!.hp = 25000;
    }).amount!);
    expect(damage[1]).toBeGreaterThan(damage[0]);
    expect(damage[2]).toBeGreaterThan(damage[1]);
    expect(damage[2]).toBeLessThan(damage[0] * 2);
  });

  it('never allows successive boss sleep skips, even with T5 cooldown and repeated attempts', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const result = trace(item('dream-lace', 160), seed);
      expect(result.uses.length).toBe(5);
      for (let index = 1; index < result.skipped.length; index++) expect(result.skipped[index] - result.skipped[index - 1]).toBeGreaterThanOrEqual(2);
    }
  });

  it('preserves the existing ordinary and boss sleep chance caps for every high power tier', () => {
    for (const power of [100, 120, 179]) for (const [boss, seed] of [[true, 1000], [false, 1900]] as const) {
      const battle = ready(item('dream-lace', power));
      battle.seed = seed;
      battle.units.find(unit => unit.side === 'enemy')!.boss = boss;
      expect(firstAction(resolveRound(battle, content).battle).statusAction).toBe('resist');
    }
  });

  it('adds upper sleep power charge once on success or resistance, keeping old and trait-only tiers unchanged', () => {
    const cases = [
      { gem: { id: 'old-sleep', defId: 'dream-lace', variant: 'pure' } as MemoryGem, charge: 25 },
      { gem: item('dream-lace', 100), charge: 25 },
      { gem: item('dream-lace', 100, 'bulwark', 179), charge: 25 },
      { gem: item('dream-lace', 120), charge: 40 },
      { gem: item('dream-lace', 179, 'bulwark', 179), charge: 55 },
    ];
    for (const { gem, charge } of cases) for (const [seed, result] of [[1, 'inflict'], [1000, 'resist']] as const) {
      const battle = ready(gem); battle.seed = seed;
      battle.units.find(unit => unit.side === 'enemy')!.boss = true;
      const action = firstAction(resolveRound(battle, content).battle);
      expect(action.statusAction).toBe(result);
      expect(action.unitsAfter!.find(unit => unit.characterId === 'seris')!.ultimateCharge).toBe(charge);
    }
  });

  it('caps added sleep charge at 100 and never grants it for an ultimate, forced attack or skipped action', () => {
    const gem = item('dream-lace', 179, 'bulwark', 179);
    const charged = ready(gem);
    charged.units.find(unit => unit.characterId === 'seris')!.ultimateCharge = 90;
    expect(firstAction(resolveRound(charged, content).battle).unitsAfter!.find(unit => unit.characterId === 'seris')!.ultimateCharge).toBe(100);
    const ultimate = ready(gem);
    ultimate.units.find(unit => unit.characterId === 'seris')!.ultimateCharge = 100;
    ultimate.partyOrder = { kind: 'ultimate' };
    expect(firstAction(resolveRound(ultimate, content).battle).unitsAfter!.find(unit => unit.characterId === 'seris')!.ultimateCharge).toBe(0);
    for (const ailment of ['sleep', 'charm'] as const) {
      const blocked = ready(gem), actor = blocked.units.find(unit => unit.characterId === 'seris')!;
      actor.ultimateCharge = 0;
      actor.ailments = { [ailment]: { turns: 2, sourceId: blocked.units.find(unit => unit.side === 'enemy')!.uid } };
      const completed = resolveRound(blocked, content).battle;
      expect(completed.events.some(event => event.skillId === gemSkill(gem).id)).toBe(false);
      const firstSnapshot = completed.events.find(event => event.actorId === actor.uid && event.unitsAfter)!.unitsAfter!;
      expect(firstSnapshot.find(unit => unit.uid === actor.uid)!.ultimateCharge).toBe(0);
    }
  });

  it('keeps sleep casting cadence unchanged and advances ultimates through the added charge', () => {
    const powers = [100, 120, 179];
    expect(powers.map(power => trace(item('dream-lace', power)).uses.length)).toEqual([5, 5, 5]);
    const ultimates = powers.map(power => trace(item('dream-lace', power), 42, [], true).ultimates.filter(event => event.actorId === 'party:seris').length);
    expect(ultimates[1]).toBeGreaterThanOrEqual(ultimates[0]);
    expect(ultimates[2]).toBeGreaterThan(ultimates[0]);
  });

  it('keeps memory cooldowns intact through twenty rounds of top-tier rewind use', () => {
    const results = [100, 120, 160].map(power => trace(item('rewind-thread', power)));
    expect(results.map(result => result.uses.length)).toEqual([4, 5, 7]);
  });

  it('increases battery use without granting a same-actor ultimate every round', () => {
    const results = [100, 120, 160].map(power => trace(item('star-furnace', power)));
    expect(results[1].uses.length).toBeGreaterThan(results[0].uses.length);
    expect(results[2].uses.length).toBeGreaterThan(results[1].uses.length);
    for (const result of results) for (const id of new Set(result.ultimates.map(event => event.actorId))) {
      const rounds = result.ultimates.filter(event => event.actorId === id).map(event => event.round);
      for (let index = 1; index < rounds.length; index++) expect(rounds[index] - rounds[index - 1]).toBeGreaterThanOrEqual(2);
    }
  });

  it.each([
    ['star-furnace', 'star-furnace', 'star-furnace'],
    ['star-furnace', 'rewind-thread', 'star-furnace'],
  ])('keeps long-running companion support combinations bounded: %j', (...companions) => {
    for (const power of [100, 120, 179]) {
      const result = trace(item('night-dew', power, 'execution', power), 42, companions);
      expect(result.ultimates.length).toBeGreaterThan(0);
      for (const id of new Set(result.ultimates.map(event => event.actorId))) {
        const rounds = result.ultimates.filter(event => event.actorId === id).map(event => event.round);
        for (let index = 1; index < rounds.length; index++) expect(rounds[index] - rounds[index - 1]).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
