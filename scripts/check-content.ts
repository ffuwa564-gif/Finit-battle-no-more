import { checkMotionPosters } from './motion-posters';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { content, validateContent } from '../src/content/index';

const errors = validateContent(content);
const publicRoot = resolve('public');
for (const asset of content.assets) {
  const path = resolve(publicRoot, asset.path);
  if (relative(publicRoot, path).startsWith('..') || /^(?:https?:|data:|\/)/.test(asset.path)) {
    errors.push(`${asset.id}: asset path must be release-relative`);
    continue;
  }
  if (!existsSync(path)) { errors.push(`${asset.id}: missing file ${asset.path}`); continue; }
  const bytes = readFileSync(path);
  if (bytes.byteLength === 0) errors.push(`${asset.id}: empty file`);
  if (asset.path.endsWith('.svg')) {
    const svg = bytes.toString();
    if (!svg.includes('<svg') || /<script\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']https?:/i.test(svg)) errors.push(`${asset.id}: invalid or externally dependent SVG`);
  } else if (asset.path.endsWith('.png') && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    errors.push(`${asset.id}: file is not PNG`);
  } else if (/\.webp$/i.test(asset.path) && bytes.subarray(8, 12).toString() !== 'WEBP') {
    errors.push(`${asset.id}: file is not WebP`);
  }
  if (asset.kind === 'video' && bytes.subarray(4, 8).toString() !== 'ftyp') errors.push(`${asset.id}: file is not MP4`);
  if (!asset.rights.trim()) errors.push(`${asset.id}: missing rights information`);
}
if (!errors.length) errors.push(...checkMotionPosters(content.assets, publicRoot));
if (errors.length) {
  console.error(`Content gate failed (${errors.length}):\n${errors.map(error => `- ${error}`).join('\n')}`);
  process.exitCode = 1;
} else {
  mkdirSync('.reports', { recursive: true });
  writeFileSync('.reports/validated-content.json', `${JSON.stringify({ appVersion: content.appVersion, contentVersion: content.contentVersion, rulesVersion: content.rulesVersion, schemaVersion: content.schemaVersion }, null, 2)}\n`);
  console.log(`Content gate passed: ${content.characters.length} characters, ${content.skills.length} skills, ${content.dungeons.length} dungeons, ${content.assets.length} assets (${content.contentVersion}).`);
}
