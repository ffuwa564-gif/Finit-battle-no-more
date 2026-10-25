import { enterGame } from './boot';
import { test, expect } from '@playwright/test';

test('SE reaches the output at audible level, covers cues, and respects mute', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const stats = { peak: 0, overallPeak: 0, cues: [] as string[] };
    Object.assign(window, { __seStats: stats });
    window.addEventListener('game:se', message => stats.cues.push((message as CustomEvent).detail.kind));
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination: AudioNode | AudioParam, ...args: number[]) {
      if (destination instanceof AudioDestinationNode) {
        const meter = this.context.createAnalyser(); meter.fftSize = 1024;
        connect.call(this, meter); connect.call(meter, destination);
        const samples = new Float32Array(meter.fftSize);
        setInterval(() => { meter.getFloatTimeDomainData(samples); for (const value of samples) { stats.peak = Math.max(stats.peak, Math.abs(value)); stats.overallPeak = Math.max(stats.overallPeak, Math.abs(value)); } }, 8);
        return destination;
      }
      return (connect as Function).call(this, destination, ...args);
    } as typeof AudioNode.prototype.connect;
  });
  await page.goto('/#settings');
  await enterGame(page);
  await page.getByRole('group', { name: 'BGM音量' }).getByRole('button', { name: '0%', exact: true }).click();
  await page.evaluate(async () => {
    const audio = await import('/src/platform/audio.ts'); await audio.enableAudio(); audio.setAudioVolume(1);
  });
  const kinds = ['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'dialogue', 'wave', 'defeat', 'victory', 'purchase', 'exchange', 'depart', 'error', 'drop'] as const;
  for (const kind of kinds) {
    await page.evaluate(async kind => {
      const audio = await import('/src/platform/audio.ts');
      (window as any).__seStats.peak = 0;
      audio.playSound(kind, kind === 'drop' ? 'epic' : undefined);
    }, kind);
    await expect.poll(() => page.evaluate(() => (window as any).__seStats.peak)).toBeGreaterThan(.025);
  }
  const stats = await page.evaluate(() => (window as any).__seStats);
  expect(stats.cues).toEqual(expect.arrayContaining(kinds));
  expect(stats.overallPeak).toBeLessThan(.98);
  await page.evaluate(async () => { const audio = await import('/src/platform/audio.ts'); audio.setAudioVolume(0); (window as any).__seStats.cues = []; audio.playSound('attack'); });
  expect(await page.evaluate(() => (window as any).__seStats.cues)).toEqual([]);
  const mutedPeak = await page.evaluate(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    (window as any).__seStats.peak = 0;
    await new Promise(resolve => setTimeout(resolve, 100));
    return (window as any).__seStats.peak;
  });
  expect(mutedPeak).toBeLessThan(.001);
  // Real UI routes exercise startup queuing and non-button dismissal sounds.
  await page.goto('/#bag');
  await enterGame(page);
  await page.getByRole('button', { name: '10 G で購入', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__seStats.cues)).toContain('purchase');
  await page.getByRole('navigation', { name: 'モバイルメニュー', exact: true }).getByRole('button', { name: 'パーティ', exact: true }).click();
  await page.getByRole('button', { name: /^エレイン/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).__seStats.cues)).toContain('cancel');
});

test('item healing and battle damage show exact per-unit numbers with generated notices', async ({ page }) => {
  await page.goto('/');
  await enterGame(page);
  await page.getByRole('heading', { name: '旅の支度' }).waitFor();
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { createInitialSave, applyCommand } = await import('/src/application/game.ts');
    const { persistSave } = await import('/src/platform/save.ts');
    const initial=createInitialSave(content,42);initial.completedDungeonIds=content.dungeons.slice(0,5).map(d=>d.id);
    const save = applyCommand(initial, { type: 'depart', dungeonId: content.dungeons[5].id, potions: 2 }, content);
    save.battle!.units.filter(unit => unit.side === 'party').forEach(unit => { unit.hp = Math.floor(unit.maxHp * .6); });
    save.battle!.initialUnits = structuredClone(save.battle!.units);
    await persistSave(save, 0);
  });
  await page.reload();
  await enterGame(page);
  await page.getByRole('button', { name: '回復薬 2' }).click();
  const target = page.locator('.party-strip button').first();
  const unitId = await target.locator('..').getAttribute('data-unit');
  await target.click();
  const healed = page.locator(`.combat-number--heal[data-hp-unit="${unitId}"]`);
  await expect(healed).toBeVisible();
  expect(Number(await healed.getAttribute('data-hp-delta'))).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.locator('.battle-toast.notice-surface')).toBeVisible();
  const hit = page.locator('.combat-number--damage,.combat-number--hurt').first();
  await expect(hit).toBeVisible({ timeout: 15000 });
  expect(Number(await hit.getAttribute('data-hp-delta'))).toBeLessThan(0);
  await expect(page.locator('.battle-toast')).toHaveCSS('background-image', /notice-moonlight\.png/);
});
