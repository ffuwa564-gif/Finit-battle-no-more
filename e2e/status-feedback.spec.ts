import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('barrier RESIST is attached to the party recipient, fits mobile, and leaves controls usable', async ({page}, testInfo) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/');await enterGame(page);
  await page.evaluate(async () => {
    const {content}=await import('/src/content/index.ts');
    const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const save=(await loadSave())!,revision=save.revision;
    let battle=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,42,'barrier-notice');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    const target=battle.units.find(u=>u.side==='party')!,actor=battle.units.find(u=>u.side==='enemy')!;
    target.barrier=100;target.barrierUntil=3;
    battle.initialUnits=structuredClone(battle.units);
    target.barrier=40;
    battle.events=[{id:'barrier-impact',kind:'attack',text:'障壁の検証',actorId:actor.uid,targetIds:[target.uid],amount:0,absorbed:60,unitsAfter:structuredClone(battle.units)}];
    battle.phase='playing';battle.cursor=0;battle.round=2;
    save.battle=battle;save.settings.reducedMotion=true;save.revision++;await persistSave(save,revision);
  });
  await page.reload();await page.evaluate(() => document.fonts.ready);await enterGame(page);
  const notice=page.locator('[data-status-visual="barrier"]');
  await expect(notice).toContainText('RESIST · 障壁吸収 60');
  const face=page.locator('.party-unit').first();
  const a=await notice.boundingBox(),b=await face.boundingBox();
  expect(a!.y).toBeGreaterThan(b!.y-70);expect(a!.x).toBeGreaterThanOrEqual(0);expect(a!.x+a!.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:testInfo.outputPath('barrier-resist-mobile.png'), style:'.status-feedback__notice { animation:none !important; }'});
  await expect(notice).toHaveCount(0);
  await expect(page.getByRole('button',{name:'ラウンドを進める',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

for (const language of ['ja', 'en'] as const) test(`sleep action loss is visible at its recipient in ${language}, without extra command-pad prose`, async ({page},testInfo) => {
  await page.setViewportSize({width:320,height:844});await page.goto('/');await enterGame(page);
  await page.evaluate(async (language) => {
    const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!,revision=save.revision;
    let battle=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,42,'sleep-notice');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    const target=battle.units.find(u=>u.side==='party')!,source=battle.units.find(u=>u.side==='enemy')!;
    target.ailments={sleep:{turns:2,sourceId:source.uid}};
    battle.initialUnits=structuredClone(battle.units);target.ailments.sleep!.turns=1;
    battle.events=[{id:'sleep-skip',kind:'debuff',text:'',actorId:target.uid,targetIds:[target.uid],ailment:'sleep',statusAction:'skip',unitsAfter:structuredClone(battle.units)}];
    battle.phase='playing';battle.cursor=0;battle.round=2;save.battle=battle;save.settings.reducedMotion=false;save.revision++;
    await persistSave(save,revision);localStorage.setItem('stillveil-language',language);
  },language);
  await page.reload();await page.evaluate(()=>document.fonts.ready);
  await page.locator('.title-screen__start').click();await expect(page.locator('.title-screen')).toHaveCount(0);
  const notice=page.locator('[data-status-visual="sleep"]');
  await expect(notice).toContainText(language==='ja'?'睡眠・行動不能':'Sleep · Cannot act');
  await expect(page.locator('.battle-control-pad')).not.toContainText(/加速|説明|スキル|Acceleration|explanation/i);
  const bounds=await notice.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(320);
  await page.screenshot({path:testInfo.outputPath(`sleep-${language}.png`),style:'.status-feedback__notice { animation:none !important; }'});
  await expect(notice).toHaveCount(0);
});
