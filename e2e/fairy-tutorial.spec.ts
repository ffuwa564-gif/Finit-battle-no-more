import { skipStory } from './boot';
import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';
test.beforeEach(({ page }) => page.setDefaultTimeout(15000));
async function stored(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!); }
const card = (page: Page) => page.locator('.fairy-guide');
async function start(page: Page) {
  await page.goto('/'); await enterGame(page);
  await page.getByRole('button', { name: '案内をお願い！', exact: true }).click();
  await expect(card(page)).toBeVisible();
}

test('Lumi offers optional guidance, highlights real buttons, and never changes the save during lessons', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await enterGame(page);
  const before = await stored(page);
  await expect(page.getByRole('region', { name: '案内妖精リュミ', exact: true })).toBeVisible();
  await expect(page.locator('.fairy-invitation')).toBeVisible();
  await page.getByRole('button', { name: '案内をお願い！', exact: true }).click();
  await expect(card(page)).toContainText('旅は、仲間選びから');
  await expect(page.locator('.fairy-guide-highlight')).toBeVisible();
  await page.screenshot({ path: info.outputPath('lumi-home-mobile.png'), fullPage: false });
  await card(page).getByRole('button', { name: '次へ', exact: true }).click();
  await expect(card(page)).toContainText('新しい縁を結びたいときは');
  await page.reload(); await enterGame(page);
  await expect(card(page)).toHaveCount(0);
  await expect(page.locator('.fairy-invitation')).toHaveCount(0);
  await page.getByRole('button', { name: '妖精に教えてもらう', exact: true }).click();
  await expect(card(page)).toContainText('新しい縁を結びたいときは');
  await card(page).getByRole('button', { name: '次へ', exact: true }).click();
  await expect(card(page)).toContainText('準備ができたら、ここ！');
  await card(page).getByRole('button', { name: 'この案内を閉じる', exact: true }).click();
  await expect(card(page)).toHaveCount(0);
  expect(await stored(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('the highlighted control remains usable, character dialogs suspend help, and Escape skips durably', async ({ page }) => {
  await start(page);
  await expect(page.getByRole('button', { name: 'このボタンへ', exact: true })).toHaveCount(0);
  await page.locator('[data-guide="home-party"]').focus();
  await page.keyboard.press('Enter');
  await expect(card(page)).toContainText('この子が、みんなの先頭！');
  await page.locator('.character-card button').first().click();
  await expect(page.getByRole('dialog').filter({ has: page.locator('.character-detail') })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(card(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card(page)).toHaveCount(0);
  await page.reload(); await enterGame(page);
  await expect(card(page)).toHaveCount(0);
  await page.goto('/#settings');
  await page.getByRole('button', { name: '妖精に教えてもらう', exact: true }).click();
  await expect(card(page)).toContainText('旅の記録を、大切に');
});

test('departure guidance is inside its modal and battle lessons neither start rounds nor spend potions', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await page.locator('[data-guide="home-dungeons"]').click();
  await expect(card(page)).toContainText('少しずつ、先の章へ');
  await card(page).getByRole('button', { name: '次へ', exact: true }).click();
  await expect(card(page)).toContainText('出発前に、ひと呼吸');
  await page.locator('[data-guide="prepare"]').first().click();
  const preparation = page.getByRole('dialog').filter({ has: page.locator('[data-guide="depart"]') });
  await expect(preparation.locator('.fairy-guide')).toContainText('お薬、持っていく？');
  expect((await stored(page)).battle).toBeNull();
  await preparation.locator('.fairy-guide').getByRole('button', { name: '次へ', exact: true }).click();
  await expect(card(page)).toContainText('さあ、いってみよう！');
  await preparation.locator('[data-guide="depart"]').click();
  await expect(card(page)).toContainText('いくよ、ATTACK！');
  const before = await stored(page);
  for (let index = 0; index < 3; index++) await card(page).getByRole('button', { name: '次へ', exact: true }).click();
  await expect(card(page)).toContainText('必殺ゲージにも注目！');
  await page.screenshot({ path: info.outputPath('lumi-battle-mobile.png') });
  expect(await stored(page)).toEqual(before);
  await card(page).getByRole('button', { name: 'この案内を閉じる', exact: true }).click();
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect.poll(async () => (await stored(page)).battle!.round).toBeGreaterThan(before.battle!.round);
});

test('English lessons fit small and large screens, and skipping leaves normal play accessible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => localStorage.setItem('stillveil-language', 'en'));
  await page.goto('/'); await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click();await skipStory(page);
  await page.getByRole('button', { name: 'Show Me Around!', exact: true }).click();
  await expect(card(page)).toContainText('Every Journey Needs Companions');
  expect(await card(page).innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const box = await card(page).boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(card(page)).toBeVisible();
  await card(page).getByRole('button', { name: 'Skip the Guide', exact: true }).click();
  await expect(card(page)).toHaveCount(0);
  await page.locator('[data-guide="home-dungeons"]').click();
  await expect(page.getByRole('heading', { name: 'Dungeons', exact: true })).toBeVisible();
});

test('gacha advice highlights the real summon without spending stones or consuming the guarantee', async ({ page }) => {
  await start(page);
  await page.locator('[data-guide="home-gacha"]').click();
  await expect(card(page)).toContainText('どんな出会いにしよう？');
  const before = await stored(page);
  await card(page).getByRole('button', { name: '次へ', exact: true }).click();
  await expect(card(page)).toContainText('大切な石を使う前に');
  await expect(page.locator('[data-guide="gacha-draw"]')).toHaveAttribute('aria-describedby', /.+/);
  expect(await stored(page)).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-guide="gacha-draw"]')).not.toHaveAttribute('aria-describedby', /.+/);
});

test('blocked tutorial preferences cannot prevent normal play or skipping', async ({ page }) => {
  await page.addInitScript(() => {
    const read = Storage.prototype.getItem, write = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key === 'stillveil-fairy-tutorial-v1') throw new DOMException('Blocked', 'SecurityError'); return read.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key === 'stillveil-fairy-tutorial-v1') throw new DOMException('Blocked', 'SecurityError'); return write.call(this, key, value); };
  });
  await start(page);
  await card(page).getByRole('button', { name: '案内をスキップ', exact: true }).click();
  await expect(card(page)).toHaveCount(0);
  await page.locator('[data-guide="home-dungeons"]').click();
  await expect(page.getByRole('heading', { name: 'ダンジョン', exact: true })).toBeVisible();
});


