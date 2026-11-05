// Native X11/Pulse common-clock capture of the isolated real application. Runtime tests are still required before use.
import { chromium } from '@playwright/test';
import{startNativeCapture}from'../verify/native-runtime/capture.mjs';
import { readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,appendFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve,relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('../../../',import.meta.url))),OUT=resolve(ROOT,'artifacts/this-girl-05');
const workletPath=resolve(ROOT,'scripts/this-girl-05/capture/pcm-worklet.js'),workletHash=hashWorklet();
function hashWorklet(){return createHash('sha256').update(readFileSync(workletPath)).digest('hex');}
const id=process.argv[2]??'lisette',applicationSpeed=Number(process.argv[3]??1),origin=process.env.CAPTURE_BASE_URL??'http://127.0.0.1:4456';
if(!/^[a-z0-9-]+$/.test(id)||![1,2].includes(applicationSpeed))throw Error('Invalid capture arguments');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(p,e.name)):[resolve(p,e.name)]).sort();
const fingerprint=p=>{const files=Object.fromEntries(walk(p).map(f=>[relative(ROOT,f),hash(f)]));return{files,sha256:createHash('sha256').update(JSON.stringify(files)).digest('hex')};};
const proofPath=resolve(OUT,`proofs/${id}.json.gz`),proof=JSON.parse(gunzipSync(readFileSync(proofPath)));
if(!proof.applicationVerified||!proof.nativeVerified)throw Error('Prepare a verified application proof first');
if(proof.spec.preflight&&!id.startsWith('preflight-'))throw Error('Preflight cannot be a final capture');
if(!['1.12.0','1.12.0-lisette-research.1'].includes(proof.fixture.appVersion))throw Error('Unknown revision mechanics');
if((proof.spec.model==='after')!==(proof.fixture.appVersion==='1.12.0-lisette-research.1'))throw Error('Wrong capture mode');
const source=fingerprint(resolve(ROOT,'src')),assets=fingerprint(resolve(ROOT,'public'));
if(source.sha256!==proof.sourceTreeSha256)throw Error('Proof and capture source differ');
const capture=resolve(OUT,'capture');mkdirSync(capture,{recursive:true});
if(existsSync(resolve(capture,id+'.mov'))||existsSync(resolve(capture,id+'.json')))throw Error('Review/rename the existing capture first');
const framesFolder=resolve(capture,'frames-'+id);mkdirSync(framesFolder,{recursive:true});
const observerPath=resolve(ROOT,'scripts/this-girl-05/capture/buffer-observer.js'),observerHash=hash(observerPath);
const codeHash=hash(fileURLToPath(import.meta.url)),proofHash=hash(proofPath);
const partialGroups=Number(process.env.CAPTURE_PREFLIGHT_MAX_GROUPS??0);
if(partialGroups&&(!proof.spec.preflight||!id.startsWith('preflight-')))throw Error('Partial recording only permitted for development preflight');
const groups=partialGroups?proof.groups.slice(0,partialGroups):proof.groups,expectedFinal=partialGroups?groups.at(-1).after:proof.final;
const pcmFile=resolve(capture,id+'.pcm'),referenceFolder=resolve(capture,'native-references-'+id);mkdirSync(referenceFolder,{recursive:true});writeFileSync(pcmFile,Buffer.alloc(0));
const pcmChunks=[],nativeBuffers=[],bufferFiles=new Map();
proof.fixture.settings={...proof.fixture.settings,speed:applicationSpeed,bgmVolume:0,seVolume:1,reducedMotion:process.env.CAPTURE_REDUCED_MOTION==='1'};
const captureProfile={prefersReducedMotion:'no-preference',requestedPulseLatencyMsec:Number(process.env.PULSE_LATENCY_MSEC??0),requestedAudioBufferSize:512};const pulseLatencyProbes=[];
const pulseProbe=label=>{try{pulseLatencyProbes.push({label,wallTime:Date.now()/1000,sinkInputs:JSON.parse(execFileSync('pactl',['--format=json','list','sink-inputs'],{encoding:'utf8'}))});}catch(e){pulseLatencyProbes.push({label,wallTime:Date.now()/1000,error:String(e)});}};
const browser=await chromium.launch({headless:false,ignoreDefaultArgs:['--mute-audio'],args:['--autoplay-policy=no-user-gesture-required','--no-sandbox','--kiosk','--start-fullscreen','--window-position=0,0','--window-size=450,848','--force-device-scale-factor=1','--audio-buffer-size=512']});
try{
 const context=await browser.newContext({viewport:{width:450,height:848},deviceScaleFactor:1,locale:'ja-JP',reducedMotion:'no-preference'});
 await context.addInitScript(()=>{
  window.__name=f=>f;localStorage.setItem('stillveil-language','ja');
  localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));
  const original=AudioNode.prototype.connect,destinations=new WeakMap();window.__nativeConnect=original;window.__captures=[];
  AudioNode.prototype.connect=function(destination,...args){
   if(destination instanceof AudioDestinationNode&&this.context instanceof AudioContext){
    let tap=destinations.get(this.context);
    if(!tap){tap=this.context.createGain();destinations.set(this.context,tap);window.__captures.push({ctx:this.context,dest:tap});}
    original.call(this,tap);
   }return original.call(this,destination,...args);
  };

 });
 await context.addInitScript({content:readFileSync(resolve(ROOT,'scripts/this-girl-05/capture/buffer-observer.js'),'utf8')});
 const outer=await context.newPage();outer.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text());});outer.on('pageerror',e=>console.error('BROWSER PAGE ERROR',String(e)));outer.setDefaultTimeout(30000);
 await outer.route('**'+'/capture-shell',route=>route.fulfill({contentType:'text/html',body:'<body style="margin:0;background:black"><iframe name="game" src="/" style="width:450px;height:800px;border:0;display:block"></iframe><div id="clock" style="position:absolute;left:0;top:800px;width:450px;height:24px;background:black"></div><canvas id="frame-clock" width="448" height="24" style="position:absolute;left:0;top:824px"></canvas></body>'}));
 await context.exposeBinding('__storePcm',(_,meta,encoded)=>{const data=Buffer.from(encoded,'base64');if(data.length!==meta.frames*4)throw Error('PCM chunk length mismatch');if(pcmChunks.length&&pcmChunks.at(-1).firstFrame+pcmChunks.at(-1).frames!==meta.firstFrame)throw Error('Noncontiguous AudioWorklet PCM '+JSON.stringify({previous:pcmChunks.at(-1),current:meta}));appendFileSync(pcmFile,data);pcmChunks.push(meta);});
 await context.exposeBinding('__storeNativeBuffer',(_,entry,encoded)=>{const data=Buffer.from(encoded,'base64');const file=resolve(referenceFolder,'buffer-'+entry.bufferId+'.f32');if(data.length!==entry.frames*4)throw Error('Native reference size mismatch');writeFileSync(file,data);bufferFiles.set(entry.bufferId,{...entry,file:relative(ROOT,file),sha256:hash(file)});});
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
  const frameCanvas=parent.document.getElementById('frame-clock'),frameContext=frameCanvas.getContext('2d');
  window.__clockTick=()=>{const value=BigInt(Date.now());let checksum=0;for(let x=value;x;x>>=8n)checksum^=Number(x&255n);const bits='101011'+value.toString(2).padStart(42,'0')+checksum.toString(2).padStart(8,'0');for(let i=0;i<bits.length;i++){frameContext.fillStyle=bits[i]==='1'?'white':'black';frameContext.fillRect(i*8,0,8,24);}window.__clockRaf=requestAnimationFrame(window.__clockTick);};window.__clockTick();
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
 const cdp=await context.newCDPSession(outer);const{windowId}=await cdp.send('Browser.getWindowForTarget');await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'fullscreen'}});await page.waitForTimeout(1000);
 const geometry=await outer.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,screenX,screenY,devicePixelRatio,mediaReducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}));if(geometry.innerWidth!==450||geometry.innerHeight!==848||geometry.devicePixelRatio!==1)throw Error('Native viewport mismatch '+JSON.stringify(geometry));
 await outer.screenshot({path:resolve(capture,id+'-golden.png')});
 execFileSync('ffmpeg',['-v','error','-y','-threads','2','-f','x11grab','-video_size','450x848','-i',(process.env.DISPLAY??':93')+'.0+0,0','-frames:v','1',resolve(capture,id+'-os-golden.png')]);
 execFileSync('python',['scripts/this-girl-05/capture/golden-qa.py',id],{cwd:ROOT,stdio:'inherit'});
 await outer.mouse.move(449,847);
 const audioZero=await page.evaluate(async workletSource=>{
  const w=window,tap=w.__captures.filter(t=>t.ctx.state==='running').at(-1);if(!tap)throw Error('No native SE AudioContext output');w.__tap=tap;
  const url=URL.createObjectURL(new Blob([workletSource],{type:'application/javascript'}));await tap.ctx.audioWorklet.addModule(url);URL.revokeObjectURL(url);
  const recorder=new AudioWorkletNode(tap.ctx,'stillveil-pcm',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});w.__pcmRecorder=recorder;w.__pcmChain=Promise.resolve();w.__nativeBufferStarts=[];w.__recordNative=false;w.__pcmWarmup=[];
  w.__nativeEvents=[];w.__battleEvents=[];w.__calibration=[];w.__ultimates=[];
  let startResolve,endResolve;const start=new Promise(r=>startResolve=r);w.__pcmEnd=new Promise(r=>endResolve=r);
  recorder.port.onmessage=e=>{const d=e.data;
   if(d.kind==='start'){w.__pcmOriginalStartFrame=d.firstFrame;w.__pcmSampleRate=d.sampleRate;}
   else if(d.kind==='pcm'){if(w.__pcmWarmup.length<4){w.__pcmWarmup.push({firstFrame:d.firstFrame,frames:d.frames});return;}if(w.__pcmStartFrame===undefined){w.__pcmStartFrame=d.firstFrame;w.__recordEpoch=(performance.timeOrigin+performance.now())/1000-(tap.ctx.currentTime-d.firstFrame/d.sampleRate);w.__recordNative=true;startResolve(w.__recordEpoch);}const bytes=new Uint8Array(d.data);let string='';for(let i=0;i<bytes.length;i+=16384)string+=String.fromCharCode(...bytes.subarray(i,i+16384));const meta={firstFrame:d.firstFrame,frames:d.frames,sampleRate:d.sampleRate,observedContextTime:tap.ctx.currentTime,observedWallTime:(performance.timeOrigin+performance.now())/1000,timeOrigin:performance.timeOrigin,outputTimestamp:tap.ctx.getOutputTimestamp()};w.__pcmChain=w.__pcmChain.then(()=>w.__storePcm(meta,btoa(string))).catch(e=>{if(!w.__pcmFailure)console.error('PCM STORE FAILURE',String(e));w.__pcmFailure=String(e);});}
   else if(d.kind==='end')w.__pcmChain.then(()=>endResolve(d));
  };
  tap.dest.connect(recorder);const mute=tap.ctx.createGain();mute.gain.value=0;recorder.connect(mute);w.__nativeConnect.call(mute,tap.ctx.destination);
  const zero=await start;
  window.addEventListener('game:se',e=>w.__nativeEvents.push({time:(performance.timeOrigin+performance.now())/1000-zero,audioContextTime:w.__tap.ctx.currentTime,...e.detail}));
  let last='',ultimate=false;
  const monitor=()=>{
   try{
    const on=!!document.querySelector('.ultimate-cinematic');
    if(on!==ultimate){ultimate=on;w.__ultimates.push({time:(performance.timeOrigin+performance.now())/1000-zero,on});}
    const b=w.__view()?.save.battle,e=b?.phase==='playing'?b.events[b.cursor]:null;
    if(e&&e.id!==last){last=e.id;w.__battleEvents.push({time:(performance.timeOrigin+performance.now())/1000-zero,wave:b.wave,round:Math.max(1,b.round-1),event:e});}
   }catch{}w.__monitor=requestAnimationFrame(monitor);
  };monitor();return zero;
 },readFileSync(workletPath,'utf8'));
 pulseProbe('before-record');const camera=startNativeCapture({file:resolve(capture,id+'-os-raw.mkv'),width:450,height:848,fps:30,rate:48000});await page.waitForTimeout(1500);
 async function calibrate(label){
  await page.evaluate(async label=>{
   const w=window,{ctx,dest}=w.__tap,box=parent.document.getElementById('clock');
   await new Promise(resolve=>requestAnimationFrame(()=>{
    const oscillator=ctx.createOscillator(),gain=ctx.createGain(),scheduledContextTime=ctx.currentTime+.005;oscillator.frequency.value=16000;gain.gain.value=.1;
    oscillator.connect(gain);gain.connect(dest);w.__nativeConnect.call(gain,ctx.destination);box.style.background='white';oscillator.start(scheduledContextTime);oscillator.stop(scheduledContextTime+.12);
    w.__calibration.push({label,time:(performance.timeOrigin+performance.now())/1000-w.__recordEpoch,scheduledContextTime,contextTime:ctx.currentTime,knownScheduledDelaySeconds:.005,outputTimestamp:ctx.getOutputTimestamp(),timeOrigin:performance.timeOrigin,method:'single RAF callback sets white and schedules native oscillator; no intervening RAF wait'});resolve();
   }));
   await new Promise(resolve=>setTimeout(resolve,230));box.style.background='black';
  },label);await page.waitForTimeout(500);
 }
 await page.waitForTimeout(1200);for(let i=0;i<5;i++)await calibrate('start-'+i);
 await page.waitForTimeout(400);const gameplayStart=Date.now()/1000-audioZero,marks=[];let rounds=0;
 for(const group of groups){
  await waitPhase(['ready']);if(group.kind==='round'&&rounds++%3===0)await calibrate('interior-'+rounds);
  await page.waitForTimeout(90);marks.push({wave:group.wave,round:group.round,kind:group.kind,time:Date.now()/1000-audioZero});
  for(const command of group.commands){const ok=await page.evaluate(async c=>await window.__view().command(c),command);if(!ok)throw Error('Rejected native command '+JSON.stringify(command));await page.waitForTimeout(65);}
  if(group.kind==='round')pulseProbe('wave-'+group.wave+'-round-'+group.round);
  if(group.kind==='round')console.log(id,'Wave',group.wave,'R',group.round,Math.round(Date.now()/1000-audioZero));
 }
 await waitPhase([expectedFinal.battle.phase]);await page.waitForTimeout(900);
 const final=await page.evaluate(async()=>{const{loadSave}=await import('/src/platform/save.ts');return await loadSave();});
 const projection=s=>({units:s.battle.units,phase:s.battle.phase,seed:s.battle.seed,potions:s.battle.potionsRemaining,chests:s.battle.gemChestChecks,finds:s.battle.gemFinds});
 if(JSON.stringify(projection(final))!==JSON.stringify(projection(expectedFinal)))throw Error('Browser/native application mismatch');
 const gameplayEnd=Date.now()/1000-audioZero;await page.waitForTimeout(1400);
 for(let i=0;i<5;i++)await calibrate('end-'+i);
 await page.waitForTimeout(200);const cameraResult=await camera.stop();pulseProbe('after-record');
 const audio=await page.evaluate(async()=>{
  const w=window;w.__recordNative=false;w.__pcmRecorder.port.postMessage('stop');const end=await Promise.race([w.__pcmEnd,new Promise((_,reject)=>setTimeout(()=>reject(Error('Worklet stop timed out')),15000))]);await w.__pcmChain;if(w.__pcmFailure)throw Error(w.__pcmFailure);cancelAnimationFrame(w.__monitor);
  return{events:w.__nativeEvents,battleEvents:w.__battleEvents,ultimates:w.__ultimates,markers:w.__calibration,duration:(performance.timeOrigin+performance.now())/1000-w.__recordEpoch,audioCapture:{kind:'audio-worklet-pcm16',baseLatency:w.__tap.ctx.baseLatency,outputLatency:w.__tap.ctx.outputLatency,startContextFrame:w.__pcmStartFrame,sampleRate:w.__pcmSampleRate,endContextFrame:end.nextFrame,warmupDiscardedChunks:w.__pcmWarmup},nativeBufferStarts:w.__nativeBufferStarts};
 });
 await page.locator('body').screenshot({path:resolve(capture,id+'-result.png')});
 const frames=[];
 if(fingerprint(resolve(ROOT,'src')).sha256!==source.sha256||fingerprint(resolve(ROOT,'public')).sha256!==assets.sha256||hash(fileURLToPath(import.meta.url))!==codeHash||hashWorklet()!==workletHash||hash(observerPath)!==observerHash)throw Error('Source changed during capture');
 const metadata={...audio,audioCapture:{...audio.audioCapture,chunks:pcmChunks,continuous:pcmChunks.every((c,i)=>!i||pcmChunks[i-1].firstFrame+pcmChunks[i-1].frames===c.firstFrame),totalFrames:pcmChunks.reduce((n,c)=>n+c.frames,0),sha256:hash(pcmFile),workletSha256:workletHash},nativeReferenceBuffers:[...bufferFiles.values()],partialPreflight:!!partialGroups};
 writeFileSync(resolve(capture,id+'.json'),JSON.stringify({...metadata,frames,camera:cameraResult,geometry,captureProfile,pulseLatencyProbes,goldenQaFile:'research/golden-'+id+'.json',audioZero,initialOffset:null,gameplayStart,gameplayEnd,marks,nativeBrowserVerified:true,researchFixture:true,productionAppVersion:proof.fixture.appVersion,contentVersion:proof.fixture.contentVersion,rulesVersion:proof.fixture.rulesVersion,unreleasedRules:proof.spec.model==='after',sourceGameCommit:proof.sourceGameCommit,sourceTreeSha256:source.sha256,sourceAssetSha256:assets.sha256,sourceAssets:assets.files,proofSha256:proofHash,captureCodeSha256:codeHash,nativeObserverCodeSha256:observerHash,applicationSpeed,reducedMotion:proof.fixture.settings.reducedMotion,viewport:{width:450,height:800,deviceScaleFactor:1},captureSurface:{width:450,height:848,diagnosticStripHeight:48,frameClock:{kind:'raf-utc-ms-barcode',top:824,height:24,cellWidth:8,bits:56,prefix:'101011',timeBits:42,checksumBits:8}}},null,2));
 await browser.close();
 execFileSync('python',['scripts/this-girl-05/capture/native-clean.py',id],{cwd:ROOT,stdio:'inherit'});
 execFileSync('python',['scripts/this-girl-05/capture/normalize_capture.py',id],{cwd:ROOT,stdio:'inherit'});
}catch(error){
 writeFileSync(resolve(OUT,`research/capture-failure-${id}.json`),JSON.stringify({id,passed:false,error:String(error),proofSha256:proofHash,sourceTreeSha256:source.sha256,codeHash},null,2));
 await browser.close();throw error;
}
