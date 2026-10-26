import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay, rng } from '../src/domain/engine';
import { chooseOmen, offerOmens, omenRecipes } from '../src/domain/omens';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { GameSave } from '../src/domain/types';

const definitions = structuredClone(content);
const stage = definitions.dungeons[0]!;
stage.waves = [stage.waves[0]!, stage.waves[0]!, stage.waves[0]!, stage.waves[0]!];
function depart() { return applyCommand(createInitialSave(definitions, 42), { type: 'depart', dungeonId: stage.id, potions: 0 }, definitions); }
function boundary(save: GameSave, desired?: string) {
  save = structuredClone(save);
  const battle = save.battle!;
  battle.units.filter(unit => unit.side === 'enemy').forEach(unit => { unit.hp = 0; });
  battle.phase = 'playing'; battle.events = []; battle.cursor = 0;
  battle.nextPhase = battle.wave + 1 === stage.waves.length ? 'reward' : 'wave';
  if (desired) {
    for (let seed = 0; ; seed++) {
      const candidate = structuredClone(battle); candidate.seed = seed; offerOmens(candidate, rng);
      if (candidate.omens!.pending!.includes(desired)) { battle.seed = seed; break; }
    }
  }
  return applyCommand(save, { type: 'replay' }, definitions);
}
function choose(save: GameSave, choiceId: string) { return applyCommand(save, { type: 'chooseOmen', choiceId }, definitions); }

describe('wave traces and hidden combinations', () => {
  it('offers three distinct deterministic choices only after the clear replay, and never rerolls on reload', () => {
    let save = depart();
    expect(save.battle!.omens).toEqual({ picks: [], activated: [] });
    save.battle!.events = [{ id: 'one', kind: 'attack', text: 'one' }, { id: 'two', kind: 'wave', text: 'two' }];
    save.battle!.cursor = 0; save.battle!.nextPhase = 'wave';
    save = applyCommand(save, { type: 'replay' }, definitions);
    expect(save.battle!.omens!.pending).toBeUndefined();
    const input = structuredClone(save);
    const first = applyCommand(save, { type: 'replay' }, definitions);
    expect(first).toEqual(applyCommand(input, { type: 'replay' }, definitions));
    expect(new Set(first.battle!.omens!.pending).size).toBe(3);
    assertSaveCompatibility(JSON.parse(JSON.stringify(first)), definitions);
    expect(() => applyCommand(first, { type: 'replay' }, definitions)).toThrow('痕跡');
    expect(() => applyCommand(first, { type: 'round' }, definitions)).toThrow();
    expect(() => applyCommand(first, { type: 'claim' }, definitions)).toThrow();
    const unknown = structuredClone(first);
    expect(() => choose(first, 'unknown')).toThrow(); expect(first).toEqual(unknown);
  });
  it('does nothing for a lone trace, then heals only when its combination is completed and never resurrects', () => {
    let save = boundary(depart(), 'bell');
    const before = structuredClone(save.battle!.units);
    save = choose(save, 'bell');
    expect(save.battle!.omens!.picks).toEqual(['bell']); expect(save.battle!.omens!.activated).toEqual([]);
    expect(save.battle!.units.filter(unit => unit.side === 'party').map(unit => unit.hp)).toEqual(before.filter(unit => unit.side === 'party').map(unit => unit.hp));
    save.battle!.units[0]!.hp = 1; save.battle!.units[1]!.hp = 0;
    save = boundary(save, 'thread'); const maximum = save.battle!.units[0]!.maxHp;
    save = choose(save, 'thread');
    expect(save.battle!.units[0]!.hp).toBe(1 + Math.floor(maximum * .25));
    expect(save.battle!.units[1]!.hp).toBe(0);
    expect(save.battle!.omens!.activated).toEqual(['returning-voices']);
    const hp = save.battle!.units[0]!.hp;
    save = choose(boundary(save, 'thread'), 'thread');
    expect(save.battle!.units[0]!.hp).toBe(hp);
    expect(save.battle!.omens!.activated).toEqual(['returning-voices']);
    assertSaveCompatibility(save, definitions);
  });
  it('retains attack and defense changes across waves but clears them for the next expedition', () => {
    let save = choose(boundary(depart(), 'ash'), 'ash');
    const attack = save.battle!.units[0]!.attack;
    save = choose(boundary(save, 'mirror'), 'mirror');
    expect(save.battle!.units[0]!.attack).toBe(attack + Math.max(1, Math.floor(attack * .12)));
    save = choose(boundary(save, 'key'), 'key');
    const defense = save.battle!.units[0]!.defense;
    save = choose(boundary(save, 'feather'), 'feather');
    expect(save.battle!.phase).toBe('reward');
    expect(save.battle!.units[0]!.defense).toBe(defense + Math.max(1, Math.floor(defense * .12)));
    expect(save.battle!.omens!.activated).toEqual(['unseen-edge', 'winged-door']);
    const before = structuredClone(save);
    expect(() => choose(save, 'feather')).toThrow(); expect(save).toEqual(before);
    save = applyCommand(save, { type: 'claim' }, definitions);
    save = applyCommand(save, { type: 'depart', dungeonId: stage.id, potions: 0 }, definitions);
    expect(save.battle!.units[0]!.attack).toBe(attack); expect(save.battle!.omens!.picks).toEqual([]);
  });
  it('grants a combination offering provisionally, then loses it on failure or claims it exactly once', () => {
    let save = choose(boundary(depart(), 'bell'), 'bell');
    save = choose(boundary(save, 'mirror'), 'mirror');
    const oldMaterials = structuredClone(save.materials);
    save = choose(boundary(save, 'key'), 'key');
    expect(save.battle!.omens!.activated).toEqual(['forgotten-offering']);
    expect(save.materials).toEqual(oldMaterials);
    const material = Object.keys(save.battle!.pendingMaterials)[0]!;
    expect(save.battle!.pendingMaterials[material]).toBe(2);
    let failure = structuredClone(save);
    while (failure.battle!.phase === 'playing') failure = applyCommand(failure, { type: 'replay' }, definitions);
    failure = applyCommand(failure, { type: 'retreat' }, definitions);
    expect(failure.battle!.pendingMaterials).toEqual({}); expect(failure.materials).toEqual(oldMaterials);
    save = choose(boundary(save, 'bell'), 'bell');
    expect(save.battle!.pendingMaterials[material]).toBe(2);
    assertSaveCompatibility(save, definitions);
    const claimed = applyCommand(save, { type: 'claim' }, definitions);
    expect(claimed.materials[material]).toBe(2);
    expect(() => applyCommand(claimed, { type: 'claim' }, definitions)).toThrow();
  });
  it('rejects malformed trace saves and preserves expeditions from before traces existed', () => {
    const save = boundary(depart(), 'bell');
    for (const mutation of [
      { picks: ['unknown'], activated: [] },
      { picks: [], activated: [omenRecipes[0].id] },
      { picks: [], activated: [], pending: ['bell', 'bell', 'key'] },
      { picks: [], activated: [], pending: ['bell', 'mirror'] },
    ]) {
      const invalid = structuredClone(save); invalid.battle!.omens = mutation;
      expect(() => assertValidSave(invalid)).toThrow('痕跡');
    }
    delete save.battle!.omens;
    assertSaveCompatibility(save, definitions);
    const next = advanceReplay(save.battle!, definitions);
    expect(next.wave).toBe(1); expect(next.omens).toBeUndefined();
  });
});
