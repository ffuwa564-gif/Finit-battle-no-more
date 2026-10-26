// One normalized timeline for particles, impact sound, HP numbers and replay advance.
export const ULTIMATE_TIMING = { effect: 900, impact: 1450, tail: 2300, end: 3200 } as const;
export const ultimatePlaybackRate = (speed: 1 | 2) => speed === 2 ? 1.25 : 1;

/** Presentation only. Speed changes preserve progress and never restart an effect. */
export class UltimateClock {
  private id: string | undefined;
  private elapsed = 0;
  private updatedAt = 0;
  rate = 1;
  sync(id: string, speed: 1 | 2, now: number): void {
    this.elapsed = this.id === id ? this.position(now) : 0;
    this.id = id; this.updatedAt = now; this.rate = ultimatePlaybackRate(speed);
  }
  position(now: number): number { return this.elapsed + Math.max(0, now - this.updatedAt) * this.rate; }
  delay(target: number, now: number): number { return Math.max(0, Math.ceil((target - this.position(now)) / this.rate)); }
}
