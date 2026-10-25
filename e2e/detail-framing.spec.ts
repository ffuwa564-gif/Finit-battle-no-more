import { test, expect, type Locator } from '@playwright/test';
import { enterGame } from './boot';

async function expectFullImage(media:Locator) {
 await expect.poll(()=>media.evaluate((el:HTMLImageElement|HTMLVideoElement)=>el instanceof HTMLImageElement?el.naturalWidth:el.videoWidth)).toBeGreaterThan(0);
 const bounds=await media.evaluate((el:HTMLImageElement|HTMLVideoElement)=>{
  const style=getComputedStyle(el),box=el.getBoundingClientRect(),slot=el.closest('.detail-art')!.getBoundingClientRect();
  const width=el instanceof HTMLImageElement?el.naturalWidth:el.videoWidth,height=el instanceof HTMLImageElement?el.naturalHeight:el.videoHeight;
  const scale=style.objectFit==='contain'?Math.min(box.width/width,box.height/height):style.objectFit==='cover'?Math.max(box.width/width,box.height/height):1;
  const drawnWidth=style.objectFit==='fill'?box.width:width*scale,drawnHeight=style.objectFit==='fill'?box.height:height*scale;
  const position=style.objectPosition.split(' ').map(p=>parseFloat(p)/100);
  const left=box.left+(box.width-drawnWidth)*position[0],top=box.top+(box.height-drawnHeight)*position[1];
  return {left:left-slot.left,top:top-slot.top,right:slot.right-left-drawnWidth,bottom:slot.bottom-top-drawnHeight,distortion:Math.abs(drawnWidth/drawnHeight-width/height),width:drawnWidth,height:drawnHeight};
 });
 expect(bounds.width).toBeGreaterThan(50);expect(bounds.height).toBeGreaterThan(50);
 for(const edge of ['left','top','right','bottom'] as const)expect(bounds[edge],`cropped ${edge}`).toBeGreaterThanOrEqual(-1);
 expect(bounds.distortion).toBeLessThan(.01);
}

test('every character detail retains the complete painting on mobile',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#codex');await enterGame(page);
 const cards=page.locator('.character-grid > .character-card');const count=await cards.count();expect(count).toBeGreaterThan(20);
 for(let i=0;i<count;i++){
  await cards.nth(i).getByRole('button',{name:'物語を読む',exact:true}).click();const dialog=page.getByRole('dialog');
  await expectFullImage(dialog.locator('.detail-art img'));
  if(await dialog.getByRole('heading',{name:'コノハナサクヤヒメ',exact:true}).count())await page.screenshot({path:testInfo.outputPath('sakuya-mobile.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
 }
});

test('short landscape screens and desktop retain both portrait and landscape paintings',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const viewport of [{width:667,height:375},{width:1280,height:900}]){
  await page.setViewportSize(viewport);await page.goto('/#codex');await enterGame(page);
  for(const name of ['コノハナサクヤヒメ','白霧の狼','石燐の幼竜','セレネ']){
   const card=page.locator('.character-card').filter({has:page.getByRole('heading',{name,exact:true})}).first();
   await card.getByRole('button',{name:'物語を読む',exact:true}).click();
   await expectFullImage(page.getByRole('dialog').locator('.detail-art img'));
   await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
  }
 }
});

test('an animated SSR keeps its full video and poster visible with a working pause control',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#gacha');await enterGame(page);
 await page.getByRole('button',{name:'ゴス☆イザナミコレクション',exact:true}).click();
 await page.getByRole('button',{name:'SSR イザナミの詳細',exact:true}).click();
 const dialog=page.getByRole('dialog');await expectFullImage(dialog.locator('.detail-art img'));await expectFullImage(dialog.locator('.detail-art video'));
 await expect.poll(()=>dialog.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
 await dialog.getByRole('button',{name:'イザナミのアニメーションを停止',exact:true}).click();await expect(dialog.locator('video')).toHaveJSProperty('paused',true);
});
