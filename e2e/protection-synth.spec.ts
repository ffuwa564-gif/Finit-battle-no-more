import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('all protection routes play the ultimate opening sound without loading the old recording', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__protection = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer && !this.loop) (window as any).__protection.push({ rate: this.context.sampleRate, duration: this.buffer.duration, samples: Array.from(this.buffer.getChannelData(0).slice(2000, 2100)) });
      return start.apply(this, args);
    };
  });
  let requests = 0;
  page.on('request', request => { if (request.url().includes('protection-runway.mp3')) requests++; });
  await page.goto('/#settings'); await enterGame(page);
  const expected = await page.evaluate(async () => {
    const audio = await import('/src/platform/audio.ts'); await audio.enableAudio(); audio.setAudioVolume(1);
    const { renderCombatSound } = await import('/src/platform/combat-audio.ts');
    const { renderUltimateSound } = await import('/src/platform/ultimate-audio.ts');
    (window as any).__protection = [];
    for (const skill of ['guard', 'barrier', 'barrier_mend'] as const) audio.playSound('guard', undefined, skill);
    audio.playSound('ultimate-guard');
    const rate = (window as any).__protection[0].rate;
    return [renderCombatSound('guard', rate, 0), renderCombatSound('barrier', rate, 0), renderCombatSound('barrier', rate, 1), renderUltimateSound('ultimate-guard', rate)].map(pcm => Array.from(pcm.slice(2000, 2100)));
  });
  expect(requests).toBe(0);
  const voices = await page.evaluate(() => (window as any).__protection);
  expect(voices).toHaveLength(4);
  for (let i = 0; i < voices.length; i++) expect(voices[i].duration).toBeCloseTo([.68, .68, .68, 1.5][i], 4);
  expect(voices.map((voice: any) => voice.samples)).toEqual(expected);
});
