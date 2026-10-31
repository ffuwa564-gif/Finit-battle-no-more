import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content/index';
import { GEM_DEFINITIONS, dungeonGemFamily, dungeonGemLootProfile, gemTier, rollGemDrop } from '../src/domain/memory-gems';

describe('published Tier hunting destinations', () => {
  it('keeps source previews, families and the published drop content consistent', () => {
    expect(validateContent(content)).toEqual([]);
    for (const dungeon of content.dungeons) {
      const profile = dungeonGemLootProfile(dungeon);
      if (dungeon.kind === 'trial') expect(profile).toEqual({ tier4Chance: 0, tier5Chance: 0 });
      if (profile.featuredDefId) expect(GEM_DEFINITIONS.find(def => def.id === profile.featuredDefId)?.family).toBe(dungeonGemFamily(dungeon));
    }
    const entry = content.dungeons.find(dungeon => dungeon.id === 'silent-cathedral')!;
    expect(dungeonGemLootProfile(entry).tier4Chance).toBe(0);
    expect(content.dungeons.some(dungeon => !dungeon.towerFloor && dungeon.kind !== 'trial' && dungeonGemLootProfile(dungeon).tier5Chance > 0)).toBe(true);
    const outsideTower = content.dungeons.filter(dungeon => dungeon.published && !dungeon.towerFloor && (dungeonGemLootProfile(dungeon).tier6Chance ?? 0) > 0);
    expect(new Set(outsideTower.map(dungeonGemFamily))).toEqual(new Set(['sanctuary', 'clock', 'grave']));
    expect(content.dungeons.filter(dungeon => dungeon.towerFloor && dungeon.towerFloor <= 40).every(dungeon => !dungeonGemLootProfile(dungeon).tier6Chance)).toBe(true);
  });

  it('rejects impossible rates, wrong-family targets and trial loot', () => {
    const source = content.dungeons.find(dungeon => dungeon.id === 'silent-cathedral')!;
    for (const patch of [
      { gemLoot: { tier4Chance: -.1, tier5Chance: 0 } },
      { gemLoot: { tier4Chance: .8, tier5Chance: .8 } },
      { gemLoot: { tier4Chance: .4, tier5Chance: .4, tier6Chance: .3 } },
      { gemLoot: { tier4Chance: .1, tier5Chance: 0, tier6Chance: NaN } },
      { gemLoot: { tier4Chance: .1, tier5Chance: 0, featuredDefId: 'star-furnace' } },
      { kind: 'trial' as const, gemLoot: { tier4Chance: .1, tier5Chance: 0 } },
    ]) {
      expect(validateContent({ ...content, dungeons: content.dungeons.map(dungeon => dungeon === source ? { ...dungeon, ...patch } : dungeon) }).some(error => error.includes('invalid memory stone loot profile'))).toBe(true);
    }
  });

  it('actually yields target upper-tier stones outside the tower, while the opening remains ordinary', () => {
    const opening = content.dungeons.find(dungeon => dungeon.id === 'silent-cathedral')!;
    const target = content.dungeons.find(dungeon => dungeon.id === 'lunette-awakening')!;
    const featured = dungeonGemLootProfile(target).featuredDefId;
    const found = new Set<number>();
    let targetedUpper = false, seed = 0xabcdef;
    for (let index = 0; index < 3000; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const early = rollGemDrop(opening, seed, `early:${index}`, { boss: true }).gem;
      const late = rollGemDrop(target, seed, `late:${index}`, { boss: true }).gem;
      if (early) expect(gemTier(early)).toBeLessThanOrEqual(3);
      if (late) { found.add(gemTier(late)); if (late.defId === featured && gemTier(late) >= 4) targetedUpper = true; }
    }
    expect(found.has(4)).toBe(true);
    expect(found.has(5)).toBe(true);
    expect(targetedUpper).toBe(true);
  });
});
