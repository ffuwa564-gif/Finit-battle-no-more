import { describe, it, expect } from 'vitest';
import { content, validateContent } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { flowerGacha, initialGacha, sharedGoddessIds, sharedSSRIds, gachaPoolIds, gachaSSRRate } from '../src/content/gacha';
import { assertSaveCompatibility } from '../src/platform/save';

const cases = [
  [flowerGacha, {"selene-standard": 1456, "athena-standard": 1457, "flora-standard": 1, "amaterasu-standard": 1458, "izanami-standard": 2, "artemis-standard": 1459, "persephone-standard": 1537, "hestia-standard": 3, "hebe-standard": 4, "eos-standard": 5, "nike-standard": 6, "rainbow-iris-standard": 1460, "toyotama-standard": 1461, "seoritsu-standard": 1462, "wakahirume-standard": 1463, "ukanomitama-standard": 7}],
  [initialGacha, {"selene-standard": 1490, "athena-standard": 1457, "flora-standard": 2, "amaterasu-standard": 1458, "izanami-standard": 3, "artemis-standard": 1459, "persephone-standard": 1460, "hestia-standard": 4, "hebe-standard": 5, "eos-standard": 6, "nike-standard": 7, "rainbow-iris-standard": 1516, "toyotama-standard": 1461, "seoritsu-standard": 1462, "wakahirume-standard": 1463, "ukanomitama-standard": 30}],
] as const;

describe('shared base-form goddesses', () => {
  it('adds sixteen R/SR base forms to each collection without mixing their costumes or changing SSR odds', () => {
    expect(validateContent(content)).toEqual([]); expect(sharedGoddessIds).toHaveLength(16);
    for (const [collection] of cases) {
      expect(sharedGoddessIds.every(id => gachaPoolIds(collection).includes(id))).toBe(true);
      const ssrs = content.characters.filter(c => gachaPoolIds(collection).includes(c.id) && c.rarity === 'SSR').map(c => c.id);
      expect(ssrs.sort()).toEqual([...collection.featuredIds, ...sharedSSRIds].sort()); expect(collection.rates).toEqual({ R: 80, SR: 17, SSR: 3 });
      expect(gachaSSRRate(0, collection)).toBe(3); expect(gachaSSRRate(73, collection)).toBe(9);
    }
  });
  it('actually summons each shared form from both collections and refunds duplicates by its own rarity', () => {
    for (const [collection, seeds] of cases) for (const [id, seed] of Object.entries(seeds)) {
      let save = createInitialSave(content, seed); save.drawCount = 10; save.stones = 10;
      save = applyCommand(save, { type: 'draw', collectionId: collection.id }, content);
      expect(save.lastGachaResult).toEqual({ characterId: id, duplicate: false, refund: 0 }); expect(save.stones).toBe(5);
      save = JSON.parse(JSON.stringify(save)); assertSaveCompatibility(save, content); save.seed = seed;
      save = applyCommand(save, { type: 'draw', collectionId: collection.id }, content);
      const refund = content.characters.find(c => c.id === id)!.rarity === 'R' ? 1 : 2;
      expect(save.lastGachaResult).toEqual({ characterId: id, duplicate: true, refund }); expect(save.stones).toBe(refund); expect(save.ownedIds.filter(owned => owned === id)).toHaveLength(1);
    }
  });
  it('keeps introductory and hard-pity SSR rewards in the selected costume collection', () => {
    for (const [collection] of cases) for (const initial of [true, false]) {
      const save = createInitialSave(content, 42); save.stones = 5; save.drawCount = initial ? 1 : 130; save.ssrPity = initial ? 1 : 89;
      const next = applyCommand(save, { type: 'draw', collectionId: collection.id }, content);
      expect(collection.featuredIds).toContain(next.lastGachaResult!.characterId); expect(next.ssrPity).toBe(0);
    }
  });
  it('allows separate ownership and home selection while rejecting two forms of the same goddess in a party', () => {
    for (const id of sharedGoddessIds) {
      const base = content.characters.find(c => c.id === id)!; const costume = content.characters.find(c => c.id === base.familyId)!;
      const save = createInitialSave(content, 42); save.ownedIds.push(id, costume.id);
      const before = structuredClone(save);
      expect(() => applyCommand(save, { type: 'party', partyIds: [id, costume.id], leaderId: id }, content)).toThrow('異なる姿'); expect(save).toEqual(before);
      const party = applyCommand(save, { type: 'party', partyIds: [id, 'liora'], leaderId: id }, content);
      const selected = applyCommand(party, { type: 'settings', settings: { homeCharacterId: id } }, content);
      assertSaveCompatibility(JSON.parse(JSON.stringify(selected)), content); expect(selected.settings.homeCharacterId).toBe(id);
      expect(selected.ownedIds).toEqual(expect.arrayContaining([id, costume.id]));
    }
  });
  it('preserves existing costume ownership and active parties when loading an old save', () => {
    const save = createInitialSave(content, 42); save.ownedIds.push('selene', 'athena', 'evelyn', 'asteria');
    save.partyIds = ['selene', 'athena', 'evelyn', 'asteria']; save.leaderId = 'athena'; save.drawCount = 80; save.ssrPity = 20;
    const loaded = JSON.parse(JSON.stringify(save)); assertSaveCompatibility(loaded, content);
    expect(loaded).toEqual(save); expect(loaded.ownedIds.some((id: string) => sharedGoddessIds.includes(id))).toBe(false);
  });
});
