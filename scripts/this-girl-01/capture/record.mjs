// Real isolated-app capture. Runtime tests are still required before use.
import { chromium } from '@playwright/test';
import { readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve,relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('../../../',import.meta.url))),OUT=resolve(ROOT,'artifacts/this-girl-01');
const id=process.argv[2]??'sakuya',applicationSpeed=Number(process.argv[3]??2),origin=process.env.CAPTURE_BASE_URL??'http://127.0.0.1:4356';
if(!/^[a-z0-9-]+$/.test(id)||![1,2].includes(applicationSpeed))throw Error('Invalid capture arguments');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(p,e.name)):[resolve(p,e.name)]).sort();
const fingerprint=p=>{const files=Object.fromEntries(walk(p).map(f=>[relative(ROOT,f),hash(f)]));return{files,sha256:createHash('sha256').update(JSON.stringify(files)).digest('hex')};};
const proofPath=resolve(OUT,`proofs/${id}.json.gz`),proof=JSON.parse(gunzipSync(readFileSync(proofPath)));
if(!proof.applicationVerified||!proof.nativeVerified)throw Error('Prepare a verified application proof first');
if(proof.spec.preflight&&!id.startsWith('preflight-'))throw Error('Preflight cannot be a final capture');
if(!proof.fixture.appVersion.includes('research'))throw Error('Use an after-model proof for the research origin');
const source=fingerprint(resolve(ROOT,'src')),assets=fingerprint(resolve(ROOT,'public'));
if(source.sha256!==proof.sourceTreeSha256)throw Error('Proof and capture source differ');
const capture=resolve(OUT,'capture');mkdirSync(capture,{recursive:true});
if(existsSync(resolve(capture,id+'.mov'))||existsSync(resolve(capture,id+'.json')))throw Error('Review/rename the existing capture first');
const framesFolder=resolve(capture,'frames-'+id);mkdirSync(framesFolder,{recursive:true});
const codeHash=hash(fileURLToPath(import.meta.url)),proofHash=hash(proofPath);
proof.fixture.settings={...proof.fixture.settings,speed:applicationSpeed,bgmVolume:0,seVolume:1};
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:450,height:824},deviceScaleFactor:1,locale:'ja-JP'});
 await context.addInitScript(()=>{
  window.__name=f=>f;localStorage.setItem('stillveil-language','ja');
  localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));
  const original=AudioNode.prototype.connect,destinations=new WeakMap();window.__captures=[];
  AudioNode.prototype.connect=function(destination,...args){
   if(destination instanceof AudioDestinationNode&&this.context instanceof AudioContext){
    let tap=destinations.get(this.context);
    if(!tap){tap=this.context.createMediaStreamDestination();destinations.set(this.context,tap);window.__captures.push({ctx:this.context,dest:tap});}
    original.call(this,tap);
   }return original.call(this,destination,...args);
  };
 });
 const outer=await context.newPage();outer.setDefaultTimeout(30000);
 await outer.route('**'+'/capture-shell',route=>route.fulfill({contentType:'text/html',body:'<body style="margin:0;background:black"><iframe name="game" src="/" style="width:450px;height:800px;border:0;display:block"></iframe><div id="clock" style="position:absolute;left:0;top:800px;width:450px;height:24px;background:black"></div></body>'}));
 await outer.goto(origin+'/capture-shell');const page=outer.frame('game');
 await page.locator('.title-screen__start').waitFor();
 await page.evaluate(async fixture=>{
  const{loadSave,persistSave}=await import('/src/platform/save.ts');const prev=await loadSave();
  fixture.revision=(prev?.revision??0)+1;await persistSave(fixture,prev?.revision);
 },proof.fixture);
 await page.goto(origin+'/');await page.getByRole('button',{name:'タップしてはじめる',exact:true}).click();await page.locator('.battle-layout').waitFor();
 await page.evaluate(async()=>{
  await document.fonts.ready;const{enableAudio}=await import('/src/platform/audio.ts');await enableAudio();
  window.__view=()=>{
   const el=document.querySelector('.battle-layout')??document.querySelector('.result-panel');if(!el)throw Error('No native game view');
   let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];const found=[];
   while(f){for(const v of[f,f.alternate])if(v?.memoizedProps?.save&&v.memoizedProps.command)found.push(v.memoizedProps);f=f.return;}
   return found.sort((a,b)=>b.save.revision-a.save.revision)[0];
  };
 });
 async function waitPhase(phases){
  for(let i=0;i<1200;i++){
   const phase=await page.evaluate(async()=>{const{loadSave}=await import('/src/platform/save.ts');return(await loadSave())?.battle?.phase;});
   if(phases.includes(phase))return;await page.waitForTimeout(100);
  }throw Error('Native phase timeout '+id);
 }
 await waitPhase(['ready']);await page.waitForTimeout(2000);
 if(await page.evaluate(()=>window.__view().save.appVersion)!==proof.fixture.appVersion)throw Error('Browser content version mismatch');
 await page.locator('body').screenshot({path:resolve(capture,id+'-start.png')});
 const cdp=await context.newCDPSession(outer),frames=[];
 cdp.on('Page.screencastFrame',event=>{
  const file='frame-'+String(frames.length).padStart(6,'0')+'.jpg';
  writeFileSync(resolve(framesFolder,file),Buffer.from(event.data,'base64'));
  frames.push({time:event.metadata.timestamp,file});void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId});
 });
 const audioZero=await page.evaluate(async()=>{
  const w=window,tap=w.__captures.filter(t=>t.ctx.state==='running').at(-1);
  if(!tap)throw Error('No native SE AudioContext output');w.__tap=tap;
  const keeper=tap.ctx.createOscillator(),silent=tap.ctx.createGain();silent.gain.value=.000001;
  keeper.connect(silent);silent.connect(tap.dest);keeper.start();w.__keeper=keeper;
  w.__chunks=[];w.__nativeEvents=[];w.__battleEvents=[];w.__calibration=[];w.__ultimates=[];
  w.__recorder=new MediaRecorder(tap.dest.stream,{mimeType:'audio/webm;codecs=opus'});
  w.__recorder.ondataavailable=e=>{if(e.data.size)w.__chunks.push(e.data);};
  const zero=await new Promise(resolve=>{w.__recorder.onstart=()=>{w.__recordEpoch=(performance.timeOrigin+performance.now())/1000;resolve(w.__recordEpoch);};w.__recorder.start();});
  window.addEventListener('game:se',e=>w.__nativeEvents.push({time:(performance.timeOrigin+performance.now())/1000-zero,...e.detail}));
  let last='',ultimate=false;
  const monitor=()=>{
   try{
    const on=!!document.querySelector('.ultimate-cinematic');
    if(on!==ultimate){ultimate=on;w.__ultimates.push({time:(performance.timeOrigin+performance.now())/1000-zero,on});}
    const b=w.__view()?.save.battle,e=b?.phase==='playing'?b.events[b.cursor]:null;
    if(e&&e.id!==last){last=e.id;w.__battleEvents.push({time:(performance.timeOrigin+performance.now())/1000-zero,wave:b.wave,round:Math.max(1,b.round-1),event:e});}
   }catch{}w.__monitor=requestAnimationFrame(monitor);
  };monitor();return zero;
 });
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:450,maxHeight:824,everyNthFrame:1});
 async function calibrate(label){
  await page.evaluate(async label=>{
   const w=window,{ctx,dest}=w.__tap,box=parent.document.getElementById('clock');box.style.background='white';
   await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.frequency.value=16000;gain.gain.value=.1;
   oscillator.connect(gain);gain.connect(dest);oscillator.start();oscillator.stop(ctx.currentTime+.12);
   w.__calibration.push({label,time:(performance.timeOrigin+performance.now())/1000-w.__recordEpoch});
   await new Promise(resolve=>setTimeout(resolve,230));box.style.background='black';
  },label);await page.waitForTimeout(500);
 }
 await page.waitForTimeout(1200);for(let i=0;i<5;i++)await calibrate('start-'+i);
 await page.waitForTimeout(400);const gameplayStart=Date.now()/1000-audioZero,marks=[];let rounds=0;
 for(const group of proof.groups){
  await waitPhase(['ready']);if(group.kind==='round'&&rounds++%3===0)await calibrate('interior-'+rounds);
  await page.waitForTimeout(90);marks.push({wave:group.wave,round:group.round,kind:group.kind,time:Date.now()/1000-audioZero});
  for(const command of group.commands){const ok=await page.evaluate(async c=>await window.__view().command(c),command);if(!ok)throw Error('Rejected native command '+JSON.stringify(command));await page.waitForTimeout(65);}
  if(group.kind==='round')console.log(id,'Wave',group.wave,'R',group.round,Math.round(Date.now()/1000-audioZero));
 }
 await waitPhase([proof.final.battle.phase]);await page.waitForTimeout(900);
 const final=await page.evaluate(async()=>{const{loadSave}=await import('/src/platform/save.ts');return await loadSave();});
 const projection=s=>({units:s.battle.units,phase:s.battle.phase,seed:s.battle.seed,potions:s.battle.potionsRemaining,chests:s.battle.gemChestChecks,finds:s.battle.gemFinds});
 if(JSON.stringify(projection(final))!==JSON.stringify(projection(proof.final)))throw Error('Browser/native application mismatch');
 await page.locator('body').screenshot({path:resolve(capture,id+'-result.png')});
 const gameplayEnd=Date.now()/1000-audioZero;await page.waitForTimeout(1400);
 for(let i=0;i<5;i++)await calibrate('end-'+i);
 await page.waitForTimeout(200);await cdp.send('Page.stopScreencast');
 const audio=await page.evaluate(async()=>{
  const w=window;await new Promise(resolve=>{w.__recorder.onstop=resolve;w.__recorder.stop();});
  cancelAnimationFrame(w.__monitor);w.__keeper.stop();
  const data=Array.from(new Uint8Array(await new Blob(w.__chunks).arrayBuffer()));
  return{data,events:w.__nativeEvents,battleEvents:w.__battleEvents,ultimates:w.__ultimates,markers:w.__calibration,duration:(performance.timeOrigin+performance.now())/1000-w.__recordEpoch};
 });
 if(!frames.length)throw Error('No native video frames');
 if(fingerprint(resolve(ROOT,'src')).sha256!==source.sha256||fingerprint(resolve(ROOT,'public')).sha256!==assets.sha256||hash(fileURLToPath(import.meta.url))!==codeHash)throw Error('Source changed during capture');
 writeFileSync(resolve(capture,id+'.webm'),Buffer.from(audio.data));const{data,...metadata}=audio;
 writeFileSync(resolve(capture,id+'.json'),JSON.stringify({...metadata,frames,audioZero,initialOffset:frames[0].time-audioZero,gameplayStart,gameplayEnd,marks,nativeBrowserVerified:true,researchFixture:true,productionAppVersion:proof.fixture.appVersion,contentVersion:proof.fixture.contentVersion,rulesVersion:proof.fixture.rulesVersion,unreleasedRules:true,sourceGameCommit:proof.sourceGameCommit,sourceTreeSha256:source.sha256,sourceAssetSha256:assets.sha256,sourceAssets:assets.files,proofSha256:proofHash,captureCodeSha256:codeHash,applicationSpeed,viewport:{width:450,height:800,deviceScaleFactor:1},captureSurface:{width:450,height:824,diagnosticStripHeight:24}},null,2));
 await browser.close();
 execFileSync('python',['scripts/this-girl-01/capture/sync_capture.py',id],{cwd:ROOT,stdio:'inherit'});
 execFileSync('python',['scripts/this-girl-01/capture/normalize_capture.py',id],{cwd:ROOT,stdio:'inherit'});
}catch(error){
 writeFileSync(resolve(OUT,`research/capture-failure-${id}.json`),JSON.stringify({id,passed:false,error:String(error),proofSha256:proofHash,sourceTreeSha256:source.sha256,codeHash},null,2));
 await browser.close();throw error;
}
