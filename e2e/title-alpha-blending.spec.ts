import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

for (const backgroundLevel of [0, 128, 255]) {
test(`half-transparent edges blend once over ${backgroundLevel}, preserving opaque black and transparent pixels`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/video/title-character-packed.mp4', route => route.fulfill({ path: resolve('e2e/fixtures/title-premultiplied-alpha.mp4'), contentType: 'video/mp4' }));
  await page.goto('/');
  const samples = await page.evaluate(async backgroundLevel => {
    const root = '/src/';
    const { createBirthRig } = await import(`${root}ui/title-birth-rig.ts`) as typeof import('../src/ui/title-birth-rig');
    const { assetPath } = await import(`${root}content/index.ts`) as typeof import('../src/content');
    const host = document.createElement('div'); document.body.appendChild(host);
    const background = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941"><path fill="rgb(${backgroundLevel},${backgroundLevel},${backgroundLevel})" d="M0 0h1672v941H0z"/></svg>`);
    const rig = await createBirthRig(host, background, assetPath('title-birth-character'), assetPath('title-character-motion'), () => {});
    try {
      const video = host.querySelector('video')!;
      const input = document.createElement('canvas'); input.width = video.videoWidth; input.height = video.videoHeight;
      const decoded = input.getContext('2d')!; decoded.drawImage(video, 0, 0);
      const rendered = new Image(); rendered.src = await rig.snapshot(); await rendered.decode();
      const output = document.createElement('canvas'); output.width = 1672; output.height = 941;
      const pixels = output.getContext('2d')!; pixels.drawImage(rendered, 0, 0);
      return [{ scene: 100, source: 100 }, { scene: 400, source: 700 }, { scene: 620, source: 1150 }].map(({ scene, source }) => {
        const color = [...decoded.getImageData(50, source, 1, 1).data];
        const alpha = decoded.getImageData(770, source, 1, 1).data[0] / 255;
        const adjusted = alpha;
        return { actual: [...pixels.getImageData(800, scene, 1, 1).data], expected: color.slice(0, 3).map(c => Math.min(255, Math.round(c + backgroundLevel * (1 - adjusted)))) };
      });
    } finally { rig.destroy(); host.remove(); }
  }, backgroundLevel);
  for (const sample of samples) {
    for (let channel = 0; channel < 3; channel++) expect(Math.abs(sample.actual[channel] - sample.expected[channel])).toBeLessThanOrEqual(3);
    expect(sample.actual[3]).toBe(255);
  }
});
}
