import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/export-lunette-motion.mjs <original-video-directory>');
mkdirSync('public/video', { recursive: true });
function ff(args) {
 const result = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' });
 if (result.error) throw result.error;
 if (result.status !== 0) throw new Error('Lunette video export failed');
}
for (const [key, character] of [['normal', 'lunette'], ['awakened', 'lunette-awakened']]) {
 const source = join(resolve(input), `${key}-original.mp4`);
 if (!existsSync(source)) throw new Error(`Missing ${source}`);
 const full = `public/video/${character}-v2.mp4`;
 // Preserve forward motion; never reverse gestures to manufacture a loop.
 ff(['-i', source, '-an', '-vf', 'scale=720:1080:force_original_aspect_ratio=increase,crop=720:1080,setsar=1,fps=24', '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1', '-crf', '25', '-maxrate', '1800k', '-bufsize', '3600k', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2', full]);
 ff(['-i', full, '-an', '-vf', 'scale=320:480,fps=18', '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.0', '-crf', '28', '-maxrate', '220k', '-bufsize', '440k', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2', `public/video/${character}-portrait-v2.mp4`]);
}
