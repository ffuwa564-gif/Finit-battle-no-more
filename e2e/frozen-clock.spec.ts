import { expect, test } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: import('@playwright/test').Page, completedRounds: number | null, accelerated = true) {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#dungeons/trials'); await enterGame(page);
  await page.evaluate(async ({ completedRounds, accelerated }) => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts'); const { content } = await import('/src/content/index.ts'); const { applyCommand } = await import('/src/application/game.ts');
    let save = (await loadSave())!; const revision = save.revision;
    save.seed = 42; save.ownedIds = [...new Set([...save.ownedIds,'eos-standard','selene','seris-awakened','fortuna'])]; save.completedDungeonIds = [...new Set([...save.completedDungeonIds,'silent-cathedral'])];
    save.settings.reducedMotion = true; save.settings.speed = 2;
    save = applyCommand(save, { type: 'party', partyIds: ['eos-standard','selene','seris-awakened','fortuna'], leaderId: accelerated ? 'eos-standard' : 'fortuna' }, content);
    if (completedRounds !== null) {
      save = applyCommand(save, { type: 'depart', dungeonId: 'frozen-dawn-clock', potions: 5 }, content);
      while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
      for (let index = 0; index < (completedRounds === -1 ? 40 : completedRounds); index++) {
        save = applyCommand(save, { type: 'strategy', strategy: 'aggressive' }, content);
        const weak = save.battle!.units.filter(unit => unit.side === 'party' && unit.hp > 0).sort((a,b) => a.hp/a.maxHp-b.hp/b.maxHp)[0]!;
        if (weak.hp < weak.maxHp * .55 && save.battle!.potionsRemaining) save = applyCommand(save, { type: 'potion', unitId: weak.uid }, content);
        const resolved = applyCommand(save, { type: 'round' }, content);
        if (completedRounds === -1 && resolved.battle!.nextPhase === 'reward') break;
        if (completedRounds === -1 && resolved.battle!.nextPhase === 'failed') throw new Error('Fixture team did not reach the winning turn');
        save = resolved;
        while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
      }
    }
    save.revision = revision + 1; await persistSave(save, revision);
  }, { completedRounds, accelerated });
  await page.reload(); await enterGame(page);
}
const readSave = (page: import('@playwright/test').Page) => page.evaluate(async () => (await import('/src/platform/save.ts')).loadSave());

test('the optional trial explains its shield, deadline, and reward-free rules before departure', async ({ page }) => {
  await prepare(page, null);
  const card = page.locator('.dungeon-card').filter({ hasText: '凍暁の大時計' }); await expect(card).toContainText('報酬なし');
  await card.getByRole('button', { name: '探索の準備', exact: true }).click();
  const modal = page.getByRole('dialog'); await expect(modal).toContainText('20ターン目'); await expect(modal).toContainText('1Wave'); await expect(modal).toContainText('障壁破壊');
  await modal.getByRole('button', { name: '探索を始める', exact: true }).click();
  await expect(page.getByRole('status', { name: '大時計の障壁と終鐘', exact: true })).toContainText('終鐘まで 19T');
  await expect(page.locator('.enemy-page-art')).toHaveAttribute('src', /trial-chrona.webp$/);
});

test('breaking the shield reveals the defense window and restores it at the next round', async ({ page }, testInfo) => {
  await prepare(page, 0);
  const clock = page.getByRole('status', { name: '大時計の障壁と終鐘', exact: true }); await expect(clock).toContainText('障壁 170');
  await page.getByRole('button', { name: '攻撃重視', exact: true }).click();
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(clock).toHaveAttribute('data-clock-state', 'broken'); await expect(clock).toContainText('防御低下');
  await page.screenshot({ path: testInfo.outputPath('frozen-clock-break-mobile.png') });
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(clock).toHaveAttribute('data-clock-state', 'shielded'); await expect(clock).toContainText('障壁 170');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('an accelerated real run clears and records the trial without loot or currency rewards', async ({ page }) => {
  await prepare(page, -1); const before = (await readSave(page))!;
  await expect(page.getByRole('status', { name: '戦闘加速', exact: true })).toContainText(`+${(before.battle!.round - 1) * 5}%`);
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.getByRole('heading', { name: '試練踏破', exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.result-panel')).toContainText('戦利品なし・踏破の記録のみ');
  await page.getByRole('button', { name: '踏破を記録して戻る', exact: true }).click();
  const after = (await readSave(page))!; expect(after.completedDungeonIds).toContain('frozen-dawn-clock'); expect(after.gold).toBe(before.gold); expect(after.stones).toBe(before.stones); expect(after.materials).toEqual(before.materials); expect(after.ownedIds).toEqual(before.ownedIds);
});

test('the final bell is forecast at turn 20 and ends an actual run without acceleration', async ({ page }) => {
  await prepare(page, 19, false);
  await expect(page.getByRole('status', { name: '大時計の障壁と終鐘', exact: true })).toContainText('終鐘・発動');
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.getByRole('heading', { name: '挑戦終了', exact: true })).toBeVisible({ timeout: 30000 });
  expect((await readSave(page))!.completedDungeonIds).not.toContain('frozen-dawn-clock');
});
