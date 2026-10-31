import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { gemSkill, type MemoryGem } from '../src/domain/memory-gems';
import { orderSkillReady } from '../src/domain/party-orders';
import type { Battle } from '../src/domain/types';

const item = (defId: string, power: number, trait: NonNullable<MemoryGem['roll']>['trait'] = 'none', value = 0): MemoryGem => ({ id: `tier6-${defId}`, defId, variant: 'pure', roll: { power, trait, value } });
function ready(gem: MemoryGem, seed = 42): Battle {
  let battle = createBattle(content, ['seris', 'liora', 'elaine', 'noelle'], 'liora', 'silent-cathedral', 0, seed, 'tier6-combat');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  battle.crystalRole = 'healer';
  battle.memoryGems = { seris: gem };
  for (const unit of battle.units) {
    unit.hp = unit.maxHp = unit.side === 'enemy' ? 100000 : 10000;
    unit.speed = unit.characterId === 'seris' ? 100 : unit.side === 'party' ? 20 : 0;
    unit.attack = unit.characterId === 'seris' ? 100 : 1;
  }
  battle.partyOrder = { kind: 'skill', skillId: gemSkill(gem).id };
  return battle;
}
const action = (battle: Battle) => resolveRound(battle, content).battle.events.find(event => event.actionSelection && event.actorId === 'party:seris')!;
function damage(defId: string, power: number, trait: NonNullable<MemoryGem['roll']>['trait'] = 'none', value = 0) {
  const battle = ready(item(defId, power, trait, value));
  if (trait === 'execution') battle.units.find(unit => unit.side === 'enemy')!.hp = 25000;
  if (defId === 'shield-break') {
    const donor = battle.units.find(unit => unit.characterId === 'liora')!;
    donor.barrier = 100; donor.barrierUntil = 3;
  }
  return action(battle).amount!;
}

/** A durable 30-round opponent isolates support cadence. Native party healing and
 * ultimates remain enabled, so battery HP costs cannot be ignored indefinitely.
 */
function supportTrace(power: number, companions: string[], pilotGem = 'night-dew', seed = 42) {
  let battle = ready(item(pilotGem, power), seed);
  for (const [index, defId] of companions.entries()) {
    battle.memoryGems![battle.partyIds[index + 1]] = { ...item(defId, power), id: `tier6-companion-${index}` };
  }
  for (const unit of battle.units.filter(unit => unit.side === 'party')) {
    unit.hp = unit.maxHp = 1000; unit.attack = 100;
  }
  const enemy = battle.units.find(unit => unit.side === 'enemy')!;
  enemy.boss = true; enemy.attack = 1;
  for (const unit of battle.units.filter(unit => unit.side === 'enemy' && unit.uid !== enemy.uid)) unit.hp = 0;
  const ultimates: { actorId: string; round: number }[] = [], sleeps: number[] = [], casts: number[] = [];
  let batteries = 0, paidBatteryCasts = 0;
  for (let step = 0; step < 30; step++) {
    const target = battle.units.find(unit => unit.uid === enemy.uid)!;
    target.barrier = 10000000; target.barrierUntil = 100;
    for (const friend of battle.units.filter(unit => unit.side === 'party')) if (friend.characterId !== 'seris' && friend.ultimateCharge === 100) friend.ultimateQueued = true;
    const actor = battle.units.find(unit => unit.characterId === 'seris')!, skill = gemSkill(battle.memoryGems!.seris);
    battle.partyOrder = actor.ultimateCharge === 100 ? { kind: 'ultimate' } : orderSkillReady(actor, battle, skill) ? { kind: 'skill', skillId: skill.id } : { kind: 'guard' };
    const completed = resolveRound(battle, content).battle;
    let previous = completed.initialUnits;
    for (const event of completed.events) {
      if (event.actionSelection && event.skillId === skill.id) casts.push(completed.round);
      if (event.actionSelection && event.ultimate && event.actorId?.startsWith('party:')) ultimates.push({ actorId: event.actorId, round: completed.round });
      if (event.actorId === enemy.uid && event.statusAction === 'skip' && event.ailment === 'sleep') sleeps.push(completed.round);
      if (event.actionSelection && event.skillId?.startsWith('memory:star-furnace:')) {
        batteries++;
        const before = previous.find(unit => unit.uid === event.actorId)!, after = event.unitsAfter!.find(unit => unit.uid === event.actorId)!;
        if (before.hp - after.hp === Math.floor(before.maxHp * .1)) paidBatteryCasts++;
      }
      if (event.unitsAfter) previous = event.unitsAfter;
    }
    battle = completed;
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    expect(battle.phase).toBe('ready');
  }
  let maxUltimateStreak = 0;
  for (const actorId of new Set(ultimates.map(event => event.actorId))) {
    const rounds = ultimates.filter(event => event.actorId === actorId).map(event => event.round);
    let streak = 0, previous = -100;
    for (const round of rounds) { streak = round === previous + 1 ? streak + 1 : 1; maxUltimateStreak = Math.max(maxUltimateStreak, streak); previous = round; }
  }
  return { ultimates, sleeps, casts, batteries, paidBatteryCasts, maxUltimateStreak };
}

