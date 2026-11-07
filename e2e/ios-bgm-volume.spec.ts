import {fulfillAudioFixture,installDecodedMusicMeter} from './audio-fixture';
import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });

function steadyMusic() {
  const rate = 48000, count = rate * 2, wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 375 * i / rate) * 8192), 44 + i * 2);
  return wav;
}
async function rms(page: Page) {
  return page.evaluate(() => {
    const meter = (window as any).musicMeter as AnalyserNode | undefined;
    if (!meter || meter.context.state !== 'running') return 0;
    const data = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
  });
}

test('music settings change real output when iPhone media volume is ignored, retaining mute and foreground recovery', async ({ page }) => {
  await page.route('**/audio/*.mp3', route => fulfillAudioFixture(route, steadyMusic()));
  await page.addInitScript(() => {
    localStorage.setItem('stillveil-fairy-tutorial-v1', JSON.stringify({ version: 2, enrolled: false, dismissed: true, seen: [] }));
    Object.defineProperty(navigator, 'standalone', { get: () => true });
    // Emulate iOS's read-only media volume, then measure the actual gain output.
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', { configurable: true, get: () => 1, set: () => {} });
  });
  await page.addInitScript(installDecodedMusicMeter,2);
  await page.goto('/#settings'); await enterGame(page);
  const controls = page.getByRole('group', { name: 'BGM音量', exact: true });
  const state=()=>page.evaluate(async()=>(await import('/src/platform/bgm.ts')).getBgmPlaybackState());
  await controls.getByRole('button', { name: '100%', exact: true }).click();
  await expect.poll(() => rms(page)).toBeGreaterThan(.08);
  const full = await rms(page), position = (await state()).position;
  await controls.getByRole('button', { name: '25%', exact: true }).click();
  await expect.poll(async () => (await rms(page)) / full).toBeGreaterThan(.22);
  await expect.poll(async () => (await rms(page)) / full).toBeLessThan(.28);
  expect(((await state()).position-position+2)%2).toBeLessThan(.8);
  expect((await state()).backend).toBe('pcm');
  await controls.getByRole('button', { name: '50%', exact: true }).click();
  await expect.poll(async () => (await rms(page)) / full).toBeGreaterThan(.46);
  await expect.poll(async () => (await rms(page)) / full).toBeLessThan(.54);
  await page.evaluate(async () => { await (window as any).musicContext.suspend(); window.dispatchEvent(new Event('pageshow')); });
  await expect.poll(async () => (await rms(page)) / full).toBeGreaterThan(.46);
  await controls.getByRole('button', { name: '0%', exact: true }).click();
  await expect.poll(async()=>(await state()).playing).toBe(false);
  await expect.poll(() => rms(page)).toBeLessThan(.0001);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(async()=>(await state()).playing).toBe(false);
  await controls.getByRole('button', { name: '25%', exact: true }).click();
  await expect.poll(async () => (await rms(page)) / full).toBeGreaterThan(.22);
  await expect.poll(async () => (await rms(page)) / full).toBeLessThan(.28);
  await page.reload(); await enterGame(page);
  await expect(controls.getByRole('button', { name: '25%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await rms(page)) / full).toBeGreaterThan(.22);
  await expect.poll(async () => (await rms(page)) / full).toBeLessThan(.28);
  await controls.getByRole('button', { name: '0%', exact: true }).click();
  await page.reload(); await enterGame(page);
  await expect(controls.getByRole('button', { name: '0%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
  // A fresh muted launch must also unmute in the settings gesture.
  await controls.getByRole('button', { name: '25%', exact: true }).click();
  await expect.poll(async () => (await rms(page)) / full).toBeGreaterThan(.22);
  await expect.poll(async () => (await rms(page)) / full).toBeLessThan(.28);
  expect(await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.settings.seVolume)).toBe(1);
  // Do not leave a previewed volume in place if IndexedDB cannot save it.
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    (window as any).restoreMusicSave = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function (value, ...args) {
      if (value?.settings?.bgmVolume === 1) throw new DOMException('Audio setting save failed', 'QuotaExceededError');
      return (put as Function).call(this, value, ...args);
    };
  });
  await controls.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('Audio setting save failed');
  await expect(controls.getByRole('button', { name: '25%', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await rms(page)) / full).toBeGreaterThan(.22);
  await expect.poll(async () => (await rms(page)) / full).toBeLessThan(.28);
  await page.evaluate(() => (window as any).restoreMusicSave());
});
