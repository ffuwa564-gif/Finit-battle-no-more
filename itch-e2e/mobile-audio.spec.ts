import { test, expect } from '@playwright/test';

async function enter(page: import('@playwright/test').Page) {
  await page.goto('/');
  // Match itch.io's non-scrolling iframe with a short visible area.
  await page.locator('iframe').evaluate(el => { el.setAttribute('scrolling', 'no'); el.style.height = '560px'; });
  const game = page.frameLocator('iframe');
  await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  await expect(game.locator('.title-screen')).toHaveCount(0);
  return game;
}

test('a non-scrolling mobile iframe can reach home navigation and settings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 650 });
  const game = await enter(page);
  await expect(game.locator('html')).toHaveClass(/is-embedded/);
  const root = game.locator('#root');
  expect(await root.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await root.evaluate(el => el.scrollTo({ top: el.scrollHeight }));
  expect(await root.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const settings = game.getByRole('navigation', { name: 'Home menu', exact: true }).getByRole('button', { name: 'Settings', exact: true });
  await expect(settings).toBeInViewport();
  await settings.click();
  await expect(game.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  expect(await root.evaluate(el => el.scrollTop)).toBe(0);
});

test('sound effects default to 100%, preview once, and stay independent of BGM', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 650 });
  const game = await enter(page);
  await game.getByRole('navigation', { name: 'Home menu', exact: true }).getByRole('button', { name: 'Settings', exact: true }).click();
  const effects = game.getByRole('group', { name: 'Sound Effects', exact: true });
  const music = game.getByRole('group', { name: 'Music Volume', exact: true });
  await expect(effects.getByRole('button', { name: '100%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await game.locator('body').evaluate(() => {
    (window as any).cues = [];
    window.addEventListener('game:se', event => (window as any).cues.push((event as CustomEvent).detail.kind));
  });
  // Let navigation audio finish before counting the volume preview.
  await page.waitForTimeout(500);
  await game.locator('body').evaluate(() => { (window as any).cues = []; });
  await effects.getByRole('button', { name: '25%', exact: true }).click();
  await expect(effects.getByRole('button', { name: '25%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(300);
  expect(await game.locator('body').evaluate(() => (window as any).cues)).toEqual(['confirm']);
  await game.locator('body').evaluate(() => { (window as any).cues = []; });
  await music.getByRole('button', { name: '50%', exact: true }).click();
  await expect(music.getByRole('button', { name: '50%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(effects.getByRole('button', { name: '25%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(300);
  expect(await game.locator('body').evaluate(() => (window as any).cues)).toEqual([]);
  await effects.getByRole('button', { name: '0%', exact: true }).click();
  await expect(effects.getByRole('button', { name: '0%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await game.locator('body').evaluate(() => (window as any).cues)).toEqual([]);
});
