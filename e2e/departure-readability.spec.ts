import { expect, test } from '@playwright/test';
import { enterGame } from './boot';
import { contrast } from './readability-checks';

test.use({ viewport: { width: 390, height: 844 } });

test('paper preparation keeps inset notices readable and departs when the legacy rare roll hits', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.completedDungeonIds = content.chapters!.flatMap(chapter => chapter.dungeonIds);
    // With this seed the old two-wave rare replacement selects Nemuria,
    // then throws because the hunt's own roster replaces that actor.
    save.seed = 22;
    save.settings.reducedMotion = true;
    save.revision++;
    await persistSave(save, revision);
  });
  await page.goto('/#dungeons/prepare/erased-star-chart');
  await page.reload();
  await enterGame(page);
  const modal = page.getByRole('dialog', { name: '消された星図', exact: true });
  await expect(modal).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await contrast(modal.locator('.memory-gem-source, .memory-gem-source small, .notice, .notice span, .expedition-loadout label, .expedition-loadout small, .dungeon-reward-note, .industry-dungeon-resources p, .industry-dungeon-resources small'));
    expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
  await modal.locator('.memory-gem-source').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('preparation-readable.png') });
  await modal.locator('p.notice').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('preparation-notices-readable.png') });
  await modal.locator('[data-guide="depart"]').click();
  await expect.poll(async () => page.evaluate(async () => {
    const save = await (await import('/src/platform/save.ts')).loadSave();
    return save?.battle?.dungeonId;
  })).toBe('erased-star-chart');
  await expect(page.locator('[data-hunt-stage="hunting"]')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath('departure-success.png') });
});
