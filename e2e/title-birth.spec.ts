import { test, expect } from '@playwright/test';

test('the birth sky plays silently and the artwork can start the game', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const title = page.locator('.title-screen');
  const video = title.locator('video');
  await expect(title.locator('.animated-illustration')).toHaveAttribute('data-animation-state', 'playing');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.15);
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.playsInline && v.loop)).toBe(true);
  await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
  await page.mouse.click(270, 250);
  await expect(title).toHaveCount(0);
  await expect(page.locator('.visual-novel')).toBeVisible();
});

test('language and animation controls do not start the game or music', async ({ page }) => {
  await page.goto('/');
  const title = page.locator('.title-screen');
  const video = title.locator('video');
  await expect(title.locator('.animated-illustration')).toHaveAttribute('data-animation-state', 'playing');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(title).toBeVisible();
  await expect(title.locator('.title-screen__invitation')).toContainText('I could not die.');
  await page.getByRole('button', { name: 'Pause Background Animation', exact: true }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play Background Animation', exact: true }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await expect(title).toBeVisible();
  await page.getByRole('button', { name: 'Tap to Begin', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(title).toHaveCount(0);
});

for (const preference of ['reduced-motion', 'save-data'] as const) {
  test(`${preference} uses the birth poster without downloading the video`, async ({ page }) => {
    if (preference === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    else await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }));
    const media: string[] = [];
    page.on('request', request => { if (request.url().includes('title-birth-loop.mp4')) media.push(request.url()); });
    await page.goto('/');
    await expect(page.locator('.title-screen .animated-illustration')).toHaveAttribute('data-animation-state', 'static');
    await expect.poll(() => page.locator('.title-screen__backdrop img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1280);
    await expect(page.locator('.title-screen video')).not.toHaveAttribute('src', /.+/);
    expect(media).toEqual([]);
    await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
    await expect(page.locator('.title-screen')).toHaveCount(0);
  });
}

test('a failed background video keeps the poster and start action available', async ({ page }) => {
  await page.route('**/video/title-birth-loop.mp4', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.title-screen .animated-illustration')).toHaveAttribute('data-animation-state', 'error');
  await expect.poll(() => page.locator('.title-screen__backdrop img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1280);
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
