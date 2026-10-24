import { enterGame } from './boot';
import { test, expect } from '@playwright/test';

test('goddess collection animates both SSRs and grants an owned goddess on the guaranteed draw', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#gacha');
  await enterGame(page);
  await expect(page.getByRole('heading', { name: 'ゴス☆イザナミコレクション', exact: true })).toBeVisible();
  await expect(page.locator('.goddess-feature')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'SSR イザナミの詳細', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SSR アマテラスの詳細', exact: true })).toBeVisible();
  const previews = page.locator('.goddess-collection video');
  await expect(previews).toHaveCount(2);
  for (const video of await previews.all()) {
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
    await expect(video).toHaveJSProperty('muted', true);
  }
  await expect(page.locator('button button')).toHaveCount(0);
  await page.getByRole('button', { name: 'イザナミのアニメーションを停止', exact: true }).click();
  await expect(previews.first()).toHaveJSProperty('paused', true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'イザナミのアニメーションを再生', exact: true }).click();
  await expect(page.getByRole('button', { name: '石5個で祈願する', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'SSR イザナミの詳細', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('黄泉のヴェール');
  await expect(page.getByRole('dialog')).toContainText('ゴシックロリータ');
  await expect.poll(() => page.getByRole('dialog').locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
  for (const video of await previews.all()) await expect(video).toHaveJSProperty('paused', true);
  await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.stones = 20; save.seed = 42; save.revision += 1; await persistSave(save, revision);
  });
  await page.reload();
  await enterGame(page);
  await page.getByRole('button', { name: '石5個で祈願する', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByText('次の祈願はSSR確定', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '石5個で祈願する', exact: true }).click();
  const result = page.getByRole('dialog');
  await expect(result).toBeVisible();
  await expect(result.getByRole('heading', { level: 2 }).first()).toHaveText(/イザナミ|アマテラス/);
  await expect.poll(() => result.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
  await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByText('迎え入れ済み', { exact: true })).toHaveCount(1);
  await page.reload();
  await enterGame(page);
  await expect(page.getByText('迎え入れ済み', { exact: true })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});


test('SSR motion follows reduced motion and leaves other rarities as still artwork', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let requests = 0;
  page.on('request', request => { if (/video\/gacha-.*\.mp4/.test(request.url())) requests++; });
  await page.goto('/#gacha');
  await enterGame(page);
  await expect(page.locator('.goddess-collection .animated-illustration[data-animation-state="static"]')).toHaveCount(2);
  for (const video of await page.locator('.goddess-collection video').all()) await expect(video).not.toHaveAttribute('src');
  expect(requests).toBe(0);
  await page.getByRole('button', { name: 'SSR アマテラスの詳細', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('video')).not.toHaveAttribute('src');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => dialog.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  for (const video of await page.locator('.goddess-collection video').all()) await expect(video).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'コノハナサクヤヒメ', exact: true }).click();
  await expect(dialog.locator('.character-artwork img')).toBeVisible();
  await expect(dialog.locator('video')).toHaveCount(0);
});
