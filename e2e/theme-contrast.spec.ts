import { expect, test, type Page } from '@playwright/test';
import { enterGame } from './boot';

/** Check actual rendered text against solid surfaces or every gradient stop. */
async function contrastFailures(page: Page, selector: string) {
  return page.locator(selector).evaluateAll(elements => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number);
    const luminance = (color: number[]) => color.slice(0, 3).map(v => {
      const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    return elements.flatMap(element => {
      if (!element.textContent?.trim()) return [];
      const foreground = luminance(rgb(getComputedStyle(element).color));
      let backgrounds: number[][] = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const css = getComputedStyle(node);
        if (css.backgroundImage.includes('gradient')) {
          backgrounds = [...css.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m => rgb(m[0])).filter(c => c.length === 3 || c[3] === 1);
          if (backgrounds.length) break;
        }
        const color = rgb(css.backgroundColor);
        if (color.length === 3 || color[3] === 1) { backgrounds = [color]; break; }
      }
      const ratios = backgrounds.map(color => {
        const background = luminance(color); return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
      });
      const ratio = Math.min(...ratios);
      return !ratios.length || ratio < 4.5 ? [{ text: element.textContent?.trim().slice(0, 65), ratio }] : [];
    });
  });
}

for (const language of ['ja', 'en']) {
  test(`event rewards, awakening conditions and exchange text remain readable in ${language}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#dungeons/boss-events'); await enterGame(page);
    await page.evaluate(async () => {
      const { loadSave, persistSave } = await import('/src/platform/save.ts');
      const save = (await loadSave())!, revision = save.revision;
      save.ownedIds.push('kuzuha');
      save.completedDungeonIds = ['silent-cathedral','kuzuha-beginner','kuzuha-intermediate','kuzuha-advanced','kuzuha-expert'];
      save.settings.reducedMotion = true;
      save.revision++; await persistSave(save, revision);
    });
    await page.reload(); await enterGame(page);
    if (language === 'en') await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
    const screens = [
      ['dungeons/boss-events', '.event-stage__name strong, .event-stage__meta, .event-stage__reward > span, .event-stage__lock, .event-form__exchange > span, .event-form__exchange > small, .event-form__exchange .button:disabled'],
      ['dungeons/memories', '.story-requirements li, .story-companion-copy > small, .story-cost, .memory-chapter.is-locked'],
      ['recruit', '.gold-exchange-card__copy h3, .gold-exchange-card__epithet, .gold-exchange-card__skills small, .gold-exchange-card__leader, .gold-exchange-card__cost strong'],
      ['gacha', '.xr-gacha__heading h2, .xr-gacha__balance, .xr-gacha__status'],
    ] as const;
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const [route, selector] of screens) {
        await page.evaluate(() => { location.hash = 'home'; });
        await expect(page.locator('.home-hub')).toBeVisible();
        await page.evaluate(route => { location.hash = route; }, route);
        await expect(page.locator(selector).first()).toBeVisible();
        expect(await contrastFailures(page, selector), `${route} at ${width}px`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
        if (route === 'dungeons/boss-events' && width === 390) {
          await page.locator('.event-sanctuary').first().screenshot({ path: info.outputPath(`event-contrast-${language}.png`) });
          await page.locator('.event-stages').first().scrollIntoViewIfNeeded();
          await page.screenshot({ path: info.outputPath(`event-rows-${language}.png`) });
          await page.locator('.event-stage').first().getByRole('button').click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
    }
  });
}
