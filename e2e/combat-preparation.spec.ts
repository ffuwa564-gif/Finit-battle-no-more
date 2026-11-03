import { test, expect } from '@playwright/test';

test('worker and fallback preserve every authored PCM sample at the output rate', async ({ page }) => {
  await page.route('**/perf-fixture.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await page.goto('/perf-fixture.html');
  const result = await page.evaluate(async () => {
    const { prepareCombatPcm } = await import('/src/platform/combat-pcm.ts');
    const { combatPcmKeys, renderCombatPcm } = await import('/src/platform/combat-pcm-scores.ts');
    const failures: string[] = [];
    for (const rate of [44100, 48000]) {
      const scores = await prepareCombatPcm(rate);
      for (const key of combatPcmKeys) {
        const actual = scores.get(key)!, reference = renderCombatPcm(key, rate);
        if (actual.length !== reference.length || actual.some((x, i) => x !== reference[i])) failures.push(`${rate}:${key}`);
      }
    }
    const OriginalWorker = window.Worker;
    try {
      window.Worker = class { constructor() { throw new Error('Blocked by embed'); } } as unknown as typeof Worker;
      const fallback = await prepareCombatPcm(48000);
      for (const key of combatPcmKeys) {
        const actual = fallback.get(key)!, reference = renderCombatPcm(key, 48000);
        if (actual.length !== reference.length || actual.some((x, i) => x !== reference[i])) failures.push(`fallback:${key}`);
      }
    } finally { window.Worker = OriginalWorker; }
    return failures;
  });
  expect(result).toEqual([]);
});

test('cut-ins reuse one detached renderer and replace a lost context', async ({ page }) => {
  await page.route('**/perf-fixture.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await page.goto('/perf-fixture.html');
  const result = await page.evaluate(async () => {
    const { createUltimateEffect } = await import('/src/ui/ultimate-pixi.ts');
    const host = document.createElement('div'); host.style.cssText = 'width:390px;height:420px'; document.body.append(host);
    const first = await createUltimateEffect(host, 'blade', () => 1600, () => {});
    const canvas = host.querySelector('canvas')!;
    const size = [canvas.width, canvas.height]; first();
    const removed = !canvas.isConnected;
    const second = await createUltimateEffect(host, 'stars', () => 1600, () => {});
    const reused = host.querySelector('canvas') === canvas;
    second();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    const third = await createUltimateEffect(host, 'blade', () => 1600, () => {});
    const replaced = host.querySelector('canvas') !== canvas;
    third(); host.remove();
    return { removed, reused, replaced, size, remaining: document.querySelectorAll('.ultimate-pixi-canvas').length };
  });
  expect(result).toMatchObject({ removed: true, reused: true, replaced: true, remaining: 0 });
  expect(result.size).toEqual([390, 420]);
});
