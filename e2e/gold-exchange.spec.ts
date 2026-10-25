import { expect, test } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: import('@playwright/test').Page, gold: number) {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#bag'); await enterGame(page);
  await page.evaluate(async gold => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts'); const save = (await loadSave())!; const revision = save.revision;
    save.gold = gold; save.stones = 17; save.drawCount = 11; save.ssrPity = 9; save.settings.reducedMotion = true; save.revision++; await persistSave(save, revision);
  }, gold);
  await page.reload(); await enterGame(page); await page.getByRole('button', { name: 'ゴールド交換', exact: true }).click();
}
const readSave = (page: import('@playwright/test').Page) => page.evaluate(async () => (await import('/src/platform/save.ts')).loadSave());

test('Fortuna is visible before purchase, costs 50,000 gold, and previews her static artwork and skills', async ({ page }, testInfo) => {
  await prepare(page, 49_999);
  const section = page.getByRole('region', { name: 'ゴールド交換', exact: true });
  await expect(section).toContainText('フォルトゥナ'); await expect(section).toContainText('50,000 G'); await expect(section).toContainText('常設・1回限り');
  await expect(section.getByRole('button', { name: 'ゴールドで迎える', exact: true })).toBeDisabled();
  await expect(section.getByRole('progressbar')).toHaveAttribute('value', '49999');
  await section.getByRole('button', { name: '物語と能力を見る', exact: true }).click();
  const dialog = page.getByRole('dialog'); const art = dialog.locator('.detail-art img');
  await expect(art).toHaveAttribute('src', /gold-fortuna.webp$/); await expect.poll(() => art.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1024);
  await expect(dialog).toContainText('運命の輪'); await expect(dialog).toContainText('リーダースキル'); await expect(dialog.locator('video')).toHaveCount(0);
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  await section.screenshot({ path: testInfo.outputPath('fortuna-gold-exchange-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('canceling is free; confirming deducts gold once, retains ownership, and permits a home selection', async ({ page }) => {
  await prepare(page, 50_000); const before = await readSave(page);
  const section = page.getByRole('region', { name: 'ゴールド交換', exact: true });
  await section.getByRole('button', { name: 'ゴールドで迎える', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'ゴールド交換の確認', exact: true }); await expect(dialog).toContainText('50,000 G');
  await dialog.getByRole('button', { name: '取消', exact: true }).click(); expect(await readSave(page)).toEqual(before);
  await section.getByRole('button', { name: 'ゴールドで迎える', exact: true }).click();
  await page.getByRole('button', { name: '交換を確定する', exact: true }).dblclick();
  dialog = page.getByRole('dialog', { name: 'フォルトゥナ', exact: true }); await expect(dialog).toBeVisible();
  const bought = (await readSave(page))!; expect(bought.gold).toBe(0); expect(bought.ownedIds.filter(id => id === 'fortuna')).toHaveLength(1);
  expect(bought.revision).toBe(before!.revision + 1); expect(bought.stones).toBe(17); expect(bought.drawCount).toBe(11); expect(bought.ssrPity).toBe(9);
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(section.getByRole('button', { name: '交換済み', exact: true })).toBeDisabled();
  await page.reload(); await enterGame(page); await expect(page.getByRole('button', { name: '交換済み', exact: true })).toBeDisabled();
  await page.goto('/#home'); await page.getByRole('button', { name: 'ホームのキャラを変更', exact: true }).click();
  await page.getByRole('button', { name: 'フォルトゥナ／朽ちた金貨に宿る祈りをホームに表示', exact: true }).click();
  await expect(page.locator('.home-artwork > img')).toHaveAttribute('src', /gold-fortuna.webp$/);
  expect((await readSave(page))!.settings.homeCharacterId).toBe('fortuna');
});

test('the exchange and goddess story support English without widening the mobile page', async ({ page }) => {
  await prepare(page, 100); await page.goto('/#settings'); await page.getByRole('button', { name: 'English', exact: true }).click(); await page.goto('/#recruit');
  const section = page.getByRole('region', { name: 'Gold Exchange', exact: true }); await expect(section).toContainText('Fortuna');
  await section.getByRole('button', { name: 'Story & Abilities', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('wheel of fortune');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
