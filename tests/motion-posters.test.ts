import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { content, validateContent } from '../src/content';
import { withMotionPosters } from '../src/content/motion-posters';
import { checkMotionPosters, exportMotionPosters } from '../scripts/motion-posters';
import type { AssetDef } from '../src/domain/types';

describe('motion poster registry', () => {
  it('rejects missing, video-valued and differently framed poster references', () => {
    const invalid = structuredClone(content);
    const video = invalid.assets.find(asset => asset.kind === 'video')!;
    delete video.posterId;
    expect(validateContent(invalid)).toContain(`assets/${video.id}: lossless video poster required`);
    video.posterId = video.id;
    expect(validateContent(invalid)).toContain(`assets/${video.id}: lossless video poster required`);
    const poster = invalid.assets.find(asset => asset.id === `${video.id}-poster`)!;
    video.posterId = poster.id; poster.width -= 2;
    expect(validateContent(invalid)).toContain(`assets/${video.id}: video/poster dimensions must match`);
  });
});

describe('actual motion poster files', () => {
  const root = mkdtempSync(join(tmpdir(), 'stillveil-posters-'));
  const videos: AssetDef[] = ['red', 'blue'].map(id => ({ id, path: `${id}.mp4`, kind: 'video', width: 64, height: 96, anchor: '50% 0%', rights: 'Synthetic test fixture.' }));
  const assets = withMotionPosters(videos);
  const poster = join(root, 'art/motion-posters/red.png');
  function ffmpeg(args: string[]): Buffer {
    const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.toString());
    return result.stdout;
  }
  beforeAll(() => {
    for (const color of ['red', 'blue']) ffmpeg(['-f', 'lavfi', '-i', `color=c=${color}:s=64x96:r=1:d=1`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-threads', '1', join(root, `${color}.mp4`)]);
  }, 30000);
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  it('accepts matching full and portrait media, catches a same-size wrong image and repairs it explicitly', () => {
    exportMotionPosters(assets, root);
    expect(checkMotionPosters(assets, root)).toEqual([]);
    const wrong = ffmpeg(['-i', join(root, 'blue.mp4'), '-frames:v', '1', '-threads', '1', '-c:v', 'png', '-f', 'image2pipe', 'pipe:1']);
    writeFileSync(poster, wrong);
    expect(checkMotionPosters(assets, root)).toEqual(['red: poster differs from first video frame; run npm run export:motion-posters']);
    exportMotionPosters(assets, root);
    expect(checkMotionPosters(assets, root)).toEqual([]);
  }, 30000);
  it('checks real dimensions even when registry entries claim to match', () => {
    exportMotionPosters(assets, root);
    writeFileSync(poster, ffmpeg(['-i', join(root, 'red.mp4'), '-vf', 'scale=32:48', '-frames:v', '1', '-threads', '1', '-c:v', 'png', '-f', 'image2pipe', 'pipe:1']));
    expect(checkMotionPosters(assets, root)).toEqual(['red: actual video/poster dimensions must match their registry and each other']);
  }, 30000);
});
