import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { frozenDawnClock } from '../src/content/trials';
import { createBattle, advanceReplay, resolveRound } from '../src/domain/engine';
import { activeAcceleration } from '../src/domain/acceleration';
import { createInitialSave, applyCommand } from '../src/application/game';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import { clockTeams, simulateClock } from '../scripts/balance-clock';
import type { Battle, GameSave } from '../src/domain/types';
const stage = frozenDawnClock.id;
const ready = (input: Battle) => { let battle = input; while (battle.phase === 'playing') battle = advanceReplay(battle, content); return battle; };
const start = (ids = ['eos-standard', 'selene', 'seris-awakened', 'fortuna']) => ready(createBattle(content, ids, ids[0]!, stage, 5, 42, 'clock-test'));

describe('Frozen Dawn Clock', () => {
  it('restores the fixed shield without stacking or scaling it with acceleration', () => {
    let battle = start(); const boss = battle.units.find(unit => unit.boss)!; expect(boss.barrier).toBe(170);
    boss.barrier = 4; battle.round = 10;
    const resolved = resolveRound(battle, content).battle;
    const restore = resolved.events.find(event => event.clockAction === 'restore')!;
    expect(restore.unitsAfter!.find(unit => unit.boss)!.barrier).toBe(170);
    expect(resolved.events.filter(event => event.clockAction === 'restore')).toHaveLength(1);
    const afterReplay = ready(resolved); expect(afterReplay.units).toEqual(resolved.units);
    const next = resolveRound(afterReplay, content).battle;
    expect(next.events.find(event => event.clockAction === 'restore')!.unitsAfter!.find(unit => unit.boss)!.barrier).toBe(170);
  });
  it('opens a same-turn defense window when shatter removes the ward, then restores it next turn', () => {
    const battle = start(['iwanagahime','seris-awakened','selene','rainbow-iris']); battle.strategy = 'aggressive';
    const result = resolveRound(battle, content).battle;
    const broken = result.events.find(event => event.clockAction === 'break')!;
    expect(broken).toBeDefined(); expect(broken.unitsAfter!.find(unit => unit.boss)!.barrier ?? 0).toBe(0);
    const lessVulnerable = structuredClone(content); lessVulnerable.dungeons.find(d => d.id === stage)!.bossClock!.brokenDefensePercent = 99;
    const baseline = resolveRound(battle, lessVulnerable).battle;
    const damage = (b: Battle) => b.events.filter(event => event.actorId === 'party:seris-awakened').reduce((sum,event) => sum + (event.amount ?? 0), 0);
    expect(damage(result)).toBeGreaterThan(damage(baseline));
    const next = resolveRound(ready(result), content).battle;
    expect(next.events[0]!.clockAction).toBe('restore'); expect(next.events[0]!.unitsAfter!.find(unit => unit.boss)!.barrier).toBe(170);
  });
  it('keeps acceleration as a living-leader effect and provides both accelerated and counter-only victories', () => {
    for (const seed of [1, 42, 731]) {
      const accelerated = simulateClock(clockTeams[0]!, seed, 'aggressive');
      expect(accelerated.phase).toBe('reward'); expect(accelerated.turns.length).toBeGreaterThanOrEqual(12); expect(accelerated.turns.length).toBeLessThanOrEqual(18);
      expect(simulateClock(clockTeams[1]!, seed, 'aggressive').phase).toBe('failed');
      expect(simulateClock(clockTeams[3]!, seed, 'switch').phase).toBe('reward');
      expect(simulateClock(clockTeams[4]!, seed, 'switch').phase).toBe('reward');
      expect(simulateClock(clockTeams[6]!, seed).phase).toBe('failed');
    }
    const battle = start(); battle.round = 12; expect(activeAcceleration(battle, content)?.percent).toBe(55);
    battle.units.find(unit => unit.characterId === 'eos-standard')!.hp = 0; expect(activeAcceleration(battle, content)).toBeUndefined();
  });
  it('telegraphs the deadline and uses the final bell as the boss action rather than an extra attack', () => {
    let battle = start(); battle.round = 19;
    expect(resolveRound(battle, content).battle.events.some(event => event.clockAction === 'finale')).toBe(false);
    battle.round = 20; const result = resolveRound(battle, content).battle;
    const actions = result.events.filter(event => event.actorId?.startsWith('enemy:') && ['attack','area'].includes(event.kind));
    expect(actions).toHaveLength(1); expect(actions[0]).toMatchObject({ kind: 'area', clockAction: 'finale', bossStrike: true, ultimate: true, ultimateName: frozenDawnClock.bossClock!.finaleName });
    expect(actions[0]!.targetIds).toHaveLength(4); expect(result.nextPhase).toBe('failed');
  });
  it('resumes a mid-round save exactly and awards only the clear record, never loot or ownership', () => {
    let save = createInitialSave(content, 42); save.completedDungeonIds.push('silent-cathedral');
    save.ownedIds.push('eos-standard','selene','seris-awakened','fortuna'); save.partyIds = ['eos-standard','selene','seris-awakened','fortuna']; save.leaderId = 'eos-standard';
    save = applyCommand(save, { type: 'depart', dungeonId: stage, potions: 5 }, content);
    while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
    save = applyCommand(save, { type: 'round' }, content); save = applyCommand(save, { type: 'replay' }, content);
    const restored: GameSave = JSON.parse(JSON.stringify(save)); assertSaveCompatibility(restored, content);
    expect(applyCommand(restored, { type: 'replay' }, content)).toEqual(applyCommand(save, { type: 'replay' }, content));
    let cleared = structuredClone(restored);
    for (let steps = 0; cleared.battle!.phase !== 'reward' && cleared.battle!.phase !== 'failed' && steps < 400; steps++) {
      if (cleared.battle!.phase === 'playing') { cleared = applyCommand(cleared, { type: 'replay' }, content); continue; }
      cleared = applyCommand(cleared, { type: 'strategy', strategy: 'aggressive' }, content);
      const weakest = cleared.battle!.units.filter(unit => unit.side === 'party' && unit.hp > 0).sort((a,b) => a.hp/a.maxHp-b.hp/b.maxHp)[0]!;
      if (weakest.hp < weakest.maxHp * .55 && cleared.battle!.potionsRemaining) cleared = applyCommand(cleared, { type: 'potion', unitId: weakest.uid }, content);
      cleared = applyCommand(cleared, { type: 'round' }, content);
    }
    expect(cleared.battle!.phase).toBe('reward'); expect(cleared.battle!.pendingMaterials).toEqual({}); expect(cleared.battle!.goldEarned).toBe(0); expect(cleared.discoveredIds).not.toContain('chrona'); expect(cleared.potions).toBeLessThan(save.potions);
    const before = structuredClone(cleared); const claimed = applyCommand(cleared, { type: 'claim' }, content);
    expect(claimed.completedDungeonIds).toContain(stage); expect(claimed.gold).toBe(before.gold); expect(claimed.stones).toBe(before.stones); expect(claimed.materials).toEqual(before.materials); expect(claimed.ownedIds).toEqual(before.ownedIds);
    const invalid = structuredClone(restored); invalid.battle!.events[0]!.clockAction = 'finale'; expect(() => assertValidSave(invalid)).toThrow('探索');
  });
  it('validates an exclusive one-wave trial without loosening existing reward and boss contracts', () => {
    expect(validateContent(content)).toEqual([]); const boss = content.characters.find(char => char.id === 'chrona')!; expect(boss.origin).toEqual(['trial']); expect(boss.motionId).toBeUndefined();
    for (const patch of [{ shield: 0 }, { deadline: 2 }, { brokenDefensePercent: 100 }, { finalePower: NaN }]) {
      const bad = structuredClone(content); Object.assign(bad.dungeons.find(d => d.id === stage)!.bossClock!, patch);
      expect(validateContent(bad).some(error => error.includes('invalid boss clock'))).toBe(true);
    }
    const rewards = structuredClone(content); rewards.dungeons.find(d => d.id === stage)!.bossLoot = { guaranteed: [{ materialId: 'clockwork:common', count: 1 }] };
    expect(validateContent(rewards).some(error => error.includes('trials cannot carry loot'))).toBe(true);
  });
});
