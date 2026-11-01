import type { Battle, Content, GameSave } from './types';
import type { BattleReview } from './expedition-review';

export const EXPEDITION_HISTORY_LIMIT = 30;
export type ExpeditionOutcome = 'victory' | 'defeat' | 'timeout' | 'retreat';
export interface ExpeditionEarnings {
  gold: number; stones: number; gemCount: number;
  materials: Record<string, number>; dust: Record<string, number>;
}
export interface ExpeditionRecord {
  runId: string; dungeonId: string; appVersion: string; contentVersion: string; rulesVersion: string;
  outcome: ExpeditionOutcome; durationMs: number | null; review?: BattleReview;
  earned: ExpeditionEarnings; potionsUsed: number | null;
}
export interface ExpeditionFilter { dungeonId?: string; contentVersion?: string; rulesVersion?: string }
export interface ExpeditionSummary {
  total: number; victories: number; outcomes: Record<ExpeditionOutcome, number>; successRate: number | null;
  timedCount: number; timedDurationMs: number; earned: ExpeditionEarnings; timedEarned: ExpeditionEarnings;
  potionsUsed: number; unknownPotionCount: number; timedPotionsUsed: number; timedUnknownPotionCount: number;
  rateEligibleCount: number; rateDurationMs: number; rateEarned: ExpeditionEarnings; ratePotionsUsed: number; rateUnknownPotionCount: number;
  perHour: (ExpeditionEarnings & { potionsUsed: number | null }) | null;
}
const emptyEarnings = (): ExpeditionEarnings => ({ gold: 0, stones: 0, gemCount: 0, materials: {}, dust: {} });
function positiveDifference(before: Record<string, number>, after: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(after).flatMap(([id, amount]) => amount > (before[id] ?? 0) ? [[id, amount - (before[id] ?? 0)]] : []));
}
const knownCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Called after a successful claim/return. An older untracked run never acquires invented timing. */
export function finalizeExpedition(previous: GameSave, next: GameSave, battle: Battle, content: Content): void {
  // Existing runs predate complete observation. Do not reconstruct or misclassify them.
  if (!battle.tracking) return;
  const existing = next.expeditionHistory ?? [];
  if (existing.some(record => record.runId === battle.id)) return;
  if (next.battle !== null || !['reward', 'failed'].includes(battle.phase)) throw new Error('終了した探索だけを記録できます。');
  const stage = content.dungeons.find(dungeon => dungeon.id === battle.dungeonId);
  if (!stage) throw new Error('探索の記録先が見つかりません。');
  const outcome: ExpeditionOutcome = battle.phase === 'reward' ? 'victory' : battle.failureKind ?? 'defeat';
  const earned: ExpeditionEarnings = {
    gold: battle.goldEarned + Math.max(0, next.gold - previous.gold),
    stones: Math.max(0, next.stones - previous.stones),
    gemCount: new Set((battle.gemFinds ?? []).map(gem => gem.id)).size,
    materials: positiveDifference(previous.materials, next.materials),
    dust: positiveDifference(previous.memoryGems?.dust ?? {}, next.memoryGems?.dust ?? {}),
  };
  // Trials already forbid loot. Do not silently turn invalid loot into an ordinary farm record.
  if (stage.kind === 'trial' && (earned.gold || earned.stones || earned.gemCount || Object.keys(earned.materials).length || Object.keys(earned.dust).length)) throw new Error('腕試しの記録に戦利品は含められません。');
  const tracking = battle.tracking;
  const record: ExpeditionRecord = {
    runId: battle.id, dungeonId: battle.dungeonId, appVersion: previous.appVersion,
    contentVersion: battle.contentVersion, rulesVersion: battle.rulesVersion, outcome,
    durationMs: knownCount(tracking?.elapsedMs) ? tracking.elapsedMs : null,
    review: structuredClone(tracking.review), earned,
    potionsUsed: knownCount(tracking?.review.potionsUsed) ? tracking.review.potionsUsed : null,
  };
  next.expeditionHistory = [record, ...existing].slice(0, EXPEDITION_HISTORY_LIMIT);
}

function addEarnings(total: ExpeditionEarnings, added: ExpeditionEarnings): void {
  total.gold += added.gold; total.stones += added.stones; total.gemCount += added.gemCount;
  for (const category of ['materials', 'dust'] as const) for (const [id, amount] of Object.entries(added[category])) total[category][id] = (total[category][id] ?? 0) + amount;
}
function rate(earned: ExpeditionEarnings, milliseconds: number): ExpeditionEarnings {
  const factor = 3_600_000 / milliseconds;
  return {
    gold: earned.gold * factor, stones: earned.stones * factor, gemCount: earned.gemCount * factor,
    materials: Object.fromEntries(Object.entries(earned.materials).map(([id, amount]) => [id, amount * factor])),
    dust: Object.fromEntries(Object.entries(earned.dust).map(([id, amount]) => [id, amount * factor])),
  };
}
/** Only timed observations enter both the hourly numerator and denominator. Rates are past results. */
export function summarizeExpeditions(records: readonly ExpeditionRecord[], filter: ExpeditionFilter = {}): ExpeditionSummary {
  const matching = records.filter(record => (filter.dungeonId === undefined || record.dungeonId === filter.dungeonId)
    && (filter.contentVersion === undefined || record.contentVersion === filter.contentVersion)
    && (filter.rulesVersion === undefined || record.rulesVersion === filter.rulesVersion));
  const summary: ExpeditionSummary = {
    total: matching.length, victories: 0, outcomes: { victory: 0, defeat: 0, timeout: 0, retreat: 0 }, successRate: null,
    timedCount: 0, timedDurationMs: 0, earned: emptyEarnings(), timedEarned: emptyEarnings(),
    potionsUsed: 0, unknownPotionCount: 0, timedPotionsUsed: 0, timedUnknownPotionCount: 0, perHour: null,
    rateEligibleCount: 0, rateDurationMs: 0, rateEarned: emptyEarnings(), ratePotionsUsed: 0, rateUnknownPotionCount: 0,
  };
  for (const record of matching) {
    summary.outcomes[record.outcome]++; addEarnings(summary.earned, record.earned);
    if (record.potionsUsed === null) summary.unknownPotionCount++; else summary.potionsUsed += record.potionsUsed;
    if (record.durationMs !== null && knownCount(record.durationMs)) {
      summary.timedCount++; summary.timedDurationMs += record.durationMs; addEarnings(summary.timedEarned, record.earned);
      if (record.potionsUsed === null) summary.timedUnknownPotionCount++; else summary.timedPotionsUsed += record.potionsUsed;
      // Zero is a real finite-resolution observation, but cannot establish an earning speed.
      if (record.durationMs > 0) {
        summary.rateEligibleCount++; summary.rateDurationMs += record.durationMs; addEarnings(summary.rateEarned, record.earned);
        if (record.potionsUsed === null) summary.rateUnknownPotionCount++; else summary.ratePotionsUsed += record.potionsUsed;
      }
    }
  }
  summary.victories = summary.outcomes.victory;
  summary.successRate = summary.total ? summary.victories / summary.total : null;
  if (summary.rateDurationMs > 0) summary.perHour = {
    ...rate(summary.rateEarned, summary.rateDurationMs),
    potionsUsed: summary.rateUnknownPotionCount ? null : summary.ratePotionsUsed * 3_600_000 / summary.rateDurationMs,
  };
  return summary;
}
