import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
async function prepare(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.audioMeters = []; w.audioCues = []; w.blockResume = false; w.resumeCalls = 0;
    window.addEventListener('game:se', e => w.audioCues.push((e as CustomEvent).detail.kind));
    const resume = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function () {
      w.resumeCalls++;
      return w.blockResume ? new Promise<void>(() => {}) : resume.call(this);
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination: AudioNode | AudioParam, ...args: number[]) {
      if (destination instanceof AudioDestinationNode && this.context instanceof AudioContext) {
        const meter = this.context.createAnalyser(); meter.fftSize = 2048;
        connect.call(this, meter); w.audioMeters.push(meter);
      }
      return (connect as Function).call(this, destination, ...args);
    } as typeof AudioNode.prototype.connect;
  });
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const save = (await loadSave())!, revision = save.revision;
    let battle = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 0, 42, 'mobile-resume');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    save.battle = battle; save.settings.bgmVolume = 0; save.settings.seVolume = 1;
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  await page.evaluate(async () => { await (await import('/src/platform/audio.ts')).enableAudio(); });
  await expect.poll(() => page.evaluate(() => (window as any).audioMeters.length)).toBeGreaterThan(0);
  await page.waitForTimeout(350);
  await page.evaluate(() => { const w = window as any; w.seContext = w.audioMeters.at(-1).context; });
}
async function rms(page: Page) {
  return page.evaluate(() => Math.max(0, ...(window as any).audioMeters.map((meter: AnalyserNode) => {
    if (meter.context.state !== 'running') return 0;
    const data = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
  })));
}
async function audible(page: Page) {
  await page.evaluate(async () => { (await import('/src/platform/audio.ts')).playSound('confirm'); });
  await expect.poll(() => rms(page), { intervals: [10, 20, 30], timeout: 3000 }).toBeGreaterThan(.001);
}

test('battle and floating command controls cannot start selection, callouts or image dragging; inputs still can', async ({ page }) => {
  await prepare(page);
  const advance = page.getByRole('button', { name: 'ラウンドを進める', exact: true });
  await expect(advance).toHaveCSS('user-select', 'none');
  await page.getByRole('button', { name: /行動を選ぶ$/ }).click();
  await expect(page.locator('.command-dial')).toBeVisible();
  await expect(page.locator('.command-dial__caption')).toHaveCSS('user-select', 'none');
  for (const selector of ['.moon-command--advance', '.command-dial__caption', '.party-strip img']) {
    expect(await page.locator(selector).first().evaluate(el => ['selectstart', 'contextmenu', 'dragstart'].map(type => !el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))))).toEqual([true, true, true]);
  }
  // Even a selection created while a native hold is in flight is cleared.
  await advance.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range); });
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('');
  await page.keyboard.press('Escape');
  // Editable controls keep their native copy/paste behavior.
  await page.evaluate(() => { const input = document.createElement('textarea'); input.id = 'editable-probe'; input.value = 'backup text'; document.getElementById('root')!.append(input); });
  const input = page.locator('#editable-probe');
  await expect(input).toHaveCSS('user-select', 'text');
  expect(await input.evaluate(el => el.dispatchEvent(new Event('contextmenu', { bubbles: true, cancelable: true })))).toBe(true);
  await input.fill('copy me'); await input.evaluate((el: HTMLTextAreaElement) => el.select());
  expect(await input.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart)).toBe(7);
});

test('foreground restores real synth output, and a trusted silent tap retries an in-flight blocked resume', async ({ page }) => {
  await prepare(page); await audible(page);
  // Suspend the actual rendering context, not just an event-dispatch counter.
  await page.evaluate(async () => {
    const w = window as any; await w.seContext.suspend();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
    w.blockResume = true;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'));
    w.callsBeforeTap = w.resumeCalls; w.blockResume = false;
  });
  // No Button, no game:ui and no command: global gesture recovery owns this case.
  await page.locator('.battle-scene').click({ position: { x: 15, y: 110 } });
  await expect.poll(() => page.evaluate(() => (window as any).resumeCalls > (window as any).callsBeforeTap)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).seContext.state)).toBe('running');
  await audible(page);
  // Repeat automatic lifecycle recovery without a click.
  await page.evaluate(async () => { await (window as any).seContext.suspend(); window.dispatchEvent(new Event('pageshow')); });
  await expect.poll(() => page.evaluate(() => (window as any).seContext.state)).toBe('running');
  await audible(page);
});

test('a closed engine rebuilds its graph; returning never unmutes saved SE settings', async ({ page }) => {
  await prepare(page);
  await page.evaluate(async () => { await (window as any).seContext.close(); window.dispatchEvent(new Event('focus')); });
  await expect.poll(() => page.evaluate(() => { const w = window as any; return w.audioMeters.at(-1).context !== w.seContext && w.audioMeters.at(-1).context.state === 'running'; })).toBe(true);
  await page.evaluate(() => { const w = window as any; w.seContext = w.audioMeters.at(-1).context; });
  await audible(page);
  await page.getByRole('button', { name: '効果音をミュート', exact: true }).click();
  await page.waitForTimeout(350);
  await page.evaluate(async () => {
    await (window as any).seContext.suspend(); window.dispatchEvent(new Event('pageshow'));
  });
  await page.evaluate(async () => { await (await import('/src/platform/audio.ts')).enableAudio(); (await import('/src/platform/audio.ts')).playSound('confirm'); });
  await expect.poll(() => rms(page)).toBeLessThan(.00001);
  expect(await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.settings.seVolume)).toBe(0);
});
