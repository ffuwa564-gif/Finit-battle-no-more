import{chromium}from'@playwright/test';import{readFileSync,writeFileSync,mkdirSync,rmSync}from'node:fs';import{execFileSync}from'node:child_process';
const OUT='artifacts/diary-111';const id=process.argv[2]??'rewind';const proof=JSON.parse(readFileSync(`${OUT}/proofs/${id}.json`));const applicationSpeed=Number(process.argv[3]??1);proof.fixture.settings.speed=applicationSpeed;const folder=`${OUT}/capture/frames-${id}`;mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});const context=await browser.newContext({viewport:{width:450,height:800},deviceScaleFactor:1,locale:'ja-JP'});
await context.addInitScript(()=>{
 window.__name=(f)=>f;localStorage.setItem('stillveil-language','ja');localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));
 const original=AudioNode.prototype.connect;const destinations=new WeakMap();window.__captures=[];
 AudioNode.prototype.connect=function(destination,...args){
  if(destination instanceof AudioDestinationNode&&this.context instanceof AudioContext){let tap=destinations.get(this.context);if(!tap){tap=this.context.createMediaStreamDestination();destinations.set(this.context,tap);window.__captures.push({ctx:this.context,dest:tap});}original.call(this,tap);}
  return original.call(this,destination,...args);
 };
});
const page=await context.newPage();page.setDefaultTimeout(30000);await page.goto('http://127.0.0.1:4328');await page.locator('.title-screen__start').waitFor();await page.evaluate(async(fixture)=>{const{loadSave,persistSave}=await import('/src/platform/save.ts');const prev=await loadSave();fixture.revision=(prev?.revision??0)+1;await persistSave(fixture,prev?.revision);},proof.fixture);await page.reload();await page.getByRole('button',{name:'タップしてはじめる',exact:true}).click();await page.locator('.battle-layout').waitFor();
await page.evaluate(async()=>{
 await document.fonts.ready;const{enableAudio}=await import('/src/platform/audio.ts');await enableAudio();
 window.__view=()=>{const el=document.querySelector('.battle-layout')??document.querySelector('.result-panel');if(!el)throw Error('No game view');let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];const found=[];while(f){for(const x of[f,f.alternate])if(x?.memoizedProps?.save&&x.memoizedProps.command)found.push(x.memoizedProps);f=f.return;}return found.sort((a,b)=>b.save.revision-a.save.revision)[0];};
});
async function waitPhase(phases){for(let i=0;i<1200;i++){const ph=await page.evaluate(async()=>{const{loadSave}=await import('/src/platform/save.ts');return(await loadSave())?.battle?.phase;});if(phases.includes(ph))return;await page.waitForTimeout(100);}throw Error('Phase timeout '+id);}
await waitPhase(['ready']);await page.waitForTimeout(3000);await page.screenshot({path:`${OUT}/capture/${id}-start.png`});
const cdp=await context.newCDPSession(page);const frames=[];
cdp.on('Page.screencastFrame',e=>{const file='frame-'+String(frames.length).padStart(6,'0')+'.jpg';writeFileSync(folder+'/'+file,Buffer.from(e.data,'base64'));frames.push({time:e.metadata.timestamp,file});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
const audioZero=await page.evaluate(async()=>{
 const w=window;const tap=w.__captures.filter(t=>t.ctx.state==='running').at(-1);if(!tap)throw Error('No native SE output');w.__tap=tap;const keeper=tap.ctx.createOscillator(),silent=tap.ctx.createGain();silent.gain.value=.000001;keeper.connect(silent);silent.connect(tap.dest);keeper.start();w.__keeper=keeper;w.__chunks=[];w.__nativeEvents=[];w.__battleEvents=[];w.__calibration=[];
 w.__recorder=new MediaRecorder(tap.dest.stream,{mimeType:'audio/webm;codecs=opus'});w.__recorder.ondataavailable=e=>{if(e.data.size)w.__chunks.push(e.data);};
 const t=await new Promise(resolve=>{w.__recorder.onstart=()=>{w.__recordEpoch=(performance.timeOrigin+performance.now())/1000;resolve(w.__recordEpoch);};w.__recorder.start();});
 window.addEventListener('game:se',e=>w.__nativeEvents.push({time:(performance.timeOrigin+performance.now())/1000-t,...e.detail}));
 let last='';const monitor=()=>{try{const b=w.__view()?.save.battle;const e=b?.phase==='playing'?b.events[b.cursor]:null;if(e&&e.id!==last){last=e.id;w.__battleEvents.push({time:(performance.timeOrigin+performance.now())/1000-t,round:b.round-1,event:e});}}catch{}w.__monitor=requestAnimationFrame(monitor);};monitor();return t;
});
await cdp.send('Page.startScreencast',{format:'jpeg',quality:87,maxWidth:900,maxHeight:1600,everyNthFrame:1});
async function calibrate(label){await page.evaluate(async(label)=>{
 const w=window,{ctx,dest}=w.__tap;const box=document.createElement('div');box.id='capture-sync-marker';box.style.cssText='position:fixed;left:5px;top:5px;width:64px;height:64px;background:#ff00ff;z-index:2147483647;pointer-events:none';document.body.append(box);
 const domTime=(performance.timeOrigin+performance.now())/1000-w.__recordEpoch;
 await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
 const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=1000;g.gain.value=.4;o.connect(g);g.connect(dest);const at=ctx.currentTime+.04;o.start(at);o.stop(at+.10);
 w.__calibration.push({label,domTime,time:(performance.timeOrigin+performance.now())/1000-w.__recordEpoch+.04});await new Promise(resolve=>setTimeout(resolve,350));box.remove();
 },label);await page.waitForTimeout(500);}
await page.waitForTimeout(1200);
await calibrate('start');await page.waitForTimeout(400);const gameplayStart=Date.now()/1000-audioZero;const marks=[];
for(const group of proof.groups){await waitPhase(['ready']);await page.waitForTimeout(90);marks.push({round:group.round,kind:group.kind,time:Date.now()/1000-audioZero});for(const cmd of group.commands){const ok=await page.evaluate(async c=>await window.__view().command(c),cmd);if(!ok)throw Error('Rejected native command '+JSON.stringify(cmd));await page.waitForTimeout(65);}if(group.kind==='round')console.log(id,'R',group.round,Math.round(Date.now()/1000-audioZero));}
await waitPhase(['reward','failed']);await page.waitForTimeout(900);const beforeClaim=await page.evaluate(async()=>{const{loadSave}=await import('/src/platform/save.ts');return await loadSave();});
const summarize=save=>save.battle.units.map(u=>[u.uid,u.hp,u.ultimateCharge??0]);if(JSON.stringify(summarize(beforeClaim))!==JSON.stringify(summarize(proof.final))||beforeClaim.battle.phase!==proof.final.battle.phase)throw Error('Browser/native replay mismatch');
await page.screenshot({path:`${OUT}/capture/${id}-result.png`});const gameplayEnd=Date.now()/1000-audioZero;await page.waitForTimeout(1400);await calibrate('end');await page.waitForTimeout(200);
await cdp.send('Page.stopScreencast');const audio=await page.evaluate(async()=>{const w=window;await new Promise(resolve=>{w.__recorder.onstop=resolve;w.__recorder.stop();});cancelAnimationFrame(w.__monitor);w.__keeper.stop();const bytes=Array.from(new Uint8Array(await new Blob(w.__chunks).arrayBuffer()));return{data:bytes,events:w.__nativeEvents,battleEvents:w.__battleEvents,markers:w.__calibration,duration:(performance.timeOrigin+performance.now())/1000-w.__recordEpoch};});
writeFileSync(`${OUT}/capture/${id}.webm`,Buffer.from(audio.data));const{data,...meta}=audio;writeFileSync(`${OUT}/capture/${id}.json`,JSON.stringify({...meta,frames,audioZero,initialOffset:frames[0].time-audioZero,gameplayStart,gameplayEnd,marks,nativeBrowserVerified:true,applicationSpeed,viewport:{width:450,height:800,deviceScaleFactor:1}},null,2));await browser.close();execFileSync('python',['scripts/diary-111/sync_capture.py',id],{stdio:'inherit'});
