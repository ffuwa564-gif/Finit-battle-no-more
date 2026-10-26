import { skipStory } from '../e2e/boot';
import { test,expect,type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { content } from '../src/content';
import { createInitialSave,applyCommand } from '../src/application/game';
import { encodeBackup } from '../src/platform/save-backup';

async function open(page:Page) {
 await page.goto('/');const game=page.frameLocator('iframe');
 await game.getByRole('button',{name:'Tap to Begin',exact:true}).click();await skipStory(game);
 await expect(game.locator('.title-screen')).toHaveCount(0);return game;
}
async function settings(page:Page){const game=page.frameLocator('iframe');await game.getByRole('navigation',{name:'Home menu',exact:true}).getByRole('button',{name:'Settings',exact:true}).click();return game;}
async function upload(page:Page,text:string){await page.frameLocator('iframe').getByLabel('Backup file',{exact:true}).setInputFiles({name:'stillveil-save.json',mimeType:'application/json',buffer:Buffer.from(text)});}

test('English game loads from a nested iframe, changes language, and shows translated skills',async({page})=>{
 await page.setViewportSize({width:390,height:844});const failures:string[]=[];
 page.on('response',response=>{if(response.status()>=400)failures.push(response.url())});
 const game=await open(page);
 await game.getByRole('button',{name:'How to Play',exact:true}).click();
 await expect(game.getByRole('dialog')).toContainText('Choose a strategy, then ATTACK');
 await game.getByRole('button',{name:'Got it — begin the journey',exact:true}).click();
 await game.getByRole('navigation',{name:'Home menu',exact:true}).getByRole('button',{name:'Party',exact:true}).click();
 await game.getByRole('button',{name:/^Seris/}).first().click();
 await expect(game.getByRole('dialog')).toContainText('ignoring 65%');
 await game.getByRole('button',{name:'Close',exact:true}).click();
 await game.getByRole('navigation',{name:'Mobile menu',exact:true}).getByRole('button',{name:'Settings',exact:true}).click();
 await game.getByRole('button',{name:'日本語',exact:true}).click();
 await expect(game.getByRole('heading',{name:'設定',exact:true})).toBeVisible();
 await game.getByRole('button',{name:'English',exact:true}).click();
 await expect(game.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
 expect(await game.locator('html').getAttribute('lang')).toBe('en');
 expect(await game.locator('html').evaluate(el=>el.scrollWidth>innerWidth)).toBe(false);
 expect(failures).toEqual([]);
});

test('backup import previews, restores and exports progress across reload',async({page})=>{
 await open(page);const game=await settings(page);
 const save=createInitialSave(content,42);save.stones=18;save.gold=240;save.drawCount=8;save.ssrPity=4;
 await upload(page,encodeBackup(save,content));await expect(game.getByRole('dialog')).toContainText('18');
 await game.getByRole('button',{name:'Cancel',exact:true}).click();
 const beforeDownload=page.waitForEvent('download');await game.getByRole('button',{name:'Export Backup',exact:true}).click();
 const beforeFile=await beforeDownload;const before=JSON.parse(await readFile((await beforeFile.path())!,'utf8'));
 expect(before.save.stones).toBe(0);
 await upload(page,encodeBackup(save,content));await game.getByRole('button',{name:'Restore This Save',exact:true}).click();
 await game.getByRole('button',{name:'Tap to Begin',exact:true}).click();await skipStory(game);await expect(game.locator('.title-screen')).toHaveCount(0);
 const download=page.waitForEvent('download');await game.getByRole('button',{name:'Export Backup',exact:true}).click();
 const file=await download;const restored=JSON.parse(await readFile((await file.path())!,'utf8'));
 expect(restored.save.stones).toBe(18);expect(restored.save.gold).toBe(240);expect(restored.save.ssrPity).toBe(4);expect(restored.save.ownedIds).toEqual(save.ownedIds);
});

test('an invalid file cannot replace the save',async({page})=>{
 await open(page);const game=await settings(page);
 await upload(page,'{"not":"a save"}');await expect(game.getByRole('alert')).toContainText('not a STILLVEIL');
 await expect(game.getByRole('dialog')).toHaveCount(0);
});

test('an expedition can be resumed and exported without leaving the battle',async({page})=>{
 await open(page);const game=await settings(page);
 const save=applyCommand(createInitialSave(content,42),{type:'depart',dungeonId:content.dungeons[0].id,potions:2},content);
 await upload(page,encodeBackup(save,content));await game.getByRole('button',{name:'Restore This Save',exact:true}).click();
 await game.getByRole('button',{name:'Tap to Begin',exact:true}).click();await skipStory(game);await expect(game.locator('.title-screen')).toHaveCount(0);
 await expect(game.getByRole('region',{name:'Battle Controls',exact:true})).toBeVisible();
 expect((await game.locator('.battle-toast').allTextContents()).join('')).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
 await expect(game.getByRole('button',{name:'Retreat',exact:true})).toBeEnabled({timeout:10000});
 await game.getByRole('button',{name:'Retreat',exact:true}).click();
 const download=page.waitForEvent('download');await game.getByRole('button',{name:'Export Backup',exact:true}).click();
 const file=await download;const backup=JSON.parse(await readFile((await file.path())!,'utf8'));
 expect(backup.save.battle.id).toBe(save.battle!.id);expect(backup.save.battle.phase).toBe('ready');
 await game.getByRole('button',{name:'Close',exact:true}).click();
 await expect(game.getByRole('region',{name:'Battle Controls',exact:true})).toBeVisible();
});
