import { test, expect, type Page } from '@playwright/test';

async function prepare(page: Page, mode: 'single' | 'guard' | 'area', fallback = false) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  if (fallback) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) {
      return /webgl/.test(type) ? null : (original as any).call(this, type, ...args);
    } as typeof original;
  });
  await page.goto('/'); await page.locator('.title-screen__start').waitFor();
  const targets = await page.evaluate(async mode => {
    const { content } = await import('/src/content/index.ts');
    const { createInitialSave } = await import('/src/application/game.ts');
    const { createBattle, advanceReplay, resolveRound } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!, save = createInitialSave(content, 42);
    const dungeon = mode === 'area' ? 'frozen-dawn-clock' : 'moonshield-rehearsal';
    let b = createBattle(content, save.partyIds, save.leaderId, dungeon, 0, 42, `target-${mode}`);
    while (b.phase === 'playing') b = advanceReplay(b, content);
    b.round = mode === 'area' ? content.dungeons.find(d => d.id === dungeon)!.bossClock!.deadline : 3;
    for (const u of b.units) {
      u.hp = u.maxHp = 10000; u.attack = 100; u.defense = 0; u.speed = u.side === 'enemy' ? 100 : 0;
      u.cooldowns = Object.fromEntries(content.characters.find(c => c.id === u.characterId)!.skillIds.map(id => [id,1000]));
    }
    if (mode === 'guard') {
      const ward = b.units.find(u => u.characterId === 'elaine')!, guard = b.units.find(u => u.characterId === 'liora')!;
      ward.hp = 5000; guard.guardTarget = ward.uid; guard.guardUntil = b.round + 1; guard.guardStrength = 14;
    }
    b = resolveRound(b, content).battle; b.cursor = b.events.findIndex(e => e.bossStrike);
    const e = b.events[b.cursor];
    if (!e?.ultimate) throw new Error('Missing enemy ultimate');
    if (mode === 'guard' && e.targetIds?.[0] !== 'party:liora') throw new Error('Guard fixture did not intercept');
    save.battle = b; save.settings = { ...save.settings, reducedMotion: false, speed: 1, bgmVolume: 0, seVolume: 0 };
    save.revision = previous.revision + 1; await persistSave(save, previous.revision);
    return e.targetIds!;
  }, mode);
  await page.reload(); await page.locator('.title-screen__start').waitFor();
  await page.evaluate(async () => { await import('/src/ui/ultimate-pixi.ts'); });
  await page.locator('.title-screen__start').click();
  await expect(page.locator('.ultimate-cinematic--enemy')).toBeVisible();
  return targets;
}

test('enemy Pixi canvas is on the party row, never on the attacking enemy', async ({ page }, info) => {
  await prepare(page, 'single');
  const cinematic = page.locator('.ultimate-cinematic--enemy');
  // Subscribe before GPU initialization/geometry checks can outlast this phase.
  const impact = page.evaluate(() => new Promise<boolean>(resolve => {
    const element = document.querySelector('.ultimate-cinematic--enemy')!;
    const observer = new MutationObserver(() => {
      if (element.getAttribute('data-phase') === 'impact') { observer.disconnect(); resolve(true); }
    });
    if (element.getAttribute('data-phase') === 'impact') resolve(true);
    else observer.observe(element, { attributes: true, attributeFilter: ['data-phase'] });
  }));
  await expect(cinematic).toHaveAttribute('data-fx-state', 'pixi');
  await expect(cinematic.locator('.ultimate-pixi-canvas, .ultimate-fallback')).toHaveCount(0);
  const canvas = page.locator('.party-strip .ultimate-party-effect .ultimate-pixi-canvas');
  await expect(canvas).toBeAttached();
  const bounds = await canvas.boundingBox(), party = await page.locator('.party-strip').boundingBox();
  const enemy = await page.locator('.enemy-page').boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(party!.y - 2);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(party!.y + party!.height + 2);
  expect(bounds!.y).toBeGreaterThan(enemy!.y + enemy!.height - 8);
  expect(await impact).toBe(true);
  await page.screenshot({ path: info.outputPath('enemy-impact-on-party.png') });
});

for (const mode of ['guard', 'area'] as const) test(`${mode}: WebGL fallback hits the actual recipients only`, async ({ page }) => {
  const targets = await prepare(page, mode, true);
  const cinematic = page.locator('.ultimate-cinematic--enemy');
  await expect(cinematic).toHaveAttribute('data-fx-state', 'fallback');
  await expect(cinematic.locator('.ultimate-fallback')).toHaveCount(0);
  await expect(page.locator('.party-unit > .ultimate-target-fallback')).toHaveCount(targets.length);
  const actual = await page.locator('.ultimate-target-fallback').evaluateAll(nodes => nodes.map(n => (n.parentElement as HTMLElement).dataset.unit).sort());
  expect(actual).toEqual([...targets].sort());
  expect(actual).toHaveLength(mode === 'area' ? 4 : 1);
});
