import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: import('@playwright/test').Page, stones: number, drawCount = 0, pity = 0, ownPool = false) {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#gacha'); await enterGame(page);
  await page.evaluate(async ({ stones, drawCount, pity, ownPool }) => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts'); const { content } = await import('/src/content/index.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.seed = 42; save.stones = stones; save.drawCount = drawCount; save.ssrPity = pity; save.settings.reducedMotion = true;
    if (ownPool) save.ownedIds = [...new Set([...save.ownedIds, ...content.characters.filter(c => c.origin.includes('gacha')).map(c => c.id)])];
    save.revision++; await persistSave(save, revision);
  }, { stones, drawCount, pity, ownPool });
  await page.reload(); await enterGame(page);
}
const readSave = (page: import('@playwright/test').Page) => page.evaluate(async () => (await import('/src/platform/save.ts')).loadSave());

test('ten wishes confirms the one-time guarantee, saves once, and lets players inspect the result grid', async ({ page }, testInfo) => {
  await prepare(page, 50); const before = await readSave(page);
  const ten = page.getByRole('button', { name: '石50個で10連祈願', exact: true }); await ten.click();
  const confirm = page.getByRole('dialog'); await expect(confirm).toContainText('石50個で10連祈願します。');
  await confirm.getByRole('button', { name: '取消', exact: true }).click(); expect(await readSave(page)).toEqual(before);
  await ten.click(); await page.getByRole('button', { name: '保証を使って祈願する', exact: true }).dblclick();
  const results = page.getByRole('dialog', { name: '10連祈願の結果', exact: true });
  await expect(results.locator('.gacha-result')).toHaveCount(10); await expect(results).toContainText('全ガチャ共通の初回SSR保証を使用しました');
  const saved = await readSave(page); expect(saved!.drawCount).toBe(10); expect(saved!.revision).toBe(before!.revision + 1);
  expect(saved!.stones).toBe(saved!.lastGachaResults!.reduce((sum, result) => sum + result.refund, 0));
  await results.screenshot({ path: testInfo.outputPath('ten-wishes-mobile.png') });
  await results.locator('.gacha-result').nth(1).click();
  await expect(page.getByRole('dialog').locator('.gacha-reveal__rarity')).toHaveText('SSR');
  await page.getByRole('button', { name: '女神を迎える', exact: true }).click();
  await expect(results.locator('.gacha-result')).toHaveCount(10); expect(await readSave(page)).toEqual(saved);
  await results.getByRole('button', { name: '祈願に戻る', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.reload(); await enterGame(page); expect(await readSave(page)).toEqual(saved); await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const title of ['神々の装い ― 和の花宴 ―', 'ゴス☆イザナミコレクション']) {
  test(`ten wishes honors shared hard pity and duplicate refunds in ${title}`, async ({ page }) => {
    await prepare(page, 50, 100, 89, true); await page.getByRole('button', { name: title, exact: true }).click();
    await page.getByRole('button', { name: '石50個で10連祈願', exact: true }).click();
    const results = page.getByRole('dialog', { name: '10連祈願の結果', exact: true });
    await expect(results.locator('.gacha-result')).toHaveCount(10); await expect(results.locator('.gacha-result').first()).toContainText('SSR');
    const save = (await readSave(page))!; expect(save.drawCount).toBe(110); expect(save.lastGachaResults!.every(result => result.duplicate)).toBe(true);
    expect(save.lastGachaResults![0]!.refund).toBe(3);
    await expect(results).toContainText(`祈願石還元 ${save.stones}個`); await expect(results).toContainText('新しい女神 0体');
    await results.getByRole('button', { name: '祈願に戻る', exact: true }).click();
    await expect(page.getByRole('button', { name: '石50個で10連祈願', exact: true })).toBeDisabled();
  });
}

test('49 stones allow a single wish but cannot start ten wishes, even when all characters are owned', async ({ page }) => {
  await prepare(page, 49, 10, 0, true);
  await expect(page.getByRole('button', { name: '石50個で10連祈願', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '石5個で祈願する', exact: true })).toBeEnabled();
});
