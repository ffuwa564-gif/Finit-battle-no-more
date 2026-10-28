import { test, expect } from '@playwright/test';
import { skipStory } from '../e2e/boot';
import { content } from '../src/content';
import { createInitialSave } from '../src/application/game';
import { encodeBackup } from '../src/platform/save-backup';

test('English nested release plays and skips a saved ten-wish ritual', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const save = createInitialSave(content, 42);
  save.stones = 50; save.drawCount = 100; save.ssrPity = 89;
  save.settings.reducedMotion = false; save.settings.bgmVolume = 0; save.settings.seVolume = 0;
  await page.goto('/nested/game/index.html#settings');
  await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click(); await skipStory(page);
  await page.getByLabel('Backup file', { exact: true }).setInputFiles({ name: 'ten-wish.json', mimeType: 'application/json', buffer: Buffer.from(encodeBackup(save, content)) });
  await page.getByRole('button', { name: 'Restore This Save', exact: true }).click();
  await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click(); await skipStory(page);
  await page.evaluate(() => { location.hash = 'gacha'; });
  await page.getByRole('button', { name: 'Clockwork Maidens — Merciless Gears', exact: true }).click();
  await page.getByRole('button', { name: '10 wishes · 50 stones', exact: true }).click();
  await expect(page.getByLabel('Weaving ten wishes', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show All Results', exact: true }).click();
  const result = page.getByRole('dialog', { name: 'Ten-Wish Results', exact: true });
  await expect(result.locator('.gacha-result.is-open')).toHaveCount(10);
  expect(await result.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
