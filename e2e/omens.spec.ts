import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page, picks: string[] = [], desired = 'bell', final = false) {
  await page.goto('/'); await enterGame(page);
  return page.evaluate(async ({ picks, desired, final }) => {
    const { content } = await import('/src/content/index.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { offerOmens } = await import('/src/domain/omens.ts');
    const { rng } = await import('/src/domain/engine.ts');
    const original = (await loadSave())!;
    let save = applyCommand(original, { type: 'depart', dungeonId: content.dungeons[0]!.id, potions: 0 }, content);
    const battle = save.battle!;
    battle.wave = final ? content.dungeons[0]!.waves.length - 1 : picks.length;
    battle.omens = { picks: final ? Array.from({ length: battle.wave }, () => 'bell') : picks, activated: [] };
    battle.phase = 'playing'; battle.nextPhase = final ? 'reward' : 'wave'; battle.events = []; battle.cursor = 0;
    battle.units.filter(unit => unit.side === 'enemy').forEach(unit => { unit.hp = 0; });
    battle.units[0]!.hp = 1;
    for (let seed = 0; ; seed++) {
      const candidate = structuredClone(battle); candidate.seed = seed; offerOmens(candidate, rng);
      if (candidate.omens!.pending!.includes(desired)) { battle.seed = seed; break; }
    }
    save = applyCommand(save, { type: 'replay' }, content);
    save.revision = original.revision + 1;
    await persistSave(save, original.revision);
    return { offered: save.battle!.omens!.pending, hp: save.battle!.units[0]!.hp, revision: save.revision };
  }, { picks, desired, final });
}
async function stored(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!); }

test('each wave waits for a cryptic three-way choice and persists the same offers across reload', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = await prepare(page);
  await page.reload(); await enterGame(page);
  const region = page.getByRole('region', { name: '廃都の痕跡', exact: true });
  const choices = region.locator('.wave-omens__choices button');
  await expect(choices).toHaveCount(3);
  for (const text of await choices.allTextContents()) expect(text).not.toMatch(/HP|攻撃|防御|回復|\d+%/);
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toHaveCount(0);
  await region.screenshot({ path: info.outputPath('omens-mobile.png') });
  await page.reload(); await enterGame(page);
  expect((await stored(page)).battle!.omens!.pending).toEqual(fixture.offered);
  await page.getByRole('button', { name: /音のない鈴に触れる/ }).press('Enter');
  await expect(choices).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).battle!.omens!.picks).toEqual(['bell']);
  expect((await stored(page)).battle!.omens!.activated).toEqual([]);
  expect((await stored(page)).battle!.units[0]!.hp).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('a combination reveals its result only after selection and never repeats after reload', async ({ page }) => {
  await prepare(page, ['bell'], 'thread');
  await page.reload(); await enterGame(page);
  await expect(page.getByText('帰り路の声', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /ほどけた糸を結ぶ/ }).click();
  await expect(page.getByText('帰り路の声', { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).battle!.omens!.activated).toEqual(['returning-voices']);
  const hp = (await stored(page)).battle!.units[0]!.hp;
  expect(hp).toBeGreaterThan(1);
  await page.reload(); await enterGame(page);
  expect((await stored(page)).battle!.units[0]!.hp).toBe(hp);
  expect((await stored(page)).battle!.omens!.activated).toEqual(['returning-voices']);
});

test('the final wave also requires a choice before rewards can be claimed', async ({ page }) => {
  await prepare(page, [], 'thread', true);
  await page.reload(); await enterGame(page);
  await expect(page.getByRole('button', { name: '獲得を確定', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /ほどけた糸を結ぶ/ }).click();
  await expect(page.getByRole('button', { name: '獲得を確定', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '獲得を確定', exact: true }).click();
  await expect.poll(async () => (await stored(page)).battle).toBeNull();
});

test('cryptic choices translate to English and fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await prepare(page);
  await page.evaluate(() => localStorage.setItem('stillveil-language', 'en'));
  await page.reload();
  await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  const region = page.getByRole('region', { name: 'Traces of the Ruined City', exact: true });
  await expect(region.locator('.wave-omens__choices button')).toHaveCount(3);
  expect(await region.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await expect(page.getByRole('button', { name: 'Export Backup', exact: true })).toBeVisible();
});
