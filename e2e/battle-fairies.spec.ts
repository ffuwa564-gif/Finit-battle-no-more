import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
const saved=(page:Page)=>page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
async function prepare(page:Page,side:'left'|'right',reduced=false) {
  await page.goto('/');await enterGame(page);
  await page.evaluate(async({side,reduced})=>{
    const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!,revision=save.revision;
    let b=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',5,42,'fairy-browser');while(b.phase==='playing')b=advanceReplay(b,content);
    b.round=2;b.potionUsed=true;for(const u of b.units)if(u.side==='party')u.ultimateCharge=85;
    b.initialUnits=structuredClone(b.units);b.fairies={seed:42,checked:'0:2',visitor:{id:`${b.id}:fairy:0:2`,side,wave:0,round:2}};
    save.battle=b;save.settings.reducedMotion=reduced;save.settings.speed=2;save.revision++;await persistSave(save,revision);
  },{side,reduced});await page.reload();await enterGame(page);
}
test('animated fairy stays on the side ivy, restores after reload, blesses once and enables specials',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await prepare(page,'left');
  const fairy=page.getByRole('button',{name:'妖精の祝福：味方全員の必殺ゲージを15%増やす',exact:true});
  await expect(fairy).toBeEnabled();await expect(page.locator('.garden-fairy__art')).toHaveAttribute('src',/fairy-facing-right.webp$/);
  for(const width of [320,390,768]) {
    await page.setViewportSize({width,height:1000});
    const a=(await fairy.boundingBox())!,h=(await page.locator('.enemy-carousel-status').boundingBox())!,p=(await page.locator('.party-strip').boundingBox())!;
    expect(a.y).toBeGreaterThan(h.y+h.height);expect(a.y+a.height).toBeLessThan(p.y);expect(a.width).toBeGreaterThanOrEqual(48);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:info.outputPath('fairy-before.png')});
  const before=await saved(page);await page.reload();await enterGame(page);await expect(fairy).toBeEnabled();
  const header=await page.locator('.enemy-carousel-status').textContent();
  await fairy.click();await expect(page.locator('.enemy-carousel-status')).toHaveText(header!);await expect(page.locator('.garden-fairy')).toHaveAttribute('data-departing','true');await expect(fairy).toHaveCount(0);
  await expect.poll(async()=>(await saved(page)).battle!.phase).toBe('ready');const after=await saved(page);
  expect(after.battle!.round).toBe(before.battle!.round);expect(after.battle!.potionUsed).toBe(true);expect(after.potions).toBe(before.potions);
  expect(after.battle!.units.filter(u=>u.side==='party').every(u=>u.ultimateCharge===100)).toBe(true);
  await page.screenshot({path:info.outputPath('fairy-after.png')});
  await page.reload();await enterGame(page);await expect(fairy).toHaveCount(0);
});
test('right visitor faces left, reduced motion uses a poster, and English announces its effect',async({page})=>{
  await page.setViewportSize({width:390,height:844});await prepare(page,'right',true);
  await expect(page.locator('.garden-fairy--right .garden-fairy__art')).toHaveAttribute('src',/fairy-facing-left-poster.png$/);
  await expect(page.locator('.garden-fairy__art')).toHaveAttribute('data-animated','false');
  await page.reload();await page.getByRole('button',{name:'English',exact:true}).click();await page.getByRole('button',{name:'Tap to Begin',exact:true}).click();
  await expect(page.getByRole('button',{name:'Fairy blessing: add 15% Ultimate charge to all living allies',exact:true})).toBeEnabled();
});
