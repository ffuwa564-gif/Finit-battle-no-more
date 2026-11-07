import {test,expect} from '@playwright/test';
import {enterGame} from './boot';
import {contrast,touchTargets} from './readability-checks';
test.use({actionTimeout:10000,viewport:{width:390,height:844}});
const saved=(page:import('@playwright/test').Page)=>page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
test('saved formations switch by swipe and build recipes use cards without a dropdown',async({page},info)=>{
 await page.goto('/#party');await enterGame(page);const initial=await saved(page);
 const section=page.locator('[data-inventory-section="party-presets"]');await section.locator('summary').click();
 await section.getByRole('button',{name:'編成名を変更',exact:true}).click();await section.getByLabel('編成名',{exact:true}).fill('塔の編成');await section.getByRole('button',{name:'この枠に保存',exact:true}).click();
 await page.locator('.party-formation__slots [data-member-id="seris"]').click();await page.getByRole('button',{name:'この仲間を先頭に',exact:true}).click();await page.getByRole('button',{name:'この仲間をリーダーに',exact:true}).click();
 await section.getByRole('button',{name:'次の編成',exact:true}).click();await section.getByRole('button',{name:'この枠に保存',exact:true}).click();
 await section.getByRole('button',{name:'前の編成',exact:true}).click();await expect.poll(async()=>(await saved(page)).partyIds).toEqual(initial.partyIds);
 const swipe=async(left:boolean)=>{const area=section.locator('.party-presets__swipe');await area.scrollIntoViewIfNeeded();const r=(await area.boundingBox())!;await page.mouse.move(r.x+(left?r.width-20:20),r.y+30);await page.mouse.down();await page.mouse.move(r.x+(left?20:r.width-20),r.y+30,{steps:8});await page.mouse.up();};
 await swipe(true);await expect.poll(async()=>(await saved(page)).partyIds[0]).toBe('seris');expect((await saved(page)).leaderId).toBe('seris');
 await swipe(false);await expect.poll(async()=>(await saved(page)).partyIds).toEqual(initial.partyIds);expect((await saved(page)).leaderId).toBe(initial.leaderId);
 expect(await section.locator('.party-presets__dots button').count()).toBe(10);await expect(section.locator('select')).toHaveCount(0);
 for(const width of [320,390]){await page.setViewportSize({width,height:844});await touchTargets(section);await contrast(section.locator('.party-presets__pager strong,.party-presets__roster strong'));}
 await page.screenshot({path:info.outputPath('swipe-formations-390.png')});await page.reload();await enterGame(page);expect((await saved(page)).partyPresets).toHaveLength(2);
 await page.goto('/#party/builds');await expect(page.getByLabel('確認するビルド',{exact:true})).toHaveCount(0);const catalog=page.locator('[data-inventory-section="build-catalog"]');await catalog.locator('summary').click();
 expect(await catalog.locator('[data-build-id]').count()).toBe(10);
 for(const id of ['sweep-dance','overflow-relay','concord-duet','disrupt-window']){if(!await catalog.evaluate(e=>(e as HTMLDetailsElement).open))await catalog.locator('summary').click();await catalog.locator(`[data-build-id="${id}"]`).click();await expect(page.locator('.build-planner__detail-heading h3')).not.toBeEmpty();}
});

test('flowers, fairies and resonance can be queued during auto replay and execute before the next round',async({page},info)=>{
 await page.addInitScript(()=>{
  (window as any).__gardenSaves=[];const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value:any,...args:any[]){
   if(args[0]==='save'&&value?.battle?.id==='auto-garden'){const b=value.battle;(window as any).__gardenSaves.push({round:b.round,bloom:b.events.find((e:any)=>e.bloomAction)?.id,fairy:b.events.find((e:any)=>e.fairyAction)?.id,role:b.crystalRole});}
   return (put as any).call(this,value,...args);
  };
 });
 await page.goto('/');await enterGame(page);
 await page.evaluate(async()=>{
  const{content}=await import('/src/content/index.ts'),{createBattle,advanceReplay}=await import('/src/domain/engine.ts'),{loadSave,persistSave}=await import('/src/platform/save.ts');
  const s=(await loadSave())!,rev=s.revision;let b=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',5,42,'auto-garden');while(b.phase==='playing')b=advanceReplay(b,content);
  b.round=2;for(const u of b.units){if(u.side==='enemy'){u.hp=u.maxHp=100000;u.attack=1;}else {u.hp=Math.ceil(u.maxHp*.45);u.ultimateCharge=20;}}
  b.initialUnits=structuredClone(b.units);b.fairies={seed:42,checked:'0:2',visitor:{id:`${b.id}:fairy:0:2`,side:'left',wave:0,round:2}};
  b.blooms={seed:42,checked:'0:2',growth:3,flower:{id:`${b.id}:flower:0:2`,kind:'heal',wave:0,round:2}};
  s.battle=b;s.settings.speed=2;s.settings.reducedMotion=true;s.revision++;await persistSave(s,rev);
 });await page.reload();await enterGame(page);
 await page.getByRole('button',{name:'オート進行を開始',exact:true}).click();await expect.poll(async()=>(await saved(page)).battle!.phase).toBe('playing');
 const flower=page.locator('.battle-bloom'),fairy=page.locator('.battle-fairy'),crystal=page.locator('.battle-crystal');
 await expect(flower).toBeEnabled();await flower.click();await expect(flower).toHaveAttribute('aria-pressed','true');await fairy.click();await expect(fairy).toHaveAttribute('aria-pressed','true');await crystal.click();await expect(crystal).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:info.outputPath('auto-interrupt-queued.png')});
 await expect.poll(()=>page.evaluate(()=>(window as any).__gardenSaves.some((s:any)=>s.bloom)),{timeout:30000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__gardenSaves.some((s:any)=>s.fairy)),{timeout:30000}).toBe(true);
 const rows=await page.evaluate(()=>(window as any).__gardenSaves as {round:number;bloom?:string;fairy?:string;role?:string}[]);
 const bloomIndex=rows.findIndex(r=>r.bloom),fairyIndex=rows.findIndex(r=>r.fairy);
 expect(bloomIndex).toBeLessThan(fairyIndex);expect(rows[bloomIndex].round).toBe(rows[fairyIndex].round);
 expect(new Set(rows.flatMap(r=>r.bloom?[r.bloom]:[])).size).toBe(1);
 expect(new Set(rows.flatMap(r=>r.fairy?[r.fairy]:[])).size).toBe(1);
 await expect.poll(async()=>(await saved(page)).battle!.crystalRole,{timeout:15000}).toBeTruthy();
 await page.getByRole('button',{name:'オート進行を停止',exact:true}).click();
 const b=(await saved(page)).battle!;expect(b.fairies?.visitor?.id).not.toBe('auto-garden:fairy:0:2');expect(b.blooms?.flower?.id).not.toBe('auto-garden:flower:0:2');
});
