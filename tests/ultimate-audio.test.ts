import { describe, expect, it } from 'vitest';
import { renderUltimateSound } from '../src/platform/ultimate-audio';

describe('procedural electrical ultimate sound', () => {
  it.each([22050, 44100, 48000])('renders finite click-free, bounded effects at %i Hz', sampleRate => {
    const sounds = ['ultimate','ultimate-strike','ultimate-magic','ultimate-sanctuary'] as const;
    for (const kind of sounds) {
      const pcm = renderUltimateSound(kind, sampleRate);
      let peak = 0, energy = 0, finite = true;
      for (const value of pcm) { finite &&= Number.isFinite(value); peak = Math.max(peak, Math.abs(value)); energy += value * value; }
      expect(finite).toBe(true);
      expect(peak).toBeLessThanOrEqual(.881);
      expect(Math.sqrt(energy / pcm.length)).toBeGreaterThan(.025);
      expect(Math.abs(pcm[0])).toBe(0); expect(Math.abs(pcm[pcm.length-1])).toBe(0);
      expect(pcm.length / sampleRate).toBeLessThanOrEqual(2.101);
    }
  });
  it('keeps a strong high-frequency crack and a fading thunder tail instead of a bell melody', () => {
    const rate = 44100, pcm = renderUltimateSound('ultimate-strike',rate);
    const rms = (start: number, end: number, difference=false) => {
      let energy = 0, n = 0;
      for (let i = Math.max(1,Math.floor(start*rate)); i < end*rate; i++, n++) energy += (difference ? pcm[i]-pcm[i-1] : pcm[i]) ** 2;
      return Math.sqrt(energy/n);
    };
    expect(rms(.001,.05,true)).toBeGreaterThan(.1);
    expect(rms(.001,.05)).toBeGreaterThan(rms(1.5,1.8)*6);
    expect(rms(.5,.8)).toBeGreaterThan(.01);
    expect(renderUltimateSound('ultimate-magic',rate)).not.toEqual(pcm);
    expect(renderUltimateSound('ultimate-sanctuary',rate)).not.toEqual(pcm);
  });
});
