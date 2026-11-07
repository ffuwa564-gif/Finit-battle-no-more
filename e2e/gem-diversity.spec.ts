import {test,expect} from '@playwright/test';
import {enterGame,skipStory} from './boot';
for(const width of [320,390])for(const language of ['ja','en'])test(`stone aptitude and new inventory at ${width}px ${language}`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');await enterGame(page);
 await page.evaluate(async language=>{
  const{loadSave,persistSave}=await import('/src/platform/save.ts');const{content}=await import('/src/content/index.ts');const{GEM_DEFINITIONS,emptyGemInventory}=await import('/src/domain/memory-gems.ts');
  const s=(await loadSave())!,revision=s.revision;s.settings.reducedMotion=true;s.memoryGems=emptyGemInventory();
  s.memoryGems.items=GEM_DEFINITIONS.filter(d=>d.introducedRule===4).map(d=>({id:`ui-${d.id}`,defId:d.id,variant:'pure',roll:{power:80,trait:'none',value:0}}));s.memoryGems.seen=s.memoryGems.items.map(g=>g.defId);s.memoryGems.equipped.seris='ui-overflow-ember';s.revision++;
  await persistSave(s,revision);localStorage.setItem('stillveil-language',language);
 },language);
 await page.goto('/#bag');await page.reload();await page.locator('.title-screen__start,.app-shell').first().waitFor();if(await page.locator('.title-screen').count())await page.locator('.title-screen__start').click();await skipStory(page);
 const manage=page.getByRole('button',{name:language==='ja'?'記憶石の管理':'Manage Memory Stones',exact:true});await manage.click();
 const sort=page.getByRole('button',{name:language==='ja'?'整理・調律':'Manage / Refine',exact:true});if(await sort.count())await sort.click();
 const inventory=page.locator('[data-inventory-section="memory-stones"]');await inventory.locator(':scope > summary').click();
 await expect(page.locator('.memory-gems__item-name')).toHaveCount(6);
 await page.locator('.memory-gems__item-name').first().click();await expect(page.getByText(language==='ja'?'石適性・得意な石を反映':'Includes aptitude and favored stones',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 expect(await page.locator('.memory-gems__effect').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(73, 59, 48)');
 await page.screenshot({path:`artifacts/gem-diversity/ui-${width}-${language}.png`,fullPage:true});
});
