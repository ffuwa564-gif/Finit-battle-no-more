import { test, expect, type Page } from '@playwright/test';

type Snapshot = { uid: string; hp: number; maxHp: number; charge: number; side: string };
async function prepare(page: Page, mode: 'attack' | 'heal' | 'ultimate' | 'lethal') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await page.locator('.title-screen__start').waitFor();
  const fixture = await page.evaluate(async mode => {
    const { content } = await import('/src/content/index.ts');
    const { createInitialSave } = await import('/src/application/game.ts');
    const { createBattle, advanceReplay, resolveRound } = await import('/src/domain/engine.ts');
    const { ultimateCharge } = await import('/src/domain/ultimates.ts');
    const { eventHpChanges } = await import('/src/platform/combat-feedback.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!; const save = createInitialSave(content, 42);
    let battle = createBattle(content, save.partyIds, save.leaderId, content.chapters[0].dungeonIds[0], 2, 42, `impact-${mode}`);
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    for (const unit of battle.units) {
      if (unit.side === 'enemy') { unit.attack = 0; unit.speed = 0; unit.hp = mode === 'lethal' ? 1 : 10000; unit.maxHp = 10000; }
      else if (mode === 'heal') unit.hp = Math.floor(unit.maxHp * .5);
      if (unit.characterId === 'seris') { unit.speed = 100; if (mode === 'ultimate') { unit.ultimateCharge = 100; unit.ultimateQueued = true; } }
    }
    battle = resolveRound(battle, content).battle;
    const index = battle.events.findIndex(event => event.unitsAfter && (mode === 'ultimate' ? event.ultimate : mode === 'heal' ? event.kind === 'heal' : event.kind === 'attack' && event.actorId === 'party:seris'));
    if (index < 0) throw new Error(`Missing ${mode} event`);
    battle.cursor = index; const event = battle.events[index];
    let before = battle.initialUnits;
    for (const prior of battle.events.slice(0, index)) if (prior.unitsAfter) before = prior.unitsAfter;
    const snapshot = (units: typeof before) => units.map(unit => ({ uid: unit.uid, hp: unit.hp, maxHp: unit.maxHp, side: unit.side, charge: ultimateCharge(unit) }));
    const expected = { id: event.id, before: snapshot(before), after: snapshot(event.unitsAfter!), changes: eventHpChanges(event, before) };
    if (!expected.changes.length) throw new Error('Fixture has no HP change');
    save.battle = battle; save.settings.reducedMotion = true; save.settings.bgmVolume = 0; save.settings.seVolume = 0;
    save.revision = previous.revision + 1; await persistSave(save, previous.revision); return expected;
  }, mode);
  await page.reload(); await page.locator('.title-screen__start').waitFor();
  // CSS animations use real time even while Playwright's JavaScript clock is paused.
  await page.addStyleTag({ content: '.combat-number { animation-play-state: paused !important; }' });
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.locator('.title-screen__start').click(); await page.clock.runFor(350);
  await page.locator('.battle-layout').waitFor(); await page.clock.runFor(20);
  return fixture;
}
async function expectParty(page: Page, expected: Snapshot[]) {
  for (const unit of expected.filter(unit => unit.side === 'party')) {
    const portrait = page.locator(`.party-unit[data-unit="${unit.uid}"]`);
    await expect(portrait.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(unit.hp));
    await expect(portrait.getByRole('meter')).toHaveAttribute('aria-valuenow', String(unit.charge));
  }
}
for (const mode of ['attack', 'heal', 'lethal'] as const) test(`${mode}: numbers, HP and charge update within the action, without waiting for NEXT`, async ({ page }) => {
  const fixture = await prepare(page, mode);
  for (const change of fixture.changes) {
    const number = page.locator(`.combat-number[data-hp-unit="${change.unitId}"]`);
    await expect(number).toHaveAttribute('data-hp-delta', String(change.amount));
    await expect(number).toHaveCSS('opacity', '1');
  }
  await expectParty(page, fixture.after);
  const enemy = fixture.after.find(unit => fixture.changes.some(change => change.unitId === unit.uid) && unit.side === 'enemy');
  if (enemy) {
    await expect(page.locator('.enemy-page')).toHaveAttribute('data-unit', enemy.uid);
    await expect(page.locator('.enemy-carousel-status [role="progressbar"]')).toHaveAttribute('aria-valuenow', String(enemy.hp));
  }
  // Impact is presentation only; the persisted replay is still on this same event.
  expect(await page.evaluate(async () => { const { loadSave } = await import('/src/platform/save.ts'); const b = (await loadSave())!.battle!; return b.events[b.cursor].id; })).toBe(fixture.id);
});

test('ultimate: old gauges during the wind-up, then exact HP/charge and numbers together at impact after changing speed', async ({ page }, info) => {
  const fixture = await prepare(page, 'ultimate');
  const recipient = fixture.changes.find(change => change.side === 'enemy')!;
  const enemyHP = page.locator('.enemy-carousel-status [role="progressbar"]');
  await expectParty(page, fixture.before);
  await expect(enemyHP).toHaveAttribute('aria-valuenow', String(fixture.before.find(unit => unit.uid === recipient.unitId)!.hp));
  await expect(page.locator('.combat-number')).toHaveCount(0);
  await page.clock.runFor(700);
  await page.getByTitle('演出速度', { exact: true }).click();
  await expect(page.getByTitle('演出速度', { exact: true })).toContainText('2');
  await page.clock.runFor(450); // Still before the retimed impact.
  await expectParty(page, fixture.before);
  await expect(page.locator('.combat-number')).toHaveCount(0);
  await page.clock.runFor(200);
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-phase', 'impact');
  await expectParty(page, fixture.after);
  await expect(enemyHP).toHaveAttribute('aria-valuenow', String(fixture.after.find(unit => unit.uid === recipient.unitId)!.hp));
  await expect(page.locator('.combat-number--ultimate')).toHaveCount(fixture.changes.length);
  for (const change of fixture.changes) await expect(page.locator(`[data-hp-unit="${change.unitId}"]`)).toHaveAttribute('data-hp-delta', String(change.amount));
  // Rescheduling an already landed hit must neither revert the meters nor duplicate numbers.
  await page.getByTitle('演出速度', { exact: true }).click(); await page.clock.runFor(10);
  await expectParty(page, fixture.after);
  await expect(page.locator('.combat-number--ultimate')).toHaveCount(fixture.changes.length);
  await page.screenshot({ path: info.outputPath('impact-gauges-and-number.png') });
});

test('NEXT cancels the skipped ultimate hit and cannot apply a stale snapshot later', async ({ page }) => {
  const fixture = await prepare(page, 'ultimate');
  await page.getByRole('button', { name: '次の演出へ', exact: true }).click();
  await page.clock.runFor(100);
  await page.clock.runFor(1500);
  await expect(page.locator('.combat-number--ultimate')).toHaveCount(0);
  // The previous ultimate result is retained as the baseline of the next replay event.
  const seris = fixture.after.find(unit => unit.uid === 'party:seris')!;
  await expect(page.locator('[data-unit="party:seris"] [role="meter"]')).toHaveAttribute('aria-valuenow', String(seris.charge));
});
