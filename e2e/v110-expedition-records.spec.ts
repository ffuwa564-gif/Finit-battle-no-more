import {expect,test,type Page} from '@playwright/test';
import {skipStory} from './boot';
const japanese=/[\u3040-\u30ff\u3400-\u9fff]/;
async function enter(page:Page){await page.waitForFunction(()=>Boolean(document.querySelector('.title-screen__start,.app-shell,[role=alert]')));const fatal=page.locator('.app-loading [role=alert]');if(await fatal.count())throw Error(await fatal.innerText());if(await page.locator('.title-screen').count())await page.locator('.title-screen__start').click();await skipStory(page);}
async function saved(page:Page){return page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);}
async function nativeResultFixture(page:Page){return page.evaluate(async()=>{
 const{content}=await import('/src/content/index.ts'),{applyCommand}=await import('/src/application/game.ts'),{loadSave,persistSave}=await import('/src/platform/save.ts');
 let s=(await loadSave())!,revision=s.revision;
 s.novels={seen:(content.novels??[]).map(scene=>scene.id)};s.settings.reducedMotion=true;
 const act=(c:Parameters<typeof applyCommand>[1],now:number)=>{s=applyCommand(s,c,content,{now});};
 const replay=(now:number)=>{let n=0;while(s.battle?.phase==='playing'){if(n++>1000)throw Error('replay limit');act({type:'replay'},now);}};
 act({type:'depart',dungeonId:'silent-cathedral',potions:2},1000);replay(1000);
 for(let n=0;s.battle?.phase!=='reward'&&n<10;n++){
  for(const u of s.battle!.units){if(u.side==='party'){u.hp=u.maxHp;u.attack=100000;u.speed=1000;}else{u.hp=1;u.attack=0;u.defense=0;u.speed=0;}}
  s.battle!.initialUnits=structuredClone(s.battle!.units);act({type:'round'},6000);replay(6000);
 }
 if(s.battle?.phase!=='reward')throw Error('fixture victory failed');act({type:'claim'},100000);
 act({type:'depart',dungeonId:'silent-cathedral',potions:2},110000);replay(110000);
 for(const u of s.battle!.units){if(u.side==='party'){u.hp=1;u.attack=0;u.speed=0;u.cooldowns=Object.fromEntries(content.characters.find(c=>c.id===u.characterId)!.skillIds.map(id=>[id,1000]));}else{u.hp=u.maxHp=10000;u.attack=100000;u.speed=1000;}}
 s.battle!.initialUnits=structuredClone(s.battle!.units);
 for(let n=0;s.battle?.phase!=='failed'&&n<8;n++){act({type:'round'},116000);replay(116000);}
 if(s.battle?.phase!=='failed')throw Error('fixture defeat failed');
 // Install the isolated multi-command fixture as one CAS update.
 s.revision=revision+1;await persistSave(s,revision);return{review:s.battle.tracking!.review,history:s.expeditionHistory!};
 });}
for(const language of ['ja','en']as const)for(const width of [320,390])test(`${language} ${width}px: native result review and farm history stay folded, readable and persist once`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:844});await page.addInitScript(l=>{localStorage.setItem('stillveil-language',l);localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));},language);
 await page.goto('/');await enter(page);const fixture=await nativeResultFixture(page);
 expect(fixture.history).toHaveLength(1);expect(fixture.review.largestHit?.round).toBe(1);
 await page.goto('/#dungeons');await page.reload();await enter(page);
 const review=page.locator('[data-inventory-section="expedition-review"]');await expect(review).toBeVisible();await expect(review).not.toHaveAttribute('open');await review.locator(':scope > summary').click();
 await expect(review.getByTestId('expedition-review')).toBeVisible();await expect(review).toContainText('Round 1');if(language==='en')expect(await review.innerText()).not.toMatch(japanese);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await review.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`review-${language}-${width}.png`)});
 await page.locator('[data-guide="return-town"]').click();await expect.poll(async()=>(await saved(page)).expeditionHistory?.length).toBe(2);
 await page.goto('/#bag');await page.reload();await enter(page);
 const section=page.locator('[data-inventory-section="expedition-ledger"]');await expect(section).toBeVisible();await expect(section).not.toHaveAttribute('open');await section.locator(':scope > summary').click();
 const ledger=section.getByTestId('expedition-ledger');await expect(ledger).toBeVisible();await expect(ledger.locator('.expedition-ledger__history > li')).toHaveCount(2);
 if(language==='en')expect(await ledger.innerText()).not.toMatch(japanese);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 const before=await saved(page);await ledger.locator('select').nth(1).selectOption('silent-cathedral');expect(await saved(page)).toEqual(before);await section.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`ledger-${language}-${width}.png`)});
 await page.reload();await enter(page);expect((await saved(page)).expeditionHistory).toEqual(before.expeditionHistory);await expect(page.locator('[data-inventory-section="expedition-ledger"]')).not.toHaveAttribute('open');
});
