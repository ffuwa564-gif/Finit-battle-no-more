import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';
async function fixture(page:Page) {
  await page.addInitScript(()=>localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,offered:true,enrolled:false,dismissed:true,topic:'general',step:0,seen:[],checkpoints:{}})));
  await page.setViewportSize({width:390,height:844});await page.goto('/#bag');await enterGame(page);
  await page.evaluate(async()=>{
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const {GEM_DEFINITIONS,emptyGemInventory}=await import('/src/domain/memory-gems.ts');const {emptyIndustry}=await import('/src/domain/industry.ts');
    const save=(await loadSave())!,rev=save.revision;
    save.memoryGems=emptyGemInventory();save.memoryGems.items=Array.from({length:23},(_,i)=>({id:'cabinet-'+i,defId:GEM_DEFINITIONS.filter(d=>!d.fixedRoll)[i%11].id,variant:'pure',locked:i===1,roll:{power:20+i,trait:'none',value:0}}));save.memoryGems.seen=[...new Set(save.memoryGems.items.map(i=>i.defId))];
    save.memoryGems.equipped={[save.partyIds[1]]:'cabinet-0'};save.industry=emptyIndustry(Date.now());save.industry.stock={timber:20,ore:20,stone:20};save.revision++;await persistSave(save,rev);
  });await page.reload();await enterGame(page);
  const toast=page.getByRole('button',{name:'通知を閉じる',exact:true});if(await toast.isVisible())await toast.click();
}
const noOverflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
test('travel bag objects open real inventory routes; scenes fit mobile and desktop',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);
  await expect(page.getByRole('button',{name:'記憶石の管理',exact:true})).toBeInViewport();
  await page.getByRole('button',{name:'記憶石の管理',exact:true}).hover();
  await expect.poll(()=>page.getByRole('button',{name:'記憶石の管理',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.evaluate(()=>document.fonts.ready);await expect(page.locator('.inventory-scene')).toHaveAttribute('data-art-ready','true');await page.screenshot({path:info.outputPath('travel-bag-390.png'),style:'.toast { visibility:hidden; }'});
  await page.getByRole('button',{name:'素材',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[data-inventory-section="materials"]')).not.toHaveAttribute('open');
  await page.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.getByRole('button',{name:'記憶石の管理',exact:true}).click();
  await expect(page.getByTestId('cabinet-gem')).toHaveCount(16);
  await expect(page.locator('.inventory-scene')).toHaveAttribute('data-art-ready','true');await page.screenshot({path:info.outputPath('memory-cabinet-390.png'),style:'.toast { visibility:hidden; }'});
  await page.getByRole('button',{name:'次のページ',exact:true}).click();await expect(page.getByTestId('cabinet-gem')).toHaveCount(7);
  await page.getByRole('button',{name:'保護中',exact:true}).click();await expect(page.getByTestId('cabinet-gem')).toHaveCount(1);
  await page.getByRole('button',{name:'詳細',exact:true}).click();await expect(page.getByRole('dialog').getByRole('article',{name:'記憶石の詳細'})).toBeVisible();
  await page.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.getByRole('button',{name:'カバンに戻る',exact:true}).click();await page.getByRole('button',{name:'クラフト',exact:true}).click();
  await expect(page.getByRole('heading',{name:'クラフト',exact:true})).toBeVisible();await expect(page.locator('.industry-target')).toContainText('作業台');
  await expect(page.locator('.inventory-scene')).toHaveAttribute('data-art-ready','true');await page.screenshot({path:info.outputPath('craft-desk-390.png'),style:'.toast { visibility:hidden; }'});
  await page.getByRole('button',{name:'レシピ',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[data-inventory-section="industry-recipes-machine"]')).not.toHaveAttribute('open');
  await page.getByRole('button',{name:'閉じる',exact:true}).click();
  for(const width of [320,390,1440]) {await page.setViewportSize({width,height:844});await noOverflow(page);}
  await page.getByRole('button',{name:'カバンに戻る',exact:true}).click();await page.getByRole('button',{name:'道具',exact:true}).click();
  const before=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.potions);
  await page.getByRole('button',{name:'10 G で購入',exact:true}).click();
  await expect.poll(()=>page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.potions)).toBe(before+1);
  expect(errors).toEqual([]);
});
test('cabinet equips real stones, keeps long management lists collapsed and survives reload',async({page})=>{
  await fixture(page);await page.goto('/#bag/gems');
  await page.getByRole('button',{name:'保護中',exact:true}).click();
  await page.getByRole('button',{name:'装備',exact:true}).click();
  await expect.poll(()=>page.evaluate(async()=>{const s=(await(await import('/src/platform/save.ts')).loadSave())!;return s.memoryGems!.equipped[s.partyIds[0]];})).toBe('cabinet-1');
  await page.getByRole('button',{name:'整理・調律',exact:true}).click();
  await expect(page.locator('[data-inventory-section="memory-stones"]')).not.toHaveAttribute('open');
  await page.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.reload();await enterGame(page);await expect(page.getByRole('button',{name:'装備中',exact:true}).first()).toBeVisible();
  await page.setViewportSize({width:320,height:844});await noOverflow(page);
});
test('crafting on the illustrated desk still completes and installs a real machine',async({page})=>{
  await fixture(page);await page.goto('/#bag/workshop/bench');await page.clock.install();
  await page.getByRole('button',{name:'加工する · 作業台',exact:true}).click();
  await expect(page.locator('.craft-desk__job')).toContainText('作業台');
  await page.clock.fastForward(15000);await page.getByRole('button',{name:'装置を設置 · 作業台',exact:true}).click();
  await expect.poll(()=>page.evaluate(async()=>Object.keys((await(await import('/src/platform/save.ts')).loadSave())!.industry!.machines))).toContain('bench:1');
  await page.getByRole('button',{name:'生産設備',exact:true}).click();await expect(page.getByRole('dialog').locator('.industry-machine')).toContainText('作業台');
});
test('empty collections keep their entrance and render no invented stones',async({page})=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/#bag');await enterGame(page);
  await page.getByRole('button',{name:'記憶石の管理',exact:true}).click();await expect(page.getByTestId('cabinet-gem')).toHaveCount(0);
  await expect(page.locator('.cabinet-empty')).toBeVisible();await noOverflow(page);
});
test('all three illustrated pages translate into English without horizontal overflow',async({page})=>{
  await fixture(page);await page.evaluate(()=>localStorage.setItem('stillveil-language','en'));await page.reload();await page.locator('.title-screen__start').click();
  await expect(page.getByRole('heading',{name:'Bag',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Craft',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Craft',exact:true})).toBeVisible();await noOverflow(page);
  await page.getByRole('button',{name:'Back to Bag',exact:true}).click();
  await page.locator('.inventory-hotspot--gems').click();
  await expect(page.locator('.inventory-scene')).not.toContainText(/[\u3040-\u30ff\u3400-\u9fff]/);
  await page.setViewportSize({width:320,height:844});await noOverflow(page);
});
