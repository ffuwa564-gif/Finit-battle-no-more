/** Run alongside the Vite dev server. This only exports the authored rig at rest. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:4173/');
  const data = await page.evaluate(async () => {
    const sourceRoot = '/src/';
    const { createBirthRig } = await import(`${sourceRoot}ui/title-birth-rig.ts`) as typeof import('../src/ui/title-birth-rig');
    const { assetPath } = await import(`${sourceRoot}content/index.ts`) as typeof import('../src/content');
    const host = document.createElement('div');
    host.hidden = true;
    document.body.appendChild(host);
    const rig = await createBirthRig(host, assetPath('title-birth-background'), assetPath('title-birth-character'), () => {});
    try { return await rig.snapshot(); } finally { rig.destroy(); host.remove(); }
  });
  await mkdir('artifacts/title-birth/rig', { recursive: true });
  const png = 'artifacts/title-birth/rig/poster-render.png';
  await writeFile(png, Buffer.from(data.split(',')[1], 'base64'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-pix_fmt', 'bgra', '-lossless', '1', '-frames:v', '1', 'public/art/title-birth-still.webp']);
  console.log('Exported the title rig at rest.');
} finally { await browser.close(); }
