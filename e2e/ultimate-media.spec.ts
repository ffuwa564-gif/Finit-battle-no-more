import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page, caster = 'seris') {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async id => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!, save = structuredClone(previous);
    let battle = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 0, 42, 'ultimate-media');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    for (const unit of battle.units) {
      if (unit.side === 'party') { unit.hp = Math.floor(unit.maxHp * .5); unit.speed = unit.characterId === id ? 100 : 1; unit.ultimateCharge = unit.characterId === id ? 100 : 0; unit.ultimateQueued = unit.characterId === id; }
      else { unit.hp = unit.maxHp = 100000; unit.attack = 0; unit.speed = 0; }
    }
    save.battle = battle; save.revision = previous.revision + 1;
    await persistSave(save, previous.revision);
  }, caster);
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.locator('.ultimate-cinematic')).toBeVisible();
}

for (const [caster, clip, theme] of [['noelle','arcane','stars'],['elaine','sanctuary','bloom']]) {
  test(`${clip} uses its dedicated Runway clip over the battlefield`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page, caster);
    const effect = page.locator('.ultimate-cinematic');
    await expect(effect).toHaveClass(new RegExp(`ultimate-cinematic--${theme}`));
    await expect(effect.locator('video')).toHaveAttribute('src', new RegExp(`ultimate-fx-${clip}.mp4`));
    await expect(effect).toHaveAttribute('data-fx-state', 'video');
    await expect(effect).toHaveAttribute('data-phase', 'impact');
    if (clip === 'sanctuary') await expect(effect.locator('.ultimate-recipients .ultimate-recipient__art')).toHaveCount(4);
    await page.waitForTimeout(220);
    await page.screenshot({ path: `artifacts/ultimates/${clip}-impact-390.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test('a failed video uses the fallback and still finishes the round', async ({ page }) => {
  await page.route('**/video/ultimate-fx-*.mp4', route => route.abort());
  await prepare(page);
  const effect = page.locator('.ultimate-cinematic');
  await expect(effect).toHaveAttribute('data-fx-state', 'fallback');
  await expect(effect.locator('.ultimate-fallback')).toBeAttached();
  await expect(effect).toHaveAttribute('data-phase', 'impact');
  await expect(page.locator('.combat-number--ultimate')).not.toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeVisible({ timeout: 20000 });
});

test('iPhone-style autoplay refusal falls back instead of holding combat', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
      if (this.getAttribute('src')?.includes('ultimate-fx-')) return Promise.reject(new DOMException('Blocked autoplay', 'NotAllowedError'));
      return original.call(this);
    };
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page);
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-fx-state', 'fallback');
  await page.getByRole('button', { name: '次の演出へ', exact: true }).click();
  await expect(page.locator('.ultimate-cinematic')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('data saving does not download effect videos', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = new EventTarget(); Object.assign(connection, { saveData: true });
    Object.defineProperty(navigator, 'connection', { value: connection });
  });
  const requests: string[] = [];
  page.on('request', request => { if (/ultimate-fx-.*\.mp4/.test(request.url())) requests.push(request.url()); });
  await prepare(page);
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-fx-state', 'static');
  await expect(page.locator('.ultimate-effect-video')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('skipping a cut-in cancels its delayed impact sound and media', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__impactSounds = [];
    window.addEventListener('game:se', (event: Event) => { const kind = (event as CustomEvent).detail.kind; if (kind.startsWith('ultimate-')) (window as any).__impactSounds.push(kind); });
  });
  await prepare(page);
  await page.getByRole('button', { name: '次の演出へ', exact: true }).click();
  await expect(page.locator('.ultimate-effect-video')).toHaveCount(0);
  await page.waitForTimeout(1800);
  expect(await page.evaluate(() => (window as any).__impactSounds)).toEqual([]);
});
