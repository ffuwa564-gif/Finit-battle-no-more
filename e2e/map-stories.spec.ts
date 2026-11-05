import { test,expect } from '@playwright/test';
import { enterGame } from './boot';
test('discover a character on the map, travel, read a short encounter and follow its lead',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#dungeons');await enterGame(page);
 await expect(page.locator('.world-pin--encounter')).toHaveCount(0);
 await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,rev=s.revision;s.completedDungeonIds=['silent-cathedral'];s.settings.reducedMotion=true;s.revision++;await persistSave(s,rev);});
 await page.reload();await enterGame(page);
 await expect(page.locator('.world-map__story-goal')).toContainText('数え直す足音');
 await expect(page.getByRole('button',{name:'数え直す足音',exact:true})).toHaveClass(/is-unread/);
 await expect(page.locator('.world-map__destination')).toContainText('門の外に');
 await page.screenshot({path:info.outputPath('discovery-mobile.png')});
 await page.clock.install();await page.getByRole('button',{name:'自動移動',exact:true}).click();await page.clock.fastForward(46000);
 await page.getByRole('button',{name:'声をかける',exact:true}).click();await page.clock.runFor(700);
 await expect(page.locator('.visual-novel')).toHaveAttribute('data-scene','map-counted-footsteps');await expect(page.locator('#novel-text')).toContainText('足跡');
 await page.getByRole('button',{name:'次の台詞',exact:true}).click();await expect(page.locator('.novel-speaker')).toHaveText('リオラ');
 await page.screenshot({path:info.outputPath('encounter-mobile.png')});
 await page.reload();await enterGame(page); // The shared boot helper explicitly skips the resumed scene.
 await expect(page.locator('.visual-novel')).toHaveCount(0);
 await expect(page.locator('.world-map__story-goal')).toContainText('手がかりの行き先');await expect(page.locator('.world-map__destination h2')).toHaveText('祈りの参道');
 const s=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);expect(s.novels!.seen).toContain('map-counted-footsteps');expect(s.completedDungeonIds).toEqual(['silent-cathedral']);expect(s.gold).toBe(100);
 await expect(page.getByRole('button',{name:'数え直す足音',exact:true})).not.toHaveClass(/is-unread/);
 await page.screenshot({path:info.outputPath('follow-clue-mobile.png')});
 for(const width of[320,390,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
});
test('unreached field encounters cannot be started or revealed by map navigation',async({page})=>{
 await page.goto('/#dungeons');await enterGame(page);
 await expect(page.locator('.world-pin--encounter')).toHaveCount(0);
 const blocked=await page.evaluate(async()=>{const{content}=await import('/src/content/index.ts');const{applyCommand}=await import('/src/application/game.ts');const{loadSave}=await import('/src/platform/save.ts');try{applyCommand((await loadSave())!,{type:'novelStart',sceneId:'map-red-cord'},content);return false;}catch{return true;}});expect(blocked).toBe(true);
});
