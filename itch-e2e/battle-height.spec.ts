import { test, expect } from '@playwright/test';
import { skipStory } from '../e2e/boot';
import { content } from '../src/content';
import { createInitialSave } from '../src/application/game';
import { createBattle, advanceReplay } from '../src/domain/engine';
import { bootMetadata, SAVE_DATABASE, SAVE_STORE } from '../src/platform/save';

test('English status badges keep the command area stable inside the nested mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 660 }); await page.goto('/');
  const game = page.frameLocator('iframe');
  const begin = async () => { await game.getByRole('button', { name: 'Tap to Begin', exact: true }).click(); await skipStory(game); await game.locator('.app-shell').evaluate(() => document.fonts.ready); };
  await begin();
  const save = createInitialSave(content, 42);
  save.ownedIds = [...new Set([...save.ownedIds, 'eos-standard'])];
  save.partyIds = ['eos-standard', 'liora', 'elaine', 'seris']; save.leaderId = 'eos-standard';
  let battle = createBattle(content, save.partyIds, save.leaderId, content.chapters![0].dungeonIds[0], 2, 42, 'iframe-height');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  save.battle = battle; save.settings.reducedMotion = true; save.revision = 100;
  // An isolated browser profile receives real engine fixtures, never the user's save.
  async function loadFixture() {
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
    }, { database: SAVE_DATABASE, store: SAVE_STORE, save, boot: bootMetadata(save) });
    await page.reload(); await begin();
  }
  const positions = () => game.locator('.battle-layout').evaluate(el => {
    const frame = el.getBoundingClientRect(), advance = el.querySelector('.moon-command--advance')!.getBoundingClientRect();
    return { height: frame.height, bottom: frame.bottom + scrollY, advance: advance.top + scrollY, advanceBottom: advance.bottom + scrollY };
  });
  await loadFixture(); const before = await positions();
  for (const unit of save.battle!.units.filter(u => u.side === 'party')) {
    unit.barrier = 170; unit.barrierUntil = unit.regenUntil = unit.buffUntil = unit.debuffUntil = unit.statusWardUntil = 4;
  }
  save.revision++; await loadFixture();
  const after = await positions();
  expect(Math.abs(after.height - before.height)).toBeLessThan(1);
  expect(Math.abs(after.advance - before.advance)).toBeLessThan(1);
  expect(after.advanceBottom).toBeLessThanOrEqual(after.bottom);
  await page.setViewportSize({ width: 390, height: 740 });
  const resized = await positions(); expect(resized.advanceBottom).toBeLessThanOrEqual(resized.bottom);
});
