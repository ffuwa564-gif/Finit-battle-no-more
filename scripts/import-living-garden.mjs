/** Import only the reviewed artwork. No generation or lossy re-export in this command. */
import { readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
const source = resolve(process.argv[2] ?? 'artifacts/frame-bud-bloom');
const manifest = JSON.parse(readFileSync(new URL('../docs/living-garden-assets.json', import.meta.url), 'utf8'));
// Validate every source before changing any destination.
for (const asset of manifest.assets) {
  const bytes = readFileSync(resolve(source, asset.file));
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`${asset.file}: not the user-approved artwork`);
}
for (const asset of manifest.assets) {
  const destination = resolve('public/art/living-garden', asset.file);
  mkdirSync(dirname(destination), { recursive: true }); copyFileSync(resolve(source, asset.file), destination);
}
console.log(`Imported ${manifest.assets.length} approved garden assets.`);
