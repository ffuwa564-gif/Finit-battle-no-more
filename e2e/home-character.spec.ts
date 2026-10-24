import { test,expect } from '@playwright/test';
import { enterGame } from './boot';
const chosenButton=(page:import('@playwright/test').Page,name:string)=>page.getByRole('dialog').getByRole('button',{name:new RegExp(`^${name}／`)});

test('home only offers owned companions, saves an animated choice and keeps the party leader',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await enterGame(page);
 await page.getByRole('button',{name:'ホームのキャラを変更',exact:true}).click();
 await expect(chosenButton(page,'セレネ')).toHaveCount(0);await expect(chosenButton(page,'エレイン')).toBeVisible();
 await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
 await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;save.ownedIds.push('selene');save.revision++;await persistSave(save,revision);});
 await page.reload();await enterGame(page);
 const before=await page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!);
 await page.getByRole('button',{name:'ホームのキャラを変更',exact:true}).click();
 await expect(page.locator('.home-artwork video')).toHaveJSProperty('paused',true);
 await expect(chosenButton(page,'アマテラス')).toHaveCount(0);await page.screenshot({path:testInfo.outputPath('home-picker.png')});await chosenButton(page,'セレネ').click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 const video=page.locator('.home-artwork video');await expect(video).toHaveAttribute('src',/gacha-selene-v2.mp4/);
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
 await expect(video).toHaveJSProperty('muted',true);
 await page.reload();await enterGame(page);await expect(page.locator('.home-artwork video')).toHaveAttribute('src',/gacha-selene-v2.mp4/);
 const after=await page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!);
 expect(after.leaderId).toBe(before.leaderId);expect(after.partyIds).toEqual(before.partyIds);expect(after.drawCount).toBe(before.drawCount);expect(after.stones).toBe(before.stones);expect(after.settings.homeCharacterId).toBe('selene');
 await expect(page.locator('.home-character-change')).toContainText('セレネ');
 await page.screenshot({path:testInfo.outputPath('home-selene.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('static companions use their illustration, and the default animation can be restored',async({page})=>{
 await page.goto('/');await enterGame(page);
 await page.getByRole('button',{name:'ホームのキャラを変更',exact:true}).click();await chosenButton(page,'エレイン').click();
 await expect(page.locator('.home-artwork > img')).toHaveAttribute('src',/elaine.png/);await expect(page.locator('.home-artwork video')).toHaveCount(0);
 await page.reload();await enterGame(page);await expect(page.locator('.home-artwork > img')).toHaveAttribute('src',/elaine.png/);
 await page.getByRole('button',{name:'ホームのキャラを変更',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'いつものホーム',exact:false}).click();
 await expect.poll(()=>page.locator('.home-artwork video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
 const save=await page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!);expect(save.settings.homeCharacterId).toBeNull();
});

test('a selected animation obeys reduced motion and falls back to its own painting on error',async({page})=>{
 await page.goto('/');await enterGame(page);
 await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;save.ownedIds.push('selene');save.settings.homeCharacterId='selene';save.revision++;await persistSave(save,revision);});
 await page.emulateMedia({reducedMotion:'reduce'});const requests:string[]=[];page.on('request',r=>{if(r.url().includes('gacha-selene-v2.mp4'))requests.push(r.url());});
 await page.reload();await enterGame(page);await expect(page.locator('.home-artwork .animated-illustration')).toHaveAttribute('data-animation-state','static');await expect(page.locator('.home-artwork img')).toHaveAttribute('src',/gacha-selene.webp/);expect(requests).toEqual([]);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.route('**/video/gacha-selene-v2.mp4',route=>route.abort());await page.reload();await enterGame(page);
 await expect(page.locator('.home-artwork .animated-illustration')).toHaveAttribute('data-animation-state','error');await expect(page.locator('.home-artwork .animated-illustration')).not.toHaveClass(/is-ready/);await expect(page.locator('.home-artwork img')).toBeVisible();
});
