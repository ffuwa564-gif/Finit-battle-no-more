import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('XR is a locked separate summon with zero unobtainable premium stones in the current release', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#gacha'); await enterGame(page);
  const premium = page.getByRole('region', { name: '星晶の祈願', exact: true });
  await expect(premium).toContainText('XR'); await expect(premium).toContainText('第10章');
  await expect(premium).toContainText('0.1%'); await expect(premium).toContainText('入手方法はまだありません');
  await expect(premium.locator('.xr-gacha__balance')).toContainText('星晶石 0');
  await expect(premium.getByRole('button', { name: '星晶石1個で祈願する', exact: true })).toBeDisabled();
  await expect(premium.getByRole('button', { name: '星晶石10個で10連祈願', exact: true })).toBeDisabled();
  await premium.scrollIntoViewIfNeeded(); await premium.screenshot({ path: testInfo.outputPath('xr-locked-mobile.png') });
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.completedDungeonIds = content.dungeons.map(dungeon => dungeon.id); save.stones = 10000; save.astralStones = 100;
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  await expect(premium.getByRole('button', { name: '星晶石1個で祈願する', exact: true })).toBeDisabled();
  const rejected = await page.evaluate(async () => {
    const { loadSave } = await import('/src/platform/save.ts'); const { applyCommand } = await import('/src/application/game.ts'); const { content } = await import('/src/content/index.ts');
    const save = (await loadSave())!; const before = JSON.stringify(save);
    try { applyCommand(save, { type: 'drawXR' }, content); return false; } catch { return JSON.stringify(save) === before; }
  });
  expect(rejected).toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.goto('/#settings'); await page.getByRole('button', { name: 'English', exact: true }).click(); await page.goto('/#gacha');
  const english = page.getByRole('region', { name: 'Astral Summon', exact: true });
  await expect(english).toContainText('Chapter 10'); await expect(english).toContainText('cannot currently be obtained');
});

test('legacy saves without premium fields still display a zero balance', async ({ page }) => {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!; const revision = save.revision; delete save.astralStones; delete save.xrDrawCount; save.revision++;
    await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page); await page.goto('/#gacha');
  await expect(page.locator('.xr-gacha__balance')).toContainText('星晶石 0');
});

test('XR has a distinct higher-rarity frame without adding a production XR character', async ({ page }) => {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const source = content.characters.find(character => character.id === 'nox')!;
    content.characters.push({ ...source, id: 'test-xr-frame', name: 'XR frame fixture', familyId: 'test-xr-frame', rarity: 'XR', strength: 40, origin: ['xr_gacha'], motionId: undefined, portraitMotionId: undefined });
  });
  await page.goto('/#preview');
  const card = page.locator('.character-card').filter({ has: page.getByRole('heading', { name: 'XR frame fixture', exact: true }) });
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('.character-portrait')).toHaveAttribute('data-rarity', 'XR');
  await expect(card.locator('.rarity-badge--XR')).toHaveText('XR');
  await expect(card.locator('.rarity-frame--XR')).toHaveCSS('border-top-width', '3px');
  await expect(card.locator('.rarity-frame--XR')).toHaveCSS('border-top-color', 'rgb(156, 225, 238)');
});
