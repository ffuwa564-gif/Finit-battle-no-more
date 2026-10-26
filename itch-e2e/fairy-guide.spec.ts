import { test, expect } from '@playwright/test';

test('embedded guide is offered once, follows real controls, and resumes only on request', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/');
  const game = page.frameLocator('iframe');
  await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  await expect(game.locator('.fairy-invitation')).toBeVisible();
  await expect.poll(() => game.locator('body').evaluate(() => JSON.parse(localStorage.getItem('stillveil-fairy-tutorial-v1')!).offered)).toBe(true);
  await page.reload();
  await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  await expect(game.locator('.fairy-invitation')).toHaveCount(0);
  await expect(game.locator('.fairy-guide')).toHaveCount(0);
  await game.getByRole('button', { name: 'Ask the Fairy', exact: true }).click();
  await expect(game.locator('[data-guide="home-party"]')).toHaveAttribute('aria-describedby', /.+/);
  await game.locator('[data-guide="home-party"]').click();
  await expect(game.locator('.fairy-guide')).toContainText('Meet Your Leader!');
  await game.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(game.locator('.fairy-guide')).toContainText('Looking for New Friends?');
  await page.reload();
  await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  await expect(game.locator('.fairy-guide')).toHaveCount(0);
  await game.getByRole('button', { name: 'Ask the Fairy', exact: true }).click();
  await expect(game.locator('.fairy-guide')).toContainText('Looking for New Friends?');
  await expect(game.getByRole('button', { name: 'Focus This Control', exact: true })).toHaveCount(0);
});
