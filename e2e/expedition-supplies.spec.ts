import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
test.use({actionTimeout:10000});
async function fixture(page:Page,route:string,battle=false){
 await page.goto('/');await enterGame(page);
 await page.evaluate(async battle=>{
  const {loadSave,persistSave}=await import('/src/platform/save.ts'),{emptyIndustry}=await import('/src/domain/industry.ts');
  const s=(await loadSave())!,revision=s.revision;
  s.materials['mist:common']=500;s.industry=emptyIndustry(Date.now());s.industry.stock={'polishing-kit':2,'polishing-cloth':1,'recovery-lantern':2,'exploration-incense':2};
  s.memoryGems!.rough=['ordinary','radiant'].map((promise,i)=>({id:`batch-${i}`,promise:promise as 'ordinary'|'radiant',result:{id:`batch-${i}`,defId:'pale-ward',variant:'pure' as const,roll:{power:34,trait:'none' as const,value:0}}}));
  if(battle){const {content}=await import('/src/content/index.ts'),{createBattle,advanceReplay}=await import('/src/domain/engine.ts'),{createBattleHarvest}=await import('/src/domain/battle-harvest.ts');let b=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',0,42,'early-browser','hunt');while(b.phase==='playing')b=advanceReplay(b,content);b.hunt={actions:45,kills:12,serial:15,stage:'hunting'};b.harvest=createBattleHarvest(b.id);b.harvest.materials={iron:3};s.battle=b;}
  s.revision++;await persistSave(s,revision);
 },battle);await page.goto('/#'+route);await page.reload();await enterGame(page);
}
const saved=(p:Page)=>p.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
test('surplus material conversion is reachable from the bag and keeps the requested reserve',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,'bag/materials');
 await page.getByRole('button',{name:'余剰素材を遠征用品にする',exact:true}).click();
 await expect(page.getByRole('region',{name:'遠征用品'})).toBeVisible();
 await page.getByLabel('仲間化・覚醒に必要な分も保護').click();await expect.poll(async()=>(await saved(page)).recycling?.protectNeeds).toBe(false);
 await page.getByLabel('素材ごとに残す数').fill('400');await page.getByRole('button',{name:'残す数を保存',exact:true}).click();
 await page.getByRole('button',{name:/^余剰素材を変換/}).click();
 await expect.poll(async()=>(await saved(page)).materials['mist:common']).toBe(400);
 expect((await saved(page)).industry!.stock['polishing-powder']).toBe(100);
 await page.screenshot({path:info.outputPath('supplies-390.png'),fullPage:true});
});
test('batch polishing consumes one kit for each selected stone and reveals unchanged rolls',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,'bag/polish');
 await page.locator('[data-inventory-section="polish-tools"]>summary').click();
 await page.getByRole('button',{name:'道具の数だけ選ぶ（最大100個）',exact:true}).click();
 await page.getByRole('button',{name:/^まとめて研磨/}).click();
 await expect.poll(async()=>(await saved(page)).memoryGems!.rough!.length).toBe(0);
 const s=await saved(page);expect(s.industry!.stock['polishing-kit']).toBe(0);expect(s.memoryGems!.items).toHaveLength(2);expect(s.memoryGems!.items.every(g=>g.roll?.power===34)).toBe(true);
 await expect(page.locator('.gem-polish__reveal')).toBeVisible();await page.screenshot({path:info.outputPath('polish-batch-390.png'),fullPage:true});
});
test('boss gate keeps actual actions and provisional loot instead of faking a completed hunt',async({page},info)=>{
 await page.setViewportSize({width:320,height:844});await fixture(page,'dungeons',true);
 const button=page.getByRole('button',{name:'ボスへ',exact:true});await expect(button).toBeVisible();const rect=await button.boundingBox();expect(rect!.width).toBeGreaterThanOrEqual(44);expect(rect!.height).toBeGreaterThanOrEqual(44);
 await button.click();await page.getByRole('button',{name:'ボスへ進む',exact:true}).click();
 await expect(page.locator('[data-hunt-stage="boss"]')).toBeVisible({timeout:15000});
 const s=await saved(page);expect(s.battle!.hunt!.actions).toBe(45);expect(s.battle!.hunt!.finishAt).toBe(45);expect(s.battle!.harvest!.materials.iron).toBe(3);expect(s.battle!.phase).not.toBe('reward');
 await page.screenshot({path:info.outputPath('early-boss-320.png')});
});
test('supplies are charged once on departure and are not spent when preparation closes',async({page})=>{
 await fixture(page,'dungeons/prepare/silent-cathedral');let modal=page.getByRole('dialog',{name:'忘却の聖堂',exact:true});
 await modal.locator('.expedition-loadout select').nth(0).selectOption('gem');await modal.locator('.expedition-loadout select').nth(1).selectOption('ore');
 await modal.getByRole('button',{name:'閉じる',exact:true}).click();expect((await saved(page)).industry!.stock['recovery-lantern']).toBe(2);
 await page.goto('/#dungeons/prepare/silent-cathedral');await page.reload();await enterGame(page);modal=page.getByRole('dialog',{name:'忘却の聖堂',exact:true});
 await modal.locator('.expedition-loadout select').nth(0).selectOption('gem');await modal.locator('.expedition-loadout select').nth(1).selectOption('ore');await modal.locator('[data-guide="depart"]').click();
 await expect.poll(async()=>(await saved(page)).battle?.supplies?.incense).toBe('ore');const s=await saved(page);expect(s.industry!.stock['recovery-lantern']).toBe(1);expect(s.industry!.stock['exploration-incense']).toBe(1);
});
