import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('goddess trial has its own tab, SSR battle artwork and a reward-free recorded clear', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#dungeons/trials'); await enterGame(page);
  await expect(page.getByRole('button', { name: '腕試し', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '女神の試練', exact: true })).toBeVisible();
  await expect(page.locator('.dungeon-meta')).toContainText('報酬なし');
  await expect(page.getByRole('button', { name: '探索の準備', exact: false })).toBeDisabled();
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.completedDungeonIds = ['silent-cathedral']; save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: '探索の準備', exact: false }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('SSR女神との4連戦'); await expect(dialog).toContainText('戦利品なし・踏破の記録のみ');
  await dialog.getByRole('button', { name: '探索を始める', exact: false }).click();
  await expect(page.locator('.enemy-carousel-name')).toContainText('セレネ');
  await expect(page.locator('.enemy-carousel video')).toHaveAttribute('src', /gacha-selene/);
  await expect(page.locator('.enemy-carousel img').first()).not.toHaveJSProperty('naturalWidth', 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('trial-battle.png') });
  const before = await page.evaluate(async () => {
    const { loadSave } = await import('/src/platform/save.ts'); const save = (await loadSave())!;
    return { gold: save.gold, stones: save.stones, materials: save.materials, ownedIds: save.ownedIds };
  });
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts'); const { applyCommand } = await import('/src/application/game.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    let save = (await loadSave())!; const revision = save.revision;
    for (const unit of save.battle!.units.filter(unit => unit.side === 'party')) { unit.hp = unit.maxHp = 10000; unit.attack = 10000; unit.speed = 100; }
    for (let step = 0; step < 300 && !['reward', 'failed'].includes(save.battle!.phase); step++) {
      if (save.battle!.phase === 'playing') { save = applyCommand(save, { type: 'replay' }, content); continue; }
      for (const unit of save.battle!.units.filter(unit => unit.side === 'party')) unit.cooldowns = Object.fromEntries(content.characters.find(char => char.id === unit.characterId)!.skillIds.map(id => [id, 999]));
      save = applyCommand(save, { type: 'round' }, content);
    }
    if (save.battle!.phase !== 'reward') throw new Error('Trial did not finish');
    save.revision = revision + 1;
    await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  await expect(page.getByRole('heading', { name: '試練踏破', exact: true })).toBeVisible();
  await expect(page.locator('.result-panel')).toContainText('勝ち抜き 4 / 4');
  await expect(page.locator('.result-panel')).not.toContainText('クリア +20 G');
  await expect(page.locator('.resource-list')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('trial-clear.png') });
  await page.getByRole('button', { name: '踏破を記録して戻る', exact: true }).click();
  await expect(page).toHaveURL(/#dungeons\/trials$/);
  await expect(page.locator('.clear-label')).toContainText('踏破済');
  const after = await page.evaluate(async () => {
    const { loadSave } = await import('/src/platform/save.ts'); const save = (await loadSave())!;
    return { gold: save.gold, stones: save.stones, materials: save.materials, ownedIds: save.ownedIds };
  });
  expect(after).toEqual(before);
});
