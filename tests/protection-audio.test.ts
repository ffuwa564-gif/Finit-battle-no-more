import { describe, expect, it } from 'vitest';
import { renderProtectionSound } from '../src/platform/protection-audio';
import { renderUltimateSound } from '../src/platform/ultimate-audio';

describe('protection reuses the actual ultimate opening', () => {
  it.each([22050, 44100, 48000])('keeps the ultimate waveform and timing at %i Hz', rate => {
    const reference = renderUltimateSound('ultimate', rate);
    for (const kind of ['guard', 'barrier'] as const) for (let take = 0; take < 3; take++) {
      const pcm = renderProtectionSound(kind, rate, take);
      expect(pcm.length).toBe(reference.length);
      let dot = 0, aa = 0, bb = 0;
      for (let i = 0; i < pcm.length; i++) { dot += pcm[i] * reference[i]; aa += pcm[i] ** 2; bb += reference[i] ** 2; }
      expect(dot / Math.sqrt(aa * bb)).toBeGreaterThan(.999999);
      expect(pcm.every(Number.isFinite)).toBe(true);
      expect(Math.sqrt(aa / pcm.length)).toBeGreaterThan(.02);
      expect(Math.abs(pcm[0])).toBe(0); expect(Math.abs(pcm.at(-1)!)).toBe(0);
    }
  });
});
