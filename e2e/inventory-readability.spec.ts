import {test,expect,type Locator,type Page} from '@playwright/test';
import {enterGame} from './boot';

test.use({viewport:{width:390,height:844},locale:'ja-JP'});
async function contrast(locator:Locator) {
 const readings=await locator.evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width&&n.getBoundingClientRect().height).map(node=>{
  const rgb=(s:string)=>s.match(/[\d.]+/g)?.map(Number)??[0,0,0,0];
  const luminance=(c:number[])=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
  const fg=rgb(getComputedStyle(node).color);let parent:Element|null=node,bg=[255,255,255,1];
  while(parent){const color=rgb(getComputedStyle(parent).backgroundColor);if(color.length===3||color[3]>=.98){bg=color;break;}parent=parent.parentElement;}
  const a=luminance(fg),b=luminance(bg);return {text:node.textContent?.trim().slice(0,80),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 }));
 expect(readings.length).toBeGreaterThan(0);
 for(const r of readings)expect(r.ratio,`${r.text}: contrast ${r.ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
}
async function folded(page:Page,id:string) {const section=page.locator(`[data-inventory-section="${id}"]`);if(!await section.getAttribute('open')){if(!await section.evaluate(el=>(el as HTMLDetailsElement).open))await section.locator(':scope>summary').click();}return section;}

test('build notebook keeps the next action ahead of the roster and readable across languages, sizes and selection states',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,offered:true,enrolled:false,dismissed:true,topic:'general',step:0,seen:[],checkpoints:{}})));
 await page.goto('/#bag/builds');await enterGame(page);const planner=page.getByTestId('build-planner');
 for(const language of ['ja','en']){
  await page.evaluate(async lang=>(await import('/src/locales/i18n.ts')).setLanguage(lang as 'ja'|'en'),language);
  for(const width of [320,390,1024]){
   await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));
   await expect(planner.locator('[data-inventory-section="build-catalog"]')).not.toHaveAttribute('open');
   await expect(planner.locator('[data-inventory-section="build-demo"]')).not.toHaveAttribute('open');
   await contrast(planner.locator('h2,h3,.build-planner__detail-heading p,.build-planner__progress p,.build-planner__next h4,.build-planner__next p,.build-planner__stages button'));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const next=await planner.getByTestId('build-next-action').boundingBox(),roster=await planner.locator('.build-planner__lineup').boundingBox();expect(next!.y+next!.height).toBeLessThanOrEqual(roster!.y);
   await page.screenshot({path:info.outputPath(`notebook-${language}-${width}.png`)});
   const catalog=await folded(page,'build-catalog');
   await contrast(catalog.locator('.build-planner__choice-copy>span,.build-planner__choice-copy small'));
   for(const card of await catalog.locator('[data-build-id]').all()){
    await card.hover();await contrast(card.locator('.build-planner__choice-copy>span,.build-planner__choice-copy small'));
   }
   await page.screenshot({path:info.outputPath(`catalog-${language}-${width}.png`)});
   await catalog.locator('[data-build-id="shield-cannon"]').click();await expect(catalog).not.toHaveAttribute('open');
   await contrast(planner.locator('.build-planner__detail-heading h3'));
  }
 }
 await page.evaluate(async()=>(await import('/src/locales/i18n.ts')).setLanguage('ja'));
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:info.outputPath('notebook-final-390.png')});
});

test('paper child screens keep preparation, ledger and stone refinement labels readable',async({page},info)=>{
 await page.goto('/#bag');await enterGame(page);
 await page.evaluate(async()=>{const{loadSave,persistSave}=await import('/src/platform/save.ts');const{emptyGemInventory}=await import('/src/domain/memory-gems.ts');const s=(await loadSave())!,rev=s.revision;s.memoryGems=emptyGemInventory();s.memoryGems.items=[{id:'readable-stone',defId:'night-dew',variant:'pure'}];s.memoryGems.dust={grave:100,clock:100,sanctuary:100};s.buildGoal={buildId:'shield-cannon',stage:'starter'};s.revision++;await persistSave(s,rev);});
 await page.goto('/#bag/notes');await enterGame(page);await contrast(page.locator('.preparation-guide h3,.preparation-guide h4,.preparation-guide header>span,.preparation-guide p,.preparation-guide>small,.build-goal-summary h3,.build-goal-summary p'));
 const ledger=await folded(page,'expedition-ledger');await contrast(ledger.locator('label,p'));await page.screenshot({path:info.outputPath('journal-readable-390.png')});
 await page.goto('/#bag/gems/night-dew');await enterGame(page);await folded(page,'memory-refinement');await contrast(page.locator('.memory-gems__refinement-modes strong,.memory-gems__refinement-modes p,.memory-gems__refinement-modes small,.memory-gems__dust strong,.memory-gems__dust small'));await page.screenshot({path:info.outputPath('refinement-readable-390.png')});
});

test('a complete build offers one confirmation action and keeps equipment unchanged until it is accepted',async({page},info)=>{
 await page.goto('/#bag/builds');await enterGame(page);
 const fixture=await page.evaluate(async()=>{
  const{loadSave,persistSave}=await import('/src/platform/save.ts');const{BUILD_DEFINITIONS,getBuildPlan}=await import('/src/domain/builds.ts');const{emptyGemInventory}=await import('/src/domain/memory-gems.ts');const{content}=await import('/src/content/index.ts');
  const s=(await loadSave())!,rev=s.revision,b=BUILD_DEFINITIONS.find(b=>b.id==='shield-cannon')!,stage=b.stages.starter;
  s.ownedIds=[...new Set([...s.ownedIds,...stage.slots.map(slot=>slot.characterIds[0])])];s.memoryGems=emptyGemInventory();s.memoryGems.items=stage.slots.map((slot,i)=>({id:`ready-${i}`,defId:slot.gem.defId,variant:slot.gem.variant,roll:{power:slot.gem.power,trait:slot.gem.coreTrait??slot.gem.trait??'none',value:slot.gem.value??0}}));s.memoryGems.seen=[...new Set(s.memoryGems.items.map(g=>g.defId))];s.buildGoal={buildId:b.id,stage:'starter'};s.revision++;await persistSave(s,rev);const plan=getBuildPlan(content,s,b.id,'starter');return {complete:plan.complete,partyIds:plan.partyIds};
 });expect(fixture.complete).toBe(true);
 await page.reload();await enterGame(page);const planner=page.getByTestId('build-planner'),review=planner.getByRole('button',{name:'編成の変更内容を確認',exact:true});await expect(review).toHaveCount(1);
 const saved=()=>page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);const before=await saved();await review.click();const confirmation=planner.getByRole('region',{name:'編成変更の確認',exact:true});await expect(confirmation).toBeVisible();await contrast(confirmation.locator('h5,p,li strong,li span'));
 await page.screenshot({path:info.outputPath('complete-confirmation-390.png')});expect(await saved()).toEqual(before);await confirmation.getByRole('button',{name:'キャンセル',exact:true}).click();await expect(confirmation).toHaveCount(0);expect(await saved()).toEqual(before);await review.click();await confirmation.getByRole('button',{name:'この内容で編成する',exact:true}).click();await expect.poll(async()=>(await saved()).partyIds).toEqual(fixture.partyIds);expect((await saved()).memoryGems!.items).toEqual(before.memoryGems!.items);
});
