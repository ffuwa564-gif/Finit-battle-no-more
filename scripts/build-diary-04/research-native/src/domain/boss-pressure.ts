import type { DungeonDef, Unit } from './types';

export type BossStrike = NonNullable<DungeonDef['bossStrike']>;
/** Public encounter state only: the same information is available before committing a command. */
export function bossWindupStatus(boss: Unit, strike: BossStrike, round: number): {
  phase: 'waiting' | 'charging' | 'broken' | 'striking' | 'open'; remaining: number; threshold: number; damage: number;
} {
  const threshold = strike.windup ? Math.max(1, Math.ceil(boss.maxHp * strike.windup.breakPercent / 100)) : 0;
  const charging = (round + 1) % strike.every === 0;
  const striking = round % strike.every === 0;
  const damage = boss.bossWindup?.round === (striking ? round - 1 : round) ? boss.bossWindup.damage : 0;
  const broken = threshold > 0 && damage >= threshold;
  const phase = !strike.windup ? striking ? 'striking' : 'waiting'
    : (boss.bossRecoveryUntil ?? -1) >= round ? 'open'
    : charging || striking ? broken ? 'broken' : charging ? 'charging' : 'striking' : 'waiting';
  return { phase, remaining: Math.max(0, threshold - damage), threshold, damage };
}

/** Only HP damage to the actual boss counts. Shields and redirected hits cannot break her charge. */
export function recordBossWindupDamage(boss: Unit, strike: BossStrike | undefined, round: number, amount: number): void {
  if (!boss.boss || !strike?.windup || (round + 1) % strike.every !== 0 || amount <= 0) return;
  const previous = boss.bossWindup?.round === round ? boss.bossWindup.damage : 0;
  boss.bossWindup = { round, damage: previous + amount };
}
