import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
async function fixture(page:Page,weak=false){
 await page.goto('/');await enterGame(page);
 await page.evaluate(async weak=>{
  const {content}=await import('/src/content/index.ts'),{createBattle,advanceReplay}=await import('/src/domain/engine.ts'),{createBattleHarvest}=await import('/src/domain/battle-harvest.ts');
  const {loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,revision=s.revision;
  let b=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',5,42,'hunt-browser','hunt');while(b.phase==='playing')b=advanceReplay(b,content);
  b.harvest=createBattleHarvest(b.id);b.hunt!.actions=24;b.hunt!.kills=26;b.hunt!.serial=30;
  b.harvest.beat=2;b.harvest.serial=4;b.harvest.nextChoice=26;
  b.harvest.offers=[{id:`${b.id}:harvest:1`,kind:'material',slot:0,hits:0,required:3,expires:20,itemId:'iron',amount:2,rarity:'epic'},
   ...(['ordinary','glimmering','radiant'] as const).map((promise,index)=>({id:`${b.id}:harvest:${index+2}`,kind:'gem' as const,slot:index+1,hits:0,required:6,expires:25,gem:{id:`${b.id}:harvest:${index+2}`,promise,result:{id:`${b.id}:harvest:${index+2}`,defId:'pale-ward',variant:'pure' as const}}}))];
  if(weak)b.units.filter(u=>u.side==='enemy').forEach(u=>u.hp=1);
  s.battle=b;s.settings.reducedMotion=true;s.settings.speed=2;s.revision++;await persistSave(s,revision);
 },weak);await page.reload();await enterGame(page);
}
test('loot value is readable before tapping, with no tier disclosure or clipped labels',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);
 await expect(page.locator('[data-hunt-rank="A"]')).toBeVisible();await expect(page.locator('.harvest-drop__name')).toHaveCount(4);
 await expect(page.locator('[data-promise="radiant"]')).toHaveAttribute('data-quality','epic');
 await expect(page.locator('[data-promise="glimmering"]')).toHaveAttribute('data-quality','rare');
 await expect(page.locator('[data-promise="ordinary"]')).toHaveAttribute('data-quality','common');
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});
  for(const label of await page.locator('.harvest-drop__name').all()){
   const r=await label.boundingBox();expect(r).toBeTruthy();expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.x+r!.width).toBeLessThanOrEqual(width);expect(r!.height).toBeGreaterThan(10);
  }
  await page.screenshot({path:info.outputPath(`hunt-loot-${width}.png`)});
 }
 expect((await page.locator('.harvest-drop').allTextContents()).join(' ')).not.toMatch(/Tier|T[1-6]/);
 const gem=page.locator('[data-promise="radiant"]');for(let i=0;i<6;i++)await gem.click();
 await expect(gem).toHaveCount(0);
 const state=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
 expect(state.battle!.harvest!.gems[0].promise).toBe('radiant');expect(state.memoryGems?.rough??[]).toHaveLength(0);
});
test('page selection pins the visible enemy, including after a refill',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,true);
 await page.getByRole('button',{name:'次の敵を表示',exact:true}).click();
 const visible=await page.locator('.enemy-page[data-unit]').getAttribute('data-unit');
 await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
 const s=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
 expect(s.battle!.hunt!.actions).toBeGreaterThan(24);expect(s.battle!.hunt!.kills).toBeGreaterThan(26);
 expect(s.battle!.events.some(e=>e.actorId?.startsWith('party:')&&e.targetIds?.includes(visible!))).toBe(true);if(visible&&s.battle!.units.some(u=>u.uid===visible&&u.hp>0))expect(s.battle!.focusTargetId).toBe(visible);else expect(s.battle!.focusTargetId).toBeUndefined();
 await expect(page.locator('.enemy-carousel-meta')).toContainText('討伐');
});
test('area-kill loot flights overlap and rare arrivals sound before collection',async({page})=>{
 await page.addInitScript(()=>{(window as any).__huntSounds=[];window.addEventListener('game:se',e=>(window as any).__huntSounds.push((e as CustomEvent).detail));});
 await fixture(page);
 await page.evaluate(async()=>{
  const {loadSave,persistSave}=await import('/src/platform/save.ts'),{content}=await import('/src/content/index.ts');
  const {createBattleHarvest,advanceHarvest,harvestQuality}=await import('/src/domain/battle-harvest.ts');
  const s=(await loadSave())!,revision=s.revision,b=s.battle!;
  b.harvest=createBattleHarvest(b.id);b.harvest.nextChoice=200;
  const drop={id:'hunt-flight-1',kind:'drop' as const,text:'drop',materialId:'mist:common',rarity:'common' as const,huntKill:true,huntProgress:{...b.hunt!}};
  for(let seed=1;seed<10000;seed++){const candidate=structuredClone(b);candidate.harvest!.seed=seed;advanceHarvest(candidate,drop,content);if(candidate.harvest!.offers.some(o=>harvestQuality(o)==='epic')){b.harvest.seed=seed;break;}}
  b.events=[drop,{...drop,id:'hunt-flight-2'},{id:'hunt-flight-pause',kind:'guard',text:'guard'}];b.cursor=0;b.phase='playing';b.nextPhase='ready';
  s.revision++;await persistSave(s,revision);
 });await page.reload();await enterGame(page);
 await expect(page.locator('[data-hunt-flight]')).toHaveCount(2,{timeout:15000});
 await expect.poll(()=>page.evaluate(()=>(window as any).__huntSounds.some((s:any)=>s.kind==='drop'&&s.rarity==='epic'))).toBe(true);
 await expect(page.locator('.harvest-drop[data-quality="epic"]')).toBeVisible();
});
test('normal preparation starts the hunt through the real departure button',async({page})=>{
 await page.goto('/#dungeons/prepare/silent-cathedral');await enterGame(page);
 const modal=page.getByRole('dialog',{name:'忘却の聖堂',exact:true});
 await expect(modal).toContainText('100手の連続討伐');await expect(modal).toContainText('狙える希少部材');
 await modal.locator('[data-guide="depart"]').click();
 await expect(page.locator('[data-hunt-stage="hunting"]')).toBeVisible();
 const s=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
 expect(s.battle!.hunt!.actions).toBe(0);expect(s.battle!.units.filter(u=>u.side==='enemy')).toHaveLength(3);
});
