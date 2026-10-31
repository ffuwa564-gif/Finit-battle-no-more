import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { emptyGemInventory, GEM_DEFINITIONS, gemSkill, dungeonGemFamily, rollGemDrop } from '../src/domain/memory-gems';
import type { GameSave } from '../src/domain/types';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import { decodeBackup, encodeBackup } from '../src/platform/save-backup';

function finishReplay(save: GameSave): GameSave {
  let remaining = 200;
  while (save.battle?.phase === 'playing' && remaining-- > 0) save = applyCommand(save, { type: 'replay' }, content);
  if (!remaining) throw new Error('replay did not finish');
  return save;
}
function start(): GameSave {
  return finishReplay(applyCommand(createInitialSave(content, 42), { type: 'depart', dungeonId: content.dungeons[0]!.id, potions: 0 }, content));
}
function atWaveEnd(save: GameSave, final = false): GameSave {
  const next = structuredClone(save), battle = next.battle!;
  battle.units.filter(unit => unit.side === 'enemy').forEach(unit => { unit.hp = 0; });
  battle.phase = 'playing'; battle.nextPhase = final ? 'reward' : 'wave';
  battle.events = [{ id: 'defeated-wave', kind: 'dialogue', text: 'wave cleared', unitsAfter: structuredClone(battle.units) }];
  battle.initialUnits = structuredClone(battle.units); battle.cursor = 0;
  return next;
}
function withGem(save = createInitialSave(content)): GameSave {
  save.memoryGems = emptyGemInventory();
  save.memoryGems.items.push({ id: 'test-owned', defId: GEM_DEFINITIONS[0]!.id, variant: 'pure' });
  save.memoryGems.seen.push(GEM_DEFINITIONS[0]!.id);
  return save;
}

