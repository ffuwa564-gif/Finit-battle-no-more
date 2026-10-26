import { test, expect } from '@playwright/test';
import { skipStory } from '../e2e/boot';

test('opening fills the nested game viewport and resumes across host reloads only until finished', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto('/');
  const game = page.frameLocator('iframe');
  await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  const story = game.locator('.visual-novel');
  await expect(story).toHaveAttribute('data-scene', 'opening-desire-gate');
  const dimensions = await story.evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, viewportWidth: innerWidth, viewportHeight: innerHeight }));
  expect(dimensions.width).toBe(dimensions.viewportWidth); expect(dimensions.height).toBe(dimensions.viewportHeight);
  await story.getByRole('button', { name: 'Next Line', exact: true }).click();
  await expect(story).toHaveAttribute('data-page', '1');
  await page.reload();
  await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  await expect(story).toHaveAttribute('data-page', '1');
  await skipStory(game);
  await page.reload();
  await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  await expect(game.locator('.title-screen')).toHaveCount(0); await expect(story).toHaveCount(0);
});
