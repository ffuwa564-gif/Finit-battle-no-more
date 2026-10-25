import { describe, it, expect } from 'vitest';
import { content, validateContent } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { gachaCollections, sharedSSRIds, gachaPoolIds, gachaBaseChance, pickSSR } from '../src/content/gacha';
import { assertSaveCompatibility } from '../src/platform/save';

describe('shared SSR summons', () => {
  it('shows probabilities totaling 100% and preserves a 50/50 SSR group split in both collections', () => {
    for (const collection of gachaCollections) {
      const pool = content.characters.filter(c => gachaPoolIds(collection).includes(c.id));
      expect(pool.reduce((sum,c) => sum + gachaBaseChance(c, collection, pool), 0)).toBeCloseTo(100, 8);
      for (const id of collection.featuredIds) expect(gachaBaseChance(pool.find(c => c.id === id)!, collection, pool)).toBe(0.75);
      for (const id of sharedSSRIds) expect(gachaBaseChance(pool.find(c => c.id === id)!, collection, pool)).toBe(0.5);
      const counts: Record<string, number> = {};
      for (let n = 0; n < 1200; n++) {
        const selected = pickSSR(pool.filter(c => c.rarity === 'SSR'), collection, (n + 0.5) / 1200, false);
        counts[selected.id] = (counts[selected.id] ?? 0) + 1;
      }
      for (const id of collection.featuredIds) expect(counts[id]).toBe(300);
      for (const id of sharedSSRIds) expect(counts[id]).toBe(200);
    }
  });
  it('summons every static common SSR from either collection, resets pity, refunds duplicates, and permits home selection', () => {
    for (const collection of gachaCollections) for (const [seed, id] of [[1899, 'hecate'], [1901, 'freyja'], [1903, 'benzaiten']] as const) {
      const original = createInitialSave(content, seed); original.drawCount = 30; original.stones = 10; original.ssrPity = 20;
      const before = structuredClone(original);
      let next = applyCommand(original, { type: 'draw', collectionId: collection.id }, content);
      expect(original).toEqual(before); expect(next.lastGachaResult).toEqual({ characterId: id, duplicate: false, refund: 0 });
      expect(next.ssrPity).toBe(0); expect(next.stones).toBe(5);
      next = JSON.parse(JSON.stringify(next)); assertSaveCompatibility(next, content); next.seed = seed;
      next = applyCommand(next, { type: 'draw', collectionId: collection.id }, content);
      expect(next.lastGachaResult).toEqual({ characterId: id, duplicate: true, refund: 3 }); expect(next.stones).toBe(3);
      next = applyCommand(next, { type: 'settings', settings: { homeCharacterId: id } }, content);
      expect(next.settings.homeCharacterId).toBe(id); expect(next.ownedIds.filter(owned => owned === id)).toHaveLength(1);
      expect(content.characters.find(c => c.id === id)!.motionId).toBeUndefined(); assertSaveCompatibility(next, content);
    }
  });
  it('keeps introductory and hard guarantees featured-only even with a common SSR seed', () => {
    for (const collection of gachaCollections) for (const intro of [true, false]) {
      const save = createInitialSave(content, 1899); save.drawCount = intro ? 1 : 100; save.ssrPity = intro ? 1 : 89; save.stones = 5;
      const next = applyCommand(save, { type: 'draw', collectionId: collection.id }, content);
      expect(collection.featuredIds).toContain(next.lastGachaResult!.characterId); expect(next.ssrPity).toBe(0);
    }
  });
  it('rejects an unavailable common SSR group without mutating the input or charging stones', () => {
    const definitions = structuredClone(content); definitions.characters = definitions.characters.filter(c => !sharedSSRIds.includes(c.id));
    expect(validateContent(definitions).some(error => error.includes('common SSR'))).toBe(true);
    const save = createInitialSave(content, 1899); save.drawCount = 10; save.stones = 5; const before = structuredClone(save);
    expect(() => applyCommand(save, { type: 'draw', collectionId: gachaCollections[0].id }, definitions)).toThrow('SSR'); expect(save).toEqual(before);
  });
});
