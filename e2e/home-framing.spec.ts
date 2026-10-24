import { test, expect } from '@playwright/test';
import { content } from '../src/content';
import { enterGame } from './boot';

test('all owned home paintings stay below the profile header on mobile and desktop', async ({ page }) => {
  await page.goto('/#home'); await enterGame(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.ownedIds = content.characters.map(c => c.id); save.settings.reducedMotion = true;
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const character of content.characters) {
      await page.getByRole('button', { name: 'ホームのキャラを変更', exact: true }).click();
      await page.getByRole('button', { name: `${character.name}／${character.epithet}をホームに表示`, exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const image = page.locator('.home-artwork img'); await image.evaluate((el: HTMLImageElement) => el.decode());
      const bounds = await image.evaluate(el => {
        const box = el.getBoundingClientRect(), header = document.querySelector('.hub-profile')!.getBoundingClientRect();
        return { top: box.top, headerBottom: header.bottom, position: getComputedStyle(el).objectPosition, height: box.height };
      });
      expect(bounds.top, character.id).toBeGreaterThanOrEqual(bounds.headerBottom + 2);
      expect(bounds.position, character.id).toBe('50% 0%'); expect(bounds.height).toBeGreaterThan(240);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
  }
});

test('retreat backup and retreat actions have matching sizes and preserve the expedition on export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/'); await enterGame(page);
  await page.getByRole('navigation', { name: 'ホームのメニュー', exact: true }).getByRole('button', { name: 'ダンジョン', exact: true }).click();
  await page.getByRole('button', { name: '探索の準備' }).first().click(); await page.getByRole('button', { name: '探索を始める', exact: true }).click();
  await expect(page.getByRole('button', { name: '撤退', exact: true })).toBeEnabled(); await page.getByRole('button', { name: '撤退', exact: true }).click();
  const dialog = page.getByRole('dialog');
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    const backup = await dialog.getByRole('button', { name: 'バックアップを保存', exact: true }).boundingBox();
    const retreat = await dialog.getByRole('button', { name: '撤退する', exact: true }).boundingBox();
    expect(Math.abs(backup!.width - retreat!.width)).toBeLessThan(1); expect(Math.abs(backup!.height - retreat!.height)).toBeLessThan(1);
    expect(backup!.height).toBeGreaterThanOrEqual(48);
  }
  const download = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'バックアップを保存', exact: true }).click(); await download;
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(page.getByRole('region', { name: '戦闘操作', exact: true })).toBeVisible();
});
