/** Shared passive skill. Round one is unmodified; each new wave restarts at one. */
export const accelerationPerRound = 5;
export function accelerationPercent(round: number): number {
  return Math.max(0, round - 1) * accelerationPerRound;
}
