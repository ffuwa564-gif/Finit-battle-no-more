import { test, expect, type Page } from '@playwright/test';
import { enterGame, skipStory } from './boot';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
async function enter(page: Page, english: boolean) {
  if (english) { await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click(); await skipStory(page); }
  else await enterGame(page);
}
async function setup(page: Page, english = false) {
  if (english) await page.addInitScript(() => localStorage.setItem('stillveil-language', 'en'));
  await page.goto('/'); await enter(page, english);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    let battle = createBattle(content, save.partyIds, save.leaderId, 'hollow-gate', 0, 42, 'pressure-browser');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    while (battle.wave < content.dungeons.find(stage => stage.id === 'hollow-gate')!.waves.length - 1) {
      battle.phase = 'playing'; battle.nextPhase = 'wave'; battle.events = []; battle.cursor = 0;
      while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    }
    battle.round = 2;
    const boss = battle.units.find(unit => unit.side === 'enemy' && unit.boss)!;
    boss.hp = boss.maxHp = 1000;
    battle.initialUnits = structuredClone(battle.units);
    save.battle = battle; save.settings.reducedMotion = true; save.revision++;
    await persistSave(save, revision);
  });
  await page.reload(); await enter(page, english);
}

test('a charging boss remains visible when the player pages to a supporting enemy', async ({ page }, info) => {
  await setup(page);
  const warning = page.getByRole('status', { name: 'ボスの大技予告', exact: true });
  await expect(warning).toHaveAttribute('data-boss-pressure', 'charging');
  await expect(warning).toContainText('崩しまで 80');
  await expect(warning).toContainText('先頭狙い');
  const bossId = await warning.getAttribute('data-boss-id');
  await page.getByRole('button', { name: '次の敵を表示', exact: true }).click();
  await expect(page.locator('.enemy-page')).not.toHaveAttribute('data-enemy-id', bossId!);
  await expect(warning).toHaveAttribute('data-boss-id', bossId!);
  await expect(warning).toContainText('崩しまで 80');
  await page.screenshot({ path: info.outputPath('boss-charge-behind-escort.png') });
});

test('English break and opening states fit a narrow screen and survive reloads', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 }); await setup(page, true);
  const warning = page.getByRole('status', { name: 'Boss Heavy-Attack Forecast', exact: true });
  await expect(warning).toContainText('80 HP to break');
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    const boss = save.battle!.units.find(unit => unit.side === 'enemy' && unit.boss)!;
    boss.bossWindup = { round: 2, damage: 80 };
    save.battle!.round = 3; save.battle!.initialUnits = structuredClone(save.battle!.units);
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enter(page, true);
  await expect(warning).toHaveAttribute('data-boss-pressure', 'broken');
  await expect(warning).toContainText('Heavy attack weakened');
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.battle!.round = 4;
    save.battle!.units.find(unit => unit.side === 'enemy' && unit.boss)!.bossRecoveryUntil = 4;
    save.battle!.initialUnits = structuredClone(save.battle!.units);
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enter(page, true);
  await expect(warning).toHaveAttribute('data-boss-pressure', 'open');
  await expect(warning).toContainText('Opening +25%');
  expect(await warning.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const box = await warning.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  const controls = await page.locator('.enemy-carousel-controls').boundingBox();
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(box!.y);
  await page.screenshot({ path: info.outputPath('boss-opening-english-320.png') });
});
