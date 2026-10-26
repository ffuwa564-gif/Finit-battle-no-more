import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page, caster = 'seris') {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async id => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!, save = structuredClone(previous);
    if(!save.partyIds.includes(id)) {
      save.ownedIds=[...new Set([...save.ownedIds,id])];
      const removed=save.partyIds[0];save.partyIds[0]=id;
      if(save.leaderId===removed)save.leaderId=id;
    }
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

for (const [caster, clip, theme] of [['seris','blade','blade'],['noelle','arcane','stars'],['kuzuha','thunder','eclipse'],['elaine','sanctuary','bloom'],['liora','shield','aegis'],['iris','rally','dawn'],['nox','bits','clockwork']]) {
  test(`${clip} renders a transparent Pixi effect over the battlefield`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page, caster);
    const effect = page.locator('.ultimate-cinematic');
    await expect(effect).toHaveAttribute('data-visual',theme);
    await expect(effect.locator('video')).toHaveCount(0);
    await expect(effect).toHaveAttribute('data-fx-state', 'pixi');
    await expect(effect.locator('canvas')).toBeVisible();
    await expect(effect).toHaveAttribute('data-phase', 'impact');
    if (['sanctuary','shield','rally'].includes(clip)) await expect(effect.locator('.ultimate-recipients .ultimate-recipient__art')).toHaveCount(4);
    await expect(effect.locator('.ultimate-cinematic__finish')).toHaveCount(0);
    await expect(effect.locator('.ultimate-cinematic__intro')).toHaveCSS('opacity', '0');
    await page.waitForTimeout(220);
    await page.screenshot({ path: `artifacts/ultimates/${clip}-impact-390.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await expect(effect).toHaveAttribute('data-phase', 'tail');
    await page.waitForTimeout(250);
    const opacity = await effect.evaluate(element => Number(getComputedStyle(element).opacity));
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(.95);
    // Healing recipients fade together with their halo, without disappearing first.
    if (['sanctuary','shield','rally'].includes(clip)) await expect(effect.locator('.ultimate-recipients')).toHaveCSS('opacity', '1');
  });
}

test('a failed renderer import uses the fallback and still finishes the round', async ({ page }) => {
  await page.route('**/src/ui/ultimate-pixi.ts*', route => route.abort());
  await prepare(page);
  const effect = page.locator('.ultimate-cinematic');
  await expect(effect).toHaveAttribute('data-fx-state', 'fallback');
  await expect(effect.locator('.ultimate-fallback')).toBeAttached();
  await expect(effect).toHaveAttribute('data-phase', 'impact');
  await expect(page.locator('.combat-number--ultimate')).not.toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeVisible({ timeout: 20000 });
});

test('unavailable WebGL falls back instead of holding combat', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind: any, options: any) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
      return original.call(this, kind, options);
    } as typeof original;
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page);
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-fx-state', 'fallback');
  await page.getByRole('button', { name: '次の演出へ', exact: true }).click();
  await expect(page.locator('.ultimate-cinematic')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('data saving does not load Pixi or download effect videos', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = new EventTarget(); Object.assign(connection, { saveData: true });
    Object.defineProperty(navigator, 'connection', { value: connection });
  });
  const requests: string[] = [];
  page.on('request', request => { if (/ultimate-fx-.*\.mp4|ultimate-pixi/.test(request.url())) requests.push(request.url()); });
  await prepare(page);
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-fx-state', 'static');
  await expect(page.locator('.ultimate-pixi-canvas')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('skipping a cut-in cancels its delayed impact sound and destroys its canvas', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__impactSounds = [];
    window.addEventListener('game:se', (event: Event) => { const kind = (event as CustomEvent).detail.kind; if (kind.startsWith('ultimate-')) (window as any).__impactSounds.push(kind); });
  });
  await prepare(page);
  await page.getByRole('button', { name: '次の演出へ', exact: true }).click();
  await expect(page.locator('.ultimate-pixi-canvas')).toHaveCount(0);
  await page.waitForTimeout(1800);
  expect(await page.evaluate(() => (window as any).__impactSounds)).toEqual([]);
});

test('losing the live WebGL context releases the canvas and keeps the fallback', async ({ page }) => {
  await prepare(page);
  const effect = page.locator('.ultimate-cinematic');
  await expect(effect).toHaveAttribute('data-fx-state','pixi');
  await effect.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', {cancelable:true})));
  await expect(effect).toHaveAttribute('data-fx-state','fallback');
  await expect(effect.locator('canvas')).toHaveCount(0);
  await expect(effect.locator('.ultimate-fallback')).toBeAttached();
  await page.getByRole('button', {name:'次の演出へ',exact:true}).click();
  await expect(page.locator('.ultimate-cinematic')).toHaveCount(0);
});

test('returning from a hidden tab does not replay a missed ultimate impact', async ({page}) => {
  await page.addInitScript(()=>{
    (window as any).__fakeHidden=false;(window as any).__hiddenImpacts=[];
    Object.defineProperty(document,'hidden',{get:()=>(window as any).__fakeHidden});
    window.addEventListener('game:se',event=>{const kind=(event as CustomEvent).detail.kind;if(kind.startsWith('ultimate-'))(window as any).__hiddenImpacts.push(kind);});
  });
  await prepare(page);
  await page.evaluate(()=>{(window as any).__fakeHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(1600);
  await page.evaluate(()=>{(window as any).__fakeHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(150);
  expect(await page.evaluate(()=>(window as any).__hiddenImpacts)).toEqual([]);
});

test('speed change after impact retains the voice so NEXT can stop its tail', async ({page}) => {
  await page.addInitScript(()=>{
    (window as any).__tailStops=0;
    const stop=AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop=function(...args:any[]){
      if(this.buffer && Math.abs(this.buffer.duration-1.05)<.001)(window as any).__tailStops++;
      return stop.apply(this,args as any);
    };
  });
  await prepare(page);
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-phase','impact');
  await page.getByTitle('演出速度',{exact:true}).click();
  await page.getByRole('button',{name:'次の演出へ',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__tailStops)).toBeGreaterThan(0);
});
