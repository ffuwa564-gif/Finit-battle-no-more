import { expect, test, type Page } from '@playwright/test';
import { skipStory } from './boot';

async function enter(page:Page) {
  await page.waitForFunction(()=>Boolean(document.querySelector('.title-screen__start,.app-shell,[role=alert]')));
  const fatal=page.locator('.app-loading [role=alert]');
  if(await fatal.count())throw new Error('Boot rejected content/save: '+await fatal.innerText());
  if(await page.locator('.title-screen').count())await page.locator('.title-screen__start').click();
  await skipStory(page);
}
async function read(page:Page) {return page.evaluate(async()=>{const{loadSave}=await import('/src/platform/save.ts');return (await loadSave())!;});}
async function label(page:Page,value:string) {return page.evaluate(async value=>(await import('/src/locales/i18n.ts')).tr(value),value);}
async function fixture(page:Page,flower=false) {
  await page.evaluate(async flower=>{
    const{content}=await import('/src/content/index.ts');
    const{applyCommand}=await import('/src/application/game.ts');
    const{loadSave,persistSave}=await import('/src/platform/save.ts');
    const prev=(await loadSave())!,base=structuredClone(prev);
    base.ownedIds=[...new Set([...base.ownedIds,'noelle','elaine','liora','lisette'])];
    base.discoveredIds=[...base.ownedIds];base.partyIds=['elaine','noelle','liora','lisette'];base.leaderId='noelle';base.settings.reducedMotion=true;
    let setup=base;
    if(flower){setup.memoryGems!.dust.sanctuary=6;setup=applyCommand(setup,{type:'craftMemoryGem',defId:'white-flower-seed'},content);setup=applyCommand(setup,{type:'equipMemoryGem',characterId:'elaine',gemId:setup.memoryGems!.items.find(g=>g.defId==='white-flower-seed')!.id},content);}
    let save=applyCommand(setup,{type:'depart',dungeonId:'silent-cathedral',potions:0},content);
    while(save.battle!.phase==='playing')save=applyCommand(save,{type:'replay'},content);
    if(flower){
      const{gemSkill}=await import('/src/domain/memory-gems.ts');
      for(const u of save.battle!.units){u.attack=0;if(u.side==='enemy')u.hp=u.maxHp=9999;}
      save.battle!.units.find(u=>u.characterId==='elaine')!.hp=20;
      save.battle!.initialUnits=structuredClone(save.battle!.units);
      save=applyCommand(save,{type:'partyOrder',battleId:save.battle!.id,order:{kind:'skill',skillId:gemSkill(save.memoryGems!.items.find(g=>g.defId==='white-flower-seed')!).id}},content);
      save=applyCommand(save,{type:'round'},content);
      while(save.battle!.phase==='playing')save=applyCommand(save,{type:'replay'},content);
    }
    save.revision=prev.revision+1;await persistSave(save,prev.revision);
  },flower);
  await page.reload();await enter(page);
}

for(const language of ['ja','en'] as const)for(const width of [320,390]){
  test(`white flower seed portrait and explanation ${language}/${width}`,async({page},info)=>{
    await page.setViewportSize({width,height:844});
    await page.addInitScript(locale=>{localStorage.setItem('stillveil-language',locale);localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));},language);
    await page.goto('/');await enter(page);await fixture(page,true);
    const summary=page.locator('.party-strip .unit-effects-summary').first();await expect(summary).toBeVisible();
    expect(await summary.evaluate(el=>{const p=el.closest('.party-unit')!.querySelector('.portrait-image')!.getBoundingClientRect(),s=el.getBoundingClientRect();return s.left>=p.left&&s.right<=p.right&&s.top>=p.top&&s.bottom<=p.bottom;})).toBe(true);
    await summary.click();const modal=page.getByRole('dialog');await expect(modal).toBeVisible();
    await expect(modal).toContainText('50');
    if(language==='en')expect(await modal.innerText()).not.toMatch(/[ぁ-んァ-ヶ一-龯]/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:info.outputPath(`white-flower-${language}-${width}.png`)});
    await page.keyboard.press('Escape');
    const before=await read(page);
    await page.locator('.party-strip .party-unit').first().getByRole('button',{name:await label(page,'エレイン：行動を選ぶ'),exact:true}).click();
    await page.locator('[data-command="guard"]').click();
    await expect.poll(async()=>(await read(page)).battle!.partyOrder?.kind).toBe('guard');
    const queued=await read(page);
    expect(queued.battle!.units.find(u=>u.characterId==='elaine')!.whiteFlower).toEqual({amount:50,until:3});
    expect(queued.battle!.units).toEqual(before.battle!.units);
  });
}

for(const language of ['ja','en'] as const)for(const width of [320,390]){
  test(`new command doctrine saves, cancels and fits ${language}/${width}`,async({page},info)=>{
    await page.setViewportSize({width,height:844});
    await page.addInitScript(locale=>{
      localStorage.setItem('stillveil-language',locale);
      localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));
    },language);
    await page.goto('/');await enter(page);await fixture(page);
    const before=await read(page),trigger=page.getByTestId('command-doctrine').locator('button');
    await trigger.click();
    const modal=page.getByRole('dialog');await expect(modal).toBeVisible();
    expect(await modal.evaluate(el=>el.getAttribute('data-game-surface')!==null||el.closest('[data-game-surface]')!==null)).toBe(true);
    const reserve=modal.getByRole('button',{name:await label(page,'この号令を予約'),exact:true});
    await expect(reserve).toBeDisabled();
    const followers=modal.locator('[data-command-follower]');await expect(followers).toHaveCount(3);
    await modal.locator('[data-command-follower="party:lisette"]').click();
    await modal.locator('[data-command-follower="party:liora"]').click();
    await expect(modal.locator('[data-command-follower="party:elaine"]')).toBeDisabled();
    await expect(modal.getByTestId('command-load')).toContainText('3 / 3');
    await expect(reserve).toBeEnabled();
    if(language==='en')expect(await modal.innerText()).not.toMatch(/[ぁ-んァ-ヶ一-龯]/);
    const geometry=await modal.evaluate(el=>{
      const box=el.getBoundingClientRect();
      return {left:box.left,right:box.right,overflow:document.documentElement.scrollWidth>innerWidth,
        controls:[...el.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height>0).every(b=>{const r=b.getBoundingClientRect();return r.width>=40&&r.height>=40;})};
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(width+1);expect(geometry.overflow).toBe(false);expect(geometry.controls).toBe(true);
    await page.screenshot({path:info.outputPath(`command-doctrine-${language}-${width}.png`),fullPage:true});
    await reserve.click();await expect(modal).not.toBeVisible();
    await expect.poll(async()=>(await read(page)).battle?.commandOrder?.followerIds.length).toBe(2);
    const queued=await read(page);expect(queued.seed).toBe(before.seed);expect(queued.gold).toBe(before.gold);
    await page.reload();await enter(page);await trigger.click();
    await expect(modal.getByTestId('command-load')).toContainText('3 / 3');
    await modal.getByRole('button',{name:await label(page,'号令の予約を解除'),exact:true}).click();
    await expect.poll(async()=>(await read(page)).battle?.commandOrder??null).toBeNull();
    const cancelled=await read(page);expect(cancelled.battle!.units).toEqual(before.battle!.units);expect(cancelled.seed).toBe(before.seed);
  });
}
