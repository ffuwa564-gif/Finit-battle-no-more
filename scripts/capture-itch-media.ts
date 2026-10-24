import { chromium, expect, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { encodeBackup } from '../src/platform/save-backup';

const root='http://127.0.0.1:4182/nested/game/index.html';
let server:ReturnType<typeof spawn>|undefined;
try { await fetch(root).then(r=>{if(!r.ok)throw Error('No preview');}); }
catch { server=spawn(process.execPath,['scripts/preview-itch.mjs'],{stdio:'ignore'}); }
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try {
 for(let i=0;i<50;i++){try{if((await fetch(root)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 await mkdir('artifacts/itch-media',{recursive:true});
 browser=await chromium.launch();
 const context=await browser.newContext({locale:'en-US',viewport:{width:1280,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(20000);
 async function enter(p:Page){await p.getByRole('button',{name:'Tap to Begin',exact:true}).click();await expect(p.locator('.title-screen')).toHaveCount(0);await p.evaluate(()=>document.fonts.ready);}
 async function restore(save:ReturnType<typeof createInitialSave>){
  console.log('Loading demo save');await page.goto(root+'#settings');
  await page.getByLabel('Backup file',{exact:true}).setInputFiles({name:'demo.json',mimeType:'application/json',buffer:Buffer.from(encodeBackup(save,content))});
  await page.getByRole('button',{name:'Restore This Save',exact:true}).click();await enter(page);
 }
 await page.setViewportSize({width:630,height:500});await page.goto(root);await page.evaluate(()=>document.fonts.ready);
 await page.locator('.title-screen__art').evaluate((el:HTMLImageElement)=>el.decode());
 await page.screenshot({path:'artifacts/itch-media/cover.jpg',type:'jpeg',quality:92,style:'.title-language,.title-screen__entry{visibility:hidden}'});
 await enter(page);await page.setViewportSize({width:1280,height:900});await page.goto(root+'#home');
 await page.screenshot({path:'artifacts/itch-media/home-en.jpg',type:'jpeg',quality:92});
 const demo=createInitialSave(content,42);demo.stones=20;demo.drawCount=1;demo.ssrPity=1;
 await restore(demo);console.log('Capturing SSR');await page.setViewportSize({width:390,height:844});await page.goto(root+'#gacha');
 await page.getByRole('button',{name:'Summon for 5 Wishstones',exact:true}).click();
 await expect(page.locator('.gacha-reveal.is-revealed')).toBeVisible({timeout:15000});
 await page.locator('.gacha-reveal__art img').first().evaluate((el:HTMLImageElement)=>el.decode());
 await page.screenshot({path:'artifacts/itch-media/ssr-en.jpg',type:'jpeg',quality:92});
 await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 const battle=applyCommand(createInitialSave(content,42),{type:'depart',dungeonId:content.dungeons[0].id,potions:2},content);
 console.log('Capturing battle');await restore(battle);await expect(page.getByRole('region',{name:'Battle Controls',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Retreat',exact:true})).toBeEnabled({timeout:15000});
 await page.screenshot({path:'artifacts/itch-media/battle-en.jpg',type:'jpeg',quality:92});
 const files:Record<string,Uint8Array>={};
 for(const name of ['cover.jpg','home-en.jpg','battle-en.jpg','ssr-en.jpg'])files[name]=await readFile(`artifacts/itch-media/${name}`);
 files['itch-listing.json']=await readFile('release/itch-listing.json');
 await writeFile('artifacts/stillveil-itch-store.zip',zipSync(files));
 console.log('Store draft: artifacts/stillveil-itch-store.zip (screenshots and bilingual listing; not uploaded)');
} finally { await browser?.close();server?.kill(); }
