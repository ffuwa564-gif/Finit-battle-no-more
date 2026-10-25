import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('four distinct ailment badges survive reload and translate without overflowing mobile battle', async ({ page }, testInfo) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/');await enterGame(page);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;
    let b=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,42,'status-ui');while(b.phase==='playing')b=advanceReplay(b,content);
    const source=b.units.find(u=>u.side==='enemy')!.uid;
    const effects=['confusion','sleep','paralysis','charm'] as const;
    b.units.filter(u=>u.side==='party').forEach((u,i)=>{u.ailments={[effects[i]!]:{turns:2,sourceId:source}};u.hp=u.maxHp=1000;u.cooldowns=Object.fromEntries(content.characters.find(c=>c.id===u.characterId)!.skillIds.map(id=>[id,99]));});
    b.initialUnits=structuredClone(b.units);save.battle=b;save.settings.reducedMotion=true;save.revision++;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);
  for(const [id,name] of [['confusion','混乱'],['sleep','睡眠'],['paralysis','麻痺'],['charm','魅了']])await expect(page.locator(`[data-ailment="${id}"]`)).toHaveText(`${name} · 2`);
  await page.screenshot({path:testInfo.outputPath('four-ailments-mobile.png')});
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  await expect(page.locator('.battle-toast')).toContainText('睡眠で行動できない');
  await expect.poll(()=>page.getByRole('button',{name:'ラウンドを進める',exact:true}).isEnabled(),{timeout:25000}).toBe(true);
  const before=await page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!.battle!);
  await page.reload();await enterGame(page);
  const after=await page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!.battle!);
  expect(after.units).toEqual(before.units);expect(after.seed).toBe(before.seed);
  await page.evaluate(()=>localStorage.setItem('stillveil-language','en'));await page.reload();await page.locator('.title-screen__start').click();await expect(page.locator('.title-screen')).toHaveCount(0);
  for(const text of await page.locator('[data-ailment]').evaluateAll(nodes=>nodes.map(node=>(node.textContent??'')+' '+node.getAttribute('title'))))expect(text).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('real companions describe all four skills and cleansing in Japanese and English', async ({ page })=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/#codex');await enterGame(page);
  for(const [name,skill] of [['セオリツヒメ','迷いの霧'],['ペルセポネ','まどろみの花'],['ミヅハノメ','痺れる閃光'],['アメノウズメ','惑いの旋律']]){
    const card=page.locator('.character-card').filter({has:page.getByRole('heading',{name,exact:true})}).first();
    await card.getByRole('button',{name:'物語を読む',exact:true}).click();const dialog=page.getByRole('dialog');
    await expect(dialog).toContainText(skill);await expect(dialog).toContainText('通常70%・ボス35%');
    await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
  }
  await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#codex');
  const elaine=page.locator('.character-card').filter({has:page.getByRole('heading',{name:'Elaine',exact:true})}).first();await elaine.getByRole('button',{name:'Read Their Story',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('confusion, sleep, paralysis, charm');
});
