import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
async function chapterThreeStack(page:Page){
 await page.goto('/#dungeons/map/pendulum-hall');await enterGame(page);
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {applyCommand}=await import('/src/application/game.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');
  const s=(await loadSave())!,r=s.revision;s.completedDungeonIds=[...content.chapters!.slice(0,2).flatMap(ch=>ch.dungeonIds),...content.chapters![2].dungeonIds.slice(0,6)];
  const next=applyCommand(s,{type:'worldStoryBegin',profile:{name:'ユイ',voice:'soft',favorite:'tea'},from:'current'},content);await persistSave(next,r);
 });await page.reload();await enterGame(page);
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'拡大',exact:true}).click();
 const pin=page.locator('[data-map-place="silver-crypt"] .world-pin__symbol');await expect(pin).toBeVisible();
 await pin.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const box=(await pin.boundingBox())!;return{x:box.x+box.width/2,y:box.y+box.height/2};
}
test('a slightly moving finger opens the actual chapter-three star/castle stack once',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','Native moving touches use CDP.');const p=await chapterThreeStack(page);
 await page.evaluate(()=>{(window as any).mapCues=[];window.addEventListener('game:ui',e=>(window as any).mapCues.push((e as CustomEvent).detail.kind));});
 const camera=await page.locator('.world-map__land').getAttribute('style');const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:p.x+8,y:p.y+1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const dialog=page.getByRole('dialog',{name:'重なっている地点',exact:true});await expect(dialog).toBeVisible();
 await expect(dialog.locator('[data-map-choice="silver-crypt"]')).toBeVisible();await expect(dialog.locator('[data-map-choice="event-silver-lantern"]')).toBeVisible();
 await expect(page.locator('.world-map__land')).toHaveAttribute('style',camera!);expect(await page.evaluate(()=>(window as any).mapCues)).toEqual(['select']);
 await dialog.locator('[data-map-choice="event-silver-lantern"]').tap();await expect(page.locator('.world-map__destination h2')).toHaveText('銀灯の守門');
});
test('the stack responds even when Safari does not synthesize a click after touchend',async({page})=>{
 const p=await chapterThreeStack(page);
 await page.locator('.world-map__surface').evaluate(el=>el.addEventListener('touchend',e=>e.preventDefault(),{passive:false,once:true}));
 await page.touchscreen.tap(p.x,p.y);await expect(page.getByRole('dialog',{name:'重なっている地点',exact:true})).toBeVisible();
});

test('a real drag and cancelled touch never open a chooser, and keyboard activation still does',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','Native moving touch sequences use CDP.');const p=await chapterThreeStack(page);const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:p.x+45,y:p.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:p.x+2,y:p.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.getByRole('dialog')).toHaveCount(0);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:2,x:p.x,y:p.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.getByRole('dialog')).toHaveCount(0);
 const castle=page.locator('[data-map-place="silver-crypt"]');await castle.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog',{name:'重なっている地点',exact:true})).toBeVisible();
});

test('WebKit touch-pointer movement selects by position without waiting for a click',async({page,browserName})=>{
 test.skip(browserName!=='webkit','Chromium uses the native CDP motion case.');const p=await chapterThreeStack(page);
 await page.evaluate(({x,y})=>{const target=document.elementFromPoint(x,y)!;for(const [type,dx]of[['pointerdown',0],['pointermove',8],['pointerup',8]]as const)target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:17,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:x+dx,clientY:y}));},p);
 const dialog=page.getByRole('dialog',{name:'重なっている地点',exact:true});await expect(dialog).toBeVisible();await expect(dialog.locator('[data-map-choice="event-silver-lantern"]')).toBeVisible();
});
