import { expect, test, type Page } from '@playwright/test';
import { skipStory } from './boot';
async function enterGame(page: Page) {
  await page.locator('.title-screen__start, .app-shell').first().waitFor();
  if (await page.locator('.title-screen').count()) await page.locator('.title-screen__start').click();
  await skipStory(page);
}

for (const locale of ['ja', 'en'] as const) for (const width of [320, 390]) {
  test(`v1.10 scout states stay inside portraits and open details at ${locale}/${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(language => localStorage.setItem('stillveil-language', language), locale);
    await page.goto('/'); await enterGame(page);
    await page.evaluate(async () => {
      const { content } = await import('/src/content/index.ts');
      const { applyCommand } = await import('/src/application/game.ts');
      const { loadSave, persistSave } = await import('/src/platform/save.ts');
      const previous = (await loadSave())!;
      const base = structuredClone(previous);
      base.ownedIds = [...new Set([...base.ownedIds, 'ione', 'neri', 'fio', 'ruka'])];
      base.discoveredIds = [...base.ownedIds]; base.partyIds = ['ione', 'neri', 'fio', 'ruka']; base.leaderId = 'ione'; base.settings.reducedMotion = true;
      let save = applyCommand(base, { type: 'depart', dungeonId: content.dungeons[0].id, potions: 0 }, content);
      while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
      const b = save.battle!;
      b.units.find(u => u.characterId === 'ione')!.whiteFlower = { amount: 50, until: b.round + 2 };
      const neri = b.units.find(u => u.characterId === 'neri')!; neri.scoutLanternUntil = b.round + 1;
      const ruka = b.units.find(u => u.characterId === 'ruka')!; ruka.scoutThreadUntil = b.round + 1; ruka.barrier = 30; ruka.barrierUntil = b.round + 1; ruka.buffStrength = 16; ruka.buffUntil = b.round + 1;
      const enemy = b.units.find(u => u.side === 'enemy')!; enemy.scoutMark = { sourceId: 'party:ione', until: b.round + 1 };
      save.revision = previous.revision + 1; await persistSave(save, previous.revision);
    });
    await page.reload(); await enterGame(page);
    const party = page.locator('.party-strip .unit-effects-summary');
    await expect(party).toHaveCount(3);
    for (const summary of await party.all()) {
      const inside = await summary.evaluate(el => {
        const portrait = el.closest('.party-unit')!.querySelector('.portrait-image')!.getBoundingClientRect(); const box = el.getBoundingClientRect();
        return box.top >= portrait.top && box.bottom <= portrait.bottom && box.left >= portrait.left && box.right <= portrait.right;
      });
      expect(inside).toBe(true);
    }
    const seed = party.filter({ has: page.locator('svg.lucide-sprout') });
    await seed.click();
    await expect(page.locator('.unit-effects-details')).toContainText(locale === 'ja' ? '種は重ねず期限も更新しない' : 'Seeds do not stack or refresh');
    await expect(page.locator('.unit-effects-details')).toContainText(locale === 'ja' ? 'HP50回復' : '50 HP');
    await page.keyboard.press('Escape');
    const thread = party.filter({ has: page.locator('small') }); await expect(thread.locator('small')).toHaveText('+1'); await thread.click();
    await expect(page.locator('.unit-effects-details')).toContainText(locale === 'ja' ? '残り糸' : 'Spare Thread');
    await expect(page.locator('.unit-effects-details')).toContainText(locale === 'ja' ? '次ラウンド終了まで' : 'next round');
    await page.keyboard.press('Escape');
    const mark = page.locator('.enemy-carousel-status .unit-effects-summary');
    await expect(mark).toHaveAttribute('aria-label', locale === 'ja' ? /宛先の標/ : /Open Address/);
    await mark.click(); await expect(page.locator('.unit-effects-details')).toContainText('10');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: info.outputPath(`scout-states-${locale}-${width}.png`), fullPage: true });
  });
}
