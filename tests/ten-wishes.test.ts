import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { gachaCollections } from '../src/content/gacha';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { GachaResult, GameCommand } from '../src/domain/types';

describe('atomic ten wishes', () => {
  it('matches ten sequential rolls across introductory, soft and hard pity boundaries in either collection', () => {
    for (const collection of gachaCollections) for (const [drawCount, pity] of [[0, 0], [1, 1], [90, 70], [100, 89], [130, 0]]) {
      const original = createInitialSave(content, 42); original.stones = 50; original.drawCount = drawCount!; original.ssrPity = pity!;
      const before = structuredClone(original);
      const batch = applyCommand(original, { type: 'draw', count: 10, collectionId: collection.id }, content);
      let singles = structuredClone(original); const results: GachaResult[] = [];
      for (let i = 0; i < 10; i++) { singles = applyCommand(singles, { type: 'draw', collectionId: collection.id }, content); results.push(singles.lastGachaResult!); }
      expect(batch.lastGachaResults).toEqual(results); expect(batch.stones).toBe(singles.stones); expect(batch.seed).toBe(singles.seed);
      expect(batch.ssrPity).toBe(singles.ssrPity); expect(batch.drawCount).toBe(drawCount! + 10); expect(batch.ownedIds).toEqual(singles.ownedIds);
      expect(batch.history.map(item => item.text)).toEqual(singles.history.map(item => item.text)); expect(new Set(batch.history.map(item => item.id)).size).toBe(batch.history.length);
      expect(batch.revision).toBe(original.revision + 1); expect(original).toEqual(before); assertSaveCompatibility(JSON.parse(JSON.stringify(batch)), content);
      if (drawCount! < 2) expect(collection.featuredIds).toContain(batch.lastGachaResults![1 - drawCount!]!.characterId);
      if (pity === 89) expect(collection.featuredIds).toContain(batch.lastGachaResults![0]!.characterId);
    }
  });
  it('counts repeats inside a batch as duplicates, with rarity-specific refunds', () => {
    const save = createInitialSave(content, 42); save.drawCount = 10; save.stones = 50;
    const next = applyCommand(save, { type: 'draw', count: 10 }, content); const seen = new Set(save.ownedIds);
    for (const result of next.lastGachaResults!) {
      expect(result.duplicate).toBe(seen.has(result.characterId));
      const rarity = content.characters.find(c => c.id === result.characterId)!.rarity;
      if (rarity === 'XR') throw new Error('XR leaked into regular summons');
      expect(result.refund).toBe(result.duplicate ? { R: 1, SR: 2, SSR: 3 }[rarity] : 0); seen.add(result.characterId);
    }
    expect(next.lastGachaResults!.some(result => result.duplicate)).toBe(true);
    expect(next.stones).toBe(next.lastGachaResults!.reduce((sum,result) => sum + result.refund, 0));
    expect(next.ownedIds.length).toBe(new Set(next.ownedIds).size);
  });
  it('requires all 50 stones up front and rejects invalid counts without mutation', () => {
    const save = createInitialSave(content, 42); save.stones = 49;
    save.ownedIds = [...new Set([...save.ownedIds, ...content.characters.filter(c => c.origin.includes('gacha')).map(c => c.id)])];
    const before = structuredClone(save);
    expect(() => applyCommand(save, { type: 'draw', count: 10 }, content)).toThrow('50'); expect(save).toEqual(before);
    save.stones = 100;
    for (const count of [0, 2, -10, 100, 1.5, NaN]) expect(() => applyCommand(save, { type: 'draw', count } as GameCommand, content)).toThrow('祈願回数');
  });
  it('rolls back the complete batch when a later roll has no eligible rarity', () => {
    const save = createInitialSave(content, 42); save.stones = 50; const before = structuredClone(save);
    const broken = structuredClone(content); broken.characters.filter(c => c.rarity === 'SSR').forEach(c => c.published = false);
    // Seed 42 first rolls R; the second roll would use the introductory SSR guarantee.
    expect(() => applyCommand(save, { type: 'draw', count: 10 }, broken)).toThrow('SSR保証'); expect(save).toEqual(before);
  });
  it('preserves old saves and replaces the previous batch when the next single wish is made', () => {
    const old = createInitialSave(content, 42); old.stones = 100; assertSaveCompatibility(old, content);
    const batch = applyCommand(old, { type: 'draw', count: 10 }, content);
    const single = applyCommand(batch, { type: 'draw' }, content);
    expect(single.lastGachaResults).toEqual([single.lastGachaResult]); assertSaveCompatibility(single, content);
    for (const bad of [[], batch.lastGachaResults!.slice(0, 2), [...batch.lastGachaResults!, batch.lastGachaResults![0]]]) {
      expect(() => assertValidSave({ ...batch, lastGachaResults: bad })).toThrow('祈願');
    }
    const corrupt = structuredClone(batch); corrupt.lastGachaResults![0]!.characterId = 'not-owned';
    expect(() => assertSaveCompatibility(corrupt, content)).toThrow('所持情報');
  });
});
