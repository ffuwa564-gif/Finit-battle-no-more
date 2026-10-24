import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/release.mjs');
const directories: string[] = [];
const hash = (input: string | Buffer) => createHash('sha256').update(input).digest('hex');
function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
}
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'stillveil-release-test-'));
  directories.push(directory);
  for (const name of ['src', 'public', 'scripts', 'dist/assets', '.reports']) mkdirSync(join(directory, name), { recursive: true });
  writeFileSync(join(directory, 'src/example.ts'), 'export const example = 1;');
  writeFileSync(join(directory, 'public/example.svg'), '<svg/>');
  writeFileSync(join(directory, 'scripts/example.js'), '// fixture, not a real review');
  writeFileSync(join(directory, 'dist/index.html'), '<html><script src="./assets/app.js"></script></html>');
  writeFileSync(join(directory, 'dist/assets/app.js'), 'console.log("fixture");');
  const files = Object.fromEntries(['src', 'public', 'scripts'].flatMap(name => walk(join(directory, name))).map(path => relative(directory, path)).sort().map(path => [path, hash(readFileSync(join(directory, path)))]));
  const fingerprint = hash(JSON.stringify({ contentVersion: 'fixture-content', files }));
  writeFileSync(join(directory, '.reports/content-review.json'), JSON.stringify({ fingerprint }));
  // Deliberately synthetic approval only inside a disposable test directory.
  writeFileSync(join(directory, 'content-approval.json'), JSON.stringify({ contentVersion: 'fixture-content', fingerprint, visualConfirmed: true, audioConfirmed: true, reviewer: 'test-fixture', confirmedAt: '2026-01-01T00:00:00Z' }));
  setVersion(directory, '0.1.0');
  return directory;
}
function setVersion(directory: string, appVersion: string) {
  writeFileSync(join(directory, '.reports/validated-content.json'), JSON.stringify({ appVersion, contentVersion: 'fixture-content', rulesVersion: '1', schemaVersion: 1 }));
  stamp(directory, appVersion);
}
function stamp(directory: string, appVersion = '0.1.0') {
  const files = Object.fromEntries(walk(join(directory, 'dist')).map(path => [relative(join(directory, 'dist'), path), hash(readFileSync(path))]));
  const report = JSON.parse(readFileSync(join(directory, '.reports/content-review.json'), 'utf8'));
  writeFileSync(join(directory, '.reports/build-fingerprint.json'), JSON.stringify({ appVersion, contentVersion: 'fixture-content', fingerprint: report.fingerprint, files }));
}
function run(directory: string) {
  return spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });
}
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { force: true, recursive: true }); });

describe('immutable release packaging', () => {
  it('retains old releases and rejects changing a previously packaged version', () => {
    const directory = fixture();
    expect(run(directory).status).toBe(0);
    writeFileSync(join(directory, 'dist/assets/app.js'), 'console.log("new build");');
    stamp(directory);
    const rejected = run(directory);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain('immutable build');
    setVersion(directory, '0.2.0');
    expect(run(directory).status).toBe(0);
    expect(existsSync(join(directory, 'dist-release/releases/0.1.0/assets/app.js'))).toBe(true);
    expect(existsSync(join(directory, 'dist-release/releases/0.2.0/assets/app.js'))).toBe(true);
    const registry = JSON.parse(readFileSync(join(directory, 'dist-release/releases.json'), 'utf8'));
    expect(registry.latest).toBe('0.2.0');
    expect(registry.releases).toHaveLength(2);
  });
  it('rejects root-relative assets and stale source review before packaging', () => {
    const directory = fixture();
    writeFileSync(join(directory, 'dist/index.html'), '<html><script src="/assets/app.js"></script></html>');
    expect(run(directory).stderr).toContain('root-relative');
    writeFileSync(join(directory, 'dist/index.html'), '<html></html>');
    writeFileSync(join(directory, 'src/example.ts'), 'export const changed = true;');
    expect(run(directory).stderr).toContain('Source files changed');
  });
  it('detects missing retained assets instead of shipping broken old saves', () => {
    const directory = fixture();
    expect(run(directory).status).toBe(0);
    rmSync(join(directory, 'dist-release/releases/0.1.0/assets/app.js'));
    setVersion(directory, '0.2.0');
    const result = run(directory);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Retained asset missing or changed');
  });
  it('refuses output changed after the build stamp', () => {
    const directory = fixture();
    writeFileSync(join(directory, 'dist/assets/app.js'), 'console.log("unstamped output");');
    expect(run(directory).stderr).toContain('Built output is stale or changed');
  });
});
