import { test, expect } from '@playwright/test';

test('the built character animation loads at the nested itch path and pauses independently', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto('/');
  const game = page.frameLocator('iframe');
  await expect(game.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'playing');
  const video = game.locator('.title-birth-scene video');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.1);
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toContain('/nested/game/video/title-character-packed.mp4');
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.playsInline)).toBe(true);
  await game.getByRole('button', { name: 'Pause Background Animation', exact: true }).click();
  await expect(game.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'paused');
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(game.locator('audio[data-bgm]')).toHaveCount(0);
  await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  await expect(game.locator('.visual-novel')).toBeVisible();
});