describe('memory gem application and portable persistence', () => {
  it('transfers only after explicit confirmation and updates both battle slots without losing either stone or resetting cooldowns', () => {
    const initial = withGem(start());
    const [source, target] = initial.partyIds;
    initial.memoryGems!.items.push({ id: 'target-owned', defId: 'night-dew', variant: 'pure' });
    initial.memoryGems!.equipped = { [source]: 'test-owned', [target]: 'target-owned' };
    initial.battle!.memoryGems = { [source]: initial.memoryGems!.items[0], [target]: initial.memoryGems!.items[1] };
    initial.battle!.units.find(unit => unit.characterId === target)!.cooldowns['memory:slot'] = 7;
    expect(() => applyCommand(initial, { type: 'equipMemoryGem', characterId: target, gemId: 'test-owned' }, content)).toThrow();
    const transferred = applyCommand(initial, { type: 'equipMemoryGem', characterId: target, gemId: 'test-owned', transfer: true }, content);
    expect(initial.memoryGems!.equipped[source]).toBe('test-owned');
    expect(transferred.memoryGems!.equipped).toEqual({ [target]: 'test-owned' });
    expect(transferred.memoryGems!.items).toHaveLength(2);
    expect(transferred.battle!.memoryGems![source]).toBeUndefined();
    expect(transferred.battle!.memoryGems![target].id).toBe('test-owned');
    expect(transferred.battle!.units.find(unit => unit.characterId === target)!.cooldowns['memory:slot']).toBe(7);
    assertSaveCompatibility(transferred, content);
    transferred.battle!.round = 2;
    expect(() => applyCommand(transferred, { type: 'equipMemoryGem', characterId: source, gemId: 'test-owned', transfer: true }, content)).toThrow();
  });

  it('opens a first chest exactly once at the completed wave and survives replay/save/retreat', () => {
    const input = atWaveEnd(start());
    const awarded = applyCommand(input, { type: 'replay' }, content);
    expect(input.memoryGems!.items).toHaveLength(0);
    expect(awarded.memoryGems!.items).toHaveLength(1);
    expect(awarded.battle!.gemChestChecks).toHaveLength(1);
    expect(awarded.battle!.gemFinds).toEqual(awarded.memoryGems!.items);
    expect(applyCommand(structuredClone(input), { type: 'replay' }, content)).toEqual(awarded);
    const restored = decodeBackup(encodeBackup(awarded, content), content).save;
    const ready = finishReplay(restored);
    expect(ready.memoryGems!.items).toHaveLength(1);
    const retreated = applyCommand(ready, { type: 'retreat' }, content);
    expect(retreated.memoryGems).toEqual(awarded.memoryGems);
    expect(() => applyCommand(retreated, { type: 'replay' }, content)).toThrow();
    assertSaveCompatibility(retreated, content);
  });

  it('adds deterministic crafting progress only on claim, not retreat, and cannot claim twice', () => {
    const complete = finishReplay(atWaveEnd(start(), true));
    const family = dungeonGemFamily(content.dungeons[0]!);
    expect(complete.memoryGems!.dust[family]).toBe(0);
    const claimed = applyCommand(complete, { type: 'claim' }, content);
    expect(claimed.memoryGems!.dust[family]).toBe(1);
    expect(() => applyCommand(claimed, { type: 'claim' }, content)).toThrow();
    const retreated = applyCommand(start(), { type: 'retreat' }, content);
    expect(retreated.memoryGems!.dust[family]).toBe(0);
  });

  it('equips one owned stone on one owned character without changing stats, cooldowns or previous save', () => {
    const initial = withGem(start()), id = initial.partyIds[0]!;
    const beforeUnits = structuredClone(initial.battle!.units);
    initial.battle!.units[0]!.cooldowns['memory:slot'] = 7;
    const equipped = applyCommand(initial, { type: 'equipMemoryGem', characterId: id, gemId: 'test-owned' }, content);
    expect(initial.memoryGems!.equipped).toEqual({});
    expect(equipped.memoryGems!.equipped[id]).toBe('test-owned');
    expect(equipped.battle!.memoryGems![id]!.id).toBe('test-owned');
    expect(equipped.battle!.units[0]!.cooldowns['memory:slot']).toBe(7);
    expect(equipped.battle!.units.map(({ cooldowns, ...rest }) => rest)).toEqual(beforeUnits.map(({ cooldowns, ...rest }) => rest));
    expect(() => applyCommand(equipped, { type: 'equipMemoryGem', characterId: 'unknown', gemId: 'test-owned' }, content)).toThrow();
    expect(() => applyCommand(equipped, { type: 'equipMemoryGem', characterId: id, gemId: 'missing' }, content)).toThrow();
    const later = structuredClone(equipped); later.battle!.round = 2;
    expect(() => applyCommand(later, { type: 'equipMemoryGem', characterId: id, gemId: null }, content)).toThrow();
    assertSaveCompatibility(equipped, content);
  });

  it('accepts legacy saves and historical gem cooldown IDs after the gem has been unequipped', () => {
    const old = createInitialSave(content); delete old.memoryGems;
    assertSaveCompatibility(old, content);
    expect(applyCommand(old, { type: 'settings', settings: { speed: 2 } }, content).memoryGems).toBeUndefined();
    const active = withGem(start());
    const skill = gemSkill(active.memoryGems!.items[0]!);
    active.battle!.units[0]!.cooldowns[skill.id] = 3;
    active.battle!.units[0]!.cooldowns['memory:slot'] = 3;
    assertSaveCompatibility(active, content);
    expect(decodeBackup(encodeBackup(active, content), content).save).toEqual(active);
  });

  it('does not reset the first-chest guarantee after salvage and excludes trial loot and dust', () => {
    const alreadySeen = withGem(start());
    alreadySeen.memoryGems!.items = [];
    const before = atWaveEnd(alreadySeen);
    const battle = before.battle!, dungeon = content.dungeons.find(item => item.id === battle.dungeonId)!;
    const expected = rollGemDrop(dungeon, battle.seed, `${battle.id}:wave:${battle.wave}`, { first: false, boss: battle.wave === dungeon.waves.length - 1 });
    const awarded = applyCommand(before, { type: 'replay' }, content);
    expect(awarded.memoryGems!.items).toEqual(expected.gem ? [expected.gem] : []);
    const trial = content.dungeons.find(item => item.kind === 'trial')!;
    const trialSave = start();
    trialSave.battle!.dungeonId = trial.id;
    trialSave.battle!.pendingMaterials = {}; trialSave.battle!.goldEarned = 0;
    const trialComplete = finishReplay(atWaveEnd(trialSave, true));
    expect(trialComplete.memoryGems!.items).toHaveLength(0);
    expect(trialComplete.battle!.gemChestChecks).toBeUndefined();
    expect(applyCommand(trialComplete, { type: 'claim' }, content).memoryGems).toEqual(emptyGemInventory());
  });

  it('rejects malformed inventory, foreign equipment and fabricated skill IDs while preserving input', () => {
    const save = withGem();
    const duplicated = structuredClone(save); duplicated.memoryGems!.items.push(structuredClone(duplicated.memoryGems!.items[0]!));
    expect(() => assertValidSave(duplicated)).toThrow();
    const foreign = structuredClone(save); foreign.memoryGems!.equipped.unknown = 'test-owned';
    expect(() => assertValidSave(foreign)).toThrow();
    const active = withGem(start()); active.battle!.units[0]!.cooldowns['memory:invented:pure:unknown'] = 4;
    expect(() => assertSaveCompatibility(active, content)).toThrow();
    expect(save.memoryGems!.items).toHaveLength(1);
  });
});
