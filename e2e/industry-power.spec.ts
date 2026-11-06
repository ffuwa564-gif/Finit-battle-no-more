import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
async function saved(page:Page){return page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!);}
async function seed(page:Page){
 await page.goto('/#bag/workshop/resonant-circuit');await enterGame(page);
 // Isolated UI fixture: chapter-four facilities and inputs, with no generated energy.
 await page.evaluate(async()=>{const{content}=await import('/src/content/index.ts');const{emptyIndustry}=await import('/src/domain/industry.ts');const{loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,rev=s.revision;s.completedDungeonIds=content.chapters!.slice(0,4).flatMap(c=>c.dungeonIds);s.industry=emptyIndustry(Date.now());s.industry.stock={precision:10,'charged-crystal':8,wire:20,charcoal:8,'wick-generator':1,'light-reservoir':1};s.industry.machines={'assembler:1':{kind:'assembler',enabled:false,progress:0}};s.revision++;await persistSave(s,rev);});
 await page.reload();await enterGame(page);
}
test('tier-four crafting builds power, reserves energy, then runs an automatic line without losing progress',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await seed(page);await page.clock.install();
 await expect(page.locator('.industry-target')).toContainText('TIER 4');
 await page.getByRole('button',{name:'装置を設置 · 灯芯炉',exact:true}).click();
 await page.locator('.inventory-hotspot--machines').click();
 await expect(page.locator('.industry-generator')).toContainText('発灯中');
 await page.clock.fastForward(21000);await page.getByRole('button',{name:'生産を更新',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).industry!.power!.stored).toBeGreaterThanOrEqual(60);
 await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'加工する · 共鳴回路',exact:true}).click();
 expect((await saved(page)).industry!.job!.energy).toBe(60);
 await page.locator('.inventory-hotspot--machines').click();
 await expect(page.locator('.industry-job')).toContainText('加工用に確保した灯力');
 await page.clock.fastForward(21000);await page.getByRole('button',{name:'生産を更新',exact:true}).click();
 expect((await saved(page)).industry!.stock['resonant-circuit']).toBe(2);
 await page.getByRole('combobox',{name:'自動組立機 #1',exact:true}).selectOption('resonant-circuit');
 await page.clock.fastForward(21000);await page.getByRole('button',{name:'生産を更新',exact:true}).click();
 expect((await saved(page)).industry!.stock['resonant-circuit']).toBeGreaterThanOrEqual(4);
 await page.getByText('設置待ちの装置',{exact:true}).click();
 await page.getByRole('button',{name:/蓄灯槽 ×1.*設置/}).click();
 await expect(page.locator('.industry-power')).toContainText('1200');
 await page.screenshot({path:info.outputPath('powered-workshop-390.png')});
 await page.getByRole('navigation',{name:'クラフトのTier'}).getByRole('button',{name:'T4',exact:true}).click();
 await expect(page.locator('#industry-recipes-part')).toHaveCount(0); // InventorySection uses its own accessible details id.
 await page.getByText('中間素材',{exact:true}).click();
 await expect(page.locator('[data-inventory-section="industry-recipes-part"] .industry-recipe')).toContainText(['共鳴回路','導灯合金']);
 await page.screenshot({path:info.outputPath('tier-four-recipes.png')});
});
test('an outage leaves stored work intact and fuel resumes the same machine',async({page})=>{
 await seed(page);
 await page.evaluate(async()=>{const{loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,rev=s.revision;s.industry!.machines['wick-generator:1']={kind:'wick-generator',enabled:false,progress:0};s.industry!.machines['assembler:1']={kind:'assembler',enabled:true,recipeId:'resonant-circuit',progress:5000};s.industry!.stock['wick-generator']=0;s.industry!.power={stored:0,generated:15,consumed:15};s.revision++;await persistSave(s,rev);});
 await page.reload();await enterGame(page);await page.locator('.inventory-hotspot--machines').click();await page.clock.install();
 const line=page.locator('.industry-machine').filter({has:page.getByRole('combobox',{name:'自動組立機 #1',exact:true})});
 await expect(line).toContainText('灯力待ち');await page.clock.fastForward(10000);await page.getByRole('button',{name:'生産を更新',exact:true}).click();
 expect((await saved(page)).industry!.machines['assembler:1'].progress).toBe(5000);
 await page.getByRole('button',{name:'点灯する',exact:true}).click();await page.clock.fastForward(2000);await page.getByRole('button',{name:'生産を更新',exact:true}).click();
 expect((await saved(page)).industry!.machines['assembler:1'].progress).toBeGreaterThan(5000);
});
test('tier filters and translated power controls fit narrow screens and dependency sections begin closed',async({page},info)=>{
 await seed(page);await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#bag/workshop/resonant-circuit');
 await expect(page.getByRole('heading',{name:'Craft',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Install machine · Wick Hearth',exact:true}).click();
 await page.locator('.inventory-hotspot--machines').click();
 await expect(page.getByRole('dialog')).not.toContainText(/[\u3040-\u30ff\u3400-\u9fff]/);
 const closed=page.locator('details').filter({hasText:'Crafting dependencies'});await expect(closed).not.toHaveAttribute('open','');
 await page.getByRole('navigation',{name:'Craft tiers'}).getByRole('button',{name:'T5',exact:true}).click();
 await page.getByText('Components',{exact:true}).click();
 for(const width of[320,390,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
 await page.setViewportSize({width:320,height:844});await page.screenshot({path:info.outputPath('english-tier-five-320.png')});
});

test('a harvesting tool completed during the reward screen updates both its preview and actual claim',async({page})=>{
 await page.goto('/#home');await enterGame(page);await page.clock.install();
 await page.evaluate(async()=>{const{content}=await import('/src/content/index.ts');const{createBattle}=await import('/src/domain/engine.ts');const{emptyIndustry}=await import('/src/domain/industry.ts');const{loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,rev=s.revision;const d=content.chapters![0].dungeonIds[0];s.battle=createBattle(content,s.partyIds,s.leaderId,d,0,42,'power-tool-preview');s.battle.phase=s.battle.nextPhase='reward';s.battle.cursor=s.battle.events.length;s.industry=emptyIndustry(Date.now());s.industry.power={stored:0,generated:120,consumed:0};s.industry.machines={'resonance-assembler:1':{kind:'resonance-assembler',enabled:false,progress:0}};s.industry.job={recipeId:'resonance-drill',count:1,readyAt:Date.now()+30000,energy:120};s.revision++;await persistSave(s,rev);});
 await page.reload();await enterGame(page);
 const ore=page.locator('.industry-dungeon-resources span').filter({hasText:'鉄鉱石'});
 await expect(ore).toContainText('+6');await page.clock.fastForward(31000);await expect(ore).toContainText('+15');
 await page.getByRole('button',{name:'獲得を確定',exact:true}).click();expect((await saved(page)).industry!.stock.ore).toBe(15);expect((await saved(page)).industry!.stock['resonance-drill']).toBe(1);
});
