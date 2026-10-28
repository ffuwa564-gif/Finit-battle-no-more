import { describe, expect, it } from 'vitest';
import { renderProtectionSound } from '../src/platform/protection-audio';
import { renderCombatSound } from '../src/platform/combat-audio';
import { renderUltimateSound } from '../src/platform/ultimate-audio';

describe('unpitched protection effects', () => {
  it('avoids sustained pitched resonances in every shield and ward take, including the defensive ultimate', () => {
    const rate = 44100;
    const clips = ['guard', 'barrier'].flatMap(family => [0, 1, 2].map(take => renderCombatSound(family as 'guard' | 'barrier', rate, take)));
    clips.push(renderUltimateSound('ultimate-guard', rate));
    for (const clip of clips) {
      const samples = clip.slice(0, Math.round(rate * .4)), energy = samples.reduce((sum, x) => sum + x * x, 0);
      for (const frequency of [205, 220, 260, 265, 330, 350, 390, 437, 440, 675, 682, 740]) {
        let real = 0, imaginary = 0;
        for (let i = 0; i < samples.length; i++) { const phase = 2 * Math.PI * frequency * i / rate; real += samples[i] * Math.cos(phase); imaginary += samples[i] * Math.sin(phase); }
        expect(2 * (real * real + imaginary * imaginary) / (samples.length * energy)).toBeLessThan(.025);
      }
    }
  });
  it.each([22050, 44100, 48000])('retains audible, finite, silent-ended air textures at %i Hz', rate => {
    for (const kind of ['guard', 'barrier'] as const) for (let take = 0; take < 3; take++) {
      const pcm = renderProtectionSound(kind, rate, take);
      expect(pcm.every(Number.isFinite)).toBe(true);
      expect(Math.sqrt(pcm.reduce((sum, x) => sum + x * x, 0) / pcm.length)).toBeGreaterThan(.02);
      expect(Math.abs(pcm[0])).toBe(0); expect(Math.abs(pcm.at(-1)!)).toBe(0);
      expect(pcm).not.toEqual(renderProtectionSound(kind, rate, take + 1));
    }
  });
});
