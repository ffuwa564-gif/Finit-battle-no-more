import { test, expect } from '@playwright/test';
import { enterGame, skipStory } from './boot';

test('title starts music with a keyboard gesture and preserves the requested page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#bag');
  await expect(page.getByRole('heading', { name: 'STILLVEIL', exact: true })).toBeVisible();
  await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const start = page.getByRole('button', { name: 'タップしてはじめる', exact: true });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.title-screen')).toHaveCount(0);
  await skipStory(page);
  await expect(page.getByRole('heading', { name: 'カバン・道具', exact: true })).toBeVisible();
  const audio = page.locator('audio[data-bgm]');
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0);
});

test('reloading a battle pauses replay behind the title until tapped', async ({ page }) => {
  await page.goto('/#dungeons');
  await enterGame(page);
  await page.getByRole('button', { name: '探索の準備' }).first().click();
  await page.getByRole('button', { name: '探索を始める' }).click();
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.getByRole('button', { name: '次の演出へ', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.title-screen')).toBeVisible();
  const cursor = () => page.evaluate(() => new Promise<number>(resolve => {
    const open = indexedDB.open('stillveil-save', 1);
    open.onsuccess = () => { const db = open.result; const req = db.transaction('state').objectStore('state').get('save'); req.onsuccess = () => { resolve(req.result.battle.cursor); db.close(); }; };
  }));
  const before = await cursor();
  await page.waitForTimeout(2200);
  expect(await cursor()).toBe(before);
  await enterGame(page);
  await expect(page.locator('audio[data-bgm]')).toHaveAttribute('data-scene', 'battle');
  await expect.poll(cursor, { timeout: 7000 }).toBeGreaterThan(before);
});
