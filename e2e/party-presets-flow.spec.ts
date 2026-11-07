import {test,expect} from '@playwright/test';
import {enterGame} from './boot';
import {contrast,touchTargets} from './readability-checks';
test.use({actionTimeout:10000,viewport:{width:390,height:844}});
const saved=(page:import('@playwright/test').Page)=>page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
test('ten formations survive reload and all build recipes are directly selectable',async({page},info)=>{
 await page.goto('/#party');await enterGame(page);const initial=await saved(page);
 const section=page.locator('[data-inventory-section="party-presets"]');await section.locator('summary').click();
 await section.getByLabel('編成名',{exact:true}).fill('塔の編成');await section.getByRole('button',{name:'現在の編成を保存',exact:true}).click();
 await page.locator('.party-formation__slots [data-member-id="seris"]').click();await page.getByRole('button',{name:'この仲間を先頭に',exact:true}).click();await page.getByRole('button',{name:'この仲間をリーダーに',exact:true}).click();
 await section.getByLabel('保存枠',{exact:true}).selectOption('9');await section.getByLabel('編成名',{exact:true}).fill('周回の編成');await section.getByRole('button',{name:'現在の編成を保存',exact:true}).click();
 expect(await section.locator('select option').count()).toBe(10);
 await section.getByLabel('保存枠',{exact:true}).selectOption('0');await section.getByRole('button',{name:'この編成を使う',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).partyIds).toEqual(initial.partyIds);expect((await saved(page)).leaderId).toBe(initial.leaderId);
 for(const width of [320,390]){await page.setViewportSize({width,height:844});await touchTargets(section);await contrast(section.locator('label,.party-presets__preview strong,.party-presets__preview li,.party-presets__preview p'));}
 await page.screenshot({path:info.outputPath('formations-390.png')});
 await page.reload();await enterGame(page);expect((await saved(page)).partyPresets).toHaveLength(2);
 await page.goto('/#party/builds');const selector=page.getByLabel('確認するビルド',{exact:true});await expect(selector).toBeVisible();
 const options=await selector.locator('option').evaluateAll(nodes=>nodes.map(n=>({id:(n as HTMLOptionElement).value,name:n.textContent!.split(' · ')[0]})));
 expect(options.length).toBeGreaterThanOrEqual(6);
 for(const option of options){await selector.selectOption(option.id);await expect(page.locator('.build-planner__detail-heading h3')).toHaveText(option.name);}
 await page.locator('[data-inventory-section="party-presets"]>summary').click();await expect(page.locator('.party-presets select option')).toHaveCount(10);
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
