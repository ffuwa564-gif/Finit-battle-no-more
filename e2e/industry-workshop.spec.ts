import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';
async function read(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!); }
async function boot(page: Page, hash = 'home') {
  await page.addInitScript(() => localStorage.setItem('stillveil-fairy-tutorial-v1', JSON.stringify({ version: 2, enrolled: false, dismissed: true, seen: [] })));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#' + hash); await enterGame(page);
}
async function win(page: Page, index: number) {
  await page.evaluate(async i => {
    const { content } = await import('/src/content/index.ts'); const { createBattle } = await import('/src/domain/engine.ts'); const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const s = (await loadSave())!, revision = s.revision; const id = content.chapters![0].dungeonIds[i];
    s.battle = createBattle(content, s.partyIds, s.leaderId, id, 0, 42, 'industry-ui-' + i); s.battle.phase = s.battle.nextPhase = 'reward'; s.battle.cursor = s.battle.events.length;
    s.settings.reducedMotion = true; s.revision++; await persistSave(s, revision);
  }, index);
  await page.reload(); await enterGame(page);
  await expect(page.locator('.campaign-story')).toHaveCount(0);
  await expect(page.locator('.industry-dungeon-resources')).toContainText('持ち帰る工房資源');
  await page.getByRole('button', { name: '獲得を確定', exact: true }).click();
  await expect.poll(async () => (await read(page)).battle).toBeNull();
}
test('dungeon resources build a real workshop and an automatic furnace while travel remains on the map', async ({ page }, info) => {
  await boot(page); await win(page, 0);
  expect((await read(page)).industry!.stock.timber).toBe(4);
  await page.goto('/#bag/workshop'); await expect(page.getByRole('heading', { name: '旅の工房' })).toBeVisible();
  await page.clock.install();
  await page.getByRole('button', { name: '加工する · 作業台', exact: true }).click();
  await expect.poll(async () => (await read(page)).industry!.job?.recipeId).toBe('bench');
  await page.goto('/#dungeons');
  await page.clock.fastForward(13000);
  await expect.poll(async () => (await read(page)).industry!.stock.bench).toBe(1);
  await page.goto('/#bag/workshop/bench');
  await page.getByRole('button', { name: '装置を設置 · 作業台', exact: true }).click();
  await expect.poll(async () => Object.keys((await read(page)).industry!.machines)).toContain('bench:1');
  await page.getByRole('button', { name: '次の製作目標 · 精錬炉', exact: true }).click();
  await expect(page.locator('.industry-target')).toContainText('次に集める資源');
  await page.locator('.industry-sources .button').first().click();
  await expect(page.locator('.world-map')).toBeVisible(); await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(page.url()).toContain('dungeons/map/');
  await win(page, 1); await page.goto('/#bag/workshop/furnace');
  await page.getByRole('button', { name: '加工する · 精錬炉', exact: true }).click();
  await page.clock.fastForward(13000);
  await page.getByRole('button', { name: '装置を設置 · 精錬炉', exact: true }).click();
  await page.goto('/#bag/workshop/charcoal');
  await page.getByRole('button', { name: '加工する · 木炭', exact: true }).click(); await page.clock.fastForward(9000);
  await page.getByRole('combobox', { name: '精錬炉 #1', exact: true }).selectOption('iron');
  await page.clock.fastForward(31000); await page.getByRole('button', { name: '生産を更新', exact: true }).click();
  await expect.poll(async () => (await read(page)).industry!.stock.iron).toBe(6);
  const s = await read(page); expect(s.industry!.stock.charcoal).toBe(0); expect(s.industry!.stock.ore).toBe(0);
  await page.screenshot({ path: info.outputPath('automatic-furnace.png') });
  await page.reload(); await enterGame(page); await expect(page.locator('.industry-machine')).toContainText(['作業台', '精錬炉']);
  for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, offenders: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => el.className + ':' + el.textContent?.slice(0,50)) })); expect(layout.overflow, JSON.stringify({width, ...layout})).toBe(false); }
});
test('chapter three explains a craft requirement and links it to the workshop without resetting progress', async ({ page }, info) => {
  await boot(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts'); const { startWorldStory, defaultHero } = await import('/src/domain/world-story.ts'); const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const s = (await loadSave())!, revision = s.revision; s.worldStory = startWorldStory(s, content, defaultHero, 'beginning'); s.worldStory.carriedChapters = [1, 2]; s.worldStory.notified = ['sealed-city-crisis']; s.worldStory.completed = ['c3-visit', 'c3-record', 'c3-evacuate', 'c3-bridge']; s.completedDungeonIds = content.chapters!.slice(0, 2).flatMap(c => c.dungeonIds).concat(content.chapters![2].dungeonIds.slice(0, 10)); s.settings.reducedMotion = true; s.revision++; await persistSave(s, revision);
  });
  await page.reload(); await enterGame(page);
  await expect(page.getByTestId('home-journey-goal')).toContainText('水門の操作輪を作る');
  await page.getByRole('button', { name: '次の目的地へ', exact: true }).click();
  await expect(page.getByRole('heading', { name: '旅の工房' })).toBeVisible();
  await expect(page.locator('.industry-target')).toContainText('水門の操作輪');
  await expect(page.locator('.industry-target')).toContainText('根に流れ込む力');
  await page.screenshot({ path: info.outputPath('chapter-three-crafting-guidance.png') });
  await page.goto('/#dungeons'); await expect(page.locator('.world-next-action')).toContainText('水門の操作輪を作る');
  const before = (await page.locator('.world-map').boundingBox())!.height;
  await page.getByRole('button', { name: '地図を広く表示', exact: true }).click();
  await expect.poll(async () => (await page.locator('.world-map').boundingBox())!.height).toBeGreaterThan(before + 40);
  await expect(page.getByRole('navigation', { name: 'モバイルメニュー', exact: true })).toBeHidden();
  await page.getByRole('button', { name: '地図の表示を戻す', exact: true }).click();
  await page.getByRole('button', { name: '目標の案内を隠す', exact: true }).click(); await expect(page.locator('.world-next-action')).toHaveCount(0);
  await page.locator('.world-objective-dock__trigger').click(); await expect(page.getByRole('dialog')).toContainText('水門の操作輪を作る');
});
test('landmarks and labels remain at their geographic anchors through zoom and pan', async ({ page }, info) => {
  await boot(page, 'dungeons');
  const measure = () => page.evaluate(() => {
    const pin = document.querySelector('[aria-label="旅人の灯"].world-pin')!, land = document.querySelector('.world-map__land')!;
    const p = pin.getBoundingClientRect(), l = land.getBoundingClientRect(), label = pin.querySelector('.world-pin__label')!.getBoundingClientRect();
    return { errorX: Math.abs(p.x + p.width / 2 - (l.x + l.width * .24)), errorY: Math.abs(p.y + p.height / 2 - (l.y + l.height * .53)), width: p.width, labelX: label.x + label.width / 2, pinX: p.x + p.width / 2 };
  });
  await page.evaluate(() => document.fonts.ready);
  const initial = await measure();
  for (let i = 0; i < 4; i++) {
    const m = await measure(); expect(m.errorX).toBeLessThan(1); expect(m.errorY).toBeLessThan(1); expect(Math.abs(m.labelX - m.pinX)).toBeLessThan(1); expect(Math.abs(m.width - initial.width)).toBeLessThan(1);
    await page.getByRole('button', { name: '拡大', exact: true }).click();
  }
  const surface = page.locator('.world-map__surface'); await surface.focus(); await page.keyboard.press('ArrowRight');
  const moved = await measure(); expect(moved.errorX).toBeLessThan(1); expect(moved.errorY).toBeLessThan(1); expect(Math.abs(moved.labelX - moved.pinX)).toBeLessThan(1);
  await page.screenshot({ path: info.outputPath('zoom-anchored-map.png') });
});