describe('Tier 6 combat upgrades', () => {
  it.each(['shield-break', 'echo-shard', 'night-dew', 'dawn-crown'])('improves actual %s damage beyond the best T5 at the minimum T6 roll', defId => {
    expect(damage(defId, 220)).toBeGreaterThan(damage(defId, 179));
  });

  it('makes the combined T6 execution/power roll stronger without multiplying all actor skills', () => {
    const t5 = damage('night-dew', 179, 'execution', 179), t6 = damage('night-dew', 239, 'execution', 239);
    expect(t6).toBeGreaterThan(t5 * 1.3);
    expect(t6).toBeLessThan(t5 * 1.6);
    const battle = ready(item('night-dew', 239, 'execution', 239));
    battle.partyOrder = { kind: 'attack' };
    const ordinary = action(battle);
    const old = ready(item('night-dew', 179, 'execution', 179)); old.partyOrder = { kind: 'attack' };
    expect(ordinary.amount).toBe(action(old).amount);
    expect(ordinary.unitsAfter!.find(unit => unit.characterId === 'seris')!.attack).toBe(100);
  });

  it.each(['clear-tear', 'twin-tide', 'pale-ward', 'hollow-lantern'])('improves real %s support output at T6', defId => {
    const effect = (power: number) => {
      const battle = ready(item(defId, power));
      for (const friend of battle.units.filter(unit => unit.side === 'party' && unit.characterId !== 'seris')) friend.hp = 1;
      const enemy = battle.units.find(unit => unit.side === 'enemy')!; enemy.buffUntil = 3; enemy.buffStrength = 10;
      const event = action(battle);
      if (defId === 'pale-ward') return event.unitsAfter!.find(unit => unit.uid === event.targetIds![0])!.barrier!;
      if (defId === 'hollow-lantern') return event.unitsAfter!.find(unit => unit.characterId === 'seris')!.buffStrength!;
      return event.amount!;
    };
    expect(effect(220)).toBeGreaterThan(effect(179));
  });

  it.each(['execution', 'chain', 'mercy', 'bulwark'] as const)('applies the T6 %s trait independently of power', trait => {
    const effect = (value: number) => {
      const gem = item('night-dew', 100, trait, value), battle = ready(gem);
      battle.units.find(unit => unit.side === 'enemy')!.hp = 25000;
      battle.units.find(unit => unit.characterId === 'noelle')!.hp = 1000;
      const events = resolveRound(battle, content).battle.events.filter(event => event.skillId === gemSkill(gem).id);
      if (trait === 'execution') return events.find(event => event.actionSelection)!.amount!;
      if (trait === 'chain') return events.find(event => !event.actionSelection && event.kind === 'attack')!.amount!;
      if (trait === 'mercy') return events.find(event => event.kind === 'heal')!.amount!;
      return events.find(event => event.kind === 'guard')!.unitsAfter!.find(unit => unit.characterId === 'noelle')!.barrier!;
    };
    expect(effect(220)).toBeGreaterThan(effect(179));
  });

  it.each(['rewind-thread', 'star-furnace'])('gives T6 %s its reviewed cadence and bounded single-use output', defId => {
    const battle = ready(item(defId, 220));
    const ally = battle.units.find(unit => unit.characterId === 'liora')!;
    ally.attack = 1000;
    const native = content.characters.find(character => character.id === 'liora')!.skillIds[0];
    ally.cooldowns[native] = 9; ally.cooldowns['memory:slot'] = 9;
    const event = action(battle), actorAfter = event.unitsAfter!.find(unit => unit.characterId === 'seris')!, after = event.unitsAfter!.find(unit => unit.characterId === 'liora')!;
    expect(actorAfter.cooldowns['memory:slot'] - battle.round).toBe(defId === 'star-furnace' ? 3 : 2);
    if (defId === 'rewind-thread') { expect(after.cooldowns[native]).toBe(7); expect(after.cooldowns['memory:slot']).toBe(9); }
    else { expect(after.ultimateCharge).toBe(80); expect(actorAfter.hp).toBe(9000); }
  });

  it('uses only power T6 for the furnace enhancement and preserves older crystal resonance', () => {
    for (const [power, value, expected, cooldown] of [[100,239,70,5],[179,239,70,3],[220,0,80,3],[239,239,80,3]] as const) {
      const battle = ready(item('star-furnace',power,value ? 'bulwark' : 'none',value));
      const ally = battle.units.find(unit => unit.characterId === 'liora')!; ally.attack=1000;
      const event=action(battle), actor=event.unitsAfter!.find(unit => unit.characterId==='seris')!;
      expect(event.unitsAfter!.find(unit => unit.characterId==='liora')!.ultimateCharge).toBe(expected);
      expect(actor.cooldowns['memory:slot']-battle.round).toBe(cooldown);
    }
    const legacy = ready({id:'legacy-furnace',defId:'star-furnace',variant:'pure'});
    legacy.crystalRole = 'attacker';
    const ally=legacy.units.find(unit=>unit.characterId==='liora')!; ally.attack=1000;
    expect(action(legacy).unitsAfter!.find(unit=>unit.characterId==='liora')!.ultimateCharge).toBe(42);
  });

  it('keeps T6 sleep cadence/caps and adds exactly 45 self charge on either outcome', () => {
    for (const [seed, status] of [[1, 'inflict'], [1000, 'resist']] as const) {
      const battle = ready(item('dream-lace', 239), seed); battle.seed = seed;
      battle.units.find(unit => unit.side === 'enemy')!.boss = true;
      const event = action(battle), actor = event.unitsAfter!.find(unit => unit.characterId === 'seris')!;
      expect(event.statusAction).toBe(status); expect(actor.ultimateCharge).toBe(70); expect(actor.cooldowns['memory:slot'] - battle.round).toBe(4);
    }
    const traitOnly = ready(item('dream-lace', 100, 'bulwark', 239));
    expect(action(traitOnly).unitsAfter!.find(unit => unit.characterId === 'seris')!.ultimateCharge).toBe(25);
  });

  it('keeps the sleep charge cap and native boss ward across thirty rounds', () => {
    const capped = ready(item('dream-lace', 220)); capped.units.find(unit => unit.characterId === 'seris')!.ultimateCharge = 90;
    expect(action(capped).unitsAfter!.find(unit => unit.characterId === 'seris')!.ultimateCharge).toBe(100);
    for (const seed of [1, 42, 97]) {
      const result = supportTrace(239, ['dream-lace', 'dream-lace', 'dream-lace'], 'dream-lace', seed);
      for (let index = 1; index < result.sleeps.length; index++) expect(result.sleeps[index] - result.sleeps[index - 1]).toBeGreaterThanOrEqual(2);
      expect(new Set(result.ultimates.map(event => `${event.actorId}:${event.round}`)).size).toBe(result.ultimates.length);
    }
  });

  it.each([
    ['star-furnace', 'star-furnace', 'star-furnace'],
    ['star-furnace', 'rewind-thread', 'star-furnace'],
  ])('keeps T6 battery and rewind combinations finite with real healing and HP costs: %j', (...companions) => {
    const result = supportTrace(239, companions);
    expect(result.batteries).toBeGreaterThan(5);
    expect(result.paidBatteryCasts).toBe(result.batteries);
    expect(result.ultimates.length).toBeGreaterThan(0);
    expect(new Set(result.ultimates.map(event => `${event.actorId}:${event.round}`)).size).toBe(result.ultimates.length);
  });
});
