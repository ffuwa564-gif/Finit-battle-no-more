import { test, expect } from '@playwright/test';

test('home portrait plays silently and pauses with controls, visibility and scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const video = page.locator('.animated-illustration video');
  await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('loop', true);
  await expect(video).toHaveAttribute('playsinline', '');
  const save = await page.evaluate(async () => { const { loadSave } = await import('/src/platform/save.ts'); return loadSave(); });
  await page.getByRole('button', { name: 'ホームのアニメーションを停止', exact: true }).click();
  await expect(video).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: 'ホームのアニメーションを再生', exact: true }).click();
  await expect(video).toHaveJSProperty('paused', false);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(video).toHaveJSProperty('paused', true);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(video).toHaveJSProperty('paused', false);
  await page.evaluate(() => { const spacer = document.createElement('div'); spacer.id = 'scroll-fixture'; spacer.style.height = '200vh'; document.body.append(spacer); window.scrollTo(0, innerHeight * 2); });
  await expect(video).toHaveJSProperty('paused', true);
  await page.evaluate(() => { document.getElementById('scroll-fixture')!.remove(); window.scrollTo(0, 0); });
  await expect(video).toHaveJSProperty('paused', false);
  expect(await page.evaluate(async () => { const { loadSave } = await import('/src/platform/save.ts'); return loadSave(); })).toEqual(save);
});

test('motion preferences keep the original artwork and do not fetch the video', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let requests = 0; page.on('request', request => { if (request.url().includes('home-portrait.mp4')) requests++; });
  await page.goto('/');
  const root = page.locator('.animated-illustration');
  await expect(root).toHaveAttribute('data-animation-state', 'static');
  await expect(root.locator('img')).toBeVisible();
  await expect(root.locator('video')).not.toHaveAttribute('src');
  expect(requests).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => root.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).toHaveAttribute('data-animation-state', 'static');
  await expect(root.locator('video')).toHaveJSProperty('paused', true);
  await expect(root.locator('video')).not.toHaveAttribute('src');
  await page.goto('/#settings');
  await page.getByRole('button', { name: 'オフ', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('navigation', { name: 'モバイルメニュー', exact: true }).getByRole('button', { name: 'ホーム', exact: true }).click();
  await expect(root).toHaveAttribute('data-animation-state', 'static');
  await page.reload();
  await expect(root.locator('video')).not.toHaveAttribute('src');
});

test('a failed animation retains the painting and working home navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/video/home-portrait.mp4', route => route.abort());
  await page.goto('/');
  const root = page.locator('.animated-illustration');
  await expect(root).toHaveAttribute('data-animation-state', 'static');
  await expect(root.locator('img')).toBeVisible();
  await page.getByRole('navigation', { name: 'ホームのメニュー', exact: true }).getByRole('button', { name: 'パーティ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'パーティ', exact: true })).toBeVisible();
});
