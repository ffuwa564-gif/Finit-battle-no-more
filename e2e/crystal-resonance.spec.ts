import {test,expect,type Page} from '@playwright/test';
import {enterGame,skipStory} from './boot';
const saved=(page:Page)=>page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
async function prepare(page:Page,kind:'heal'|'strike'='strike',reduced=false){
  await page.goto('/');await enterGame(page);
  await page.evaluate(async({kind,reduced})=>{
    const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const save=(await loadSave())!,revision=save.revision;let b=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',5,42,'crystal-ui');while(b.phase==='playing')b=advanceReplay(b,content);
    b.round=2;b.blooms={seed:42,checked:'0:2',growth:3,flower:{id:`${b.id}:flower:0:2`,kind,wave:0,round:2}};
    for(const u of b.units)if(u.side==='enemy'){u.hp=u.maxHp=100000;u.attack=1;}
    b.initialUnits=structuredClone(b.units);save.battle=b;save.settings.reducedMotion=reduced;save.settings.speed=2;save.revision++;await persistSave(save,revision);
  },{kind,reduced});await page.reload();await enterGame(page);
}
test('crystal selects one matching role, persists without spending turns, and clears via keyboard',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await prepare(page);
  await expect(page.locator('.garden-flower-art')).toHaveAttribute('src',/black-flower-open.png$/);
  const before=await saved(page);const crystal=page.locator('.battle-crystal');await crystal.click();
  const modal=page.getByRole('dialog',{name:'宝石の共鳴',exact:true});await expect(modal).toBeVisible();
  await expect(modal.locator('.crystal-choice')).toHaveCount(6);await expect(modal.getByRole('button',{name:'導き手',exact:true})).toBeDisabled();
  await modal.getByRole('button',{name:'剣士',exact:true}).click();await expect(modal).toHaveCount(0);
  await expect(page.locator('.living-frame')).toHaveAttribute('data-crystal-role','attacker');
  await expect(page.locator('.garden-crystal-art')).toHaveAttribute('src',/crystal-attacker-motion.webp$/);
  const after=await saved(page);expect(after.battle).toEqual({...before.battle,crystalRole:'attacker'});expect(after.seed).toBe(before.seed);expect(after.potions).toBe(before.potions);
  await page.screenshot({path:info.outputPath('black-flower-red-crystal.png')});
  await page.reload();await enterGame(page);await expect(crystal).toHaveAccessibleName('宝石の共鳴：剣士');
  await crystal.focus();await page.keyboard.press('Enter');await modal.getByRole('button',{name:'共鳴を解除',exact:true}).click();
  await expect(page.locator('.living-frame')).toHaveAttribute('data-crystal-role','none');
});
test('all six role portraits fit on mobile and controls stay clear of HUD, flower and paging',async({page})=>{
  await prepare(page,'heal',true);await expect(page.locator('.garden-flower-art')).toHaveAttribute('src',/flower-open-poster.png$/);
  for(const width of [320,390,768]){
    await page.setViewportSize({width,height:900});const crystal=page.locator('.battle-crystal');const c=(await crystal.boundingBox())!,f=(await page.locator('.battle-bloom').boundingBox())!;
    expect(c.width).toBeGreaterThanOrEqual(48);expect(c.x).toBeGreaterThan(f.x+f.width);
    for(const arrow of await page.locator('.enemy-carousel-arrow').all()){const a=(await arrow.boundingBox())!;expect(c.x<a.x+a.width&&c.x+c.width>a.x&&c.y<a.y+a.height&&c.y+c.height>a.y).toBe(false);}
    await crystal.click();await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});
test('failed role animation uses the correct poster and English explains the actual bonus',async({page})=>{
  await page.route('**/crystal-*-motion.webp',route=>route.abort());await prepare(page);
  await page.locator('.battle-crystal').click();await page.getByRole('dialog').getByRole('button',{name:'守護者',exact:true}).click();
  await expect(page.locator('.garden-crystal-art')).toHaveAttribute('src',/crystal-tank-poster.png$/);
  await expect(page.locator('.garden-crystal-art')).toHaveAttribute('data-animated','false');
  await page.reload();await page.getByRole('button',{name:'English',exact:true}).click();await page.getByRole('button',{name:'Tap to Begin',exact:true}).click();await skipStory(page);
  await page.locator('.battle-crystal').click();await expect(page.getByRole('dialog',{name:'Crystal Resonance',exact:true})).toContainText('increase by 20%');
});
test('a fresh damage flower loads its own black animation and can be harvested immediately',async({page})=>{
  const requested:string[]=[];page.on('request',r=>requested.push(r.url()));await prepare(page);
  await page.evaluate(async()=>{
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!,revision=save.revision;
    save.battle!.blooms={seed:43,checked:'0:2',growth:0};save.revision++;await persistSave(save,revision);
  });await page.reload();await enterGame(page);
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  await expect.poll(async()=>(await saved(page)).battle!.phase,{timeout:30000}).toBe('ready');
  await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-kind','strike');
  await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-state','opening');
  await expect.poll(()=>requested.some(url=>url.endsWith('/black-flower-bloom.webp'))).toBe(true);
  await expect(page.locator('.battle-bloom')).toBeEnabled();const before=await saved(page);
  await page.locator('.battle-bloom').click();await expect(page.locator('.living-frame')).toHaveAttribute('data-bloom-state','bud');
  expect((await saved(page)).battle!.round).toBe(before.battle!.round);
});
