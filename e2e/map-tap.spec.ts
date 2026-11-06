import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

for (const selector of ['.world-pin', '.world-person']) {
  test(`${selector} stays under the finger while pressed and selects on release`, async ({ page }) => {
    await page.goto('/#dungeons');
    await enterGame(page);
    if (selector === '.world-person') {
      await page.evaluate(async () => {
        const { content } = await import('/src/content/index.ts');
        const { applyCommand } = await import('/src/application/game.ts');
        const { loadSave, persistSave } = await import('/src/platform/save.ts');
        const save = (await loadSave())!;
        const next = applyCommand(save, { type: 'worldStoryBegin', profile: { name: 'ユイ', voice: 'soft', favorite: 'tea' }, from: 'beginning' }, content);
        await persistSave(next, save.revision);
      });
      await page.reload();
      await enterGame(page);
    }
    const pin = page.locator(selector).filter({ visible: true }).first();
    // Center an actual map control through the atlas, without forcing its click.
    if (selector === '.world-pin') {
      await page.getByRole('button', { name: '探索地点の一覧', exact: true }).click();
      await page.getByRole('dialog').locator('.world-index-place').first().click();
    }
    const target = selector === '.world-pin' ? page.locator('.world-pin.is-selected') : pin;
    const before = (await target.boundingBox())!;
    const x = before.x + before.width / 2, y = before.y + before.height / 2;
    expect(y).toBeGreaterThan(80);
    expect(y).toBeLessThan(630);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const pressed = (await target.boundingBox())!;
    expect(Math.abs(pressed.x - before.x)).toBeLessThan(2);
    expect(Math.abs(pressed.y - before.y)).toBeLessThan(2);
    expect(Math.abs(pressed.width - before.width)).toBeLessThan(2);
    await page.mouse.up();
    await expect(target).toHaveClass(/is-selected/);
    await target.tap();
    await expect(target).toHaveClass(/is-selected/);
  });
}


test('a touch selects another destination and still works after dragging the map', async ({ page }) => {
  await page.goto('/#dungeons');
  await enterGame(page);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) {
      await page.mouse.move(190, 380);
      await page.mouse.down();
      await page.mouse.move(210, 400, { steps: 8 });
      await page.mouse.up();
    }
    const label = await page.locator('.world-pin:not(.is-selected)').evaluateAll(elements => {
      const pin = elements.find(el => {
        const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
        return x > 30 && x < innerWidth - 60 && y > 150 && y < 580 && el.contains(document.elementFromPoint(x, y));
      });
      return pin?.getAttribute('aria-label');
    });
    expect(label).toBeTruthy();
    const pin = page.locator('.world-pin').and(page.getByRole('button', { name: label!, exact: true }));
    await pin.tap();
    await expect(pin).toHaveClass(/is-selected/);
    await expect(page.locator('.world-map__destination h2')).toHaveText(label!);
  }
});
