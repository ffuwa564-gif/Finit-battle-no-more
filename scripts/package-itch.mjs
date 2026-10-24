import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';

const root = 'dist-itch';
if (!existsSync(join(root,'index.html'))) throw new Error('Run build:itch before packaging.');
const files = {};
let bytes = 0;
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory,entry);
    if (statSync(path).isDirectory()) walk(path);
    else {
      const key = relative(root,path).replaceAll('\\','/');
      const file = readFileSync(path);
      if (key.length > 240 || file.length > 200 * 1024 * 1024) throw new Error(`itch.io file limit exceeded: ${key}`);
      files[key] = file; bytes += file.length;
      if (/\.(html|css)$/.test(key) && /(?:src|href)=["']\/(?!\/)|url\(["']?\/(?!\/)/.test(file.toString())) throw new Error(`Root-relative asset in ${key}`);
    }
  }
}
walk(root);
if (Object.keys(files).length > 1000 || bytes > 500 * 1024 * 1024) throw new Error('itch.io HTML5 archive limits exceeded.');
mkdirSync('artifacts',{recursive:true});
const archive = zipSync(files,{level:0});
const output = 'artifacts/stillveil-itch-preview.zip';
writeFileSync(output,archive);
writeFileSync('artifacts/itch-build.json',JSON.stringify({distribution:'itch.io HTML5',preview:true,releaseReady:false,archive:output,sha256:createHash('sha256').update(archive).digest('hex'),files:Object.keys(files).length,extractedBytes:bytes,builtAt:new Date().toISOString()},null,2)+'\n');
console.log(`Review ZIP: ${output} (${Object.keys(files).length} files, ${(bytes/1024/1024).toFixed(1)} MiB). No upload or publication performed.`);
