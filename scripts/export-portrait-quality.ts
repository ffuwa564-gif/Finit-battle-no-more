import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'node:child_process';
import { content } from '../src/content';
import { exportMotionPosters } from './motion-posters';

function run(args: string[]): void {
  const result = spawnSync(ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw result.error ?? new Error('Portrait encoding failed');
}
const highIds = new Set<string>();
const selected = new Set(process.argv.slice(2));
for (const character of content.characters.filter(character => character.portraitMotionId && (!selected.size || selected.has(character.id)))) {
  const light = content.assets.find(asset => asset.id === character.portraitMotionId)!;
  const high = content.assets.find(asset => asset.id === light.highResolutionId)!;
  const original = content.assets.find(asset => asset.id === character.motionId)!;
  if (original.width < high.width) throw new Error(`${character.id}: encode from a full-resolution original, never upscale the lightweight video`);
  // Both 3:4 originals (Nox and Lunette) use a centered 2:3 portrait crop.
  // Preserve that crop rather than stretching the full illustration.
  const framing = original.width * light.height > light.width * original.height ? 'scale=-2:960,crop=640:960' : 'scale=640:960';
  run(['-i', `public/${original.path}`, '-an', '-vf', `${framing},setsar=1,fps=18`, '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1', '-crf', '20', '-maxrate', '1400k', '-bufsize', '2800k', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2', `public/${high.path}`]);
  highIds.add(high.id);
  const comparison = spawnSync(ffmpeg.path, ['-hide_banner', '-i', `public/${light.path}`, '-i', `public/${high.path}`, '-filter_complex', '[1:v]scale=320:480:flags=bilinear[b];[0:v][b]ssim', '-frames:v', '1', '-f', 'null', '-'], { encoding: 'utf8' });
  const similarity = Number(/All:([0-9.]+)/.exec(comparison.stderr)?.[1]);
  if (comparison.status !== 0 || !Number.isFinite(similarity) || similarity < .90) throw new Error(`${character.id}: first-frame framing changed (SSIM ${similarity}); review the crop before exporting posters`);
  console.log(`Encoded ${character.id}: ${high.width}x${high.height}, framing SSIM ${similarity}`);
}
exportMotionPosters(content.assets.filter(asset => highIds.has(asset.id) || asset.kind !== 'video'), 'public');
