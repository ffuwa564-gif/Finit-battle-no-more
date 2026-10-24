import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('skill conditions and leader effects explain how to choose a party', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#party'); await enterGame(page);
  await expect(page.locator('.leader-panel')).toContainText('被ダメージを10%軽減');
  await page.getByRole('button', { name: /^セリス/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('銀閃の貫突');
  await expect(dialog).toContainText('防御力を65%無視');
  await expect(dialog).toContainText('薄明の追撃');
  await expect(dialog).toContainText('再使用まで3ラウンド');
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.locator('.character-card').filter({ has: page.getByRole('heading', { name: 'セリス', exact: true }) }).getByRole('button', { name: 'リーダーにする', exact: true }).click();
  await expect(page.locator('.leader-panel')).toContainText('残りHP35%以下');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('saved barriers, regeneration and defense reduction are visible in battle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!;
    let save = applyCommand(previous, { type: 'depart', dungeonId: content.dungeons[0].id, potions: 0 }, content);
    while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
    const party = save.battle!.units.find(u => u.side === 'party')!;
    party.barrier = 40; party.barrierUntil = 2; party.regenStrength = 16; party.regenUntil = 3;
    const enemy = save.battle!.units.find(u => u.side === 'enemy')!;
    enemy.debuffStrength = 14; enemy.debuffUntil = 2;
    save.revision = previous.revision + 1;
    await persistSave(save, previous.revision);
  });
  await page.reload(); await enterGame(page);
  await expect(page.locator('.party-strip .unit-effects').first()).toContainText('障壁 40');
  await expect(page.locator('.party-strip .unit-effects').first()).toContainText('再生');
  await expect(page.locator('.enemy-carousel-status .unit-effects')).toContainText('防御↓');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
