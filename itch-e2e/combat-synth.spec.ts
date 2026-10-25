import { test, expect } from '@playwright/test';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { encodeBackup } from '../src/platform/save-backup';

test('real battle skill synthesis is audible and its entire effect tail obeys mute', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  await context.addInitScript(() => {
    const w = window as typeof window & { meters: AnalyserNode[]; skillCues: string[] };
    w.meters = []; w.skillCues = [];
    window.addEventListener('game:se', event => {
      const skill = (event as CustomEvent).detail.skill;
      if (skill) w.skillCues.push(skill);
    });
    const original = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination: AudioNode | AudioParam, ...args: number[]) {
      if (destination instanceof AudioDestinationNode && this.context instanceof AudioContext) {
        const meter = this.context.createAnalyser(); meter.fftSize = 2048;
        original.call(this, meter); w.meters.push(meter);
      }
      return (original as Function).call(this, destination, ...args);
    } as typeof AudioNode.prototype.connect;
  });
  const page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    let save = createInitialSave(content, 42);
    const party = ['seris-awakened', 'noelle-awakened', 'liora-awakened', 'elaine-awakened'];
    save.ownedIds = [...new Set([...save.ownedIds, ...party])];
    save.partyIds = party; save.leaderId = party[0];
    save.settings = { ...save.settings, bgmVolume: 0, seVolume: 1, speed: 2 };
    save = applyCommand(save, { type: 'depart', dungeonId: content.dungeons[0].id, potions: 0 }, content);
    while (save.battle?.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
    await page.goto('/nested/game/index.html#settings');
    await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
    await page.getByLabel('Backup file', { exact: true }).setInputFiles({ name: 'combat-audio.json', mimeType: 'application/json', buffer: Buffer.from(encodeBackup(save, content)) });
    await page.getByRole('button', { name: 'Restore This Save', exact: true }).click();
    await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
    await page.getByRole('button', { name: 'Advance Round', exact: true }).click();
    const rms = () => page.evaluate(() => Math.max(0, ...(window as any).meters.map((meter: AnalyserNode) => {
      const data = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length);
    })));
    await expect.poll(() => page.evaluate(() => (window as any).skillCues.length), { timeout: 15000 }).toBeGreaterThan(0);
    await expect.poll(rms, { timeout: 5000, intervals: [30, 50, 100] }).toBeGreaterThan(0.005);
    await page.getByRole('button', { name: 'Mute sound effects', exact: true }).click();
    // Reverb/delay have independent tails; all must pass through the master SE gain.
    await page.waitForTimeout(350);
    await expect.poll(rms, { timeout: 3000 }).toBeLessThan(0.00001);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
