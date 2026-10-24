import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { approvalFingerprint, walk } from './fingerprint';

if (!existsSync('dist/index.html')) throw new Error('No completed Vite build was found.');
const report = approvalFingerprint();
const files = Object.fromEntries(walk('dist').filter(path => !path.endsWith('_headers')).map(path => [relative('dist', path).replaceAll('\\', '/'), createHash('sha256').update(readFileSync(path)).digest('hex')]));
mkdirSync('.reports', { recursive: true });
writeFileSync('.reports/build-fingerprint.json', `${JSON.stringify({ fingerprint: report.fingerprint, appVersion: report.appVersion, contentVersion: report.contentVersion, files }, null, 2)}\n`);
console.log(`Development build stamped for ${report.appVersion}. This is not a visual/audio approval.`);
