import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
import {contrast,touchTargets} from './readability-checks';
test.use({locale:'ja-JP',viewport:{width:390,height:844}});
async function boot(page:Page){await page.addInitScript(()=>localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,offered:true,enrolled:false,dismissed:true,topic:'general',step:0,seen:[],checkpoints:{}})));await page.goto('/#recruit');await enterGame(page);}
async function settle(page:Page){await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});}

test('recruitment shows the full painting without an overlay and readable prices at phone and desktop sizes',async({page},info)=>{
 await boot(page);
 for(const language of ['ja','en']){
  await page.evaluate(async lang=>(await import('/src/locales/i18n.ts')).setLanguage(lang as 'ja'|'en'),language);
  for(const width of [320,390,1024]){
   await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));
   const section=page.locator('.gold-exchange-section'),art=section.locator('.gold-exchange-card__art'),img=art.locator('img');
   await expect(img).toHaveCSS('object-fit','contain');await expect(img).toHaveCSS('object-position','50% 50%');await expect(art.locator('.inventory-illustration')).toHaveCount(0);
   await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
   const bounds=await art.boundingBox();expect(bounds!.height).toBeLessThanOrEqual(width>760?640:340);
   await contrast(section.locator('h2,h3,.gold-exchange-card__epithet,.gold-exchange-card__cost strong,.gold-exchange-card__cost>span,.gold-exchange-card__progress span'));await touchTargets(section);
   const skills=section.locator('[data-inventory-section]');await expect(skills).not.toHaveAttribute('open');await skills.locator('summary').click();await contrast(skills.locator('strong,small,p'));await skills.locator('summary').click();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>scrollTo(0,0));await settle(page);await page.screenshot({path:info.outputPath(`recruit-${language}-${width}.png`)});
  }
 }
});

test('ordinary recruitment keeps material names and counts visible and still recruits using the saved materials',async({page},info)=>{
 await boot(page);const target=await page.evaluate(async()=>{const{content}=await import('/src/content/index.ts');const{loadSave,persistSave}=await import('/src/platform/save.ts');const{recruitCost}=await import('/src/domain/engine.ts');const s=(await loadSave())!,rev=s.revision,c=content.characters.find(c=>c.published&&c.origin.includes('recruit')&&!s.ownedIds.includes(c.id))!;s.discoveredIds=[...new Set([...s.discoveredIds,c.id])];for(const cost of recruitCost(c))s.materials[cost.materialId]=cost.count;s.revision++;await persistSave(s,rev);return {id:c.id,name:c.name,costs:recruitCost(c)};});
 await page.reload();await enterGame(page);await page.setViewportSize({width:320,height:740});const candidates=page.locator('[data-inventory-section="recruit-candidates"]');await expect(candidates).not.toHaveAttribute('open');await candidates.locator('summary').click();const card=candidates.locator('.character-card').filter({has:page.getByRole('heading',{name:target.name,exact:true})});
 await expect(card.locator('.cost-list>div>span:not(.material-icon)').first()).toBeVisible();await contrast(card.locator('h3,p,.cost-list>div>span:not(.material-icon),.cost-list strong'));await touchTargets(card);await card.scrollIntoViewIfNeeded();await settle(page);await page.screenshot({path:info.outputPath('ordinary-recruit-320.png')});
 await card.getByRole('button',{name:'仲間に迎える',exact:true}).click();await expect.poll(()=>page.evaluate(async id=>(await(await import('/src/platform/save.ts')).loadSave())!.ownedIds.includes(id),target.id)).toBe(true);
 const s=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);for(const cost of target.costs)expect(s.materials[cost.materialId]??0).toBe(0);
});
