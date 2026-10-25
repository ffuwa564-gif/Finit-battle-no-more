import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('clockwork event has its own rewards, instructions and awakened animation in both languages', async ({ page }, testInfo) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/#dungeons/boss-events'); await enterGame(page);
  const event = page.getByRole('region', {name:'時計庭のうさぎ姫',exact:true});
  await expect(event).toContainText('3ターンごと'); await expect(event).toContainText('うさぎの歯車');
  await expect(event).not.toContainText('葛葉'); await expect(event.locator('.event-stage')).toHaveCount(5);
  await expect(event.locator('.character-artwork__still')).toHaveCount(1);
  const video = event.locator('video');
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute('src', /video\/lunette-awakened-loop.mp4/);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('loop', true);
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
  await expect(enemy.locator('video')).toHaveCount(0);
});

test('awakened Lunette plays on home and keeps her painting for reduced motion and errors', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.ownedIds.push('lunette-awakened');
    save.settings.homeCharacterId = 'lunette-awakened';
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  const home = page.locator('.home-artwork');
  await expect(home.locator('video')).toHaveAttribute('src', /video\/lunette-awakened-loop.mp4/);
  await expect.poll(() => home.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await expect(home.locator('video')).toHaveJSProperty('muted', true);
  await expect.poll(() => home.locator('video').evaluate((v: HTMLVideoElement) => v.duration)).toBeGreaterThan(9.5);
  await expect(home.locator('video')).toHaveJSProperty('loop', true);
  const wrapped = await home.locator('video').evaluate((v: HTMLVideoElement) => new Promise<boolean>(resolve => {
    let previous = v.currentTime;
    const timeout = setTimeout(() => { clearInterval(timer); resolve(false); }, 15000);
    const timer = setInterval(() => {
      if (v.currentTime < previous - 1) { clearInterval(timer); clearTimeout(timeout); resolve(true); }
      previous = v.currentTime;
    }, 50);
  }));
  expect(wrapped).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('lunette-awakened-home.png'), fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(home.locator('.animated-illustration')).toHaveAttribute('data-animation-state', 'static');
  await expect(home.locator('video')).not.toHaveAttribute('src');
  await expect(home.locator('img')).toHaveAttribute('src', /event-lunette-awakened.png/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/video/lunette-awakened-loop.mp4', route => route.abort());
  await page.reload(); await enterGame(page);
  await expect(home.locator('.animated-illustration')).toHaveAttribute('data-animation-state', 'error');
  await expect(home.locator('img')).toBeVisible();
});

test('awakened Lunette uses the lightweight portrait and full animation in details', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#party'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.ownedIds.push('lunette-awakened');
    save.partyIds = ['lunette-awakened', 'liora', 'seris', 'noelle'];
    save.leaderId = 'lunette-awakened'; save.revision++;
    await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  const card = page.locator('.character-card').filter({ has: page.getByRole('heading', { name: '星時計・ルネット', exact: true }) });
  await card.scrollIntoViewIfNeeded();
  const portrait = card.locator('video');
  await expect(portrait).toHaveAttribute('src', /lunette-awakened-portrait-loop.mp4/);
  await expect.poll(() => portrait.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await expect(portrait).toHaveJSProperty('videoWidth', 320);
  await page.screenshot({ path: testInfo.outputPath('lunette-awakened-portrait.png') });
  await card.getByRole('button', { name: '星時計・ルネット・リーダー', exact: true }).click();
  const video = page.getByRole('dialog').locator('video');
  await expect(video).toHaveAttribute('src', /video\/lunette-awakened-loop.mp4/);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('lunette-awakened-detail.png'), fullPage: true });
  await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const { content } = await import('/src/content/index.ts');
    const save = (await loadSave())!;
    await persistSave(applyCommand(save, { type: 'depart', dungeonId: content.dungeons[0].id, potions: 0 }, content), save.revision);
  });
  await page.reload(); await enterGame(page);
  const battlePortrait = page.locator('.party-strip video[src$="lunette-awakened-portrait-loop.mp4"]');
  await expect.poll(() => battlePortrait.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await expect(battlePortrait).toHaveJSProperty('muted', true);
  await page.screenshot({ path: testInfo.outputPath('lunette-awakened-battle.png'), fullPage: true });
});
