import type { DungeonDef } from '../domain/types';
import { dungeonGemFamily, type GemFamily } from '../domain/memory-gems';
import { campaignChapters } from './chapters';

const featured: Record<GemFamily, string[]> = {
  sanctuary: ['pale-ward', 'clear-tear', 'shield-break', 'dawn-crown'],
  clock: ['echo-shard', 'rewind-thread', 'hollow-lantern', 'star-furnace'],
  grave: ['night-dew', 'dream-lace', 'twin-tide'],
};

/** Rates apply to each existing roll attribute, conditional on a final-wave stone drop.
 * Content, drop generation and the source guide all consume the same configuration.
 * Early routes keep their original rolls; the tower is never the sole upper-tier source.
 */
export function withGemLoot(dungeon: DungeonDef): DungeonDef {
  if (dungeon.kind === 'trial') return dungeon;
  const family = dungeonGemFamily(dungeon), pool = featured[family];
  const profile = (tier4Chance: number, tier5Chance: number, index: number, regularOnly = false): DungeonDef => {
    const choices = regularOnly ? pool.slice(0, -1) : pool;
    return { ...dungeon, gemLoot: { tier4Chance, tier5Chance, featuredDefId: choices[index % choices.length] } };
  };
  if (dungeon.towerFloor) {
    const band = Math.floor((dungeon.towerFloor - 1) / 20);
    return profile(.20 + band * .05, .02 + band * .02, Math.floor((dungeon.towerFloor - 1) / 3));
  }
  const chapter = campaignChapters.find(item => item.id === dungeon.chapterId);
  if (chapter) {
    const index = chapter.dungeonIds.indexOf(dungeon.id), finale = index === chapter.dungeonIds.length - 1;
    if (chapter.number === 1) return finale ? profile(.06, 0, index, true) : dungeon;
    if (chapter.number === 2) return profile(finale ? .16 : .10, finale ? .01 : .005, index);
    return profile(finale ? .22 : .18, finale ? .03 : .02, index);
  }
  if (dungeon.eventId && dungeon.tierName) {
    const index = ['初級', '中級', '上級', '超級', '覚醒級'].indexOf(dungeon.tierName);
    if (index < 2) return dungeon;
    const rates = [[.12, .005], [.20, .02], [.25, .04]][index - 2]!;
    return profile(rates[0], rates[1], Math.min(index, pool.length - 1));
  }
  const shortRoutes: Record<string, string> = {
    'event-stardust-garden': 'night-dew',
    'event-whiteflower-path': 'pale-ward',
    'event-silver-lantern': 'shield-break',
  };
  if (shortRoutes[dungeon.id]) return { ...dungeon, gemLoot: { tier4Chance: .06, tier5Chance: 0, featuredDefId: shortRoutes[dungeon.id] } };
  if (dungeon.storyId) return profile(.16, .015, Math.max(0, ['memory-elaine', 'memory-liora', 'memory-noelle', 'memory-lisette', 'memory-seris'].indexOf(dungeon.id)));
  return dungeon;
}
