import { describe, expect, it } from 'vitest';
import { renderProtectionSound } from '../src/platform/protection-audio';
import { renderUltimateSound } from '../src/platform/ultimate-audio';

const rms = (pcm: Float32Array) => Math.sqrt(pcm.reduce((sum, x) => sum + x * x, 0) / pcm.length);
describe('warm synth protection buff', () => {
  it.each([22050, 44100, 48000])('blooms into an audible low-mid voice with silent ends at %i Hz', rate => {
    const clips = ['guard', 'barrier'].flatMap(kind => [0, 1, 2].map(take => renderProtectionSound(kind as 'guard' | 'barrier', rate, take)));
    clips.push(renderUltimateSound('ultimate-guard', rate));
    for (const pcm of clips) {
      expect(pcm.every(Number.isFinite)).toBe(true);
      expect(rms(pcm)).toBeGreaterThan(.12);
      expect(rms(pcm.slice(0, Math.round(rate * .02)))).toBeLessThan(rms(pcm.slice(Math.round(rate * .08), Math.round(rate * .18))) * .2);
      expect(Math.abs(pcm[0])).toBe(0); expect(Math.abs(pcm.at(-1)!)).toBe(0);
      let smooth = 0, high = 0, total = 0;
      const pole = 1 - Math.exp(-2 * Math.PI * 1500 / rate);
      for (const x of pcm) { smooth += pole * (x - smooth); high += (x - smooth) ** 2; total += x * x; }
      expect(high / total).toBeLessThan(.04);
    }
  });
});
