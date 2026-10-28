import { expect, test, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page) {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.ownedIds = [...new Set([...save.ownedIds, 'eos-standard'])];
    save.partyIds = ['eos-standard', 'liora', 'elaine', 'seris']; save.leaderId = 'eos-standard';
    let battle = createBattle(content, save.partyIds, save.leaderId, content.chapters![0].dungeonIds[0], 2, 42, 'height-check');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    save.battle = battle; save.settings.reducedMotion = true;
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page); await page.evaluate(() => document.fonts.ready);
}
async function effects(page: Page, enabled: boolean) {
  await page.evaluate(async enabled => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision, battle = save.battle!;
    for (const unit of battle.units.filter(u => u.side === 'party')) {
      unit.barrier = enabled ? 170 : 0; unit.barrierUntil = enabled ? 4 : undefined;
      unit.regenUntil = unit.buffUntil = unit.debuffUntil = unit.statusWardUntil = enabled ? 4 : undefined;
      unit.guardTarget = enabled ? battle.units.find(u => u.side === 'party' && u.uid !== unit.uid)!.uid : undefined;
      unit.guardUntil = enabled ? 4 : undefined;
      unit.ailments = enabled ? { sleep: { turns: 2, sourceId: battle.units.find(u => u.side === 'enemy')!.uid }, paralysis: { turns: 2, sourceId: battle.units.find(u => u.side === 'enemy')!.uid } } : {};
    }
    save.revision++; await persistSave(save, revision);
  }, enabled);
  await page.reload(); await enterGame(page); await page.evaluate(() => document.fonts.ready);
}
async function positions(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => { const r = document.querySelector(selector)!.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height }; };
    return { frame: rect('.battle-layout'), scene: rect('.battle-scene'), party: rect('.party-strip'), advance: rect('.moon-command--advance'), width: innerWidth, pageWidth: document.documentElement.scrollWidth };
  });
}
for (const viewport of [{ width: 390, height: 844 }, { width: 390, height: 660 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`battle positions remain stable with many status badges at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await prepare(page);
    const before = await positions(page);
    await expect(page.locator('.ultimate-hint')).toHaveCount(0);
    await page.screenshot({path: info.outputPath('empty-status-layout.png'), fullPage:true});
    await effects(page, true); await expect(page.locator('.party-strip .unit-effects-summary')).toHaveCount(4);
    const after = await positions(page);
    expect(Math.abs(after.frame.height - before.frame.height)).toBeLessThan(1);
    expect(Math.abs(after.party.top - before.party.top)).toBeLessThan(1);
    expect(Math.abs(after.advance.top - before.advance.top)).toBeLessThan(1);
    expect(after.advance.bottom).toBeLessThanOrEqual(after.frame.bottom);
    expect(after.scene.height).toBeGreaterThanOrEqual(260);
    const controls = await page.locator('.moon-command--strategy').first().boundingBox();
    expect(controls!.height).toBeGreaterThanOrEqual(82);
    expect(controls!.height).toBeLessThanOrEqual(88);
    const overlay = await page.locator('.party-unit').first().evaluate(el => {
      const portrait = el.querySelector('.portrait-image')!.getBoundingClientRect();
      const icons = el.querySelector('.unit-effects-summary')!.getBoundingClientRect();
      const meter = el.querySelector('.ultimate-meter')!.getBoundingClientRect();
      return { inside: icons.top >= portrait.top && icons.bottom <= portrait.bottom && icons.left >= portrait.left && icons.right <= portrait.right, gapBelow: el.getBoundingClientRect().bottom - meter.bottom };
    });
    expect(overlay.inside).toBe(true);
    expect(overlay.gapBelow).toBeLessThanOrEqual(2);
    expect(after.pageWidth).toBeLessThanOrEqual(after.width);
    await page.screenshot({ path: info.outputPath('status-layout.png'), fullPage: true });
    const status = page.locator('.party-strip .unit-effects-summary').first();
    await status.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.unit-effects-details li')).toHaveCount(8);
    await expect(page.getByRole('dialog')).toContainText('残り2回の行動');
    await expect(page.getByRole('dialog')).toContainText('ダメージを肩代わり');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(Math.abs((await positions(page)).advance.top - before.advance.top)).toBeLessThan(1);
    await page.getByRole('button', { name: /^回復薬 / }).click();
    expect(Math.abs((await positions(page)).advance.top - before.advance.top)).toBeLessThan(1);
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await effects(page, false);
    expect(Math.abs((await positions(page)).advance.top - before.advance.top)).toBeLessThan(1);
    await page.setViewportSize({ width: viewport.width, height: viewport.height + 80 });
    const resized = await positions(page);
    expect(resized.advance.bottom).toBeLessThanOrEqual(resized.frame.bottom);
  });
}
