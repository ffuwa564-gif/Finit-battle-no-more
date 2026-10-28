import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

const saved = (page: Page) => page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
async function prepare(page: Page, kind?: 'heal' | 'strike', reduced = false) {
  await page.goto('/#dungeons'); await enterGame(page);
  await page.getByRole('button', { name: '探索の準備' }).first().click();
  await page.getByRole('button', { name: '探索を始める', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeEnabled();
  await page.evaluate(async ({ kind, reduced }) => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision, battle = save.battle!;
    battle.round = kind ? 2 : 1; battle.potionUsed = Boolean(kind);
    const ally = battle.units.find(unit => unit.side === 'party')!; ally.hp = kind ? 1 : Math.ceil(ally.maxHp / 2);
    for (const enemy of battle.units.filter(u => u.side === 'enemy')) { enemy.hp = enemy.maxHp = 100000; enemy.attack = 1; }
    battle.initialUnits = structuredClone(battle.units);
    battle.blooms = { seed: 42, checked: `0:${battle.round}`, growth: kind ? 3 : 0,
      ...(kind ? { flower: { id: `${battle.id}:flower:0:2`, kind, wave: 0, round: 2 } } : {}) };
    save.settings.reducedMotion = reduced; save.settings.speed = 2;
    save.revision++; await persistSave(save, revision);
  }, { kind, reduced });
  await page.reload(); await enterGame(page);
}
const round = (page: Page) => page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
const ready = (page: Page) => expect.poll(async () => (await saved(page)).battle!.phase, { timeout: 30000 }).toBe('ready');

test('saved bloom is already open, heals once back to a bud, and leaves HUD, portraits and paging clear', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page, 'heal');
  const flower = page.getByRole('button', { name: /^癒しの花：/ });
  await expect(flower).toBeEnabled();
  await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-state', 'open');
  await expect(page.locator('.garden-flower-art')).toHaveAttribute('src', /flower-open-poster\.png$/);
  await expect(page.locator('.garden-frame__art')).toHaveCount(1);
  await expect(page.locator('.garden-crystal-art')).toHaveCount(1);
  await expect(page.locator('.garden-frame__bloom-art, .garden-frame__current')).toHaveCount(0);
  await expect(flower).toHaveText(''); await expect(flower.locator('img, svg')).toHaveCount(0);
  const box = await flower.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(48); expect(box!.height).toBeGreaterThanOrEqual(48);
  await expect.poll(() => page.locator('.garden-frame__art').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  await expect(page.locator('.garden-frame__art')).toHaveAttribute('data-animated', 'true');
  const scene = await page.locator('.battle-scene').boundingBox(), frame = await page.locator('.living-frame').boundingBox();
  expect(frame!.y + frame!.height).toBeGreaterThan(scene!.y + scene!.height + 20);
  const status = await page.locator('.enemy-carousel-status').boundingBox();
  expect(status!.x).toBeGreaterThan(frame!.x + frame!.width * .14);
  expect(status!.x + status!.width).toBeLessThan(frame!.x + frame!.width * .86);
  const portrait = await page.locator('.party-strip .portrait-image').first().boundingBox();
  // The painted art ends inside its transparent canvas; preserve a gap above the faces.
  expect(portrait!.y).toBeGreaterThan(frame!.y + frame!.height * .98);
  await page.screenshot({ path: info.outputPath('living-frame-approved-mobile.png'), fullPage: true });
  const before = await saved(page); await flower.click();
  await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-state', 'bud');
  await expect(page.locator('.garden-flower-art')).toHaveAttribute('src', /flower-bud-poster\.png$/);
  await expect(flower).toHaveCount(0); await ready(page);
  const after = await saved(page);
  expect(after.battle!.units.find(u => u.side === 'party')!.hp).toBeGreaterThan(1);
  expect(after.battle!.round).toBe(2); expect(after.battle!.potionUsed).toBe(true); expect(after.potions).toBe(before.potions);
  await page.reload(); await enterGame(page); await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-state', 'bud');
  const front = await page.locator('.enemy-page').getAttribute('data-enemy-id');
  await page.getByRole('button', { name: '次の敵を表示', exact: true }).click();
  await expect(page.locator('.enemy-page')).not.toHaveAttribute('data-enemy-id', front!); expect(errors).toEqual([]);
});

