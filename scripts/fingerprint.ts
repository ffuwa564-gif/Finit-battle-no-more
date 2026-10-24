import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { content } from '../src/content/index';

export function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function approvalFingerprint() {
  const paths = [...walk('src'), ...walk('public'), ...walk('scripts')]
    .filter(path => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
    .sort();
  const files = Object.fromEntries(paths.map(path => [relative('.', path).replaceAll('\\', '/'), createHash('sha256').update(readFileSync(path)).digest('hex')]));
  const fingerprint = createHash('sha256').update(JSON.stringify({ contentVersion: content.contentVersion, files })).digest('hex');
  return { contentVersion: content.contentVersion, appVersion: content.appVersion, rulesVersion: content.rulesVersion, schemaVersion: content.schemaVersion, fingerprint, files };
}
