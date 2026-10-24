/** Records real gameplay in isolated demo saves. Never reads the user's browser profile. */
import { chromium, expect, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { encodeBackup } from '../src/platform/save-backup';
import type { GameSave } from '../src/domain/types';

const root='http://127.0.0.1:4182/nested/game/index.html';
const out='artifacts/trailer/raw';
let server:ReturnType<typeof spawn>|undefined;
try{if(!(await fetch(root)).ok)throw Error('No server');}catch{server=spawn(process.execPath,['scripts/preview-itch.mjs'],{stdio:'ignore'});}
for(let i=0;i<50;i++){try{if((await fetch(root)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
function demo(){const s=createInitialSave(content,42);s.ownedIds=content.characters.map(c=>c.id);s.discoveredIds=[...s.ownedIds];s.completedDungeonIds=content.dungeons.map(d=>d.id);s.potions=20;s.settings={...s.settings,bgmVolume:0,seVolume:.8,speed:2};return s;}
function replay(s:GameSave){let n=0;while(s.battle?.phase==='playing'&&n++<300)s=applyCommand(s,{type:'replay'},content);if(n>=300)throw Error('Replay stuck');return s;}
function nextRound(s:GameSave){const b=s.battle!;const low=b.units.filter(u=>u.side==='party'&&u.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(low&&low.hp<low.maxHp*.6&&b.potionsRemaining&&!b.potionUsed)s=applyCommand(s,{type:'potion',unitId:low.uid},content);return applyCommand(s,{type:'round'},content);}
function bossSave(stage:string,party:string[],finish=false){let s=demo();s.partyIds=party;s.leaderId=party[1];s=replay(applyCommand(s,{type:'depart',dungeonId:stage,potions:5},content));const last=content.dungeons.find(d=>d.id===stage)!.waves.length-1;
for(let i=0;i<100;i++){
 if(s.battle?.phase!=='ready')throw Error(`Cannot record ${stage}: ${s.battle?.phase}`);
 if(s.battle.wave===last){if(!finish)return s;const next=nextRound(s);if(next.battle!.events.some(e=>e.kind==='drop'))return s;s=replay(next);}else s=replay(nextRound(s));
}throw Error('No boss');}
await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const selected=new Set((process.env.TRAILER_SHOTS??'battle,loot,summon,boss,awaken').split(','));
async function setup(save:GameSave,hash:string){const context=await browser.newContext({viewport:{width:540,height:960},locale:'en-US',deviceScaleFactor:1});
await context.addInitScript(()=>{
 localStorage.setItem('stillveil-language','en');
 const w=window as any;w.__audioBuses=[];w.__se=[];
 const connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination:any,...args:any[]){
  if(destination instanceof AudioDestinationNode){const ctx=this.context as any;if(!ctx.__recordBus){ctx.__recordBus=ctx.createMediaStreamDestination();w.__audioBuses.push(ctx.__recordBus);}connect.call(this,ctx.__recordBus);}
  return (connect as any).call(this,destination,...args);
 } as any;
 window.addEventListener('game:se',(e:any)=>w.__se.push({at:Date.now(),...e.detail}));
});
const page=await context.newPage();page.setDefaultTimeout(25000);
await page.goto(root+'#settings');await page.getByRole('button',{name:'Tap to Begin',exact:true}).click();await expect(page.locator('.title-screen')).toHaveCount(0);
await page.getByLabel('Backup file',{exact:true}).setInputFiles({name:'trailer-demo.json',mimeType:'application/json',buffer:Buffer.from(encodeBackup(save,content))});
await page.getByRole('button',{name:'Restore This Save',exact:true}).click();await page.getByRole('button',{name:'Tap to Begin',exact:true}).click();await expect(page.locator('.title-screen')).toHaveCount(0);
if(!save.battle)await page.goto(root+hash);
await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(900);
if(save.battle)await expect(page.getByRole('button',{name:'Advance Round',exact:true})).toBeEnabled();
return {context,page};}
async function record(name:string,page:Page,seconds:number,action:()=>Promise<void>){
 const dir=`${out}/${name}`;await mkdir(dir,{recursive:true});
 const cdp=await page.context().newCDPSession(page);const frames:{timestamp:number;data:Buffer}[]=[];
 cdp.on('Page.screencastFrame',e=>{frames.push({timestamp:e.metadata.timestamp??0,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
 await page.evaluate(()=>{const w=window as any;w.__se=[];const bus=w.__audioBuses.filter((b:any)=>b.context.state==='running').at(-1);w.__audioDebug=w.__audioBuses.map((b:any)=>({state:b.context.state,time:b.context.currentTime}));if(!bus)return;w.__audioChunks=[];w.__audioStart=Date.now();w.__rec=new MediaRecorder(bus.stream,{mimeType:'audio/webm;codecs=opus'});w.__rec.ondataavailable=(e:any)=>w.__audioChunks.push(e.data);w.__rec.start(100);});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:540,maxHeight:960,everyNthFrame:1});
 const start=Date.now();await action();const remaining=seconds*1000-(Date.now()-start);if(remaining>0)await page.waitForTimeout(remaining);
 await cdp.send('Page.stopScreencast');
 const audio=await page.evaluate(async()=>{const w=window as any;if(!w.__rec)return null;await new Promise<void>(resolve=>{w.__rec.onstop=()=>resolve();w.__rec.stop();});const bytes=await new Blob(w.__audioChunks,{type:'audio/webm'}).arrayBuffer();return {start:w.__audioStart,bytes:Array.from(new Uint8Array(bytes)),events:w.__se,debug:w.__audioDebug};});
 if(frames.length<2)throw Error(`Not enough frames for ${name}`);
 let list='ffconcat version 1.0\n';
 for(let i=0;i<frames.length;i++){const filename=`frame-${String(i).padStart(5,'0')}.jpg`;await writeFile(`${dir}/${filename}`,frames[i].data);list+=`file '${filename}'\nduration ${i+1<frames.length?Math.max(.001,frames[i+1].timestamp-frames[i].timestamp):.05}\n`;}
 list+=`file 'frame-${String(frames.length-1).padStart(5,'0')}.jpg'\n`;
 await writeFile(`${dir}/frames.ffconcat`,list);
 if(audio)await writeFile(`${dir}/audio.webm`,new Uint8Array(audio.bytes));
 const meta={name,frames:frames.length,firstFrame:frames[0].timestamp,lastFrame:frames.at(-1)!.timestamp,audioStart:audio?.start,audioOffsetSeconds:audio?(frames[0].timestamp*1000-audio.start)/1000:0,events:audio?.events??[],audioDebug:audio?.debug};
 await writeFile(`${dir}/metadata.json`,JSON.stringify(meta,null,2));await page.screenshot({path:`${out}/${name}.png`});console.log(name,frames.length,'frames',audio?.events?.length??0,'SE events');await cdp.detach();
}
try{
 const party=['elaine-awakened','liora-awakened','seris-awakened','lisette-awakened'];
 if(selected.has('battle')){
  const {page,context}=await setup(bossSave('memory-seris',party),'');
  await record('battle',page,12,async()=>{await page.getByRole('button',{name:'Offense',exact:true}).click();await page.waitForTimeout(450);await page.getByRole('button',{name:'Advance Round',exact:true}).click();await page.waitForTimeout(6500);const advance=page.getByRole('button',{name:'Advance Round',exact:true});if(await advance.isEnabled().catch(()=>false))await advance.click();});await context.close();
 }
 if(selected.has('loot')){
  const {page,context}=await setup(bossSave('memory-lisette',party,true),'');
  await record('loot',page,15,async()=>{await page.waitForTimeout(500);await page.getByRole('button',{name:'Advance Round',exact:true}).click();});await context.close();
 }
 if(selected.has('summon')){
  const s=createInitialSave(content,42);s.stones=10;s.drawCount=1;s.ssrPity=1;s.settings={...s.settings,bgmVolume:0,seVolume:.8,speed:2};
  const {page,context}=await setup(s,'#gacha');await page.getByRole('button',{name:'Summon for 5 Wishstones',exact:true}).scrollIntoViewIfNeeded();
  await record('summon',page,11,async()=>{await page.getByRole('button',{name:'Summon for 5 Wishstones',exact:true}).click();await page.getByRole('button',{name:'Use Guarantee and Summon',exact:true}).click();});await context.close();
 }
 if(selected.has('boss')){
  const {page,context}=await setup(bossSave('kuzuha-awakening',['mireille','evelyn','asteria','kuzuha']),'');
  await record('boss',page,9,async()=>{await page.waitForTimeout(800);await page.getByRole('button',{name:'Advance Round',exact:true}).click();});await context.close();
 }
 if(selected.has('awaken')){
  const s=demo();s.ownedIds=s.ownedIds.filter(id=>id!=='seris-awakened');s.materials['seris-memory:rare']=300;s.partyIds=['elaine-awakened','liora-awakened','seris','noelle-awakened'];s.leaderId='seris';
  const {page,context}=await setup(s,'#dungeons/memories');const awaken=page.locator('.story-final .toolbar button').last();await awaken.scrollIntoViewIfNeeded();
  await record('awaken',page,9,async()=>{await page.waitForTimeout(1000);await awaken.click();});await context.close();
 }
 const all=[];for(const name of ['battle','loot','summon','boss','awaken']){try{all.push(JSON.parse(await readFile(`${out}/${name}/metadata.json`,'utf8')));}catch{}}
 await writeFile(`${out}/captures.json`,JSON.stringify(all,null,2));
}finally{await browser.close();server?.kill();}
