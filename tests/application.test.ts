import { gachaPity, gachaSSRRate } from '../src/content/gacha';
import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import type { Content, GameSave } from '../src/domain/types';
import { applyCommand, createInitialSave } from '../src/application/game';
import { assertSaveCompatibility, assertValidSave, bootMetadata } from '../src/platform/save';

function finishReplay(save: GameSave, definitions = content): GameSave {
  let next = save;
  let limit = 200;
  while (next.battle?.phase === 'playing' && limit-- > 0) next = applyCommand(next, { type: 'replay' }, definitions);
  if (limit <= 0) throw new Error('演出が完了しません');
  return next;
}
function start(): GameSave {
  return finishReplay(applyCommand(createInitialSave(content, 42), { type: 'depart', dungeonId: content.dungeons[0]!.id, potions: 2 }, content));
}

describe('application command boundary', () => {
  it('keeps all commands immutable and refuses town mutations during an expedition', () => {
    const initial = createInitialSave(content, 42);
    const snapshot = structuredClone(initial);
    const departed = applyCommand(initial, { type: 'depart', dungeonId: content.dungeons[0]!.id, potions: 2 }, content);
    expect(initial).toEqual(snapshot);
    expect(departed.revision).toBe(initial.revision + 1);
    expect(() => applyCommand(departed, { type: 'buyPotion', count: 1 }, content)).toThrow('探索');
    expect(() => applyCommand(departed, { type: 'round' }, content)).toThrow('指示待ち');
    expect(() => applyCommand(departed, { type: 'claim' }, content)).toThrow('演出');
  });

  it('consumes a potion and its per-round slot together, without consuming unspent carry slots', () => {
    const initial = start();
    const target = initial.battle!.units.find(unit => unit.side === 'party')!;
    target.hp = 1;
    const result = applyCommand(initial, { type: 'potion', unitId: target.uid }, content);
    expect(result.potions).toBe(initial.potions - 1);
    expect(result.battle!.potionsRemaining).toBe(1);
    expect(result.battle!.potionUsed).toBe(true);
    expect(result.battle!.units.find(unit => unit.uid === target.uid)!.hp).toBeGreaterThan(1);
    expect(() => applyCommand(result, { type: 'potion', unitId: target.uid }, content)).toThrow();
    const retreated = applyCommand(result, { type: 'retreat' }, content);
    const town = applyCommand(retreated, { type: 'leaveFailure' }, content);
    expect(town.potions).toBe(initial.potions - 1);
    const departed = applyCommand(town, { type: 'depart', dungeonId: content.dungeons[0]!.id, potions: 0 }, content);
    expect(departed.battle!.units.filter(unit => unit.side === 'party').every(unit => unit.hp === unit.maxHp)).toBe(true);
  });

  it('discards all provisional material on retreat while keeping gold and discovered characters', () => {
    const initial = start();
    initial.battle!.pendingMaterials = { 'mist:epic': 1 };
    initial.materials = { 'mist:common': 2 };
    initial.gold += 10;
    const discovered = content.characters.find(item => item.origin.includes('recruit') && !item.origin.includes('initial'))!;
    initial.discoveredIds.push(discovered.id);
    const result = applyCommand(initial, { type: 'retreat' }, content);
    expect(result.battle!.pendingMaterials).toEqual({});
    expect(result.materials).toEqual({ 'mist:common': 2 });
    expect(result.gold).toBe(initial.gold);
    expect(result.discoveredIds).toContain(discovered.id);
  });

  it('claims material, clear gold and first-clear stone once, only after replay is complete', () => {
    const initial = start();
    const battle = initial.battle!;
    battle.pendingMaterials = { 'mist:rare': 2 };
    battle.nextPhase = 'reward';
    battle.phase = 'playing';
    battle.events = [{ id: 'last', kind: 'dialogue', text: '終わり' }];
    battle.cursor = 0;
    expect(() => applyCommand(initial, { type: 'claim' }, content)).toThrow();
    const complete = finishReplay(initial);
    expect(complete.battle!.phase).toBe('reward');
    const result = applyCommand(complete, { type: 'claim' }, content);
    expect(result.materials['mist:rare']).toBe(2);
    expect(result.gold).toBe(initial.gold + 20);
    expect(result.stones).toBe(1);
    expect(result.claimedExplorationIds).toContain(battle.id);
    expect(result.battle).toBeNull();
    expect(() => applyCommand(result, { type: 'claim' }, content)).toThrow();
    const repeated = structuredClone(complete);
    repeated.completedDungeonIds = [battle.dungeonId];
    expect(applyCommand(repeated, { type: 'claim' }, content).stones).toBe(0);
  });

  it('rejects duplicate party slots and cannot recruit unavailable or already-owned characters', () => {
    const initial = createInitialSave(content);
    expect(() => applyCommand(initial, { type: 'party', partyIds: [initial.partyIds[0]!, initial.partyIds[0]!], leaderId: initial.leaderId }, content)).toThrow('異なる');
    const target = content.characters.find(item => item.published && item.origin.includes('recruit') && !initial.ownedIds.includes(item.id))!;
    expect(() => applyCommand(initial, { type: 'recruit', characterId: target.id }, content)).toThrow('一度倒した');
    initial.discoveredIds.push(target.id);
    initial.materials[`${target.speciesId}:common`] = 100;
    initial.materials[`${target.speciesId}:rare`] = 100;
    initial.materials[`${target.speciesId}:epic`] = 100;
    const result = applyCommand(initial, { type: 'recruit', characterId: target.id }, content);
    expect(result.ownedIds).toContain(target.id);
    expect(() => applyCommand(result, { type: 'recruit', characterId: target.id }, content)).toThrow('すでに');
    const hidden = structuredClone(content);
    hidden.characters.find(item => item.id === target.id)!.published = false;
    expect(() => applyCommand(initial, { type: 'recruit', characterId: target.id }, hidden)).toThrow();
  });

  it('cannot create materials through an up/down exchange cycle', () => {
    const initial = createInitialSave(content);
    initial.materials['mist:common'] = 5;
    const up = applyCommand(initial, { type: 'exchange', speciesId: 'mist', rarity: 'common', direction: 'up' }, content);
    const down = applyCommand(up, { type: 'exchange', speciesId: 'mist', rarity: 'rare', direction: 'down' }, content);
    expect(down.materials['mist:common']).toBe(3);
    expect(() => applyCommand(down, { type: 'exchange', speciesId: 'mist', rarity: 'common', direction: 'up' }, content)).toThrow('不足');
  });

  it('guarantees SSR only on the introductory second draw, with duplicates refunded', () => {
    const initial = createInitialSave(content, 42); initial.stones = 100;
    const first = applyCommand(initial, { type: 'draw' }, content);
    const second = applyCommand(first, { type: 'draw' }, content);
    expect(content.characters.find(c => c.id === second.lastGachaResult!.characterId)!.rarity).toBe('SSR');
    expect(second.ssrPity).toBe(0);
    const later = { ...second, drawCount: 3, seed: 42 };
    const fourth = applyCommand(later, { type: 'draw' }, content);
    expect(content.characters.find(c => c.id === fourth.lastGachaResult!.characterId)!.rarity).toBe('R');
    expect(fourth.lastGachaResult!.duplicate).toBe(true);
    expect(fourth.stones).toBe(later.stones - 4);
    expect(new Set(fourth.ownedIds).size).toBe(fourth.ownedIds.length);
  });
});

