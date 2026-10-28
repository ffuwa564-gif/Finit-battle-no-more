import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

const saved = (page: Page) => page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
async function prepare(page: Page, kind: 'heal' | 'strike', reduced = false) {
  await page.goto('/#dungeons'); await enterGame(page);
  await page.getByRole('button', { name: '探索の準備' }).first().click();
  await page.getByRole('button', { name: '探索を始める', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeEnabled();
  await page.evaluate(async ({ kind, reduced }) => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision, battle = save.battle!;
    battle.round = 2; battle.potionUsed = true;
    const ally = battle.units.find(unit => unit.side === 'party')!; ally.hp = 1;
    battle.initialUnits = structuredClone(battle.units);
    battle.blooms = { seed: 42, checked: '0:2', flower: { id: `${battle.id}:flower:0:2`, kind, wave: 0, round: 2 } };
    save.settings.reducedMotion = reduced;
    save.revision++; await persistSave(save, revision);
  }, { kind, reduced });
  await page.reload(); await enterGame(page);
}

test('saved healing flower can be tapped once and frame reactions leave turn and potion state intact', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page, 'heal');
  const flower = page.getByRole('button', { name: /^癒しの花：/ });
  await expect(flower).toBeVisible();
  await expect.poll(() => page.locator('.garden-frame__art').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  await expect.poll(() => flower.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  const box = await flower.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(48); expect(box!.height).toBeGreaterThanOrEqual(48);
  await page.screenshot({ path: info.outputPath('living-frame-healing.png'), fullPage: true });
  const before = await saved(page);
  await flower.click();
  await expect(page.locator('.living-frame')).toHaveAttribute('data-cue', 'heal');
  await expect(flower).toHaveCount(0);
  await expect.poll(async () => (await saved(page)).battle!.units.find(u => u.side === 'party')!.hp).toBeGreaterThan(1);
  await expect.poll(async () => (await saved(page)).battle!.phase).toBe('ready');
  const after = await saved(page);
  expect(after.battle!.round).toBe(2); expect(after.battle!.potionUsed).toBe(true); expect(after.potions).toBe(before.potions);
  await page.reload(); await enterGame(page);
  await expect(flower).toHaveCount(0); expect((await saved(page)).battle!.round).toBe(2);
  await expect(page.getByRole('button', { name: '次の敵を表示', exact: true })).toBeEnabled();
  const front = await page.locator('.enemy-page').getAttribute('data-enemy-id');
  await page.getByRole('button', { name: '次の敵を表示', exact: true }).click();
  await expect(page.locator('.enemy-page')).not.toHaveAttribute('data-enemy-id', front!);
  expect(errors).toEqual([]);
});

test('crystal flower supports keyboard, uses attack feedback, and reduced motion keeps both controls and HP working', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, 'strike', true);
  await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  const flower = page.getByRole('button', { name: /^Mooncrystal Blossom:/ });
  await expect(flower).toBeVisible();
  await expect.poll(() => page.locator('.garden-frame__art').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  await expect.poll(() => flower.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  const animated = await page.locator('.living-frame *').evaluateAll(elements => elements.filter(el => getComputedStyle(el).animationName !== 'none').length);
  expect(animated).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: info.outputPath('living-frame-crystal-320.png'), fullPage: true });
  const before = await saved(page), hp = before.battle!.units.filter(u => u.side === 'enemy').reduce((sum,u) => sum + u.hp, 0);
  await flower.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.living-frame')).toHaveAttribute('data-cue', 'strike-flower');
  await expect(flower).toHaveCount(0);
  expect((await saved(page)).battle!.units.filter(u => u.side === 'enemy').reduce((sum,u) => sum + u.hp, 0)).toBeLessThan(hp);
  expect((await saved(page)).battle!.round).toBe(2);
  // An OS preference change also works when the in-game setting is not reduced.
  await page.evaluate(() => { document.documentElement.dataset.motion = 'full'; document.querySelector('.living-frame')!.setAttribute('data-reduced', 'false'); });
  expect(await page.locator('.garden-frame__current').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});
