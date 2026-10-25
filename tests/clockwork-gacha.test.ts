import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { clockworkGacha, flowerGacha, initialGacha, gachaPoolIds, gachaBaseChance, sharedGoddessIds, sharedSSRIds } from '../src/content/gacha';
import { createInitialSave, applyCommand } from '../src/application/game';
import { assertSaveCompatibility } from '../src/platform/save';

describe('clockwork maiden summons', () => {
  it('has one exclusive SSR, preserves common pools and does not leak Nox into other collections', () => {
    expect(clockworkGacha.featuredIds).toEqual(['nox']);
    expect(clockworkGacha.characterIds).toEqual(['nox']);
    expect(gachaPoolIds(clockworkGacha)).toEqual(['nox', ...sharedGoddessIds, ...sharedSSRIds]);
    for (const other of [flowerGacha, initialGacha]) expect(gachaPoolIds(other)).not.toContain('nox');
    const pool = content.characters.filter(char => gachaPoolIds(clockworkGacha).includes(char.id));
    expect(gachaBaseChance(pool.find(char => char.id === 'nox')!, clockworkGacha, pool)).toBe(1.5);
    expect(pool.reduce((sum, char) => sum + gachaBaseChance(char, clockworkGacha, pool), 0)).toBeCloseTo(100, 8);
  });
  it('gives Nox on introductory and hard guarantees and refunds duplicates without duplicating ownership', () => {
    for (const introductory of [true, false]) {
      const save = createInitialSave(content, 1899);
      save.drawCount = introductory ? 1 : 100; save.ssrPity = introductory ? 1 : 89; save.stones = 10;
      const first = applyCommand(save, { type: 'draw', collectionId: clockworkGacha.id }, content);
      expect(first.lastGachaResult).toEqual({ characterId: 'nox', duplicate: false, refund: 0 });
      expect(first.ssrPity).toBe(0); expect(first.stones).toBe(5);
      first.ssrPity = 89;
      const duplicate = applyCommand(first, { type: 'draw', collectionId: clockworkGacha.id }, content);
      expect(duplicate.lastGachaResult).toEqual({ characterId: 'nox', duplicate: true, refund: 3 });
      expect(duplicate.stones).toBe(3); expect(duplicate.ownedIds.filter(id => id === 'nox')).toHaveLength(1);
      const selected = applyCommand(duplicate, { type: 'settings', settings: { homeCharacterId: 'nox' } }, content);
      assertSaveCompatibility(JSON.parse(JSON.stringify(selected)), content);
    }
  });
  it('shares introductory guarantee consumption when changing collections', () => {
    let save = createInitialSave(content); save.stones = 20; save.drawCount = 1;
    save = applyCommand(save, { type: 'draw', collectionId: clockworkGacha.id }, content);
    expect(save.drawCount).toBe(2);
    save.ssrPity = 12;
    const next = applyCommand(save, { type: 'draw', collectionId: flowerGacha.id }, content);
    expect(next.drawCount).toBe(3);
    expect(next.ownedIds).toContain('nox');
    expect(content.characters.find(char => char.id === 'nox')!.skillIds.map(id => content.skills.find(skill => skill.id === id)!.template)).toEqual(['attack', 'pierce']);
  });
});
