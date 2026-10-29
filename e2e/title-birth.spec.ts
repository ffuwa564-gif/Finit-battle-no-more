import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
const digest = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

test('the 2D birth sky animates silently without video and the artwork can start the game', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const title = page.locator('.title-screen');
  const canvas = title.locator('canvas');
  await expect(title.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'playing');
  await expect(canvas).toBeVisible();
  await expect(title.locator('video')).toHaveCount(0);
  await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
  await page.mouse.click(270, 250);
  await expect(title).toHaveCount(0);
  await expect(page.locator('.visual-novel')).toBeVisible();
});

test('language and animation controls do not start the game or music', async ({ page }) => {
  await page.goto('/');
  const title = page.locator('.title-screen');
  const canvas = title.locator('canvas');
  await expect(title.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'playing');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(title).toBeVisible();
  await expect(title.locator('.title-screen__invitation')).toContainText('I could not die.');
  await page.addStyleTag({ content: '.title-screen *, .title-screen *::before, .title-screen *::after { animation: none !important; transition: none !important; }' });
  await page.getByRole('button', { name: 'Pause Background Animation', exact: true }).click();
  await expect(title.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'paused');
  await page.waitForTimeout(100);
  const frozen = digest(await canvas.screenshot());
  await page.waitForTimeout(350);
  expect(digest(await canvas.screenshot())).toBe(frozen);
  await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play Background Animation', exact: true }).click();
  await expect(title.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'playing');
  await page.waitForTimeout(400);
  expect(digest(await canvas.screenshot())).not.toBe(frozen);
  await expect(title).toBeVisible();
  await page.getByRole('button', { name: 'Tap to Begin', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(title).toHaveCount(0);
});

for (const preference of ['reduced-motion', 'save-data'] as const) {
  test(`${preference} uses the birth poster without downloading the rig or parts`, async ({ page }) => {
    if (preference === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    else await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }));
    const media: string[] = [];
    page.on('request', request => { if (/title-birth-rig|title-birth-background|title-birth-character|\.mp4/.test(request.url())) media.push(request.url()); });
    await page.goto('/');
    await expect(page.locator('.title-screen .title-birth-scene')).toHaveAttribute('data-animation-state', 'static');
    await expect.poll(() => page.locator('.title-birth-scene__poster').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1672);
    await expect(page.locator('.title-screen canvas')).toHaveCount(0);
    await expect(page.locator('.title-screen video')).toHaveCount(0);
    expect(media).toEqual([]);
    await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
    await expect(page.locator('.title-screen')).toHaveCount(0);
  });
}

test('failed character loading keeps the poster and start action available', async ({ page }) => {
  await page.route('**/art/title-birth-character.webp', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.title-screen .title-birth-scene')).toHaveAttribute('data-animation-state', 'error');
  await expect.poll(() => page.locator('.title-birth-scene__poster').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1672);
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.visual-novel')).toBeVisible();
});

test('starting while a part is still loading does not wait for the renderer', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/art/title-birth-character.webp', async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
  const requested = page.waitForRequest('**/art/title-birth-character.webp');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await requested;
  await expect(page.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'loading');
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.visual-novel')).toBeVisible({ timeout: 2000 });
  await page.waitForTimeout(1400);
  await expect(page.locator('.title-birth-scene')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('an unavailable WebGL renderer falls back to the still image', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind: any, options: any) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
      return original.call(this, kind, options);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'error');
  await expect(page.locator('.title-birth-scene__poster')).toBeVisible();
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.visual-novel')).toBeVisible();
});

test('the wordmark and invitation fit portrait, landscape and desktop screens', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'STILLVEIL', exact: true })).toBeVisible();
    const brand = await page.locator('.title-screen__brand').boundingBox();
    const entry = await page.locator('.title-screen__entry').boundingBox();
    expect(brand!.y).toBeGreaterThanOrEqual(0);
    expect(brand!.y + brand!.height).toBeLessThan(entry!.y);
    expect(entry!.y + entry!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1)).toBe(false);
    await page.screenshot({ path: `artifacts/title-birth/title-${viewport.width}x${viewport.height}.png` });
  }
});
