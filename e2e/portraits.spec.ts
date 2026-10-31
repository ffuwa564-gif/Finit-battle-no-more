import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('collection videos stay lightweight while enlarged leader faces use higher resolution', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#party'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.ownedIds.push('evelyn', 'asteria', 'kuzuha-awakened');
    save.partyIds = ['elaine', 'evelyn', 'asteria', 'kuzuha-awakened']; save.leaderId = 'kuzuha-awakened';
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  const card = page.locator('.character-card').filter({ has: page.getByRole('heading', { name: '九尾・葛葉', exact: true }) });
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => card.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await expect(card.locator('video')).toHaveJSProperty('videoWidth', 320);
  await expect(card.locator('button button')).toHaveCount(0);
  await card.getByRole('button', { name: '九尾・葛葉・リーダー', exact: true }).click();
  await expect(card.locator('video')).toHaveJSProperty('paused', true);
  await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await page.getByRole('navigation', { name: 'モバイルメニュー', exact: true }).getByRole('button', { name: 'ホーム', exact: true }).click();
  const face = page.locator('.hub-profile-avatar video');
  await expect.poll(() => face.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await expect(face).toHaveAttribute('src', /kuzuha-awakened-portrait-hq.mp4/);
  await expect(page.locator('.hub-profile-avatar button')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'ホームのメニュー', exact: true }).getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: 'オフ', exact: true }).click();
  await page.getByRole('navigation', { name: 'モバイルメニュー', exact: true }).getByRole('button', { name: 'ホーム', exact: true }).click();
  await expect(face).not.toHaveAttribute('src');
  await expect(page.locator('.hub-profile-avatar img')).toBeVisible();
});

test('battle portraits animate and any enemy with motion plays irrespective of acquisition route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const { createBattle, characterStats } = await import('/src/domain/engine.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.ownedIds.push('evelyn', 'asteria', 'kuzuha-awakened');
    save.partyIds = ['elaine', 'evelyn', 'asteria', 'kuzuha-awakened']; save.leaderId = 'kuzuha-awakened';
    const battle = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 5, 42, 'portrait-preview');
    // Exercise the renderer with a registered non-event animated character.
    const enemy = battle.units.find(unit => unit.side === 'enemy')!;
    const stats = characterStats(content.characters.find(char => char.id === 'asteria')!, undefined, true);
    battle.units = [...battle.units.filter(unit => unit.side === 'party'), { ...enemy, characterId: 'asteria', boss: true, ...stats, maxHp: stats.hp }];
    battle.initialUnits = structuredClone(battle.units); battle.events = []; battle.cursor = 0; battle.phase = 'ready';
    save.battle = battle; save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  const portraits = page.locator('.party-strip video');
  await expect(portraits).toHaveCount(3);
  for (const video of await portraits.all()) {
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    await expect(video).toHaveJSProperty('videoWidth', 640);
    await expect(video).toHaveJSProperty('muted', true);
  }
  const enemy = page.locator('.enemy-page video');
  await expect.poll(() => enemy.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await expect(enemy).toHaveAttribute('src', /gacha-amaterasu.mp4/);
  await page.getByRole('button', { name: 'アマテラスのアニメーションを停止', exact: true }).click();
  await expect(enemy).toHaveJSProperty('paused', true);
  for (const video of await portraits.all()) await expect(video).toHaveJSProperty('paused', false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const video of await page.locator('video').all()) await expect(video).not.toHaveAttribute('src');
  await expect(page.locator('.party-strip button button')).toHaveCount(0);
});
