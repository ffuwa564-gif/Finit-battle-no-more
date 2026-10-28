import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('protection skills and defensive ultimate play the bundled Runway recording', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__protection = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer && !this.loop && this.buffer.duration > 1.3 && this.buffer.duration < 1.5) {
        (window as any).__protection.push(Array.from(this.buffer.getChannelData(0).slice(2000, 2100)));
      }
      return start.apply(this, args);
    };
  });
  let requests = 0;
  page.on('request', request => { if (request.url().includes('/audio/sfx/protection-runway.mp3')) requests++; });
  await page.goto('/#settings'); await enterGame(page);
  const expected = await page.evaluate(async () => {
    const audio = await import('/src/platform/audio.ts'); await audio.enableAudio(); audio.setAudioVolume(1);
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(await (await fetch('/audio/sfx/protection-runway.mp3')).arrayBuffer());
    const samples = Array.from(decoded.getChannelData(0).slice(2000, 2100)); await context.close();
    for (const skill of ['guard', 'barrier', 'barrier_mend'] as const) audio.playSound('guard', undefined, skill);
    audio.playSound('ultimate-guard');
    return samples;
  });
  expect(requests).toBe(2); // One unlock fetch plus the independent comparison decode.
  expect(await page.evaluate(() => (window as any).__protection)).toEqual([expected, expected, expected, expected]);
});
