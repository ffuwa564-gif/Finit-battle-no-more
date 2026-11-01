import { test, expect, type Page } from '@playwright/test';
import { skipStory } from './boot';

async function enter(page:Page) {
  await page.locator('.title-screen__start,.app-shell').first().waitFor();
  if(await page.locator('.title-screen__start').count())await page.locator('.title-screen__start').click();
  await skipStory(page);
}
async function saved(page:Page) {return page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);}
for(const language of ['ja','en'] as const)for(const width of [320,390]) {
  test(`${language} ${width}px preparation guides farming, crafting and existing equipment`,async({page},info)=>{
    await page.setViewportSize({width,height:844});
    await page.addInitScript(l=>{localStorage.setItem('stillveil-language',l);localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));},language);
    await page.goto('/#bag');await enter(page);
    const guide=page.getByTestId('preparation-guide');await expect(guide).toHaveAttribute('data-step','farm');
    const before=await saved(page);
    await guide.locator(':scope > .button').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    expect(await saved(page)).toEqual(before);
    // Isolated fixture: make exactly one recipe affordable; all actions below use real UI.
    await page.evaluate(async()=>{
      const {loadSave,persistSave}=await import('/src/platform/save.ts');
      const {emptyGemInventory}=await import('/src/domain/memory-gems.ts');
      const s=(await loadSave())!,revision=s.revision;s.memoryGems=emptyGemInventory();s.memoryGems.dust.sanctuary=6;
      s.settings.reducedMotion=true;s.revision++;await persistSave(s,revision);
    });
    await page.goto('/#bag');await page.reload();await enter(page);
    await expect(guide).toHaveAttribute('data-step','craft');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await guide.screenshot({path:info.outputPath(`preparation-${language}-${width}.png`)});
    await guide.locator(':scope > .button').click();
    const craft=page.getByTestId('build-craft-target');await expect(craft).toBeVisible();await craft.locator('button').click();
    await expect(page.getByTestId('owned-gem-target')).toBeVisible();await expect(craft).toHaveCount(0);
    const stones=page.locator('[data-inventory-section="memory-stones"]');await expect(stones).not.toHaveAttribute('open');
    await page.getByTestId('owned-gem-target').locator('button').click();await expect(stones).toHaveAttribute('open','');
    await page.locator('.memory-gems__detail-actions .button').first().click();
    await expect.poll(async()=>Object.keys((await saved(page)).memoryGems!.equipped).length).toBe(1);
    expect((await saved(page)).memoryGems!.items).toHaveLength(1);
    await page.goto('/#bag');await page.reload();await enter(page);await expect(guide).toHaveAttribute('data-step','try');
    if(language==='en')expect(await guide.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    const ready=await saved(page);await guide.locator(':scope > .button').last().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();expect(await saved(page)).toEqual(ready);
  });
  test(`${language} ${width}px command tradeoff and native tower defeat lead back to preparation`,async({page},info)=>{
    await page.setViewportSize({width,height:844});
    await page.addInitScript(l=>{localStorage.setItem('stillveil-language',l);localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));},language);
    await page.goto('/');await enter(page);
    await page.evaluate(async()=>{
      const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
      const {loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,revision=s.revision;
      s.partyIds=['liora','noelle','seris','elaine'];s.leaderId='noelle';s.settings.reducedMotion=true;
      s.novels={seen:(content.novels??[]).map(n=>n.id)};
      let b=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',2,20261101,'command-preview');
      while(b.phase==='playing')b=advanceReplay(b,content);s.battle=b;s.revision++;await persistSave(s,revision);
    });
    await page.reload();await enter(page);await page.getByTestId('command-doctrine').locator('button').click();
    await expect(page.getByTestId('command-tradeoff')).toBeVisible();
    await page.locator('[data-command-follower]').first().click();
    await expect(page.getByTestId('command-reservation-summary')).toBeVisible();
    const dialog=page.locator('.command-doctrine-modal');
    expect(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(false);
    await page.getByTestId('command-tradeoff').screenshot({path:info.outputPath(`command-cost-${language}-${width}.png`)});
    await page.evaluate(async()=>{
      const {content}=await import('/src/content/index.ts');const {applyCommand}=await import('/src/application/game.ts');
      const {loadSave,persistSave}=await import('/src/platform/save.ts');let s=(await loadSave())!;const revision=s.revision;
      s.battle=null;s.completedDungeonIds=['silent-cathedral'];
      const act=(c:Parameters<typeof applyCommand>[1])=>{s=applyCommand(s,c,content);};
      act({type:'depart',dungeonId:'ivory-tower-001',potions:2});
      for(let i=0;i<1000&&s.battle?.phase!=='failed'&&s.battle?.phase!=='reward';i++)act(s.battle?.phase==='playing'?{type:'replay'}:{type:'round'});
      if(s.battle?.phase!=='failed')throw Error('Expected real initial-party tower defeat');
      s.revision=revision+1;await persistSave(s,revision);
    });
    await page.reload();await enter(page);
    const next=page.getByTestId('expedition-next-step');await expect(next).toBeVisible();
    const details=next.locator('details');await expect(details).not.toHaveAttribute('open');await details.locator('summary').click();
    if(language==='en')expect(await next.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await next.screenshot({path:info.outputPath(`next-attempt-${language}-${width}.png`)});
    const before=await saved(page);await next.locator('.expedition-next-step__actions button').first().click();
    await expect(page.getByTestId('preparation-guide')).toBeVisible();
    const after=await saved(page);expect(after.battle).toBeNull();expect(after.expeditionHistory?.length).toBe((before.expeditionHistory?.length??0)+1);
    await page.reload();await enter(page);expect((await saved(page)).expeditionHistory).toEqual(after.expeditionHistory);
  });
}
