import { test, expect, type Page } from '@playwright/test';
import { skipStory } from '../e2e/boot';
import { content } from '../src/content';
import { createInitialSave } from '../src/application/game';
import { bootMetadata, SAVE_DATABASE, SAVE_STORE } from '../src/platform/save';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ja-JP' });
async function preparation(page: Page) {
  await page.goto('/');
  const game = page.frameLocator('iframe');
  const begin = async () => {
    await game.getByRole('button', { name: /^(タップしてはじめる|Tap to Begin)$/ }).click({ timeout: 15000 });
    await skipStory(game);
  };
  await begin();
  const save = createInitialSave(content, 42);
  save.ownedIds = [...new Set([...save.ownedIds, 'lunette-awakened', 'athena', 'asteria'])];
  save.partyIds = ['lunette-awakened', 'athena', 'asteria', 'elaine']; save.leaderId = 'asteria';
  save.completedDungeonIds = ['last-safety-key']; save.settings.bgmVolume = 0; save.revision = 100;
  await game.locator('.app-shell').evaluate(async (_, fixture) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(fixture.database);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, transaction = db.transaction(fixture.store, 'readwrite'), store = transaction.objectStore(fixture.store);
        store.put(fixture.save, 'save'); store.put(fixture.boot, 'boot');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    location.hash = 'dungeons';
  }, { save, boot: bootMetadata(save), database: SAVE_DATABASE, store: SAVE_STORE });
  await page.reload(); await begin();
  await game.locator('.app-shell').evaluate(() => { location.hash = 'dungeons'; });
  const card = game.locator('.dungeon-card').filter({ has: game.getByRole('heading', { name: '虚ろの門', exact: true }) });
  await card.getByRole('button', { name: '探索の準備', exact: true }).click();
  const modal = game.getByRole('dialog', { name: '虚ろの門', exact: true });
  await expect(modal).toBeVisible();
  return { game, modal };
}

test('preparation portal protects static/animated portraits and text outside the app root', async ({ page, browserName }, info) => {
  const { game, modal } = await preparation(page);
  await expect(game.locator('#root [role="dialog"]')).toHaveCount(0);
  expect(await modal.evaluate(el => !!el.closest('[data-game-surface]'))).toBe(true);
  const name = modal.locator('.portrait-copy strong').nth(1);
  await expect(name).toHaveCSS('user-select', 'none');
  // touch-callout is iOS-only; Linux WebKit exercises the real DOM hit testing
  // and selection policy but does not expose this platform-specific property.
  if (await name.evaluate(() => CSS.supports('-webkit-touch-callout', 'none'))) expect(await name.evaluate(el => getComputedStyle(el).getPropertyValue('-webkit-touch-callout'))).toBe('none');
  for (const media of await modal.locator('.home-party img, .home-party video').all()) {
    await media.scrollIntoViewIfNeeded();
    await expect(media).toHaveCSS('pointer-events', 'none');
    await expect(media).toHaveAttribute('draggable', 'false');
    expect(await media.evaluate(el => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return !!hit && !['IMG', 'VIDEO'].includes(hit.tagName);
    })).toBe(true);
  }
  const video = modal.locator('video').first();
  await expect(video).toHaveJSProperty('controls', false);
  await expect(video).toHaveJSProperty('muted', true);
  for (const element of [name, modal.locator('.home-party img').last()]) {
    expect(await element.evaluate(el => ['selectstart', 'contextmenu', 'dragstart'].map(type => !el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))))).toEqual([true, true, true]);
  }
  await name.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range); });
  await expect.poll(() => name.evaluate(() => getSelection()?.toString())).toBe('');
  await page.screenshot({ path: info.outputPath(`preparation-${browserName}.png`) });
  // Game controls still work; hiding native hit targets must not block departure.
  await modal.getByRole('button', { name: '探索を始める', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(game.locator('.battle-layout')).toBeVisible();
});

test('the same portal contract preserves editable selection, copying and scrolling', async ({ page }) => {
  const { modal } = await preparation(page);
  await modal.evaluate(el => {
    const host = document.createElement('div'); host.dataset.editableProbe = '';
    host.innerHTML = '<textarea aria-label="Editable contract">backup text</textarea><div contenteditable="true" aria-label="Editable rich text"><span>copy this</span></div>';
    el.querySelector('.modal__body')!.append(host);
  });
  const input = modal.getByRole('textbox', { name: 'Editable contract', exact: true });
  await expect(input).toHaveCSS('user-select', 'text');
  expect(await input.evaluate(el => el.dispatchEvent(new Event('contextmenu', { bubbles: true, cancelable: true })))).toBe(true);
  await input.fill('copy me'); await input.evaluate((el: HTMLTextAreaElement) => el.select());
  expect(await input.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart)).toBe(7);
  const rich = modal.locator('[contenteditable] span');
  await expect(rich).toHaveCSS('user-select', 'text');
  await rich.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range); });
  await expect.poll(() => rich.evaluate(() => getSelection()?.toString())).toBe('copy this');
  await modal.locator('.modal__body').evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await modal.locator('.modal__body').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await modal.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(modal).toHaveCount(0);
});

test('current party makes the first companion and leader independently selectable and persists both', async ({ page }, info) => {
  const { game, modal } = await preparation(page);
  await modal.getByRole('button', { name: '閉じる', exact: true }).click();
  await game.locator('.app-shell').evaluate(() => { location.hash = 'party'; });
  const formation = game.getByRole('region', { name: '現在の編成', exact: true });
  await expect(formation.locator('[data-member-id]')).toHaveCount(4);
  await expect(formation.locator('[data-position="1"]')).toHaveAttribute('data-member-id', 'lunette-awakened');
  await expect(formation.locator('.leader-panel')).toContainText(content.characters.find(c => c.id === 'asteria')!.name);
  await formation.locator('[data-member-id="elaine"]').click();
  const first = formation.getByRole('button', { name: 'この仲間を先頭に', exact: true });
  const box = (await first.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThan(100);
  await first.click();
  await expect(formation.locator('[data-position="1"]')).toHaveAttribute('data-member-id', 'elaine');
  await expect(formation.locator('.leader-panel')).toContainText(content.characters.find(c => c.id === 'asteria')!.name);
  await formation.locator('[data-member-id="athena"]').click();
  await formation.getByRole('button', { name: 'この仲間をリーダーに', exact: true }).click();
  await expect(formation.locator('.leader-panel')).toContainText(content.characters.find(c => c.id === 'athena')!.name);
  await expect(formation.locator('[data-position="1"]')).toHaveAttribute('data-member-id', 'elaine');
  await page.screenshot({ path: info.outputPath('current-party-japanese-390.png') });
  await page.reload();
  await game.getByRole('button', { name: 'タップしてはじめる', exact: true }).click(); await skipStory(game);
  await game.locator('.app-shell').evaluate(() => { location.hash = 'party'; });
  await expect(formation.locator('[data-position="1"]')).toHaveAttribute('data-member-id', 'elaine');
  await expect(formation.locator('[data-member-id="athena"]')).toContainText('リーダー');
  await page.setViewportSize({ width: 320, height: 740 });
  await game.locator('.app-shell').evaluate(() => { location.hash = 'settings'; });
  await game.getByRole('button', { name: 'English', exact: true }).click();
  await game.locator('.app-shell').evaluate(() => { location.hash = 'party'; });
  const english = game.getByRole('region', { name: 'Current Party', exact: true });
  await expect(english).toBeVisible();
  expect(await english.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(english.locator('[data-position="1"]')).toContainText('First · Controlled');
  await page.screenshot({ path: info.outputPath('current-party-english-320.png') });
});
