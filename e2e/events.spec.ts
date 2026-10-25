import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';
import type { GameSave } from '../src/domain/types';

async function stored(page: Page): Promise<GameSave> {
  return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
}
async function clearEvent(page: Page) {
  await page.getByRole('button', { name: '探索の準備', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('踏破報酬：毎回 石1個');
  await page.getByRole('button', { name: '探索を始める', exact: true }).click();
  await expect.poll(async () => (await stored(page)).battle?.id).toBeTruthy();
  for (let i = 0; i < 180; i++) {
    const save = await stored(page);
    if (save.battle?.phase === 'reward') return;
    expect(save.battle?.phase).not.toBe('failed');
    const name = save.battle?.phase === 'playing' ? '次の演出へ' : 'ラウンドを進める';
    await page.getByRole('button', { name, exact: true }).click();
    await expect.poll(async () => (await stored(page)).revision).toBeGreaterThan(save.revision);
  }
  throw new Error('イベントが完了しません');
}

test('three repeatable events award one stone per confirmed expedition and retain the event list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#dungeons'); await enterGame(page);
  await expect(page.locator('.dungeon-card')).toHaveCount(3);
  await expect(page.getByText('初踏破 石3個', { exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: '祈願石イベント', exact: true }).click();
  await expect(page.locator('.dungeon-card')).toHaveCount(3);
  for (const name of ['星屑の庭', '白花の祈り路', '銀灯の守門']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByText('毎回 石1個', { exact: true })).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  for (let run = 0; run < 2; run++) {
    await clearEvent(page);
    expect((await stored(page)).stones).toBe(run);
    await expect(page.locator('.reward-summary')).toContainText('イベント踏破 +1');
    await page.getByRole('button', { name: '獲得を確定', exact: true }).click();
    await expect.poll(async () => (await stored(page)).stones).toBe(run + 1);
    await expect(page.getByRole('button', { name: '祈願石イベント', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.dungeon-card')).toHaveCount(3);
  }
  await page.reload(); await enterGame(page);
  expect((await stored(page)).stones).toBe(2);
  await expect(page.locator('.dungeon-card')).toHaveCount(3);
});
