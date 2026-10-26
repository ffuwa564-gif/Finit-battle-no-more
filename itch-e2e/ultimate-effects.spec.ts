import { test, expect } from '@playwright/test';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { encodeBackup } from '../src/platform/save-backup';

test('packaged Pixi and electrical audio work in a nested cross-origin iframe', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(() => {
    (window as any).__ultimateCues=[];
    window.addEventListener('game:se', event => {
      const kind=(event as CustomEvent).detail.kind;
      if(kind.startsWith('ultimate-')) (window as any).__ultimateCues.push(kind);
    });
  });
  const errors:string[]=[], missing:string[]=[], videos:string[]=[];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {if(response.status()>=400) missing.push(response.url());});
  page.on('request', request => {if(/ultimate-fx-.*\.mp4/.test(request.url()))videos.push(request.url());});
  let save=createInitialSave(content,42);
  save.settings={...save.settings,bgmVolume:0,seVolume:1};
  save=applyCommand(save,{type:'depart',dungeonId:content.dungeons[0].id,potions:0},content);
  while(save.battle!.phase==='playing') save=applyCommand(save,{type:'replay'},content);
  for(const unit of save.battle!.units) {
    if(unit.side==='party'&&unit.characterId==='seris') {unit.ultimateCharge=100;unit.speed=100;}
    if(unit.side==='enemy'){unit.hp=unit.maxHp=100000;unit.attack=0;}
  }
  await page.goto('/');
  const frame=page.frameLocator('iframe[title="STILLVEIL"]');
  await frame.getByRole('button',{name:'Tap to Begin',exact:true}).click();
  const child=page.frames().find(frame=>frame.url().includes('/nested/game/'))!;
  await child.evaluate(()=>location.hash='settings');
  await frame.getByLabel('Backup file',{exact:true}).setInputFiles({name:'ultimate.json',mimeType:'application/json',buffer:Buffer.from(encodeBackup(save,content))});
  await frame.getByRole('button',{name:'Restore This Save',exact:true}).click();
  await frame.getByRole('button',{name:'Tap to Begin',exact:true}).click();
  await frame.getByRole('button',{name:'Seris: queue ultimate',exact:true}).click();
  await frame.getByRole('button',{name:'Advance Round',exact:true}).click();
  const effect=frame.locator('.ultimate-cinematic');
  await expect(effect).toHaveAttribute('data-fx-state','pixi');
  await expect(effect.locator('canvas')).toBeVisible();
  await expect(effect.locator('video')).toHaveCount(0);
  await expect.poll(()=>child.evaluate(()=>(window as any).__ultimateCues)).toEqual(['ultimate-strike']);
  await expect(frame.locator('.combat-number--ultimate')).not.toHaveCount(0);
  await page.screenshot({path:'artifacts/ultimate-pixi/packaged-iframe-390.png'});
  expect(videos).toEqual([]); expect(missing).toEqual([]); expect(errors).toEqual([]);
});
