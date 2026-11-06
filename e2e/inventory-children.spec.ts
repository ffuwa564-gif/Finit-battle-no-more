import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
async function seed(page:Page) {
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,offered:true,enrolled:false,dismissed:true,topic:'general',step:0,seen:[],checkpoints:{}})));
 await page.goto('/#bag');await enterGame(page);
 await page.evaluate(async()=>{
  const{loadSave,persistSave}=await import('/src/platform/save.ts');const{emptyGemInventory}=await import('/src/domain/memory-gems.ts');const{emptyIndustry}=await import('/src/domain/industry.ts');const{content}=await import('/src/content/index.ts');
  const s=(await loadSave())!,revision=s.revision;s.memoryGems=emptyGemInventory();s.memoryGems.items=[{id:'decor-stone',defId:'night-dew',variant:'pure',roll:{power:40,trait:'none',value:0}},{id:'decor-ward',defId:'pale-ward',variant:'pure',locked:true}];s.memoryGems.seen=['night-dew','pale-ward'];s.memoryGems.dust={grave:100,clock:100,sanctuary:100};s.materials={'mist:common':20,'mist:rare':5,'mist:epic':1};s.completedDungeonIds=content.chapters!.slice(0,2).flatMap(c=>c.dungeonIds);s.industry=emptyIndustry(Date.now());s.industry.stock={timber:20,stone:20,ore:20,charcoal:10};s.industry.machines={'bench:1':{kind:'bench',enabled:false,progress:0},'wick-generator:1':{kind:'wick-generator',enabled:false,progress:0}};s.gold=100000;s.revision++;await persistSave(s,revision);
 });await page.reload();await enterGame(page);
}
async function photograph(page:Page,path:string) {
 const dialog=page.getByRole('dialog');
 if(await dialog.count())await expect.poll(()=>dialog.locator('.inventory-frame img').first().evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.screenshot({path,style:'.toast { visibility:hidden; }'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
}
test('child screens use real artwork for materials, inspection, refinement, machinery and recipes',async({page},info)=>{
 await seed(page);
 await page.getByRole('button',{name:'素材',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveAttribute('data-inventory-art','parchment-list');
 await page.locator('[data-inventory-section="materials"]>summary').click();
 await expect(page.getByRole('dialog').locator('[data-inventory-item="material-rare"]')).toBeVisible();
 await photograph(page,info.outputPath('materials-390.png'));
 await page.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'記憶石の管理',exact:true}).click();
 await page.locator('[data-testid="cabinet-gem"][data-gem-id="decor-stone"]').click();await page.getByRole('button',{name:'詳細',exact:true}).click();
 await expect(page.getByRole('dialog').locator('[data-inventory-button]')).not.toHaveCount(0);
 const inspection=page.locator('.inventory-inspection-heading');
 const title=await inspection.locator('h3').boundingBox(),protect=await inspection.getByRole('button').boundingBox();
 expect(title&&protect&&(title.y+title.height<=protect.y||title.x+title.width<=protect.x)).toBe(true);
 await photograph(page,info.outputPath('stone-detail-390.png'));
 await page.locator('[data-inventory-section="memory-refinement"]>summary').click();
 await page.getByRole('button',{name:'調律する',exact:true}).first().click();
 await expect(page.getByTestId('gem-refinement-offer')).toBeVisible();
 await photograph(page,info.outputPath('refinement-390.png'));
 await page.getByRole('button',{name:'元の性能を残す',exact:true}).click();
 await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByRole('button',{name:'カバンに戻る',exact:true}).click();
 await page.getByRole('button',{name:'クラフト',exact:true}).click();await page.locator('.inventory-hotspot--machines').click();
 await expect(page.getByRole('dialog').locator('[data-inventory-item="bench"]')).toBeVisible();await photograph(page,info.outputPath('machines-390.png'));
 await page.getByRole('dialog').getByRole('button',{name:'製作図',exact:true}).click();await page.locator('[data-inventory-section="industry-recipes-part"]>summary').click();
 await photograph(page,info.outputPath('recipes-390.png'));
 await page.setViewportSize({width:320,height:740});await photograph(page,info.outputPath('recipes-320.png'));
});
test('journal, build book and character details share the material palette without cropping artwork',async({page},info)=>{
 await seed(page);await page.getByRole('button',{name:'旅の記録',exact:true}).click();await photograph(page,info.outputPath('journal-390.png'));
 await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByRole('button',{name:'ビルド',exact:true}).click();
 await expect(page.locator('.inventory-book-cover img')).toBeVisible();await photograph(page,info.outputPath('build-book-390.png'));
 await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByRole('button',{name:'道具',exact:true}).click();await page.getByRole('button',{name:'ゴールド交換',exact:true}).click();
 await page.getByRole('button',{name:'物語と能力を見る',exact:true}).first().click();
 await expect(page.getByRole('dialog').locator('.inventory-portrait')).toBeVisible();
 expect(await page.getByRole('dialog').locator('.character-artwork__still').evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain');
 await photograph(page,info.outputPath('character-detail-390.png'));
});
