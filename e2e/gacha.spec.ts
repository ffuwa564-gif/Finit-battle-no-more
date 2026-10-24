import { enterGame } from './boot';
import { test, expect } from '@playwright/test';

test('goddess collection shows two static SSRs and grants an owned goddess on the guaranteed draw', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#gacha');
  await enterGame(page);
  await expect(page.getByRole('heading', { name: 'ゴス☆イザナミコレクション', exact: true })).toBeVisible();
  await expect(page.locator('.goddess-feature')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'SSR イザナミの詳細', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SSR アマテラスの詳細', exact: true })).toBeVisible();
  await expect(page.locator('.goddess-collection video')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '石5個で祈願する', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'SSR イザナミの詳細', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('黄泉のヴェール');
  await expect(page.getByRole('dialog')).toContainText('ゴシックロリータ');
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
  await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByText('迎え入れ済み', { exact: true })).toHaveCount(1);
  await page.reload();
  await enterGame(page);
  await expect(page.getByText('迎え入れ済み', { exact: true })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