describe('save contracts', () => {
  it('exposes active exploration metadata and rejects corrupt saves rather than resetting', () => {
    const initial = createInitialSave(content);
    assertValidSave(initial);
    expect(bootMetadata(initial).hasExploration).toBe(false);
    expect(bootMetadata(start()).hasExploration).toBe(true);
    expect(() => assertValidSave({ ...initial, materials: { 'mist:common': -1 } })).toThrow();
    expect(() => assertValidSave({ ...initial, schemaVersion: 999 })).toThrow('未対応');
    const expedition = start();
    assertSaveCompatibility(expedition, content);
    const broken = structuredClone(expedition);
    broken.battle!.units[0]!.hp = Number.NaN;
    expect(() => assertValidSave(broken)).toThrow('探索');
    const missing = structuredClone(expedition);
    missing.battle!.units[0]!.characterId = 'removed-character';
    expect(() => assertSaveCompatibility(missing, content)).toThrow('参照するキャラクター');
  });
});


describe('gothic goddess pity', () => {
  it('guarantees SSR at 90, resets the streak and refunds a duplicate SSR', () => {
    const save = createInitialSave(content, 42); save.stones = 5; save.drawCount = 120; save.ssrPity = 89;
    save.ownedIds.push(...content.characters.filter(c => c.origin.includes('gacha')).map(c => c.id));
    const next = applyCommand(save, { type: 'draw' }, content);
    expect(content.characters.find(c => c.id === next.lastGachaResult!.characterId)!.rarity).toBe('SSR');
    expect(next.ssrPity).toBe(0);
    expect(next.lastGachaResult).toMatchObject({ duplicate: true, refund: 3 });
    expect(next.stones).toBe(3);
    expect(next.drawCount).toBe(121);
    assertSaveCompatibility(next, content);
  });

  it('raises SSR odds at 74 and derives a streak for old saves', () => {
    expect(gachaSSRRate(72)).toBe(3);
    expect(gachaSSRRate(73)).toBe(9);
    expect(gachaSSRRate(88)).toBe(99);
    const old = createInitialSave(content, 42); delete old.ssrPity; old.drawCount = 4;
    old.history = [{ id: '4', text: '召喚：R アメノウズメが訪れました。' }, { id: '3', text: '召喚：SSR イザナミが訪れました。' }];
    expect(gachaPity(old)).toBe(1);
    expect(() => assertValidSave({ ...old, ssrPity: 90 })).toThrow('天井');
    const next = applyCommand({ ...old, stones: 5 }, { type: 'draw' }, content);
    expect(next.ssrPity).toBe(2);
  });

  it('does not consume stones or change the input when guaranteed SSR content is missing', () => {
    const definitions = structuredClone(content);
    definitions.characters.filter(c => c.rarity === 'SSR').forEach(c => c.published = false);
    const save = createInitialSave(definitions, 42); save.stones = 5; save.drawCount = 1;
    const before = structuredClone(save);
    expect(() => applyCommand(save, { type: 'draw' }, definitions)).toThrow('保証対象');
    expect(save).toEqual(before);
  });
});
