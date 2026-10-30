import { test, expect } from '@playwright/test';

test('enemy boss strike shows its own cut-in and applies party damage only at impact', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await page.locator('.title-screen__start').waitFor();
  const fixture = await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { createInitialSave } = await import('/src/application/game.ts');
    const { createBattle, advanceReplay, resolveRound } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!, save = createInitialSave(content, 42);
    let battle = createBattle(content, save.partyIds, save.leaderId, 'moonshield-rehearsal', 0, 42, 'enemy-cut-in');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    battle.round = 3;
    for (const unit of battle.units) {
      unit.hp = unit.maxHp = 10000; unit.attack = 100; unit.defense = 0;
      unit.speed = unit.side === 'enemy' ? 100 : 0;
      unit.cooldowns = Object.fromEntries(content.characters.find(c => c.id === unit.characterId)!.skillIds.map(id => [id, 1000]));
    }
    battle = resolveRound(battle, content).battle;
    battle.cursor = battle.events.findIndex(e => e.bossStrike);
    const event = battle.events[battle.cursor];
    if (!event.ultimate || event.ultimateName !== '月盾の一撃') throw new Error('Enemy strike missing cinematic');
    const target = event.unitsAfter!.find(u => event.targetIds!.includes(u.uid))!;
    save.battle = battle; save.settings = { ...save.settings, reducedMotion: true, seVolume: 0, bgmVolume: 0 };
    save.revision = previous.revision + 1; await persistSave(save, previous.revision);
    return { id: event.id, target: target.uid, hp: target.hp, before: 10000, name: content.characters.find(c => c.id === battle.units.find(u => u.uid === event.actorId)!.characterId)!.name };
  });
  await page.reload(); await page.locator('.title-screen__start').waitFor();
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.locator('.title-screen__start').click(); await page.clock.runFor(370);
  const cutIn = page.locator('.ultimate-cinematic--enemy');
  await expect(cutIn).toBeVisible(); await expect(cutIn).toHaveAttribute('data-phase', 'intro');
  await expect(cutIn).toHaveAttribute('data-visual', 'eclipse');
  await expect(cutIn).toContainText(fixture.name); await expect(cutIn).toContainText('月盾の一撃');
  await expect(cutIn.locator('.ultimate-recipients')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('enemy-ultimate-intro.png') });
  const hp = page.locator(`.party-unit[data-unit="${fixture.target}"] [role="progressbar"]`);
  await expect(hp).toHaveAttribute('aria-valuenow', String(fixture.before));
  await expect(page.locator('.combat-number--hurt')).toHaveCount(0);
  await page.clock.runFor(1100);
  await expect(hp).toHaveAttribute('aria-valuenow', String(fixture.before));
  await page.clock.runFor(400);
  await expect(cutIn).toHaveAttribute('data-phase', 'impact');
  await expect(hp).toHaveAttribute('aria-valuenow', String(fixture.hp));
  await expect(page.locator(`.combat-number--hurt[data-hp-unit="${fixture.target}"]`)).toHaveAttribute('data-hp-delta', String(fixture.hp - fixture.before));
  expect(await page.evaluate(async () => { const { loadSave } = await import('/src/platform/save.ts'); const b = (await loadSave())!.battle!; return b.events[b.cursor].id; })).toBe(fixture.id);
});
