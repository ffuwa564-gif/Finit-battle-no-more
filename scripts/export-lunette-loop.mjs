import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [base, bridge] = process.argv.slice(2).map(path => resolve(path));
if (!base || !bridge || !existsSync(base) || !existsSync(bridge)) {
  throw new Error('Usage: node scripts/export-lunette-loop.mjs <original-eight-second.mp4> <return-bridge.mp4>');
}
const full = resolve('public/video/lunette-awakened-loop.mp4');
const portrait = resolve('public/video/lunette-awakened-portrait-loop.mp4');
if ([full, portrait].some(output => output === base || output === bridge)) throw new Error('Inputs must be separate from output files.');
mkdirSync('public/video', { recursive: true });
function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Lunette loop export failed');
}
// Keep the original performance in forward order. Skip the bridge's first
// frame, which repeats the original clip's last frame at the join.
ffmpeg(['-i', base, '-i', bridge, '-filter_complex',
  '[0:v]scale=720:960,setsar=1,fps=24,setpts=PTS-STARTPTS[a];[1:v]scale=720:960,setsar=1,fps=24,trim=start_frame=1,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[out]',
  '-map', '[out]', '-an', '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1', '-crf', '24', '-maxrate', '1600k', '-bufsize', '3200k', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2', full]);
ffmpeg(['-i', full, '-an', '-vf', 'scale=360:480,crop=320:480,setsar=1,fps=18',
  '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.0', '-crf', '26', '-maxrate', '280k', '-bufsize', '560k', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2', portrait]);
console.log('Exported Lunette forward animation with a return bridge, plus lightweight portrait.');
