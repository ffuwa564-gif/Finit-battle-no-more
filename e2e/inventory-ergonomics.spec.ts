import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
import {contrast,touchTargets} from './readability-checks';
test.use({viewport:{width:390,height:844},locale:'ja-JP',isMobile:true,hasTouch:true});
async function seed(page:Page){
 await page.addInitScript(()=>localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,offered:true,enrolled:false,dismissed:true,topic:'general',step:0,seen:[],checkpoints:{}})));
 await page.goto('/#bag');await enterGame(page);await page.evaluate(async()=>{
  const{loadSave,persistSave}=await import('/src/platform/save.ts');const{content}=await import('/src/content/index.ts');const{emptyGemInventory}=await import('/src/domain/memory-gems.ts');const{emptyIndustry,industryCatalog}=await import('/src/domain/industry.ts');
  const s=(await loadSave())!,rev=s.revision;s.memoryGems=emptyGemInventory();s.memoryGems.items=['night-dew','pale-ward','echo-shard','shield-break','clear-tear','rewind-thread'].map((defId,i)=>({id:`layout-${i}`,defId,variant:'pure',roll:{power:40,trait:'none',value:0}}));s.memoryGems.seen=s.memoryGems.items.map(g=>g.defId);s.memoryGems.dust={grave:100,clock:100,sanctuary:100};s.materials={'mist:common':30,'mist:rare':20,'mist:epic':4};s.completedDungeonIds=content.chapters!.slice(0,3).flatMap(c=>c.dungeonIds);s.industry=emptyIndustry(Date.now());s.industry.stock=Object.fromEntries(industryCatalog.items.map(i=>[i.id,i.kind==='machine'?1:20]));s.industry.machines={'bench:1':{kind:'bench',enabled:false,progress:0},'wick-generator:1':{kind:'wick-generator',enabled:false,progress:0},'kiln:1':{kind:'kiln',enabled:true,recipeId:'carbonize',progress:0}};s.gold=100000;s.revision++;await persistSave(s,rev);
 });await page.reload();await enterGame(page);
}
async function section(page:Page,id:string){const area=page.locator(`[data-inventory-section="${id}"]`);if(!await area.evaluate(el=>(el as HTMLDetailsElement).open))await area.locator(':scope>summary').click();return area;}
async function route(page:Page,hash:string){await page.goto('/#'+hash);await enterGame(page);}
async function photo(page:Page,path:string){await page.screenshot({path,style:'.toast{visibility:hidden}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}

test('collection drawer keeps real touch targets separated at320px and390px and a touch equips the selected stone',async({page},info)=>{
 await seed(page);await route(page,'bag/gems');
 for(const width of [320,390]){
  await page.setViewportSize({width,height:740});await page.evaluate(()=>scrollTo(0,0));await touchTargets(page.locator('.inventory-scene--memory-cabinet'));
  const tray=await page.locator('.cabinet-tray').boundingBox(),pages=await page.locator('.cabinet-pagination').boundingBox(),manage=await page.locator('.cabinet-manage').boundingBox();
  expect(pages!.y+pages!.height).toBeLessThanOrEqual(tray!.y+1);expect(tray!.y+tray!.height).toBeLessThanOrEqual(manage!.y+1);
  await photo(page,info.outputPath(`cabinet-${width}.png`));
 }
 const selected=await page.locator('[data-testid="cabinet-gem"]').first().getAttribute('data-gem-id');await page.locator('[data-testid="cabinet-gem"]').first().click();const box=(await page.locator('.cabinet-tray__actions').getByRole('button',{name:'装備',exact:true}).boundingBox())!;await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
 await expect(page.locator('.cabinet-tray__actions').getByRole('button',{name:'装備中',exact:true})).toBeDisabled();expect(await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.memoryGems!.equipped)).toMatchObject({[await page.locator('.cabinet-owner select').inputValue()]:selected});
});

test('stone catalogue, comparison and confirmations stay readable and operable on a narrow phone',async({page},info)=>{
 await seed(page);await page.setViewportSize({width:320,height:740});await route(page,'bag/gems/night-dew');const modal=page.getByRole('dialog',{name:'記憶石の管理',exact:true});await section(page,'memory-stones');await touchTargets(modal.locator('.modal__body'));await contrast(modal.locator('input,select,.memory-gem-tier'));await contrast(modal.locator('.memory-gems__item-name,.memory-gems__item-roll,.memory-gems__item-roll small,.memory-gems__item-status'));
 await modal.locator('.memory-gems__grid').scrollIntoViewIfNeeded();await photo(page,info.outputPath('stone-list-320.png'));await modal.locator('[data-gem-id="layout-0"]').click();await modal.locator('.memory-gems__detail').scrollIntoViewIfNeeded();await photo(page,info.outputPath('stone-detail-320.png'));await page.getByRole('button',{name:'分解',exact:true}).click();const confirmation=page.getByRole('group',{name:'分解の確認',exact:true});await expect(confirmation).toBeVisible();await touchTargets(confirmation);await contrast(confirmation.locator('p'));await confirmation.scrollIntoViewIfNeeded();await photo(page,info.outputPath('salvage-320.png'));await confirmation.getByRole('button',{name:'やめる',exact:true}).click();
 await section(page,'memory-refinement');await page.getByRole('button',{name:'調律する',exact:true}).first().click();const offer=page.getByTestId('gem-refinement-offer');await expect(offer).toBeVisible();await touchTargets(offer);await contrast(offer.locator('.memory-gems__refinement-compare>div>span,.memory-gems__refinement-compare p,.memory-gems__refinement-compare strong,.memory-gem-tier'));
 await photo(page,info.outputPath('comparison-320.png'));await page.getByRole('button',{name:'元の性能を残す',exact:true}).click();await section(page,'memory-crafting');await touchTargets(modal.locator('.modal__body'));await modal.locator('.memory-gems__recipe').first().scrollIntoViewIfNeeded();await photo(page,info.outputPath('stone-crafting-320.png'));
});

test('workshop, supplies and material exchange use readable rows and full-sized controls in both languages',async({page},info)=>{
 await seed(page);await page.setViewportSize({width:320,height:740});
 for(const language of ['ja','en']){
  await route(page,'bag/workshop');await page.evaluate(async lang=>(await import('/src/locales/i18n.ts')).setLanguage(lang as 'ja'|'en'),language);await page.locator('.inventory-hotspot--machines').click();const modal=page.locator('.craft-detail-modal');await touchTargets(modal.locator('.modal__body'));await contrast(modal.locator('select'));await contrast(modal.locator('.industry-machine header strong,.industry-machine p,.industry-help'));await modal.locator('.industry-machine:has(select)').first().scrollIntoViewIfNeeded();await photo(page,info.outputPath(`machines-${language}-320.png`));
  await modal.locator('.industry-tabs button').nth(1).click();await section(page,'industry-recipes-part');await touchTargets(modal.locator('.modal__body'));await modal.locator('[data-inventory-section="industry-recipes-part"] .industry-recipe').first().scrollIntoViewIfNeeded();await photo(page,info.outputPath(`recipes-${language}-320.png`));
  await modal.locator('.industry-tabs button').nth(2).click();await section(page,'industry-stock-raw');await touchTargets(modal.locator('.modal__body'));await contrast(modal.locator('.industry-stock>div>span:nth-child(2),.industry-stock strong'));await modal.locator('[data-inventory-section="industry-stock-raw"] .industry-stock').scrollIntoViewIfNeeded();await photo(page,info.outputPath(`stock-${language}-320.png`));
  await route(page,'bag/items');await touchTargets(page.getByRole('dialog').locator('.modal__body'));await contrast(page.locator('.shop-item h2,.shop-item p,.shop-item .subtle'));await photo(page,info.outputPath(`items-${language}-320.png`));
  await route(page,'bag/materials');await section(page,'material-exchange');await touchTargets(page.getByRole('dialog').locator('.modal__body'));await contrast(page.locator('.exchange-row>span'));await photo(page,info.outputPath(`exchange-${language}-320.png`));
 }
});
