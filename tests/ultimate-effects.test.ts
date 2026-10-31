import { describe, expect, it } from 'vitest';
import { ultimateFrame, ultimateVisualFor, rabbitBitFrame, rabbitShotTimes, RABBIT_VOLLEY } from '../src/platform/ultimate-choreography';
import { content } from '../src/content';
import { ultimateSoundFor } from '../src/platform/ultimate-audio';
import { ULTIMATE_TIMING, UltimateClock } from '../src/platform/ultimate-timing';

describe('ultimate presentation clock', () => {
  it('gives both Lunette forms their own rabbit summon and volley without replacing other characters', () => {
    for (const id of ['lunette', 'lunette-awakened']) expect(ultimateVisualFor(content.characters.find(c => c.id === id)!)).toBe('rabbit-bits');
    expect(ultimateVisualFor(content.characters.find(c => c.id === 'noelle')!)).toBe('stars');
    expect(ultimateVisualFor(content.characters.find(c => c.id === 'nox')!)).toBe('clockwork');
    expect(ultimateSoundFor('rabbit-bits')).toBe('ultimate-rabbits');
    const impact = ULTIMATE_TIMING.impact;
    for (let i = 0; i < 4; i++) {
      expect(rabbitBitFrame(i, impact - 1).summon).toBe(1);
      expect(rabbitBitFrame(i, impact - 1).beam).toBe(0);
      expect(rabbitBitFrame(i, impact + 140).beam).toBeGreaterThan(0);
      expect(rabbitBitFrame(i, ULTIMATE_TIMING.end).alpha).toBe(0);
    }
    expect(rabbitBitFrame(0, impact).beam).toBe(1);
    expect(rabbitBitFrame(1, impact).beam).toBe(0);
  });
  it('fires sixteen separate shots, rests, finishes together and remains visible through the final echo', () => {
    const shots=[0,1,2,3].flatMap(rabbitShotTimes).sort((a,b)=>a-b);
    expect(new Set(shots).size).toBe(16);
    expect(shots.at(-1)).toBeLessThan(RABBIT_VOLLEY.finale-.25);
    for(let bit=0;bit<4;bit++){
      for(const at of rabbitShotTimes(bit))expect(rabbitBitFrame(bit,ULTIMATE_TIMING.impact+at*1000).beam).toBeCloseTo(1);
      expect(rabbitBitFrame(bit,ULTIMATE_TIMING.impact+950).finishCharge).toBeGreaterThan(.5);
      const last=rabbitBitFrame(bit,ULTIMATE_TIMING.impact+RABBIT_VOLLEY.finale*1000);
      expect(last.final).toBe(true);expect(last.beam).toBe(1);expect(last.alpha).toBe(1);
    }
  });
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
