import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('Zakuro chapter opens after the old campaign and renders the procession, portrait and story on mobile', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.completedDungeonIds = content.chapters!.slice(0, 3).flatMap(chapter => chapter.dungeonIds);
    save.ownedIds = [...new Set([...save.ownedIds, 'zakuro', 'selene', 'athena', 'seris-awakened', 'fortuna'])];
    save.partyIds = ['zakuro', 'selene', 'athena', 'seris-awakened']; save.leaderId = 'selene';
    save.novels = { seen: ['opening-desire-gate'] }; save.settings.reducedMotion = true;
    save.settings.homeCharacterId = 'zakuro';
    save.revision++; await persistSave(save, revision);
    localStorage.setItem('stillveil-fairy-tutorial-v1', JSON.stringify({ version: 2, enrolled: false, dismissed: true, seen: [] }));
  });
  await page.goto('/#dungeons'); await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: '第4章 柘榴の樹海', exact: true }).click();
  await expect(page.getByRole('heading', { name: '柘榴の樹海', exact: true })).toBeVisible();
  const procession = page.locator('.dungeon-card').filter({ hasText: '怠惰姫の渡御' });
  await expect(procession.getByRole('button', { name: '探索の準備' })).toBeDisabled();
  await page.screenshot({ path: info.outputPath('zakuro-chapter-390.png') });
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.completedDungeonIds.push('ritual-stone-grove');
    const next = applyCommand(save, { type: 'depart', dungeonId: 'zakuro-procession', potions: 0 }, content);
    await persistSave(next, revision);
  });
  await page.reload(); await enterGame(page);
  await expect(page.locator('.enemy-page-art').last()).toHaveAttribute('src', /zakuro.webp$/);
  await expect.poll(() => page.locator('.enemy-page-art').last().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1024);
  await page.screenshot({ path: info.outputPath('zakuro-battle-390.png') });
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.battle = null;
    const next = applyCommand(save, { type: 'novelStart', sceneId: 'zakuro-forest-encounter' }, content);
    await persistSave(next, revision);
  });
  await page.reload(); await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.visual-novel')).toHaveAttribute('data-scene', 'zakuro-forest-encounter');
  await expect(page.locator('.visual-novel')).toContainText('リオラの盾が弾く');
  await expect.poll(() => page.locator('.novel-backgrounds img.is-current').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1024);
  await page.screenshot({ path: info.outputPath('zakuro-story-390.png') });
  expect(errors).toEqual([]);
});
