import { test,expect,type Page } from '@playwright/test';
import { enterGame } from './boot';
const motionVersion = (id:string) => id === 'athena' ? 'anime' : 'v2';
async function patchSave(page:Page,patch:{drawCount?:number;stones?:number;ssrPity?:number;ownedIds?:string[];partyIds?:string[];leaderId?:string}){
 await page.evaluate(async(patch)=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;Object.assign(save,patch);save.revision++;await persistSave(save,revision);},patch);
 await page.reload();await enterGame(page);
}

test('both SSR paintings play, pause and resume, and a video failure keeps the original visible',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#gacha');await enterGame(page);
 const previews=page.locator('.goddess-collection video');await expect(previews).toHaveCount(2);
 for(const [id,name] of [['selene','セレネ'],['athena','アテナ']]){
  const preview=page.locator(`.goddess-feature--${id} video`);
  await expect(preview).toHaveAttribute('src',new RegExp(`gacha-${id}-${motionVersion(id)}.mp4`));
  await expect.poll(()=>preview.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
  await expect(preview).toHaveJSProperty('muted',true);await expect(preview).toHaveJSProperty('loop',true);await expect(preview).toHaveJSProperty('playsInline',true);
  await page.getByRole('button',{name:`${name}のアニメーションを停止`,exact:true}).click();await expect(preview).toHaveJSProperty('paused',true);
  await page.getByRole('button',{name:`${name}のアニメーションを再生`,exact:true}).click();await expect(preview).toHaveJSProperty('paused',false);
 }
 await page.getByRole('button',{name:'SSR セレネの詳細',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect.poll(()=>dialog.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
 for(const preview of await previews.all())await expect(preview).toHaveJSProperty('paused',true);
 await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.route('**/video/gacha-athena-anime.mp4',route=>route.abort());await page.reload();await enterGame(page);
 const artwork=page.locator('.goddess-feature--athena .animated-illustration');await expect(artwork).toHaveAttribute('data-animation-state','error');
 await expect(artwork).not.toHaveClass(/is-ready/);await expect(artwork.locator('img')).toBeVisible();
 await expect.poll(()=>artwork.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1024);
});

test('SSR reveal and party/battle portraits use the matching full and lightweight animations',async({page})=>{
 await page.goto('/#gacha');await enterGame(page);
 await patchSave(page,{drawCount:100,stones:5,ssrPity:89});
 await page.getByRole('button',{name:'石5個で祈願する',exact:true}).click();
 await page.getByRole('button',{name:'演出をスキップ',exact:true}).click();
 const result=page.getByRole('dialog');await expect(result.locator('video')).toHaveAttribute('src',/gacha-(selene-v2|athena-anime).mp4/);
 await expect.poll(()=>result.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
 await result.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.goto('/#party');
 await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;save.ownedIds=[...new Set([...save.ownedIds,'selene','athena'])];save.partyIds=['selene','athena','seris','noelle'];save.leaderId='selene';save.revision++;await persistSave(save,revision);});
 await page.reload();await enterGame(page);
 for(const [id,name] of [['selene','セレネ'],['athena','アテナ']]){
  const card=page.locator('.character-card').filter({has:page.getByRole('heading',{name,exact:true})});
  await card.scrollIntoViewIfNeeded();const v=card.locator('video');
  await expect(v).toHaveAttribute('src',new RegExp(`${id}-portrait-${motionVersion(id)}.mp4`));
  await expect.poll(()=>v.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);await expect(v).toHaveJSProperty('videoWidth',320);
 }
 await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const {applyCommand}=await import('/src/application/game.ts');const {content}=await import('/src/content/index.ts');const save=(await loadSave())!;await persistSave(applyCommand(save,{type:'depart',dungeonId:content.dungeons[0].id,potions:0},content),save.revision);});
 await page.reload();await enterGame(page);
 for(const id of ['selene','athena']){
  const v=page.locator(`.party-strip video[src$="${id}-portrait-${motionVersion(id)}.mp4"]`);
  await expect.poll(()=>v.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);await expect(v).toHaveJSProperty('muted',true);
 }
 expect(await page.locator('button button').count()).toBe(0);
});

test('reduced motion requests no new SSR video and retains both paintings',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const requests:string[]=[];
 page.on('request',r=>{if(/gacha-(?:selene-v2|athena-anime)\.mp4|(?:selene-portrait-v2|athena-portrait-anime)\.mp4/.test(r.url()))requests.push(r.url());});
 await page.goto('/#gacha');await enterGame(page);
 await expect(page.locator('.goddess-collection .animated-illustration')).toHaveCount(2);
 for(const art of await page.locator('.goddess-collection .animated-illustration').all()){
  await expect(art).toHaveAttribute('data-animation-state','static');await expect(art.locator('video')).not.toHaveAttribute('src',/.+/);await expect(art.locator('img')).toBeVisible();
 }
 expect(requests).toEqual([]);
});
