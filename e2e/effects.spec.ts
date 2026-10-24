import { test, expect } from '@playwright/test';

// Exercise the actual GLSL programs in CI, including machines without a physical GPU.
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

test('GLSL renders all cues, leaves progression unchanged, and survives context loss', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('[data-fx-mode="menu"]')).toHaveAttribute('data-fx-backend', 'webgl');
  const pixels = await page.evaluate(async () => {
    const { createSceneRenderer } = await import('/src/platform/fx-renderer.ts');
    const canvas = document.createElement('canvas');
    const renderer = createSceneRenderer(canvas, 'battle');
    if (!renderer) throw new Error('GLSL initialization failed');
    renderer.resize(240, 240, 1);
    renderer.render(0);
    const kinds = ['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'drop', 'wave', 'defeat'] as const;
    const gl = canvas.getContext('webgl')!;
    const result = [];
    for (const [index, kind] of kinds.entries()) {
      const start = index * 2500;
      renderer.render(start);
      renderer.cue({ kind, x: .5, y: .5, rarity: 'epic' });
      renderer.render(start + 350);
      const data = new Uint8Array(240 * 240 * 4);
      gl.readPixels(0, 0, 240, 240, gl.RGBA, gl.UNSIGNED_BYTE, data);
      result.push({ kind, error: gl.getError(), visible: data.some((value, i) => i % 4 === 3 && value > 8) });
    }
    renderer.render(3_600_000);
    renderer.cue({ kind: 'heal', x: .5, y: .5 });
    renderer.render(3_600_350);
    result.push({ kind: 'after-hour', error: gl.getError(), visible: true });
    renderer.dispose();
    renderer.dispose();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return result;
  });
  expect(pixels.every(result => result.error === 0 && result.visible)).toBe(true);

  await page.goto('/#dungeons');
  await page.getByRole('button', { name: '探索の準備' }).first().click();
  await page.getByRole('button', { name: '探索を始める' }).click();
  await expect(page.locator('[data-fx-mode="battle"]')).toHaveAttribute('data-fx-backend', 'webgl');
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeEnabled();
  const sameSave = await page.evaluate(async () => {
    const readSave = () => new Promise<string>((resolve, reject) => {
      const request = indexedDB.open('stillveil-save', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('state');
        const saved = transaction.objectStore('state').get('save');
        saved.onsuccess = () => resolve(JSON.stringify(saved.result));
        transaction.oncomplete = () => db.close();
      };
    });
    const before = await readSave();
    const rect = document.querySelector('.battle-scene')!.getBoundingClientRect();
    for (let i = 0; i < 30; i++) window.dispatchEvent(new CustomEvent('game:fx', { detail: { kind: 'drop', rarity: 'epic', x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } }));
    return before === await readSave();
  });
  expect(sameSave).toBe(true);
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-fx-mode="battle"] canvas') as HTMLCanvasElement;
    canvas.getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.locator('[data-fx-mode="battle"]')).toHaveAttribute('data-fx-backend', 'static');
  await page.getByRole('button', { name: '次の敵を表示', exact: true }).click();
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.getByRole('button', { name: '次の演出へ', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('motion preference switches to a static layer and back', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const effects = page.locator('[data-fx-mode="menu"]');
  await expect(effects).toHaveAttribute('data-fx-backend', 'static');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(effects).toHaveAttribute('data-fx-backend', 'webgl');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(effects).toHaveAttribute('data-fx-backend', 'static');
  await page.locator('.home-hub-menu').getByRole('button', { name: 'パーティ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'パーティ', exact: true })).toBeVisible();
});

test('WebGL unavailable retains the artwork and usable menu', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind: string, ...args: unknown[]) {
      if (kind === 'webgl' || kind === 'webgl2') return null;
      return original.call(this, kind, ...args);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('[data-fx-mode="menu"]')).toHaveAttribute('data-fx-backend', 'static');
  await expect(page.locator('.animated-illustration > img')).toBeVisible();
  await page.locator('.home-hub-menu').getByRole('button', { name: 'パーティ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'パーティ', exact: true })).toBeVisible();
});
