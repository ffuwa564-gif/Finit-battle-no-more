import { test, expect, type Page } from '@playwright/test';
import { enterGame, skipStory } from './boot';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test.beforeEach(({ page }) => page.setDefaultTimeout(15000));
async function setup(page: Page, english = false) {
  if (english) await page.addInitScript(() => localStorage.setItem('stillveil-language', 'en'));
  await page.goto('/');
  if (english) { await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click(); await skipStory(page); }
  else await enterGame(page);
  await page.evaluate(async reduced => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.partyIds = ['liora', 'seris']; save.leaderId = 'liora';
    let battle = createBattle(content, save.partyIds, save.leaderId, 'oath-chain-rehearsal', 0, 42, 'coordination-browser');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    for (const unit of battle.units) {
      unit.hp = unit.maxHp = 10000;
      unit.attack = unit.side === 'enemy' ? 0 : 40;
      unit.defense = 0;
      unit.speed = unit.characterId === 'liora' ? 100 : unit.side === 'party' ? 80 : 0;
    }
    battle.initialUnits = structuredClone(battle.units); save.battle = battle; save.settings.reducedMotion = reduced; save.revision++;
    await persistSave(save, revision);
  }, english);
  await page.reload();
  if (english) await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  else await enterGame(page);
}
async function battle(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.battle!); }
async function plan(page: Page) {
  return page.evaluate(async () => {
    const { coordinationPlan } = await import('/src/domain/engine.ts');
    const { content } = await import('/src/content/index.ts');
    const { loadSave } = await import('/src/platform/save.ts');
    return coordinationPlan((await loadSave())!.battle!, content)!;
  });
}
async function display(page: Page, id: string) {
  for (let attempts = 0; attempts < 8; attempts++) {
    if (await page.locator('.enemy-page').getAttribute('data-enemy-id') === id) return;
    await page.getByRole('button', { name: /^(次の敵を表示|Next Enemy)$/ }).click();
  }
  throw new Error('Expected target never appeared');
}

test('read an ally plan before committing, preserve it while choosing, and attack its numbered target together', async ({ page }, info) => {
  await setup(page);
  const before = await plan(page); expect(before.mode).toBe('strike');
  const partner = page.locator(`.companion-choice__bubble[data-planned-actor="${before.partnerId}"]`);
  await expect(partner).toBeVisible(); await expect(partner).toHaveAttribute('data-coordination-partner', 'strike');
  const target = before.targetIds[0];
  const enemyNumber = (await battle(page)).units.filter(unit => unit.side === 'enemy').findIndex(unit => unit.uid === target) + 1;
  await expect(partner).toContainText('#' + enemyNumber);
  await display(page, target);
  await page.screenshot({ path: info.outputPath('coordination-ready-mobile.png') });
  await page.locator('[data-pilot] .character-portrait').click();
  await expect(page.locator('[data-coordination-reference]')).toBeVisible();
  await expect(page.locator('[data-coordination-reference]')).toContainText('#' + enemyNumber);
  await page.screenshot({ path: info.outputPath('coordination-palette-mobile.png') });
  await page.locator('[data-command="attack"]').click();
  expect(await plan(page)).toEqual(before);
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect.poll(async () => (await battle(page)).events.some(event => event.coordinationAction === 'linked')).toBe(true);
  expect((await battle(page)).events.some(event => event.coordinationAction === 'isolated')).toBe(false);
});

test('choosing another visible enemy commits that target and causes the warned isolated counter', async ({ page }) => {
  await setup(page);
  const before = await plan(page);
  const other = (await battle(page)).units.find(unit => unit.side === 'enemy' && !before.targetIds.includes(unit.uid))!;
  expect(other).toBeDefined();
  await display(page, other.uid);
  await page.locator('[data-pilot] .character-portrait').click();
  await page.locator('[data-command="attack"]').click();
  expect((await battle(page)).focusTargetId).toBe(other.uid);
  const hp = (await battle(page)).units.find(unit => unit.characterId === 'liora')!.hp;
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect.poll(async () => (await battle(page)).events.some(event => event.coordinationAction === 'isolated')).toBe(true);
  const after = await battle(page);
  const recoil = after.events.find(event => event.coordinationAction === 'isolated')!;
  expect(recoil.targetIds).toContain('party:liora'); expect(recoil.amount).toBe(3600); // 40% of 10,000 HP, reduced by Liora's 10% leader protection.
  expect(after.units.find(unit => unit.characterId === 'liora')!.hp).toBeLessThanOrEqual(hp - recoil.amount!);
  expect(after.pendingMaterials).toEqual({});
});

test('narrow reduced-motion English plans remain readable and self-defense is a safe response', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 }); await setup(page, true);
  const before = await plan(page);
  const partner = page.locator(`.companion-choice__bubble[data-planned-actor="${before.partnerId}"]`);
  await expect(partner).toBeVisible();
  expect(await partner.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await page.locator('[data-pilot] .character-portrait').focus(); await page.keyboard.press('Enter');
  const reference = page.locator('[data-coordination-reference]'); await expect(reference).toBeVisible();
  expect(await reference.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await page.screenshot({ path: info.outputPath('coordination-palette-english-320.png') });
  await page.locator('[data-command="guard"]').click();
  await page.getByRole('button', { name: 'Advance Round', exact: true }).click();
  await expect.poll(async () => (await battle(page)).phase).toBe('playing');
  expect((await battle(page)).events.some(event => event.coordinationAction === 'isolated')).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('defeated enemies do not renumber the surviving target or the ally declaration', async ({ page }) => {
  await setup(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    const battle = save.battle!;
    battle.units.find(unit => unit.side === 'enemy')!.hp = 0;
    battle.initialUnits = structuredClone(battle.units); save.revision++;
    await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  const expected = (await plan(page)).targetIds[0];
  await expect(page.locator('.enemy-page')).toHaveAttribute('data-enemy-id', expected);
  await expect(page.locator('.enemy-carousel-position')).toContainText('2 / 2');
  await expect(page.locator('.enemy-formation-number')).toHaveText('#2');
  await expect(page.locator('.companion-choice__bubble[data-choice-state="planned"]')).toContainText('#2');
});
