import { test,expect,type Page } from '@playwright/test';
import { enterGame } from './boot';
import {contrast} from './readability-checks';
async function seed(page:Page){await page.goto('/#bag');await enterGame(page);await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const {roughMemoryGem}=await import('/src/domain/gem-polishing.ts');const save=(await loadSave())!,rev=save.revision;save.memoryGems!.rough=[{...roughMemoryGem({id:'rough-radiant',defId:'pale-ward',variant:'pure',roll:{power:170,trait:'bulwark',value:128}},1),promise:'radiant'},{...roughMemoryGem({id:'rough-ordinary',defId:'echo-shard',variant:'pure',roll:{power:40,trait:'none',value:0}},4),promise:'ordinary'}];save.revision++;await persistSave(save,rev);localStorage.setItem('stillveil-world-travel-v1',JSON.stringify({position:{x:.38,y:.72},journey:{from:{x:.38,y:.72},to:{x:.53,y:.28},destinationId:'world-tower',startedAt:Date.now(),arrivesAt:Date.now()+45000}}));});await page.reload();await enterGame(page);await page.goto('/#bag/polish');await page.locator('.gem-polish').waitFor();}
test('polish a sealed stone during travel, reveal its real tier once and keep legacy equipment',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await seed(page);
 await expect(page.locator('.gem-polish__travel')).toContainText('白亜の塔');
 await expect(page.locator('.gem-polish .memory-gem-tier')).toHaveCount(0);
 await expect(page.locator('.gem-polish__pad')).toBeEnabled();await contrast(page.locator('.gem-polish__pad'));await page.screenshot({path:info.outputPath('ready-to-polish-mobile.png')});
 await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
 await page.getByRole('button',{name:'研磨を始める',exact:false}).click();
 await page.screenshot({path:info.outputPath('polishing-mobile.png')});
 for(let i=0;i<13;i++){
  const delta=await page.evaluate(async()=>{const {loadSave}=await import('/src/platform/save.ts');const {polishWindow,POLISH_RULES}=await import('/src/domain/gem-polishing.ts');const s=(await loadSave())!.memoryGems!,q=s.polish!,raw=s.rough!.find(r=>r.id===q.rawId)!;let now=Math.max(Date.now()+300,q.lastTapAt+300);const {angle,center}=polishWindow(q,raw,now);now+=((center-angle+360)%360)/360*POLISH_RULES[raw.promise].period;return Math.ceil(now-Date.now());});
  await page.clock.fastForward(delta);await page.getByRole('button',{name:'磨く',exact:false}).filter({has:page.locator('small')}).click();
 }
 await expect(page.locator('.gem-polish__reveal')).toBeVisible();await expect(page.locator('.gem-polish__reveal')).toContainText('T5');
 await page.screenshot({path:info.outputPath('revealed-mobile.png')});
 const inv=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.memoryGems!);expect(inv.items.filter(g=>g.id==='rough-radiant')).toHaveLength(1);expect(inv.rough!.map(r=>r.id)).toEqual(['rough-ordinary']);
 await page.clock.resume();await page.reload();await enterGame(page);expect((await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.memoryGems!)).items.filter(g=>g.id==='rough-radiant')).toHaveLength(1);
});
test('timeout keeps the stone, allows a different stone, and fits a narrow phone',async({page})=>{
 await page.setViewportSize({width:320,height:740});await seed(page);await page.clock.install();await page.getByRole('button',{name:'研磨を始める',exact:false}).click();await page.clock.fastForward(46000);
 await expect(page.locator('.gem-polish__feedback')).toContainText('時間切れ');await page.locator('.gem-polish__stones .button').nth(1).click();await expect(page.locator('.gem-polish__title')).toContainText('普通の原石');await page.getByRole('button',{name:'研磨を始める',exact:false}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