test('the initial invitation is offered once even when ignored', async ({ page }) => {
  await page.goto('/'); await enterGame(page);
  await expect(page.locator('.fairy-invitation')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('stillveil-fairy-tutorial-v1')!).offered)).toBe(true);
  await page.reload(); await enterGame(page);
  await expect(page.locator('.fairy-invitation')).toHaveCount(0);
  await expect(card(page)).toHaveCount(0);
  await page.getByRole('button', { name: '妖精に教えてもらう', exact: true }).click();
  await expect(card(page)).toContainText('旅は、仲間選びから');
});

test('following a highlighted button advances it and each screen retains its own checkpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await page.locator('[data-guide="home-party"]').click();
  await expect(card(page)).toContainText('この子が、みんなの先頭！');
  await card(page).getByRole('button', { name: '次へ', exact: true }).click();
  await expect(card(page)).toContainText('仲間のこと、もっと知ろう');
  await page.goto('/#home');
  await expect(card(page)).toContainText('新しい縁を結びたいときは');
  await page.goto('/#party');
  await expect(card(page)).toContainText('仲間のこと、もっと知ろう');
  await page.reload(); await enterGame(page);
  await expect(card(page)).toHaveCount(0);
  await page.getByRole('button', { name: '妖精の案内', exact: true }).click();
  await expect(card(page)).toContainText('仲間のこと、もっと知ろう');
  await card(page).getByRole('button', { name: 'この案内を閉じる', exact: true }).click();
  await page.goto('/#home');
  await expect(card(page)).toContainText('新しい縁を結びたいときは');
  await page.goto('/#party');
  await expect(card(page)).toHaveCount(0);
});

test('old enrolled preferences do not reopen automatically after the update', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('stillveil-fairy-tutorial-v1')) localStorage.setItem('stillveil-fairy-tutorial-v1', JSON.stringify({ version: 1, enrolled: true, dismissed: false, topic: 'home', step: 1, seen: ['party'] }));
  });
  await page.goto('/'); await enterGame(page);
  await expect(card(page)).toHaveCount(0); await expect(page.locator('.fairy-invitation')).toHaveCount(0);
  await page.getByRole('button', { name: '妖精に教えてもらう', exact: true }).click();
  await expect(card(page)).toContainText('新しい縁を結びたいときは');
  const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('stillveil-fairy-tutorial-v1')!));
  expect(preferences.version).toBe(2); expect(preferences.seen).toEqual(['party']);
});
