import { chromium } from '@playwright/test';
import { createInitialSave } from '../../src/application/game.ts';
import { content } from '../../src/content/index.ts';
import { createBattle, advanceReplay } from '../../src/domain/engine.ts';
import { bootMetadata, SAVE_DATABASE, SAVE_STORE } from '../../src/platform/save.ts';
import { fairyStorageKey, newFairyProgress } from '../../src/ui/fairy-tutorial-data.ts';
import { enterGame } from '../../e2e/boot.ts';
import { mkdirSync, writeFileSync, openSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

if(!process.argv[2])throw Error('Pass the production baseline directory as the first argument');
const output='artifacts/animation-optimization';mkdirSync(output,{recursive:true});
const modes=['baseline','optimized'];
const base=createInitialSave(content,42,{opening:false});
const ids=['athena','nox','lunette-awakened','seris-awakened'];
base.ownedIds=[...new Set([...base.ownedIds,...ids])];base.partyIds=ids;base.leaderId='athena';
base.settings={...base.settings,bgmVolume:0,seVolume:0,speed:1,reducedMotion:false};
let battle=createBattle(content,ids,'athena','silent-cathedral',0,42,'load-profile');
for(let guard=0;battle.phase==='playing';guard++){if(guard>2000)throw Error('Fixture replay failed');battle=advanceReplay(battle,content);}
if(battle.phase!=='ready')throw Error('Expected idle ready battle');
base.battle=battle;
const patch=execFileSync('git',['diff','--','src'],{encoding:'utf8'});writeFileSync(output+'/measured-source.patch',patch);
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const serveLog=openSync(output+'/server.log','w');
const baselineServer=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4318','--strictPort'],{cwd:process.argv[2],stdio:['ignore',serveLog,serveLog]});
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4317','--strictPort'],{stdio:['ignore',serveLog,serveLog]});
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let ready=false;
for(let i=0;i<90;i++){try{const response=await fetch('http://127.0.0.1:4317/',{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break;}}catch{}await sleep(500);}
if(!ready)throw Error('Production preview not ready');
const rows:any[]=[];
const gpuDetails:any[]=[];
try {
for(let repetition=0;repetition<3;repetition++) {
 const order=modes.map((_,j)=>modes[(j+repetition)%modes.length]);
 for(const mode of order){
  const origin=mode==='baseline'?'http://127.0.0.1:4318':'http://127.0.0.1:4317';
  const launched=await chromium.launchServer({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const browser=await chromium.connect(launched.wsEndpoint());
  try{
   const context=await browser.newContext({locale:'ja-JP',viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
   let replaced=0;
   if(mode==='no-garden')await context.route('**/art/living-garden/*.webp',async route=>{
    const url=new URL(route.request().url());const file=url.pathname.split('/').pop()!;
    const map:Record<string,string>={'frame-circulating-light.webp':'frame-poster.png','crystal-motion.webp':'crystal-poster.png','flower-bud-bloom.webp':'flower-open-poster.png','black-flower-bloom.webp':'black-flower-open.png'};
    const poster=map[file]??file.replace(/-motion\.webp$/,'-poster.png').replace(/\.webp$/,'-poster.png');
    url.pathname=url.pathname.slice(0,url.pathname.lastIndexOf('/')+1)+poster;
    const response=await route.fetch({url:url.href});if(!response.ok())throw Error('Missing garden poster '+url.href);
    await route.fulfill({response});replaced++;
   });
   if(mode==='no-portraits')await context.route('**/video/*portrait*.mp4',route=>route.abort());
   await context.addInitScript((noFx:boolean)=>{
    (window as any).__profileDraws=0;
    const getContext=HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext=function(...args:any[]){
      if(noFx&&this.closest('.scene-effects'))return null;
      return (getContext as any).apply(this,args);
    };
    for(const cls of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){
      if(!cls)continue;
      for(const name of ['drawArrays','drawElements']as const){
        const original=(cls.prototype as any)[name];
        (cls.prototype as any)[name]=function(...args:any[]){(window as any).__profileDraws++;return original.apply(this,args);};
      }
    }
   },mode==='no-background-fx');
   const page=await context.newPage();
   await page.route('**/__profile_seed',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Seed only</title>'}));
   await page.goto(origin+'/__profile_seed');
   const save=structuredClone(base);save.settings.reducedMotion=mode==='reduced-motion';
   await page.evaluate(async({save,boot,database,store,key,progress})=>{
    localStorage.setItem(key,JSON.stringify({...progress,offered:true,enrolled:false,dismissed:true}));
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(database,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(store))r.result.createObjectStore(store);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    await new Promise<void>((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(save,'save');t.objectStore(store).put(boot,'boot');t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>reject(t.error);});
   },{save,boot:bootMetadata(save),database:SAVE_DATABASE,store:SAVE_STORE,key:fairyStorageKey,progress:newFairyProgress()});
   await page.goto(origin+'/');await enterGame(page);
   await page.locator('.party-strip').waitFor({state:'visible',timeout:30000});
   await page.waitForTimeout(7000);
   const inspect=()=>page.evaluate(()=>{
    const videos=[...document.querySelectorAll<HTMLVideoElement>('.party-strip video')].map(v=>({src:v.currentSrc,playing:!v.paused,width:v.videoWidth,height:v.videoHeight,time:v.currentTime}));
    const canvas=document.querySelector<HTMLCanvasElement>('.scene-effects canvas');const gl=canvas?.getContext('webgl');const debug=gl?.getExtension('WEBGL_debug_renderer_info');
    return {videos,draws:(window as any).__profileDraws,fxBackend:document.querySelector('.scene-effects')?.getAttribute('data-fx-backend'),renderer:debug?gl!.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,garden:[...document.querySelectorAll<HTMLImageElement>('.living-frame img')].map(i=>({src:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight})),visibility:document.visibilityState};
   });
   const state=await inspect();
   if(!['reduced-motion','no-portraits'].includes(mode)&&state.videos.filter(v=>v.playing&&v.width===640&&v.time>.2).length!==4)throw Error('Four real HQ portrait videos must be playing: '+JSON.stringify(state));
   if(['reduced-motion','no-portraits'].includes(mode)&&state.videos.some(v=>v.playing))throw Error('Portrait stop intervention failed');
   if(mode==='no-background-fx'&&state.fxBackend!=='static')throw Error('GL stop intervention failed');
   if(mode==='no-garden'&&replaced<2)throw Error('Garden intervention missing');
   if(state.fxBackend!=='webgl')throw Error('WebGL required for before/after');
   if(state.visibility!=='visible')throw Error('Background page would invalidate measurements');
   if(mode==='normal'&&repetition===0){gpuDetails.push(await(await browser.newBrowserCDPSession()).send('SystemInfo.getInfo'));}
   const system=await browser.newBrowserCDPSession();const pageCdp=await context.newCDPSession(page);await pageCdp.send('Performance.enable');
   const p0=await system.send('SystemInfo.getProcessInfo');const m0=await pageCdp.send('Performance.getMetrics');const t0=performance.now();const draw0=state.draws;
   await page.waitForTimeout(8000);
   const elapsed=(performance.now()-t0)/1000;const p1=await system.send('SystemInfo.getProcessInfo');const m1=await pageCdp.send('Performance.getMetrics');const after=await inspect();
   const old=new Map(p0.processInfo.map((p:any)=>[p.id,p]));
   const deltas=p1.processInfo.map((p:any)=>({type:p.type,id:p.id,cpuSeconds:old.has(p.id)?Math.max(0,p.cpuTime-(old.get(p.id)as any).cpuTime):0}));
   const cpuSeconds=deltas.reduce((s:number,p:any)=>s+p.cpuSeconds,0);
   const mm0=Object.fromEntries(m0.metrics.map((m:any)=>[m.name,m.value]));const mm1=Object.fromEntries(m1.metrics.map((m:any)=>[m.name,m.value]));
   const row={mode,repetition,elapsed,cpuSeconds,cpuPercentOfOneCore:100*cpuSeconds/elapsed,processes:deltas,drawCallsPerSecond:(after.draws-draw0)/elapsed,taskSeconds:mm1.TaskDuration-mm0.TaskDuration,scriptSeconds:mm1.ScriptDuration-mm0.ScriptDuration,layoutSeconds:mm1.LayoutDuration-mm0.LayoutDuration,heapBytes:mm1.JSHeapUsedSize,state,after,gardenReplacements:replaced};
   rows.push(row);writeFileSync(output+'/before-after-raw.json',JSON.stringify({sourceCommit,rows},null,2));console.log('PROFILE_RESULT '+JSON.stringify(row));
   await page.screenshot({path:output+'/'+mode+'-'+repetition+'.png'});
   await context.close();
  }finally{await browser.close();await launched.close();}
 }
}
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const summary=modes.map(mode=>{const rr=rows.filter(r=>r.mode===mode);return{mode,n:rr.length,medianCpuPercentOfOneCore:median(rr.map(r=>r.cpuPercentOfOneCore)),minCpuPercent:Math.min(...rr.map(r=>r.cpuPercentOfOneCore)),maxCpuPercent:Math.max(...rr.map(r=>r.cpuPercentOfOneCore)),medianDrawCallsPerSecond:median(rr.map(r=>r.drawCallsPerSecond)),medianTaskSeconds:median(rr.map(r=>r.taskSeconds))};});
const report={complete:true,sourceCommit,gameVersion:content.appVersion,node:process.version,chromium:await chromium.executablePath(),cpuModel:os.cpus()[0]?.model,logicalCores:os.cpus().length,viewport:{width:390,height:844,dpr:3},warmupSeconds:7,sampleSeconds:8,repetitions:3,orderPolicy:'Alternating before/after order by repetition',fixture:{party:ids,seed:42,stage:'silent-cathedral',phase:'ready',audio:'muted'},scope:'Before/after optimization, all four HQ portraits and original garden WebP retained; original background shader/30fps versus optimized shader/adaptive 15-30fps. Production build, idle battle at a fixed legal engine-generated state; Linux Chromium with explicit software SwiftShader. Browser process CPU comparison only. No real-device GPU power/temperature measurement; results must not be represented as iPhone thermal savings. No battle action/save costs measured.',gpuDetails,summary,rows};
writeFileSync(output+'/before-after-report.json',JSON.stringify(report,null,2));console.log('PROFILE_SUMMARY '+JSON.stringify({...report,rows:undefined,gpuDetails:undefined}));
} finally {server.kill('SIGTERM');baselineServer.kill('SIGTERM');}

