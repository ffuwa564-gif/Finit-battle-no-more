import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { enterGame } from './boot';

const shared = '通常の姿・共通プール';
test('both collections show the same base forms, correct chances, and linked costume details', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#gacha'); await enterGame(page);
  const pool = page.getByRole('region', { name: shared, exact: true });
  await expect(pool.locator('.character-card')).toHaveCount(5);
  await expect(pool).toContainText('SR · 通常の姿 · 共通'); await expect(pool).toContainText('基準排出率 3.4%');
  await pool.getByRole('button', { name: 'セレネ／月明かりの導き手の詳細', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog.locator('.detail-art img')).toHaveAttribute('src', /gacha-selene-standard.webp$/);
  await expect(dialog.locator('.goddess-form')).toHaveCount(2); await expect(dialog).toContainText('通常の姿と特別な装いは別々に迎えられます。');
  await expect(dialog.locator('video')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'セレネ／月白の振袖の姿を見る', exact: true }).click();
  await expect(dialog.locator('.detail-art img')).toHaveAttribute('src', /gacha-selene.webp$/);
  await dialog.getByRole('button', { name: 'セレネ／月明かりの導き手の姿を見る', exact: true }).click();
  await expect(dialog.locator('.detail-art img')).toHaveAttribute('src', /gacha-selene-standard.webp$/);
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.getByRole('button', { name: 'ゴス☆イザナミコレクション', exact: true }).click();
  await expect(pool.locator('.character-card')).toHaveCount(5); await expect(pool).toContainText('基準排出率 2.8333%');
  await pool.scrollIntoViewIfNeeded(); await page.screenshot({ path: testInfo.outputPath('shared-base-forms.png') });
  await page.goto('/#settings'); await page.getByRole('button', { name: 'English', exact: true }).click(); await page.goto('/#gacha');
  await expect(page.getByRole('region', { name: 'Base Forms — Shared Pool', exact: true })).toContainText('Moonlit Guide');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('a shared form can be summoned, selected for home, and exported without a costume unlock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#gacha'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts'); const save = (await loadSave())!; const revision = save.revision;
    save.seed = 3; save.drawCount = 10; save.stones = 20; save.settings.reducedMotion = true; save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page); await page.getByRole('button', { name: '石5個で祈願する', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toContainText('朝庭の花守り'); await expect(dialog.locator('.gacha-reveal__rarity')).toHaveText('R');
  await expect(dialog.locator('video')).toHaveCount(0); await dialog.getByRole('button', { name: '女神を迎える', exact: true }).click();
  await page.goto('/#home'); await page.getByRole('button', { name: 'ホームのキャラを変更', exact: true }).click();
  await page.getByRole('button', { name: 'フローラ／朝庭の花守りをホームに表示', exact: true }).click();
  await expect(page.locator('.home-artwork > img')).toHaveAttribute('src', /gacha-flora-standard.webp$/);
  await page.goto('/#settings'); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'バックアップを保存', exact: true }).click();
  const file = await download; const save = JSON.parse(await readFile((await file.path())!, 'utf8')).save;
  expect(save.ownedIds).toContain('flora-standard'); expect(save.ownedIds).not.toContain('flora'); expect(save.settings.homeCharacterId).toBe('flora-standard'); expect(save.stones).toBe(15);
});
