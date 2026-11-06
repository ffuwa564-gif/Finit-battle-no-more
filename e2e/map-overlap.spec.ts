import {test,expect} from '@playwright/test';
import {enterGame} from './boot';
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
test('overlapping map markers offer the covered destination at multiple zoom levels',async({page})=>{
 await page.goto('/#dungeons/map/ashen-library');await enterGame(page);
 for (const zoom of [1,2]) {
  if(zoom===2)for(let i=0;i<3;i++)await page.getByRole('button',{name:'拡大',exact:true}).click();
  await page.locator('.world-map__land').evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const collision=await page.locator('[data-map-place]').evaluateAll(els=>{
   for(const a of els)for(const b of els){
    if(a===b)continue;
    const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
    const left=Math.max(ar.left,br.left,30),right=Math.min(ar.right,br.right,innerWidth-70),top=Math.max(ar.top,br.top,160),bottom=Math.min(ar.bottom,br.bottom,570);
    if(right-left<3||bottom-top<3)continue;
    const x=(left+right)/2,y=(top+bottom)/2,hit=document.elementFromPoint(x,y)?.closest('[data-map-place]');
    if(hit!==a&&hit!==b)continue;
    const hidden=hit===a?b:a;
    return {x,y,hidden:hidden.getAttribute('data-map-place')!,label:hidden.getAttribute('aria-label')!};
   }return null;
  });
  expect(collision).toBeTruthy();
  await page.touchscreen.tap(collision!.x,collision!.y);
  const dialog=page.getByRole('dialog',{name:'重なっている地点',exact:true});await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-map-choice]')).not.toHaveCount(1);
  await dialog.locator(`[data-map-choice="${collision!.hidden}"]`).tap();
  await expect(dialog).toHaveCount(0);await expect(page.locator('.world-map__destination h2')).toHaveText(collision!.label);
 }
});
test('old category URLs keep the map and a prayer-stone preparation closes back to it',async({page})=>{
 await page.goto('/#dungeons/events');await enterGame(page);
 await expect(page.locator('.world-map')).toBeVisible();await expect(page.locator('.dungeon-mode-tabs,.dungeon-list')).toHaveCount(0);
 const id=await page.evaluate(async()=>{const{content}=await import('/src/content/index.ts');return content.dungeons.find(d=>d.published&&d.kind==='event'&&!d.eventId)!.id;});
 await page.evaluate(id=>{location.hash='dungeons/prepare/'+id;},id);
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.world-map')).toBeVisible();
 for(const hash of ['dungeons/list','dungeons/trials']){
  await page.evaluate(hash=>{location.hash=hash;},hash);await expect(page.locator('.world-map')).toBeVisible();
  await expect(page.locator('.dungeon-mode-tabs,.dungeon-list')).toHaveCount(0);
 }
 await page.goto('/#dungeons/tower');await enterGame(page);await expect(page.locator('.world-map')).toBeVisible();
 await expect(page.getByRole('dialog',{name:'白亜の塔',exact:true})).toBeVisible();
 await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();await expect(page.locator('.world-map')).toBeVisible();
});
