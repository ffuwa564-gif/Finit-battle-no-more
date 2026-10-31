import {chromium,expect,type Page} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {content} from '../src/content';
import {createInitialSave} from '../src/application/game';
import {createBattle,advanceReplay} from '../src/domain/engine';
import {companionSignals} from '../src/domain/companion-behavior';
import {encodeBackup} from '../src/platform/save-backup';
import {skipStory} from '../e2e/boot';
const url='http://127.0.0.1:4182/nested/game/index.html';
let server:ReturnType<typeof spawn>|undefined;
try{if(!(await fetch(url)).ok)throw Error('preview');}catch{server=spawn(process.execPath,['scripts/preview-itch.mjs'],{stdio:'ignore'});}
for(let i=0;i<50;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(15000);
const out='artifacts/battle-guide-reading-v2';
try{
 await page.addInitScript(()=>{localStorage.setItem('stillveil-language','ja');localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));});
 await page.goto(url);await page.getByRole('button',{name:'タップしてはじめる',exact:true}).click();await skipStory(page);
 const save=createInitialSave(content,2);save.partyIds=['liora','seris','elaine','noelle'];save.leaderId='liora';save.completedDungeonIds=['silent-cathedral'];
 let b=createBattle(content,save.partyIds,save.leaderId,'oath-chain-rehearsal',2,2,'battle-guide-demo');while(b.phase==='playing')b=advanceReplay(b,content);
 save.battle=b;save.settings={...save.settings,reducedMotion:false,seVolume:0,bgmVolume:0,speed:1};
 expect(companionSignals(b,content)).toHaveLength(3);
 await page.goto(url+'#settings');await page.getByLabel('バックアップファイル',{exact:true}).setInputFiles({name:'demo.json',mimeType:'application/json',buffer:Buffer.from(encodeBackup(save,content))});
 await page.getByRole('button',{name:'この内容で復元',exact:true}).click();await page.getByRole('button',{name:'タップしてはじめる',exact:true}).click();
 await expect(page.locator('.companion-signal').first()).toBeVisible();
 await expect(page.locator('[data-planned-targets],[data-choice-skill]')).toHaveCount(0);
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);
 // A recording-only touch marker, never included in the game build or its hit testing.
 await page.evaluate(()=>{const style=document.createElement('style');style.textContent='.capture-finger{position:fixed;z-index:300;width:30px;height:30px;margin:-15px 0 0 -15px;border:2px solid #ecf8ff;border-radius:50%;background:#bedff82e;box-shadow:0 0 0 6px #b9d6eb18,0 0 15px #c3e4ff55;pointer-events:none;opacity:0;transition:opacity .16s}.capture-finger[data-down="true"]{background:#e1f2ff55;box-shadow:0 0 0 8px #c1dffb22,0 0 20px #bcdcff77}';document.head.append(style);const ring=document.createElement('div');ring.className='capture-finger';document.body.append(ring);});
 const cdp=await context.newCDPSession(page);
 async function finger(x:number,y:number,visible=true,down=false){await page.locator('.capture-finger').evaluate((el:HTMLElement,p)=>{el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.opacity=p.visible?'1':'0';el.dataset.down=String(p.down);},{x,y,visible,down});}
 async function tap(selector:string,settle=300){const r=(await page.locator(selector).boundingBox())!;const p={x:r.x+r.width/2,y:r.y+r.height/2};await finger(p.x,p.y,true,true);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await page.waitForTimeout(180);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await finger(p.x,p.y,true,false);await page.waitForTimeout(settle);await finger(p.x,p.y,false);}
 const segments:any[]=[];
 async function record(name:string,action:()=>Promise<void>,hold=.5){
  const dir=`${out}/${name}`;await mkdir(dir,{recursive:true});const frames:{timestamp:number,data:Buffer}[]=[];
  const onFrame=(e:any)=>{frames.push({timestamp:e.metadata.timestamp,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId});};
  cdp.on('Page.screencastFrame',onFrame);await cdp.send('Page.startScreencast',{format:'jpeg',quality:94,maxWidth:390,maxHeight:844,everyNthFrame:1});
  await page.waitForTimeout(150);await action();await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',onFrame);
  if(!frames.length)throw Error('No capture frames');
  let concat='ffconcat version 1.0\n';
  for(let i=0;i<frames.length;i++){const f=`frame-${String(i).padStart(5,'0')}.jpg`;await writeFile(`${dir}/${f}`,frames[i].data);concat+=`file '${f}'\nduration ${i+1<frames.length?Math.max(.01,frames[i+1].timestamp-frames[i].timestamp):hold}\n`;}
  concat+=`file 'frame-${String(frames.length-1).padStart(5,'0')}.jpg'\n`;await writeFile(`${dir}/frames.ffconcat`,concat);
  await page.screenshot({path:`${out}/${name}.png`});segments.push({name,frames:frames.length,duration:frames.at(-1)!.timestamp-frames[0].timestamp+hold});console.log(name,segments.at(-1));
 }
 await record('01-read',async()=>{await page.waitForTimeout(750);const r=(await page.locator('.companion-signal').nth(1).boundingBox())!;await finger(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(1800);await finger(0,0,false);},.5);
 await record('02-command',async()=>{
  await tap('.enemy-carousel-arrow:last-child');await page.waitForTimeout(350);const r=(await page.locator('[data-pilot] .portrait-image').boundingBox())!;const origin={x:r.x+r.width/2,y:r.y+r.height/2};
  await finger(origin.x,origin.y,true,true);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});await expect(page.locator('.command-dial')).toBeVisible();await page.waitForTimeout(1000);
  const box=(await page.locator('[data-command="attack"]').boundingBox())!;const target={x:box.x+box.width/2,y:box.y+box.height/2};
  for(let i=1;i<=12;i++){const p={x:origin.x+(target.x-origin.x)*i/12,y:origin.y+(target.y-origin.y)*i/12};await finger(p.x,p.y,true,true);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});await page.waitForTimeout(70);}
  await page.waitForTimeout(950);await page.screenshot({path:`${out}/palette-detail.png`});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await finger(target.x,target.y,false);await expect(page.getByLabel('狙っている敵',{exact:true})).toBeVisible();await page.waitForTimeout(1200);
 },.7);
 await record('03-reveal',async()=>{
  await page.waitForTimeout(650);await tap('[data-guide="battle-advance"]',60);
  await expect(page.locator('.companion-signal')).toHaveCount(0);
  const revealed=page.locator('.companion-choice__bubble[data-choice-state="selected"]');await expect(revealed.first()).toBeVisible();
  await page.waitForTimeout(350);await page.screenshot({path:`${out}/revealed-commands.png`});
 },1.8);
 await writeFile(`${out}/capture.json`,JSON.stringify({party:save.partyIds,trial:'oath-chain-rehearsal',reducedMotion:false,segments},null,2));
}finally{await context.close();await browser.close();server?.kill();}
