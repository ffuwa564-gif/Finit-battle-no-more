import type { Battle, Unit } from './types';

export interface BattleReview {
  rounds: number;
  partyDamageTaken: number;
  enemyDamageTaken: number;
  partyHealing: number;
  partyBarrierAbsorbed: number;
  partyHpSpent: number;
  actionsLost: number;
  potionsUsed: number;
  largestHit?: { actorCharacterId?: string; targetCharacterId: string; skillId?: string; amount: number; wave: number; round: number };
}
export interface ExpeditionTracking { startedAt?: number; elapsedMs?: number | null; review: BattleReview }
const validTime = (value: number | undefined): value is number => value !== undefined && Number.isSafeInteger(value) && value >= 0;
const positive = (value: number | undefined): number => Number.isFinite(value) ? Math.max(0, value!) : 0;
export function createExpeditionTracking(now?: number): ExpeditionTracking {
  return { ...(validTime(now) ? { startedAt: now } : {}), review: { rounds: 0, partyDamageTaken: 0, enemyDamageTaken: 0, partyHealing: 0, partyBarrierAbsorbed: 0, partyHpSpent: 0, actionsLost: 0, potionsUsed: 0 } };
}

/** Exactly once per generated command batch; replay never calls this helper.
 * Each event reports observed net HP changes, not unmitigated attack power.
 */
export function trackEventBatch(tracking: ExpeditionTracking, battle: Battle, context: { round: number; wave: number } = battle): void {
  let before = battle.initialUnits;
  for (const event of battle.events) {
    const actor = before.find(unit => unit.uid === event.actorId) ?? battle.units.find(unit => unit.uid === event.actorId);
    if (event.statusAction === 'skip' && actor?.side === 'party') tracking.review.actionsLost++;
    const after = event.unitsAfter;
    if (!after) continue;
    const spent = positive(event.selfCost);
    for (const unit of after) {
      const old = before.find(candidate => candidate.uid === unit.uid);
      if (!old) continue; // New wave/unit creation is not healing or damage.
      const delta = unit.hp - old.hp;
      const selfCost = unit.uid === actor?.uid ? Math.min(Math.max(0, -delta), spent) : 0;
      if (unit.side === 'party') {
        tracking.review.partyDamageTaken += Math.max(0, -delta - selfCost);
        tracking.review.partyHealing += Math.max(0, delta);
        tracking.review.partyHpSpent += selfCost;
        const hit = Math.max(0, -delta - selfCost);
        if (actor?.side === 'enemy' && hit > (tracking.review.largestHit?.amount ?? 0)) tracking.review.largestHit = { actorCharacterId: actor.characterId, targetCharacterId: unit.characterId, ...(event.skillId ? { skillId: event.skillId } : {}), amount: hit, wave: context.wave, round: context.round };
      } else tracking.review.enemyDamageTaken += Math.max(0, -delta - selfCost);
    }
    if (event.targetIds?.some(id => after.some(unit => unit.uid === id && unit.side === 'party'))) tracking.review.partyBarrierAbsorbed += positive(event.absorbed);
    before = after;
  }
}

/** Potions have a separate command path and do not re-use an old replay batch. */
export function trackPotion(tracking: ExpeditionTracking, beforeUnits: Unit[], afterUnits: Unit[]): void {
  tracking.review.potionsUsed++;
  for (const unit of afterUnits.filter(unit => unit.side === 'party')) {
    const old = beforeUnits.find(candidate => candidate.uid === unit.uid);
    if (old) tracking.review.partyHealing += Math.max(0, unit.hp - old.hp);
  }
}

/** A result fixes wall-clock elapsed time once, including an explicitly unknown result. */
export function finishTracking(tracking: ExpeditionTracking, now?: number): void {
  if (tracking.elapsedMs !== undefined) return;
  tracking.elapsedMs = validTime(tracking.startedAt) && validTime(now) && now >= tracking.startedAt ? now - tracking.startedAt : null;
}

const counterKeys = ['rounds', 'partyDamageTaken', 'enemyDamageTaken', 'partyHealing', 'partyBarrierAbsorbed', 'partyHpSpent', 'actionsLost', 'potionsUsed'] as const;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256;
export function validBattleReview(value: unknown): value is BattleReview {
  if (!object(value) || Object.keys(value).some(key => ![...counterKeys, 'largestHit'].includes(key)) || !counterKeys.every(key => count(value[key]))) return false;
  if (value.largestHit === undefined) return true;
  const hit = value.largestHit;
  return object(hit) && !Object.keys(hit).some(key => !['actorCharacterId', 'targetCharacterId', 'skillId', 'amount', 'wave', 'round'].includes(key))
    && identifier(hit.targetCharacterId) && (hit.actorCharacterId === undefined || identifier(hit.actorCharacterId)) && (hit.skillId === undefined || identifier(hit.skillId))
    && count(hit.amount) && hit.amount > 0 && count(hit.wave) && count(hit.round) && hit.round >= 1;
}
export function validExpeditionTracking(value: unknown): value is ExpeditionTracking {
  return object(value) && !Object.keys(value).some(key => !['startedAt', 'elapsedMs', 'review'].includes(key)) && validBattleReview(value.review)
    && (value.startedAt === undefined || count(value.startedAt)) && (value.elapsedMs === undefined || value.elapsedMs === null || count(value.elapsedMs));
}
