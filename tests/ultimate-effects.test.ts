import { describe, expect, it } from 'vitest';
import { ultimateFrame } from '../src/platform/ultimate-choreography';
import { ULTIMATE_TIMING, UltimateClock } from '../src/platform/ultimate-timing';

describe('ultimate presentation clock', () => {
  it('travels to the target, holds the impact and preserves time for readable results', () => {
    const impact = ULTIMATE_TIMING.impact;
    expect(ultimateFrame('blade',impact-95).travel).toBe(0);
    expect(ultimateFrame('blade',impact-45).travel).toBeGreaterThan(.5);
    expect(ultimateFrame('blade',impact+50).action).toBe(0);
    expect(ultimateFrame('blade',impact+160).action).toBeCloseTo(.1);
    expect(ultimateFrame('bloom',impact+50).action).toBeCloseTo(.05);
    expect(ULTIMATE_TIMING.end-impact).toBeGreaterThan(1500);
  });
  it('rounds fractional timer delays up so effects cannot miss their start gate', () => {
    const clock = new UltimateClock(); clock.sync('one', 1, 1000);
    const delay = clock.delay(ULTIMATE_TIMING.effect, 1000.25);
    expect(delay).toBe(900);
    expect(clock.position(1000.25 + delay)).toBeGreaterThanOrEqual(ULTIMATE_TIMING.effect);
  });
  it('keeps the impact shared by sound, particles and numbers when speed changes', () => {
    const clock = new UltimateClock();
    clock.sync('one', 1, 1000);
    clock.sync('one', 2, 1400);
    expect(clock.position(1400)).toBe(400);
    expect(clock.delay(ULTIMATE_TIMING.effect, 1400)).toBe(400);
    expect(clock.delay(ULTIMATE_TIMING.impact, 1400)).toBe(840);
    expect(clock.delay(ULTIMATE_TIMING.end, 1400)).toBe(2240);
    clock.sync('one', 1, 2400);
    expect(clock.position(2400)).toBe(1650);
    expect(clock.delay(ULTIMATE_TIMING.impact, 2400)).toBe(0);
    clock.sync('two', 2, 5000);
    expect(clock.position(5000)).toBe(0);
    expect(clock.delay(ULTIMATE_TIMING.end, 5000)).toBe(2560);
  });
});
