import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('clockwork event has its own rewards, instructions and animated forms in both languages', async ({ page }, testInfo) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/#dungeons/boss-events'); await enterGame(page);
  const event = page.getByRole('region', {name:'時計庭のうさぎ姫',exact:true});
  await expect(event).toContainText('3ターンごと'); await expect(event).toContainText('うさぎの歯車');
  await expect(event).not.toContainText('葛葉'); await expect(event.locator('.event-stage')).toHaveCount(5);
  await expect(event.locator('video')).toHaveCount(2);
  await expect(event.getByRole('button',{name:'ルネットを迎える',exact:true})).toBeDisabled();
  await event.scrollIntoViewIfNeeded(); await page.screenshot({path:testInfo.outputPath('clockwork-event.png')});
  await page.goto('/#settings'); await page.getByRole('button',{name:'English',exact:true}).click(); await page.goto('/#dungeons/boss-events');
  const english = page.getByRole('region',{name:'Princess of the Clockwork Rabbits',exact:true});
  await expect(english).toContainText('Rabbit Gear'); await expect(english).toContainText('Barriers, guarding');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('real bit deployments and shots survive reload, replay once, and respect reduced motion', async ({ page }, testInfo) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/'); await enterGame(page);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts'); const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;
    let battle=createBattle(content,save.partyIds,save.leaderId,'lunette-beginner',0,42,'clockwork-e2e');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    battle.phase='playing';battle.nextPhase='wave';battle.events=[];battle.cursor=0;
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    battle.round=3;
    for(const unit of battle.units){unit.hp=unit.maxHp=10000;unit.attack=unit.side==='enemy'?80:1;unit.cooldowns=Object.fromEntries(content.characters.find(c=>c.id===unit.characterId)!.skillIds.map(id=>[id,1000]));}
    battle.initialUnits=structuredClone(battle.units);save.battle=battle;save.settings.reducedMotion=true;save.revision++;await persistSave(save,revision);
  });
  await page.reload(); await enterGame(page);
  const status=page.getByRole('status',{name:'うさぎビットの状態',exact:true});
  await expect(status).toContainText('このターンに展開');
  const enemy=page.locator('.enemy-carousel');
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  await expect(status).toContainText('次ターン射撃', {timeout:20000});
  await expect(page.locator('.clockwork-bit')).toHaveCount(2);
  await expect.poll(()=>page.getByRole('button',{name:'ラウンドを進める',exact:true}).isEnabled(), {timeout:20000}).toBe(true);
  await page.reload(); await enterGame(page); await expect(page.locator('.clockwork-bit')).toHaveCount(2);
  const before=await page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!.battle!);
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  await expect(page.locator('.clockwork-bits.is-firing')).toBeVisible({timeout:20000});
  await page.screenshot({path:testInfo.outputPath('rabbit-bit-fire.png')});
  await expect.poll(()=>page.getByRole('button',{name:'ラウンドを進める',exact:true}).isEnabled(), {timeout:20000}).toBe(true);
  const after=await page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!.battle!);
  expect(after.events.filter(e=>e.bitAction==='fire')).toHaveLength(2); expect(after.round).toBe(before.round+1);
  await page.reload();await enterGame(page);
  const reloaded=await page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!.battle!);
  expect(reloaded.units).toEqual(after.units); expect(reloaded.round).toBe(after.round);
  expect(await page.locator('.clockwork-bit').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await expect(enemy.locator('video')).not.toHaveAttribute('src');
  await expect(enemy.locator('video')).toHaveJSProperty('paused',true);
});
