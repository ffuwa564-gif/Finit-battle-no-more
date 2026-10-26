import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page, reducedMotion = false) {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async reduced => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!;
    const save = structuredClone(previous);
    const battle = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 2, 42, 'ultimate-browser');
    let ready = battle;
    while (ready.phase === 'playing') ready = advanceReplay(ready, content);
    for (const unit of ready.units) {
      if (unit.side === 'party') unit.ultimateCharge = 100;
      else { unit.hp = unit.maxHp = 100000; unit.attack = 0; unit.speed = 0; }
    }
    ready.units.find(unit => unit.characterId === 'seris')!.speed = 100;
    ready.units.find(unit => unit.characterId === 'seris')!.hp -= 10;
    save.battle = ready; save.settings.reducedMotion = reduced; save.revision = previous.revision + 1;
    await persistSave(save, previous.revision);
  }, reducedMotion);
  await page.reload(); await enterGame(page);
}

test('tap ready frames to queue or cancel, retain choices, and unleash the selected characters with cut-ins', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    (window as any).__nativeUltimates=[];
    const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start=function(...args:any[]) {
      if(this.buffer && Math.abs(this.buffer.duration-1.05)<.001 && !this.loop) {
        const lead=(args[0]-this.context.currentTime)*1000;
        const record={due:performance.now()+lead,lead,stopped:false};
        (window as any).__nativeUltimates.push(record);(this as any).__ultimateRecord=record;
      }
      return start.apply(this,args as any);
    };
    AudioBufferSourceNode.prototype.stop=function(...args:any[]) {if((this as any).__ultimateRecord)(this as any).__ultimateRecord.stopped=true;return stop.apply(this,args as any);};
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page);
  await expect(page.locator('.party-unit--ultimate-ready')).toHaveCount(4);
  await page.getByRole('button', { name: 'セリス：必殺技を予約', exact: true }).click();
  await expect(page.getByRole('button', { name: 'セリス：必殺技の予約を解除' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'セリス：必殺技の予約を解除' }).click();
  await expect(page.locator('.party-unit--ultimate-queued')).toHaveCount(0);
  // Potion mode must heal rather than queue an ultimate.
  await page.getByRole('button', { name: '回復薬 2', exact: true }).click();
  await page.getByRole('button', { name: 'セリスを回復', exact: true }).click();
  await expect(page.locator('.party-unit--ultimate-queued')).toHaveCount(0);
  await expect(page.locator('[data-unit="party:seris"] [role="meter"]')).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'セリス：必殺技を予約', exact: true }).click();
  await page.getByRole('button', { name: 'ノエル：必殺技を予約', exact: true }).click();
  await page.getByRole('button', { name: '攻撃重視', exact: true }).click();
  await expect(page.locator('.party-unit--ultimate-queued')).toHaveCount(2);
  await page.reload(); await enterGame(page);
  await expect(page.locator('.party-unit--ultimate-queued')).toHaveCount(2);
  await page.screenshot({ path: 'artifacts/ultimates/queued-390.png' });
  await page.evaluate(() => {
    (window as any).__ultimateSounds = [];
    (window as any).__impactEvents = [];
    window.addEventListener('game:se', (event: Event) => { const kind = (event as CustomEvent).detail.kind; if (kind.startsWith('ultimate-')) (window as any).__impactEvents.push({ kind, at: performance.now() }); });
    window.addEventListener('game:combat-numbers', (event: Event) => { if ((event as CustomEvent).detail.ultimate) (window as any).__impactEvents.push({ kind: 'numbers', at: performance.now() }); });
    window.addEventListener('game:se', (event: Event) => (window as any).__ultimateSounds.push((event as CustomEvent).detail.kind));
  });
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  const cutIn = page.getByRole('status', { name: 'セリスの必殺技：薄明・夜を断つ剣', exact: true });
  await expect(cutIn).toBeVisible();
  await expect(page.locator('.battle-toast')).not.toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/ultimates/cutin-390.png' });
  await page.getByTitle('演出速度', { exact: true }).click();
  await page.waitForTimeout(100);
  await expect.poll(() => page.evaluate(() => (window as any).__ultimateSounds.filter((kind: string) => kind === 'ultimate').length)).toBe(1);
  await expect(cutIn).toHaveAttribute('data-fx-state', 'pixi');
  await expect(cutIn.locator('canvas')).toBeVisible();
  await expect(cutIn.locator('video')).toHaveCount(0);
  await expect(cutIn).toHaveAttribute('data-phase', 'impact');
  await expect(page.locator('.combat-number--ultimate')).not.toHaveCount(0);
  const hits = await page.evaluate(() => (window as any).__impactEvents);
  expect(hits.filter((hit: any) => hit.kind === 'ultimate-strike')).toHaveLength(1);
  const reserved=await page.evaluate(()=>(window as any).__nativeUltimates);
  const sounding=reserved.filter((voice:any)=>!voice.stopped);
  expect(sounding).toHaveLength(1);
  expect(reserved[0].lead).toBeGreaterThan(500);
  expect(Math.abs(sounding[0].due-hits.find((hit:any)=>hit.kind==='numbers').at)).toBeLessThan(60);
  expect(reserved.some((voice:any)=>voice.stopped)).toBe(true);
  expect(Math.abs(hits.find((hit: any) => hit.kind === 'numbers').at - hits.find((hit: any) => hit.kind === 'ultimate-strike').at)).toBeLessThan(150);
  expect(await cutIn.evaluate(element => getComputedStyle(element).mixBlendMode)).toBe('normal');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'artifacts/ultimates/pixi-impact-390.png' });
  await expect(page.getByRole('button', { name: 'ノエル：必殺技の予約を解除' })).toBeDisabled();
  // The next selected character gets her own cinematic later in the same round.
  await expect(page.getByRole('status', { name: 'ノエルの必殺技：星詠・失われた天河', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.party-unit--ultimate-queued')).toHaveCount(0);
  expect(Number(await page.locator('[data-unit="party:seris"] [role="meter"]').getAttribute('aria-valuenow'))).toBeLessThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('reduced-motion ultimates remain readable in a narrow viewport, including English', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, true);
  await page.evaluate(() => localStorage.setItem('stillveil-language', 'en'));
  await page.reload();
  await page.locator('.title-screen__start').click();
  await expect(page.locator('.title-screen')).toHaveCount(0);
  await page.getByRole('button', { name: 'Seris: queue ultimate', exact: true }).click();
  await page.getByRole('button', { name: 'Advance Round', exact: true }).click();
  const cutIn = page.locator('.ultimate-cinematic--reduced');
  await expect(cutIn).toContainText('Nightcleaving Blade');
  expect(await cutIn.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.screenshot({ path: 'artifacts/ultimates/reduced-320-en.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
