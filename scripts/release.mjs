import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { join, relative } from 'node:path';

const fail = message => { throw new Error(message); };
const hash = data => createHash('sha256').update(data).digest('hex');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
if (!existsSync('dist/index.html') || !existsSync('.reports/validated-content.json')) fail('Run content checks and the Vite build before packaging.');
if (!existsSync('content-approval.json') || !existsSync('.reports/content-review.json')) fail('A matching visual/audio release approval is required; run npm run check:release first.');
const metadata = JSON.parse(readFileSync('.reports/validated-content.json', 'utf8'));
const review = JSON.parse(readFileSync('.reports/content-review.json', 'utf8'));
const approval = JSON.parse(readFileSync('content-approval.json', 'utf8'));
if (approval.fingerprint !== review.fingerprint || approval.contentVersion !== metadata.contentVersion || approval.visualConfirmed !== true || approval.audioConfirmed !== true || typeof approval.reviewer !== 'string' || !approval.reviewer.trim() || typeof approval.confirmedAt !== 'string' || Number.isNaN(Date.parse(approval.confirmedAt))) fail('Release approval is stale or incomplete.');
const currentSourcePaths = [...walk('src'), ...walk('public'), ...walk('scripts')].filter(path => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx')).sort();
const currentSourceFiles = Object.fromEntries(currentSourcePaths.map(path => [path.replaceAll('\\', '/'), hash(readFileSync(path))]));
const currentFingerprint = hash(JSON.stringify({ contentVersion: metadata.contentVersion, files: currentSourceFiles }));
if (currentFingerprint !== review.fingerprint) fail('Source files changed since the release review. Run the review gate again.');
if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(metadata.appVersion)) fail('appVersion must be a safe semantic version.');
const html = readFileSync('dist/index.html', 'utf8');
if (/\b(?:src|href)=["']\/(?!\/)/.test(html)) fail('The Vite build contains root-relative assets. Build with base: ./ for immutable release directories.');
const files = Object.fromEntries(walk('dist').filter(path => !path.endsWith('_headers')).map(path => [relative('dist', path).replaceAll('\\', '/'), hash(readFileSync(path))]));
if (!existsSync('.reports/build-fingerprint.json')) fail('The Vite build has no source/artifact stamp. Run npm run build first.');
const buildStamp = JSON.parse(readFileSync('.reports/build-fingerprint.json', 'utf8'));
if (buildStamp.fingerprint !== currentFingerprint || buildStamp.appVersion !== metadata.appVersion || buildStamp.contentVersion !== metadata.contentVersion || JSON.stringify(buildStamp.files) !== JSON.stringify(files)) fail('Built output is stale or changed. Run npm run build and review the current content before release.');
const artifactHash = hash(JSON.stringify(files));
const directory = `dist-release/releases/${metadata.appVersion}`;
if (existsSync(`${directory}/release-manifest.json`)) {
  const prior = JSON.parse(readFileSync(`${directory}/release-manifest.json`, 'utf8'));
  if (prior.artifactHash !== artifactHash) fail('This appVersion already contains a different immutable build. Bump appVersion; never overwrite a published release.');
}
mkdirSync(directory, { recursive: true });
cpSync('dist', directory, { recursive: true });
const manifest = { ...metadata, artifactHash, reviewFingerprint: review.fingerprint, baseURL: `/releases/${metadata.appVersion}/`, files };
writeFileSync(`${directory}/release-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
const manifests = readdirSync('dist-release/releases').map(version => {
  const path = `dist-release/releases/${version}/release-manifest.json`;
  if (!existsSync(path)) fail(`Retained release ${version} has no compatibility manifest.`);
  const item = JSON.parse(readFileSync(path, 'utf8'));
  for (const [file, expected] of Object.entries(item.files)) {
    const asset = `dist-release/releases/${version}/${file}`;
    if (!existsSync(asset) || hash(readFileSync(asset)) !== expected) fail(`Retained asset missing or changed: ${asset}`);
  }
  return { ...item, path: `/releases/${version}/` };
});
writeFileSync('dist-release/releases.json', `${JSON.stringify({ latest: metadata.appVersion, releases: manifests }, null, 2)}\n`);
writeFileSync('dist-release/index.html', `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#efeee8"><link rel="apple-touch-icon" href="/releases/${metadata.appVersion}/apple-touch-icon.png"><title>Stillveil — 起動</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#efeee8;color:#414b5a;font:16px/1.8 system-ui}main{max-width:32rem;padding:2rem}h1{font:36px Georgia,serif;letter-spacing:.1em}p{white-space:pre-wrap}</style><main><h1>Stillveil</h1><p id="status" role="status">記憶をたどっています…</p></main><script type="module" src="/boot.js"></script></html>`);
writeFileSync('dist-release/boot.js', `const status=document.getElementById('status');
try {
const stop=message=>{status.textContent=message;throw new Error(message)};
const request=indexedDB.open('stillveil-save');
let first=false;
request.onupgradeneeded=()=>{first=true;request.transaction.abort()};
const existing=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>first?resolve(null):reject(request.error)});
let boot=null;let hasSave=false;
if(existing){if(!existing.objectStoreNames.contains('state'))stop('保存形式を読み取れません。セーブは変更していません。');const tx=existing.transaction('state','readonly');const store=tx.objectStore('state');const b=store.get('boot');const s=store.getKey('save');await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);b.onsuccess=()=>{boot=b.result??null};s.onsuccess=()=>{hasSave=s.result!==undefined}});existing.close()}
if(hasSave&&!boot)stop('起動情報が見つかりません。セーブを保持して停止しました。');
if(boot&&(boot.contractVersion!==1||!Number.isInteger(boot.schemaVersion)||typeof boot.appVersion!=='string'||typeof boot.hasExploration!=='boolean'||typeof boot.hasPendingRewards!=='boolean'))stop('未対応の起動情報です。セーブは変更していません。');
const response=await fetch('/releases.json',{cache:'no-store'});if(!response.ok)stop('リリース情報を取得できません。再読み込みしてください。');const registry=await response.json();
const pinned=boot&&(boot.hasExploration||boot.hasPendingRewards);const version=pinned?boot.appVersion:registry.latest;const release=registry.releases.find(item=>item.appVersion===version);
if(!release)stop('この探索を再開するための版が見つかりません。セーブを保持して停止しました。');
if(boot&&(release.schemaVersion!==boot.schemaVersion||pinned&&(release.rulesVersion!==boot.rulesVersion||release.contentVersion!==boot.contentVersion)))stop('保存データと配信版に互換性がありません。セーブは変更していません。');
const check=await fetch(release.path+'release-manifest.json',{cache:'no-store'});if(!check.ok||!(check.headers.get('content-type')??'').includes('json'))stop('必要なリリースを確認できません。セーブは変更していません。');const actual=await check.json();if(actual.artifactHash!==release.artifactHash)stop('リリース内容が一致しません。セーブは変更していません。');
location.replace(release.path+location.hash);
} catch(error) { if(status.textContent==='記憶をたどっています…')status.textContent='起動情報を確認できません。セーブを保持して停止しました。通信とブラウザーの保存設定を確認してください。'; console.error(error); }
`);
writeFileSync('dist-release/_headers', `/\n  Cache-Control: no-cache\n/boot.js\n  Cache-Control: no-cache\n/releases.json\n  Cache-Control: no-cache\n/releases/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
console.log(`Packaged ${metadata.appVersion} for Cloudflare Pages in dist-release/. Retained ${manifests.length} immutable release(s). No account connection or deployment was performed.`);
