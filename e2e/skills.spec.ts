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
  const summary = page.locator('.party-strip .unit-effects-summary').first();
  await expect(summary).toHaveAttribute('aria-label', /障壁 40/);
  await expect(summary).toHaveAttribute('aria-label', /再生/);
  await summary.click();
  const details = page.getByRole('dialog', { name: '付与効果', exact: true });
  await expect(details).toContainText('障壁 40');
  await expect(details).toContainText('再生');
  await details.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.locator('.enemy-carousel-status .unit-effects')).toContainText('防御↓');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('Athena rally explains its cooldown and shows the attack boost on every ally after reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#party'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!;
    const save = structuredClone(previous);
    save.ownedIds = [...new Set([...save.ownedIds, 'athena'])];
    save.discoveredIds = [...new Set([...save.discoveredIds, 'athena'])];
    save.partyIds = ['seris', 'athena', 'elaine', 'noelle']; save.leaderId = 'seris';
    save.revision = previous.revision + 1;
    await persistSave(save, previous.revision);
  });
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: /^アテナ/ }).first().click();
  await expect(page.getByRole('dialog')).toContainText('軍神の号令');
  await expect(page.getByRole('dialog')).toContainText('生存中の味方全員');
  await expect(page.getByRole('dialog')).toContainText('再使用まで4ラウンド');
  await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, resolveRound, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!;
    const save = structuredClone(previous);
    let battle = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 0, 42, 'rally-browser');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    for (const unit of battle.units) {
      unit.hp = unit.maxHp = 10000;
      if (unit.side === 'enemy') { unit.attack = 0; unit.speed = 0; }
    }
    const athena = battle.units.find(unit => unit.characterId === 'athena')!;
    athena.speed = 100; athena.cooldowns['guard-23'] = 99;
    battle = resolveRound(battle, content).battle;
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    save.battle = battle; save.revision = previous.revision + 1;
    await persistSave(save, previous.revision);
  });
  await page.reload(); await enterGame(page);
  await expect(page.locator('.party-strip .unit-effects-summary')).toHaveCount(4);
  for (const effect of await page.locator('.party-strip .unit-effects-summary').all()) await expect(effect).toHaveAttribute('aria-label', /攻撃↑/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: 'artifacts/rally/battle-390.png' });
});
