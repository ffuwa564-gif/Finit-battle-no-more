import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
const digest = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

test('the isolated Runway character plays silently over the fixed sky and artwork starts the game', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const title = page.locator('.title-screen');
  const canvas = title.locator('canvas');
  await expect(title.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'playing');
  await expect(canvas).toBeVisible();
  const video = title.locator('video');
  await expect(video).toHaveCount(1);
  expect(await video.evaluate((v: HTMLVideoElement) => ({ muted: v.muted, inline: v.playsInline, width: v.videoWidth, height: v.videoHeight }))).toEqual({ muted: true, inline: true, width: 1008, height: 896 });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.1);
  await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
  await page.mouse.click(270, 250);
  await expect(title).toHaveCount(0);
  await expect(page.locator('.visual-novel')).toBeVisible();
});

test('language and animation controls do not start the game or music', async ({ page }) => {
  await page.goto('/');
  const title = page.locator('.title-screen');
  const canvas = title.locator('canvas');
  await expect(title.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'playing');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(title).toBeVisible();
  await expect(title.locator('.title-screen__invitation')).toContainText('Experience a world of stillness,');
  await expect(title.locator('.title-screen__invitation')).toContainText('inhabited only by girls.');
  await page.addStyleTag({ content: '.title-screen *, .title-screen *::before, .title-screen *::after { animation: none !important; transition: none !important; }' });
  await page.getByRole('button', { name: 'Pause Background Animation', exact: true }).click();
  await expect(title.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'paused');
  await page.waitForTimeout(100);
  const video = title.locator('video');
  const frozenTime = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
  const frozen = digest(await canvas.screenshot());
  await page.waitForTimeout(350);
  expect(digest(await canvas.screenshot())).toBe(frozen);
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(frozenTime);
  await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play Background Animation', exact: true }).click();
  await expect(title.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'playing');
  await page.waitForTimeout(400);
  expect(digest(await canvas.screenshot())).not.toBe(frozen);
  await expect(title).toBeVisible();
  await page.getByRole('button', { name: 'Tap to Begin', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(title).toHaveCount(0);
});

for (const preference of ['reduced-motion', 'save-data'] as const) {
  test(`${preference} uses the birth poster without downloading character video or renderer`, async ({ page }) => {
    if (preference === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    else await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }));
    const media: string[] = [];
    page.on('request', request => { if (/title-birth-rig|title-birth-background|title-birth-character|title-character|\.mp4/.test(request.url())) media.push(request.url()); });
    await page.goto('/');
    await expect(page.locator('.title-screen .title-birth-scene')).toHaveAttribute('data-animation-state', 'static');
    await expect.poll(() => page.locator('.title-birth-scene__poster').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1672);
    await expect(page.locator('.title-screen canvas')).toHaveCount(0);
    await expect(page.locator('.title-screen video')).toHaveCount(0);
    expect(media).toEqual([]);
    await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
    await expect(page.locator('.title-screen')).toHaveCount(0);
  });
}

test('failed character loading keeps the poster and start action available', async ({ page }) => {
  await page.route('**/art/title-birth-character.webp', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.title-screen .title-birth-scene')).toHaveAttribute('data-animation-state', 'error');
  await expect.poll(() => page.locator('.title-birth-scene__poster').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1672);
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.visual-novel')).toBeVisible();
});

test('starting while a part is still loading does not wait for the renderer', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/art/title-birth-character.webp', async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
  const requested = page.waitForRequest('**/art/title-birth-character.webp');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await requested;
  await expect(page.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'loading');
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.visual-novel')).toBeVisible({ timeout: 2000 });
  await page.waitForTimeout(1400);
  await expect(page.locator('.title-birth-scene')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('an unavailable WebGL renderer falls back to the still image', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind: any, options: any) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
      return original.call(this, kind, options);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'error');
  await expect(page.locator('.title-birth-scene__poster')).toBeVisible();
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.visual-novel')).toBeVisible();
});

test('the wordmark and invitation fit portrait, landscape and desktop screens', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'STILLVEIL', exact: true })).toBeVisible();
    const brand = await page.locator('.title-screen__brand').boundingBox();
    const entry = await page.locator('.title-screen__entry').boundingBox();
    expect(brand!.y).toBeGreaterThanOrEqual(0);
    expect(brand!.y + brand!.height).toBeLessThan(entry!.y);
    expect(entry!.y + entry!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1)).toBe(false);
    await page.screenshot({ path: `artifacts/title-birth/title-${viewport.width}x${viewport.height}.png` });
  }
});

test('the alpha compositor preserves the sky outside the girl and renders her face opaque', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const pixels = await page.evaluate(async () => {
    const root = '/src/';
    const { createBirthRig } = await import(`${root}ui/title-birth-rig.ts`) as typeof import('../src/ui/title-birth-rig');
    const { assetPath } = await import(`${root}content/index.ts`) as typeof import('../src/content');
    const host = document.createElement('div'); document.body.appendChild(host);
    const rig = await createBirthRig(host, assetPath('title-birth-background'), assetPath('title-birth-character'), assetPath('title-character-motion'), () => {});
    const read = async (url: string) => {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 1672; canvas.height = 941;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      return { corner: [...context.getImageData(680, 90, 1, 1).data], face: [...context.getImageData(836, 159, 1, 1).data] };
    };
    try {
      return { actual: await read(await rig.snapshot()), background: await read(assetPath('title-birth-background')) };
    } finally { rig.destroy(); host.remove(); }
  });
  for (let channel = 0; channel < 4; channel++) expect(Math.abs(pixels.actual.corner[channel] - pixels.background.corner[channel])).toBeLessThanOrEqual(2);
  // Skin at the face is bright and covers the dark sky behind it.
  expect(pixels.actual.face[0]).toBeGreaterThan(140);
  expect(pixels.actual.face[3]).toBe(255);
  expect(pixels.actual.face).not.toEqual(pixels.background.face);
});

for (const mode of ['network-error', 'autoplay-denied'] as const) {
  test(`${mode} keeps the static title usable`, async ({ page }) => {
    if (mode === 'network-error') await page.route('**/video/title-character-packed.mp4', route => route.abort());
    else await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Playback blocked', 'NotAllowedError')); });
    await page.goto('/');
    await expect(page.locator('.title-birth-scene')).toHaveAttribute('data-animation-state', 'error');
    await expect(page.locator('.title-birth-scene__poster')).toBeVisible();
    await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
    await expect(page.locator('.visual-novel')).toBeVisible();
  });
}
