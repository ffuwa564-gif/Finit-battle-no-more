import { test,expect } from '@playwright/test';
import { enterGame } from './boot';
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
test('real two-finger pinches start on a pin, follow the midpoint, reverse and release without selecting it',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','Real multi-touch injection uses the Chromium CDP input interface.');
 await page.goto('/#dungeons');await enterGame(page);
 const land=page.locator('.world-map__land');await page.getByRole('button',{name:'拡大',exact:true}).click();
 await expect.poll(async()=>Number(await land.getAttribute('data-map-zoom'))).toBeGreaterThan(1);
 const cdp=await context.newCDPSession(page);
 const surface=page.locator('.world-map__surface');const bounds=(await surface.boundingBox())!;
 const pin=page.getByRole('button',{name:'旅人の灯',exact:true});const box=(await pin.boundingBox())!;
 const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
 const chosen=await page.locator('.world-map__destination h2').innerText();
 const before=Number(await land.getAttribute('data-map-zoom'));
 const touch=(id:number,x:number,y:number)=>({id,x,y});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,x,y),touch(2,x+70,y)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,x-30,y-15),touch(2,x+100,y+15)]});
 await expect.poll(async()=>Number(await land.getAttribute('data-map-zoom'))).toBeGreaterThan(before*1.6);
 const enlarged=Number(await land.getAttribute('data-map-zoom'));
 // Same gap, shifted midpoint: this must pan even without a change of scale.
 const matrix=()=>land.evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return{a:m.a,e:m.e,f:m.f};});
 const first=await matrix();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,x-15,y+5),touch(2,x+115,y+35)]});
 await expect.poll(async()=>(await matrix()).f).toBeGreaterThan(first.f+10);
 expect(Number(await land.getAttribute('data-map-zoom'))).toBeCloseTo(enlarged,1);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,x+15,y+15),touch(2,x+75,y+25)]});
 await expect.poll(async()=>Number(await land.getAttribute('data-map-zoom'))).toBeLessThan(enlarged*.7);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('.world-map__destination h2')).toHaveText(chosen);
 // A fresh tap must work after the gesture, and page zoom must not have changed.
 await page.getByRole('button',{name:'探索地点の一覧',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 expect(await page.evaluate(()=>window.visualViewport!.scale)).toBe(1);
 expect(bounds.height).toBeGreaterThan(400);
});
test('the atlas includes all chapters and unlocked canonical scenes without revealing locked scenes',async({page})=>{
 await page.goto('/#dungeons');await enterGame(page);
 await page.getByRole('button',{name:'探索地点の一覧',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByRole('group',{name:'地図の章'}).locator('button')).toHaveCount(7);
 await dialog.getByRole('button',{name:/第7章.*ふたりの署名/}).click();await expect(dialog).toContainText('契生石の点検');
 await dialog.getByRole('button',{name:'物語',exact:true}).click();await expect(dialog).toContainText('序章');await expect(dialog).not.toContainText('祈りを預けずに');
 await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.evaluate(async()=>{const{content}=await import('/src/content/index.ts');const{loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,r=s.revision;s.completedDungeonIds=content.dungeons.filter(d=>!d.rebirth).map(d=>d.id);s.novels={seen:content.novels!.filter(n=>n.trigger.kind!=='rebirth').map(n=>n.id)};s.revision++;await persistSave(s,r);});
 await page.reload();await enterGame(page);await page.getByRole('button',{name:'探索地点の一覧',exact:true}).click();await dialog.getByRole('button',{name:'物語',exact:true}).click();
 const total=await page.evaluate(async()=> (await import('/src/content/index.ts')).content.novels!.filter(n=>n.trigger.kind!=='intro').length);await expect(dialog.locator('.world-index-place')).toHaveCount(total);
 await dialog.getByRole('button',{name:/祈りを預けずに/}).click();
 await expect(page.locator('.world-map__destination h2')).toHaveText('祈りを預けずに');
 await page.clock.install();await page.getByRole('button',{name:'自動移動',exact:true}).click();await page.clock.fastForward(46000);await page.getByRole('button',{name:'物語を読む',exact:true}).click();await page.clock.runFor(700);await expect(page.locator('.visual-novel')).toHaveAttribute('data-scene','prayer-and-return');
});
