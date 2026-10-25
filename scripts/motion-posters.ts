import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AssetDef } from '../src/domain/types';

function run(command: string, args: string[]): Buffer {
  const result = spawnSync(command, args, { maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new Error(`${command} is required for motion poster validation: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr.toString().slice(-2000)}`);
  return result.stdout;
}

function dimensions(path: string): [number, number] {
  const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path]).toString());
  const stream = probe.streams?.[0];
  if (!stream) throw new Error(`No video/image stream: ${path}`);
  return [stream.width, stream.height];
}

function firstFrame(path: string): Buffer {
  return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1', '-threads', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
}

/** Check actual media, not just registry dimensions: a wrong crop may be the same size. */
export function checkMotionPosters(assets: AssetDef[], publicRoot: string): string[] {
  const errors: string[] = [];
  for (const video of assets.filter(asset => asset.kind === 'video')) {
    const poster = assets.find(asset => asset.id === video.posterId && asset.kind !== 'video');
    if (!poster) { errors.push(`${video.id}: matching poster asset required`); continue; }
    const videoPath = resolve(publicRoot, video.path), posterPath = resolve(publicRoot, poster.path);
    if (!existsSync(videoPath) || !existsSync(posterPath)) { errors.push(`${video.id}: video or poster file missing`); continue; }
    try {
      const [width, height] = dimensions(videoPath), [posterWidth, posterHeight] = dimensions(posterPath);
      if (width !== video.width || height !== video.height || posterWidth !== poster.width || posterHeight !== poster.height || width !== posterWidth || height !== posterHeight) {
        errors.push(`${video.id}: actual video/poster dimensions must match their registry and each other`);
        continue;
      }
      if (!firstFrame(videoPath).equals(firstFrame(posterPath))) errors.push(`${video.id}: poster differs from first video frame; run npm run export:motion-posters`);
    } catch (error) { errors.push(`${video.id}: ${error instanceof Error ? error.message : error}`); }
  }
  return errors;
}

/** Explicit write command; validation never regenerates stale posters silently. */
export function exportMotionPosters(assets: AssetDef[], publicRoot: string): void {
  for (const video of assets.filter(asset => asset.kind === 'video')) {
    const poster = assets.find(asset => asset.id === video.posterId && asset.kind !== 'video');
    if (!poster) throw new Error(`${video.id}: matching poster asset required`);
    const path = resolve(publicRoot, poster.path);
    if (!/\.png$/i.test(path)) throw new Error(`${video.id}: lossless PNG poster required`);
    const [width, height] = dimensions(resolve(publicRoot, video.path));
    if (width !== video.width || height !== video.height || width !== poster.width || height !== poster.height) throw new Error(`${video.id}: fix registry dimensions before exporting`);
    const bytes = run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', resolve(publicRoot, video.path), '-frames:v', '1', '-threads', '1', '-pix_fmt', 'rgb24', '-c:v', 'png', '-f', 'image2pipe', 'pipe:1']);
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path) || !readFileSync(path).equals(bytes)) writeFileSync(path, bytes);
  }
}
