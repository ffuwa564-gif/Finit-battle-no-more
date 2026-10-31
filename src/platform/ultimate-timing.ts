// One normalized timeline for particles, impact sound, HP numbers and replay advance.
export const ULTIMATE_TIMING = { effect: 900, impact: 1450, tail: 2300, end: 3200 } as const;
/** Authored scene beats; visuals and audio must derive from these, never arbitrary cue lists. */
export const RABBIT_SEQUENCE = {
  summon: 1200, summonStep: 360, summonDuration: 540,
  aim: 3200, fire: 4200, charge: 6000, finish: 6800, tail: 7800, end: 8400,
} as const;
export const RABBIT_TIMING = { effect: RABBIT_SEQUENCE.summon, impact: RABBIT_SEQUENCE.fire,
  damage: RABBIT_SEQUENCE.finish, tail: RABBIT_SEQUENCE.tail, end: RABBIT_SEQUENCE.end } as const;
export const rabbitStage = (elapsed: number) => elapsed < RABBIT_SEQUENCE.summon ? 'command'
  : elapsed < RABBIT_SEQUENCE.aim ? 'summon' : elapsed < RABBIT_SEQUENCE.fire ? 'aim'
  : elapsed < RABBIT_SEQUENCE.charge ? 'volley' : elapsed < RABBIT_SEQUENCE.finish ? 'charge'
  : elapsed < RABBIT_SEQUENCE.tail ? 'finish' : 'reveal';
export const ultimateTimingFor = (visual?: string) => visual === 'rabbit-bits'
  ? RABBIT_TIMING : { ...ULTIMATE_TIMING, damage: ULTIMATE_TIMING.impact };
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
