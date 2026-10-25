import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('common SSRs show accurate rates and static art in both collections on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#gacha'); await enterGame(page);
  const common = page.getByRole('region', { name: '共通SSR', exact: true });
  for (const title of ['神々の装い ― 和の花宴 ―', 'ゴス☆イザナミコレクション']) {
    await page.getByRole('button', { name: title, exact: true }).click();
    await expect(common.locator('.character-card')).toHaveCount(3);
    await expect(common.getByText('基準排出率 0.5%', { exact: true })).toHaveCount(3);
    await expect(page.locator('.goddess-feature__rarity')).toHaveText(['SSR · 0.75%', 'SSR · 0.75%']);
    for (const [name, epithet, id] of [['ヘカテ', '三叉路に灯す蒼火', 'hecate'], ['フレイヤ', '琥珀に眠る鷹の歌', 'freyja'], ['弁財天', '水鏡にほどける琵琶', 'benzaiten']]) {
      await common.getByRole('button', { name: `${name}／${epithet}の詳細`, exact: true }).click();
      const dialog = page.getByRole('dialog'); const art = dialog.locator('.detail-art img');
      await expect(art).toHaveAttribute('src', new RegExp(`gacha-${id}.webp$`));
      await expect.poll(() => art.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1024);
      await expect(dialog.locator('video')).toHaveCount(0); await expect(dialog.locator('.flavor-text')).not.toBeEmpty();
      await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
    }
  }
  await common.screenshot({ path: testInfo.outputPath('shared-ssr-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('an off-banner SSR is revealed and selectable as a static home illustration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#gacha'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts'); const save = (await loadSave())!; const revision = save.revision;
    save.seed = 1899; save.drawCount = 30; save.ssrPity = 20; save.stones = 10; save.settings.reducedMotion = true; save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page); await page.getByRole('button', { name: '石5個で祈願する', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toContainText('三叉路に灯す蒼火');
  await expect(dialog.locator('.gacha-reveal__rarity')).toHaveText('SSR'); await expect(dialog.locator('video')).toHaveCount(0);
  await dialog.getByRole('button', { name: '女神を迎える', exact: true }).click();
  await page.goto('/#home'); await page.getByRole('button', { name: 'ホームのキャラを変更', exact: true }).click();
  await page.getByRole('button', { name: 'ヘカテ／三叉路に灯す蒼火をホームに表示', exact: true }).click();
  await expect(page.locator('.home-artwork > img')).toHaveAttribute('src', /gacha-hecate.webp$/);
  const save = await page.evaluate(async () => (await import('/src/platform/save.ts')).loadSave());
  expect(save!.ssrPity).toBe(0); expect(save!.stones).toBe(5); expect(save!.settings.homeCharacterId).toBe('hecate');
});
