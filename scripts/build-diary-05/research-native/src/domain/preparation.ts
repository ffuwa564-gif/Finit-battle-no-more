import { dungeonLock } from './events';
import { homeJourneyTarget } from './home-journey';
import { GEM_CRAFT_COST, GEM_DEFINITIONS, dungeonGemFamily } from './memory-gems';
import type { Battle, Content, GameSave } from './types';

export const PREPARATION_GOALS = ['wick-stone', 'white-flower-seed'] as const;
export type PreparationGoal = typeof PREPARATION_GOALS[number];

/** A small, achievable recipe, using the same inventory and locks as the game. */
export function preparationPlan(content: Content, save: GameSave, goal: PreparationGoal) {
  const definition = GEM_DEFINITIONS.find(def => def.id === goal)!;
  const inventory = save.memoryGems;
  const owned = inventory?.items.find(gem => gem.defId === goal);
  const equippedIds = new Set(save.partyIds.map(id => inventory?.equipped[id]).filter(Boolean));
  const equipped = inventory?.items.find(gem => gem.defId === goal && equippedIds.has(gem.id));
  const dust = inventory?.dust[definition.family] ?? 0;
  const candidates = content.dungeons.filter(dungeon => dungeon.published && !dungeon.towerFloor && !dungeon.eventId
    && (dungeon.kind ?? 'normal') === 'normal' && dungeonGemFamily(dungeon) === definition.family
    && !dungeonLock(dungeon, save, content));
  // Prefer a known route to an untested stage; never recommend a locked floor.
  const farm = candidates.find(dungeon => save.completedDungeonIds.includes(dungeon.id)) ?? candidates[0];
  const journey = homeJourneyTarget(content, save);
  return { definition, owned: equipped ?? owned, equipped: Boolean(equipped), dust, cost: GEM_CRAFT_COST,
    remaining: Math.max(0, GEM_CRAFT_COST - dust), farm, unlockRoute: journey?.kind === 'campaign' ? journey.dungeon : undefined,
    step: equipped ? 'try' as const : owned ? 'equip' as const : dust >= GEM_CRAFT_COST ? 'craft' as const : 'farm' as const,
    equippedPartyCount: save.partyIds.filter(id => inventory?.items.some(gem => gem.id === inventory.equipped[id])).length };
}

/** Observations suggest experiments, never a diagnosed cause or promised victory. */
export function expeditionExperiments(battle: Battle): string[] {
  const review = battle.tracking?.review;
  if (!review) return ['敵の編成を確認し、石と倒す順を一つずつ試しましょう。'];
  const tips: string[] = [];
  if (battle.failureKind === 'timeout') tips.push('期限に到達しました。集中する敵と、攻撃に使える手数を見直しましょう。');
  if (review.actionsLost > 0) tips.push('行動不能が記録されています。異常解除の石を使うタイミングを試しましょう。');
  if (review.potionsUsed === 0 && battle.potionsRemaining > 0) tips.push('持ち込んだ回復薬は未使用でした。倒れる前のラウンドで使う余地を確認しましょう。');
  if (review.largestHit) tips.push('最大被害を受けた仲間を確認し、障壁や防御を先に使う手順を試しましょう。');
  tips.push('一度に変える要素を絞り、次の記録と比べましょう。');
  return tips.slice(0, 3);
}
