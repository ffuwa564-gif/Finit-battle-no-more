import { test, expect } from '@playwright/test';
import { enterGame } from './boot';
const title = '機巧少女 ― 無慈悲な歯車 ―';

test('clockwork SSR/SR/R have original art and unique skills in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#gacha'); await enterGame(page);
  await page.getByRole('button', { name: title, exact: true }).click();
  const showcase = page.getByRole('region', { name: title, exact: true });
  await expect(showcase.locator('.goddess-feature')).toHaveCount(2);
  await expect(showcase).toContainText('0.75%');
  await page.getByRole('button', { name: 'SSR ヴェスパの詳細', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('星炉の過充填'); await expect(dialog).toContainText('必殺ゲージを35充填');
  await expect(dialog).toContainText('星炉・限界臨界の夜明け');
  const artwork = dialog.locator('.detail-art img');
  await expect.poll(() => artwork.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1086);
  await page.screenshot({ path: 'artifacts/clockwork-roster/vespera-detail-390.png' });
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  for (const [name, skill, id] of [['ミエット', '装甲リサイクル', 'miette'], ['ティッカ', '秒針ジャミング', 'tikka']]) {
    const card = page.locator('.gacha-exclusive-pool .character-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await card.getByRole('button').click();
    await expect(dialog).toContainText(skill);
    await expect(dialog.locator('.detail-art img')).toHaveAttribute('src', new RegExp(`gacha-${id}.png`));
    await expect.poll(() => dialog.locator('.detail-art img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1086);
    await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  }
  await page.locator('.gacha-exclusive-pool').screenshot({ path: 'artifacts/clockwork-roster/sr-r-pool-390.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.goto('/#settings'); await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.goto('/#gacha');
  await page.getByRole('button', { name: 'Clockwork Maidens — Merciless Gears', exact: true }).click();
  await page.getByRole('button', { name: 'SSR Vespera Details', exact: true }).click();
  await expect(dialog).toContainText('Starforge Overcharge'); await expect(dialog).toContainText('35 ultimate charge');
  expect(await dialog.textContent()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  expect(errors).toEqual([]);
});

test('Vespera charges a manual ultimate in real combat and all new allies keep their portraits after reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!; const save = structuredClone(previous);
    save.ownedIds = [...new Set([...save.ownedIds, 'vespera', 'miette', 'tikka', 'nox'])];
    save.partyIds = ['vespera', 'miette', 'tikka', 'nox']; save.leaderId = 'vespera';
    let battle = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 0, 42, 'clockwork-browser');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    for (const unit of battle.units) {
      if (unit.side === 'enemy') { unit.hp = unit.maxHp = 100000; unit.attack = 0; unit.speed = 0; }
      else { unit.speed = 100 - save.partyIds.indexOf(unit.characterId) * 10; unit.barrier = 100; unit.barrierUntil = 5; }
    }
    battle.units.find(unit => unit.characterId === 'nox')!.ultimateCharge = 65;
    save.battle = battle; save.revision = previous.revision + 1;
    await persistSave(save, previous.revision);
  });
  await page.reload(); await enterGame(page);
  await expect(page.locator('[data-unit="party:nox"] [role="meter"]')).toHaveAttribute('aria-valuenow', '65');
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.locator('.battle-toast')).toContainText('星炉の過充填');
  await expect(page.locator('[data-hp-unit="party:vespera"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('[data-unit="party:nox"] [role="meter"]')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('.party-unit--ultimate-queued')).toHaveCount(0);
  await page.getByRole('button', { name: 'ノクス：必殺技を予約', exact: true }).click();
  await page.reload(); await enterGame(page);
  await expect(page.locator('[data-unit="party:nox"]')).toHaveClass(/party-unit--ultimate-queued/);
  await expect(page.locator('.party-strip img[src*="gacha-vespera"]')).toBeVisible();
  await expect(page.locator('.party-strip img[src*="gacha-miette"]')).toBeVisible();
  await expect(page.locator('.party-strip img[src*="gacha-tikka"]')).toBeVisible();
  await page.screenshot({ path: 'artifacts/clockwork-roster/battle-390.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
