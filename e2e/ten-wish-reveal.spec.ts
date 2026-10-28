import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page, reduced = false, special = true) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#gacha'); await enterGame(page);
  await page.evaluate(async ({ reduced, special }) => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.stones = 50; save.drawCount = 100; save.ssrPity = special ? 89 : 0; save.seed = 42;
    save.settings.reducedMotion = reduced; save.settings.bgmVolume = 0; save.settings.seVolume = 0;
    for (let seed = 1; seed < 200; seed++) {
      const trial = applyCommand({ ...save, seed }, { type: 'draw', collectionId: 'clockwork-maidens', count: 10 }, content);
      if (special ? trial.lastGachaResults?.[0].characterId === 'nox' : trial.lastGachaResults?.every(result => ['R', 'SR'].includes(content.characters.find(c => c.id === result.characterId)!.rarity))) { save.seed = seed; break; }
    }
    save.revision++; await persistSave(save, revision);
  }, { reduced, special });
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: '機巧少女 ― 無慈悲な歯車 ―', exact: true }).click();
}
const saved = (page: Page) => page.evaluate(async () => {
  const s = (await (await import('/src/platform/save.ts')).loadSave())!;
  return { stones: s.stones, drawCount: s.drawCount, seed: s.seed, results: s.lastGachaResults, owned: s.ownedIds, pity: s.ssrPity };
});

test('ten wishes open a constellation and spotlight the real SSR before continuing the saved results', async ({ page }, info) => {
  await prepare(page);
  await page.getByRole('button', { name: '石50個で10連祈願', exact: true }).click();
  await expect(page.locator('.gacha-ritual')).toBeVisible();
  await expect(page.locator('.gacha-ritual__constellation i')).toHaveCount(10);
  const snapshot = await saved(page); expect(snapshot.drawCount).toBe(110); expect(snapshot.results).toHaveLength(10);
  await page.waitForTimeout(850); // Capture the seal after its deliberate opening fade-in.
  await page.screenshot({ path: info.outputPath('invocation.png') });
  await expect(page.locator('.gacha-result.is-sealed')).toHaveCount(10);
  await page.screenshot({ path: info.outputPath('sealed-cards.png') });
  await expect(page.locator('.gacha-reveal--ssr')).toBeVisible();
  await page.getByRole('button', { name: '演出をスキップ', exact: true }).click();
  await expect(page.locator('.gacha-reveal__result h3')).toBeVisible();
  await expect(page.locator('.gacha-reveal__result')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: info.outputPath('ssr-spotlight.png') });
  await page.getByRole('button', { name: 'ノクスを迎える', exact: true }).click();
  await expect(page.locator('.gacha-result.is-open').first()).toContainText('ノクス');
  await page.getByRole('button', { name: '結果をまとめて見る', exact: true }).click();
  await expect(page.locator('.gacha-result.is-open')).toHaveCount(10);
  await expect(page.locator('.gacha-result').first()).toHaveCSS('animation-name', 'none');
  await page.screenshot({ path: info.outputPath('summary.png') });
  expect(await saved(page)).toEqual(snapshot);
  await page.locator('.gacha-result').first().click();
  await page.getByRole('button', { name: '演出をスキップ', exact: true }).click();
  await page.getByRole('button', { name: 'ノクスを迎える', exact: true }).click();
  expect(await saved(page)).toEqual(snapshot);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

for (const stage of ['ritual', 'spotlight']) test(`skip during ${stage} shows all results without spending again`, async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: '石50個で10連祈願', exact: true }).click();
  await expect(page.locator('.gacha-ritual')).toBeVisible(); const snapshot = await saved(page);
  if (stage === 'spotlight') await expect(page.locator('.gacha-reveal--ssr')).toBeVisible();
  await page.getByRole('button', { name: '結果をまとめて見る', exact: true }).click();
  await expect(page.locator('.gacha-result.is-open')).toHaveCount(10);
  expect(await saved(page)).toEqual(snapshot);
  await page.locator('.gacha-result').first().click();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.getByRole('button', { name: '祈願に戻る', exact: true }).click();
  await page.reload(); await enterGame(page);
  expect(await saved(page)).toEqual(snapshot);
});

test('OS reduced motion opens the ten results immediately without ritual or card motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await prepare(page);
  await page.getByRole('button', { name: '石50個で10連祈願', exact: true }).click();
  await expect(page.locator('.gacha-ritual')).toHaveCount(0);
  await expect(page.locator('.gacha-result.is-open')).toHaveCount(10);
  await expect(page.locator('.gacha-result').first()).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: '結果をまとめて見る', exact: true })).toHaveCount(0);
});

test('ordinary and SR cards continue to the summary automatically', async ({ page }) => {
  await prepare(page, false, false);
  await page.getByRole('button', { name: '石50個で10連祈願', exact: true }).click();
  const snapshot = await saved(page);
  await expect(page.locator('.gacha-results__accept')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.gacha-result.is-open')).toHaveCount(10);
  await expect(page.locator('.gacha-reveal')).toHaveCount(0);
  expect(await saved(page)).toEqual(snapshot);
});
