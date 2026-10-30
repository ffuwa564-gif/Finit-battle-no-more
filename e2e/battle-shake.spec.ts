import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page, reduced = false) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async reduced => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    let battle = createBattle(content, save.partyIds, save.leaderId, content.chapters[0].dungeonIds[0], 2, 42, 'shake-review');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    save.battle = battle;
    save.settings = { ...save.settings, reducedMotion: reduced, bgmVolume: 0, seVolume: 0 };
    save.revision++; await persistSave(save, revision);
  }, reduced);
  await page.reload(); await enterGame(page);
  await expect(page.locator('.battle-control-pad')).toBeVisible();
}

/** Observe the real impact listener and GSAP frames, including late cleanup. */
async function observe(page: Page, side: 'party' | 'enemy', heal = false, burst = false) {
  return page.evaluate(async ({ side, heal, burst }) => {
    const { loadSave } = await import('/src/platform/save.ts');
    const battle = (await loadSave())!.battle!;
    const unit = side === 'party' ? battle.units.find(u => u.side === side)! : battle.units.find(u => u.uid === document.querySelector('.enemy-page')!.getAttribute('data-unit'))!;
    const scene = document.querySelector<HTMLElement>('.battle-scene')!;
    const art = document.querySelector<HTMLElement>('.enemy-page > .enemy-page-art, .enemy-page > .animated-illustration')!;
    const controls = document.querySelector<HTMLElement>('.battle-control-pad')!;
    const hud = document.querySelector<HTMLElement>('.enemy-carousel-status')!;
    const point = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; };
    const baseline = { scene: point(scene), art: point(art), controls: point(controls), hud: point(hud) };
    const emit = (id: string) => window.dispatchEvent(new CustomEvent('game:combat-numbers', { detail: { id, changes: [{ unitId: unit.uid, characterId: unit.characterId, side, amount: heal ? 10 : -Math.ceil(unit.maxHp * .3) }] } }));
    emit('shake-1'); if (burst) { setTimeout(() => emit('shake-2'), 45); setTimeout(() => emit('shake-3'), 90); }
    const samples: typeof baseline[] = []; const start = performance.now();
    await new Promise<void>(resolve => {
      const tick = () => {
        samples.push({ scene: point(scene), art: point(art), controls: point(controls), hud: point(hud) });
        if (performance.now() - start > 460) resolve(); else requestAnimationFrame(tick);
      }; requestAnimationFrame(tick);
    });
    const max = (key: keyof typeof baseline) => Math.max(...samples.map(s => Math.hypot(s[key].x - baseline[key].x, s[key].y - baseline[key].y)));
    return { scene: max('scene'), art: max('art'), controls: max('controls'), hud: max('hud'), settled: { scene: getComputedStyle(scene).transform, art: getComputedStyle(art).transform } };
  }, { side, heal, burst });
}

test('party damage shakes the stage, keeps commands fixed, and consecutive hits settle', async ({ page }) => {
  await prepare(page);
  const result = await observe(page, 'party', false, true);
  expect(result.scene).toBeGreaterThan(1); expect(result.scene).toBeLessThan(11);
  expect(result.controls).toBeLessThan(.1);
  expect(result.settled.scene).toBe('none');
});

test('enemy damage shakes only its artwork, keeping enemy HP and commands fixed', async ({ page }) => {
  await prepare(page);
  const result = await observe(page, 'enemy');
  expect(result.art).toBeGreaterThan(1);
  expect(result.scene).toBeLessThan(.1); expect(result.hud).toBeLessThan(.1); expect(result.controls).toBeLessThan(.1);
  expect(result.settled.art).toBe('none');
});

test('healing and both reduced-motion settings suppress damage shakes', async ({ page }) => {
  await prepare(page);
  expect((await observe(page, 'party', true)).scene).toBeLessThan(.1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect((await observe(page, 'party')).scene).toBeLessThan(.1);
  await prepare(page, true);
  expect((await observe(page, 'enemy')).art).toBeLessThan(.1);
});
