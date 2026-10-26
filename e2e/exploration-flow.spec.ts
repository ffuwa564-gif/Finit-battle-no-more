import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function boundary(page: Page, legacyFinal = false) {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async final => {
    const { content } = await import('/src/content/index.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!;
    const save = applyCommand(previous, { type: 'depart', dungeonId: content.dungeons[0].id, potions: 0 }, content);
    const battle = save.battle!;
    battle.phase = 'playing'; battle.cursor = 0;
    battle.nextPhase = final ? 'reward' : 'wave';
    battle.events = final ? [] : [{ id: 'last-defeat', kind: 'defeat', text: 'cleared' }];
    for (const unit of battle.units) if (unit.side === 'enemy') unit.hp = 0;
    battle.units.find(unit => unit.side === 'party')!.hp = 1;
    if (final) {
      battle.wave = content.dungeons[0].waves.length - 1;
      battle.omens = { picks: Array.from({ length: battle.wave }, () => 'bell'), activated: [], pending: ['bell', 'thread', 'key'] };
      battle.pendingMaterials = { 'pilgrim:common': 2 };
    }
    await persistSave(save, previous.revision);
  }, legacyFinal);
  await page.reload(); await enterGame(page);
}
const stored = (page: Page) => page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);

test('a new expedition flows from the last defeat straight to the next Wave without choices', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boundary(page);
  await expect(page.getByRole('region', { name: '廃都の痕跡', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeVisible({ timeout: 10000 });
  const save = await stored(page);
  expect(save.battle!.wave).toBe(1); expect(save.battle!.omens).toBeUndefined();
  expect(save.battle!.units.find(unit => unit.side === 'party')!.hp).toBe(1);
  await expect(page.locator('.wave-omens')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/no-wave-choices/next-wave-390.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('a legacy save waiting on the final choice automatically reaches rewards after reload', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await boundary(page, true);
  await expect(page.getByRole('button', { name: '獲得を確定', exact: true })).toBeVisible();
  await expect(page.locator('.wave-omens')).toHaveCount(0);
  expect((await stored(page)).battle!.omens).toBeUndefined();
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: '獲得を確定', exact: true }).click();
  await expect.poll(async () => (await stored(page)).battle).toBeNull();
  const save = await stored(page); expect(save.stones).toBe(3); expect(save.materials['pilgrim:common']).toBe(2);
  expect(errors).toEqual([]);
});
