import { test, expect, type Page } from '@playwright/test';
import type { GameSave } from '../src/domain/types';

async function stored(page: Page): Promise<GameSave> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('stillveil-save', 1);
    open.onsuccess = () => { const db = open.result; const tx = db.transaction('state'); const req = tx.objectStore('state').get('save'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); };
    open.onerror = () => reject(open.error);
  }));
}
async function openDungeon(page: Page) {
  await page.goto('/#dungeons');
  await page.getByRole('button', { name: '探索の準備' }).first().click();
  await page.getByRole('button', { name: '探索を始める' }).click();
  await expect.poll(async () => (await stored(page))?.battle?.id).toBeTruthy();
}
async function step(page: Page) {
  const before = await stored(page);
  if (!before.battle) throw new Error('Missing exploration');
  const name = before.battle.phase === 'playing' ? '次の演出へ' : 'ラウンドを進める';
  await page.getByRole('button', { name, exact: true }).click();
  await expect.poll(async () => (await stored(page)).revision).toBeGreaterThan(before.revision);
}

test('mobile common UI, flavor details and leader change remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '旅の支度' })).toBeVisible();
  await page.goto('/#party');
  await page.getByRole('button', { name: 'リーダーにする' }).first().click();
  await expect.poll(async () => (await stored(page)).leaderId).toBe('elaine');
  await page.getByRole('button', { name: /^エレイン/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'リーダースキル', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('full exploration preserves provisional rewards across reload and claims only once', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await openDungeon(page);
  let reloaded = false;
  for (let i = 0; i < 300; i++) {
    const save = await stored(page);
    if (save.battle?.phase === 'reward') break;
    expect(save.battle?.phase).not.toBe('failed');
    if (!reloaded && save.battle && Object.keys(save.battle.pendingMaterials).length > 0) {
      const id = save.battle.id;
      expect(Object.values(save.materials).reduce((sum, n) => sum + n, 0)).toBe(0);
      await page.reload();
      await expect.poll(async () => (await stored(page)).battle?.id).toBe(id);
      reloaded = true;
    }
    await step(page);
    // Regression: toast and drop siblings must not reuse keys and leak old DOM.
    expect(await page.locator('.battle-toast').count()).toBeLessThanOrEqual(1);
  }
  expect(consoleErrors).toEqual([]);
  const provisional = await stored(page);
  expect(provisional.battle?.phase).toBe('reward');
  expect(reloaded).toBe(true);
  expect(provisional.materials).toEqual({});
  expect(provisional.stones).toBe(0);
  const amount = Object.values(provisional.battle!.pendingMaterials).reduce((sum, n) => sum + n, 0);
  await page.getByRole('button', { name: '獲得を確定', exact: true }).click();
  await expect.poll(async () => (await stored(page)).battle).toBeNull();
  const claimed = await stored(page);
  expect(claimed.stones).toBe(1);
  expect(Object.values(claimed.materials).reduce((sum, n) => sum + n, 0)).toBe(amount);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ダンジョン', exact: true })).toBeVisible();
  expect((await stored(page)).stones).toBe(1);
  expect((await stored(page)).materials).toEqual(claimed.materials);
});

test('retreat forfeits all provisional materials while retaining earned gold', async ({ page }) => {
  await openDungeon(page);
  for (let i = 0; i < 100; i++) {
    const save = await stored(page);
    if (save.battle?.phase === 'ready' && Object.keys(save.battle.pendingMaterials).length) break;
    await step(page);
  }
  const before = await stored(page);
  expect(Object.keys(before.battle!.pendingMaterials).length).toBeGreaterThan(0);
  expect(before.gold).toBeGreaterThan(100);
  await page.getByRole('button', { name: '撤退', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '撤退する', exact: true }).click();
  await expect(page.getByText('今回の素材は失われました。')).toBeVisible();
  await page.getByRole('button', { name: '街へ戻る', exact: true }).click();
  await expect.poll(async () => (await stored(page)).battle).toBeNull();
  expect((await stored(page)).materials).toEqual({});
  expect((await stored(page)).gold).toBe(before.gold);
});