test('fresh bloom opens once, survives ATTACK, then a later bloom gets a fresh opening', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await prepare(page);
  const frame = page.locator('.living-frame'); await expect(frame).toHaveAttribute('data-bloom-state', 'bud');
  await round(page); await expect(frame).toHaveAttribute('data-bloom-state', 'opening', { timeout: 30000 });
  await expect(page.locator('.battle-bloom')).toBeDisabled();
  await expect.poll(() => page.locator('.garden-flower-art').getAttribute('src')).toMatch(/^blob:/);
  const firstURL = await page.locator('.garden-flower-art').getAttribute('src');
  const firstId = (await saved(page)).battle!.blooms!.flower!.id;
  // The player can keep fighting while the presentation opens; that does not discard or restart it.
  await round(page); await ready(page); await expect(frame).toHaveAttribute('data-bloom-state', 'open', { timeout: 15000 });
  const openSave = await saved(page); expect(openSave.battle!.blooms!.flower!.id).toBe(firstId);
  await expect(page.locator('.battle-bloom')).toBeEnabled();
  const currentRound = openSave.battle!.round; await page.locator('.battle-bloom').click(); await ready(page);
  expect((await saved(page)).battle!.round).toBe(currentRound); await expect(frame).toHaveAttribute('data-bloom-state', 'bud');
  for (let i = 0; i < 3; i++) { await round(page); await ready(page); if ((await saved(page)).battle!.blooms!.flower) break; }
  await expect(frame).toHaveAttribute('data-bloom-state', 'opening');
  await expect.poll(() => page.locator('.garden-flower-art').getAttribute('src')).toMatch(/^blob:/);
  expect(await page.locator('.garden-flower-art').getAttribute('src')).not.toBe(firstURL);
  await expect(frame).toHaveAttribute('data-bloom-state', 'open', { timeout: 15000 });
  const before = await saved(page); await page.waitForTimeout(300); expect(await saved(page)).toEqual(before);
  await page.reload(); await enterGame(page); await expect(frame).toHaveAttribute('data-bloom-state', 'open');
});

test('320px reduced motion uses open/bud posters and keyboard harvest applies crystal damage', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, 'strike', true); await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  const flower = page.getByRole('button', { name: /^Mooncrystal Blossom:/ }); await expect(flower).toBeEnabled();
  await expect(page.locator('.garden-frame__art')).toHaveAttribute('data-animated', 'false');
  await expect(page.locator('.garden-crystal-art')).toHaveAttribute('data-animated', 'false');
  await expect(page.locator('.garden-flower-art')).toHaveAttribute('src', /flower-open-poster\.png$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const counter = await page.locator('.enemy-carousel-position').boundingBox(); expect(counter!.height).toBeLessThan(32);
  const flowerBox = await flower.boundingBox();
  for (const arrow of await page.locator('.enemy-carousel-arrow').all()) {
    const b = await arrow.boundingBox();
    const overlaps = flowerBox!.x < b!.x + b!.width && flowerBox!.x + flowerBox!.width > b!.x && flowerBox!.y < b!.y + b!.height && flowerBox!.y + flowerBox!.height > b!.y;
    expect(overlaps).toBe(false);
  }
  await page.screenshot({ path: info.outputPath('living-frame-approved-320.png'), fullPage: true });
  const before = await saved(page), hp = before.battle!.units.filter(u => u.side === 'enemy').reduce((s,u) => s + u.hp, 0);
  await flower.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-state', 'bud');
  const after = await saved(page); expect(after.battle!.units.filter(u => u.side === 'enemy').reduce((s,u) => s + u.hp, 0)).toBeLessThan(hp);
  expect(after.battle!.round).toBe(2);
});

test('failed motion downloads still allow a new flower to be harvested', async ({ page }) => {
  await page.route('**/art/living-garden/*.webp', route => route.abort());
  await prepare(page); await round(page); await ready(page);
  await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-state', 'open', { timeout: 10000 });
  await expect(page.locator('.garden-frame__art')).toHaveAttribute('data-animated', 'false');
  await expect(page.locator('.battle-bloom')).toBeEnabled();
  await page.locator('.battle-bloom').click(); await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-state', 'bud');
});
