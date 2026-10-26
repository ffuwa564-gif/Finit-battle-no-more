import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay } from '../src/domain/engine';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { GameSave } from '../src/domain/types';

function depart(dungeonId = content.dungeons[0]!.id) {
  let save = applyCommand(createInitialSave(content, 42), { type: 'depart', dungeonId, potions: 0 }, content);
  while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
  return save;
}
function boundary(save: GameSave, final = false) {
  const copy = structuredClone(save), battle = copy.battle!;
  if (final) battle.wave = content.dungeons.find(stage => stage.id === battle.dungeonId)!.waves.length - 1;
  for (const enemy of battle.units.filter(unit => unit.side === 'enemy')) enemy.hp = 0;
  battle.phase = 'playing'; battle.nextPhase = final ? 'reward' : 'wave'; battle.events = []; battle.cursor = 0;
  return copy;
}

describe('exploration without Wave choices', () => {
  it('creates no choice state and proceeds straight to the next Wave after the last replay event', () => {
    const save = depart(); expect(save.battle!.omens).toBeUndefined();
    const cleared = boundary(save);
    cleared.battle!.events = [{ id: 'defeat', kind: 'defeat', text: 'cleared' }];
    const next = applyCommand(cleared, { type: 'replay' }, content);
    expect(next.battle!.wave).toBe(1); expect(next.battle!.omens).toBeUndefined();
    assertValidSave(next); assertSaveCompatibility(next, content);
    expect(cleared.battle!.wave).toBe(0);
  });
  it('reaches final rewards immediately and claims the normal first-clear reward exactly once', () => {
    const cleared = boundary(depart(), true);
    cleared.battle!.pendingMaterials = { 'pilgrim:common': 2 };
    const reward = applyCommand(cleared, { type: 'replay' }, content);
    expect(reward.battle!.phase).toBe('reward'); expect(reward.battle!.omens).toBeUndefined();
    const claimed = applyCommand(reward, { type: 'claim' }, content);
    expect(claimed.battle).toBeNull(); expect(claimed.stones).toBe(3); expect(claimed.materials['pilgrim:common']).toBe(2);
    expect(() => applyCommand(claimed, { type: 'claim' }, content)).toThrow();
  });
  it('accepts old pending-choice saves and resumes without selecting or granting combination effects', () => {
    const old = boundary(depart());
    old.battle!.omens = { picks: [], activated: [], pending: ['bell', 'thread', 'mirror'] };
    const unit = old.battle!.units.find(unit => unit.side === 'party')!; unit.hp = 1;
    assertValidSave(old); assertSaveCompatibility(old, content);
    const next = applyCommand(JSON.parse(JSON.stringify(old)), { type: 'replay' }, content);
    expect(next.battle!.wave).toBe(1); expect(next.battle!.omens).toBeUndefined();
    expect(next.battle!.units.find(after => after.uid === unit.uid)!.hp).toBe(1);
    expect(next.battle!.pendingMaterials).toEqual({});
    expect(old.battle!.omens.pending).toHaveLength(3);
    assertValidSave(next); assertSaveCompatibility(next, content);
  });
  it('preserves saved stats and loot from an old combination when bypassing the final choice', () => {
    const old = boundary(depart(), true);
    old.battle!.omens = { picks: ['ash', 'mirror'], activated: ['unseen-edge'], pending: ['bell', 'key', 'feather'] };
    const unit = old.battle!.units.find(unit => unit.side === 'party')!;
    unit.attack += 12; unit.hp = 1; old.battle!.pendingMaterials = { 'pilgrim:common': 2 };
    assertValidSave(old); assertSaveCompatibility(old, content);
    const next = applyCommand(old, { type: 'replay' }, content);
    expect(next.battle!.phase).toBe('reward'); expect(next.battle!.omens).toBeUndefined();
    expect(next.battle!.units.find(after => after.uid === unit.uid)).toMatchObject({ hp: 1, attack: unit.attack });
    const claimed = applyCommand(next, { type: 'claim' }, content);
    expect(claimed.materials['pilgrim:common']).toBe(2);
    const fresh = applyCommand(claimed, { type: 'depart', dungeonId: content.dungeons[0]!.id, potions: 0 }, content);
    expect(fresh.battle!.units.find(after => after.uid === unit.uid)!.attack).toBe(unit.attack - 12);
  });
  it('drops old choice metadata during ordinary commands and direct replay without altering saved resources', () => {
    const old = depart(); old.battle!.omens = { picks: [], activated: [] };
    const changed = applyCommand(old, { type: 'strategy', strategy: 'aggressive' }, content);
    expect(changed.battle!.omens).toBeUndefined(); expect(changed.battle!.units).toEqual(old.battle!.units);
    expect(changed.gold).toBe(old.gold); expect(changed.stones).toBe(old.stones);
    const cleared = boundary(old); cleared.battle!.omens!.pending = ['bell', 'mirror', 'key'];
    expect(advanceReplay(cleared.battle!, content).wave).toBe(1);
  });
  it('still rejects malformed legacy records instead of discarding corrupt data during loading', () => {
    for (const state of [
      { picks: ['unknown'], activated: [] },
      { picks: [], activated: ['unseen-edge'] },
      { picks: [], activated: [], pending: ['bell', 'bell', 'key'] },
    ]) {
      const old = boundary(depart()); old.battle!.omens = state;
      expect(() => assertValidSave(old)).toThrow('痕跡');
    }
  });
});
