import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('memories hide locked chapters and four real awakenings unlock animated Seris with persistent ownership', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#dungeons/memories'); await enterGame(page);
  const story = page.getByRole('region', {name:'薄明の剣と、約束の朝'});
  await expect(story).toContainText('0 / 4');
  await expect(story.getByRole('button',{name:'セリスを覚醒',exact:true})).toBeDisabled();
  await story.getByRole('button',{name:'エレインの記憶',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('覚醒すると開放');
  await expect(page.getByRole('dialog')).not.toContainText('朝を封じに行くセリスを');
  await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
  await page.evaluate(async()=>{
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const {content}=await import('/src/content/index.ts');
    const save=(await loadSave())!;const revision=save.revision;
    save.ownedIds.push('lisette'); save.completedDungeonIds=['veiled-cloister','hollow-gate','last-observatory','pale-throne'];save.leaderId='seris';
    for(const def of content.awakenings!)save.materials[def.cost.materialId]=def.cost.count;
    save.revision++;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);
  for(const name of ['エレイン','リオラ','ノエル','リゼット']){
    await story.getByRole('button',{name:`${name}を覚醒`,exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).not.toContainText('覚醒すると開放');
    await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
  }
  await expect(story).toContainText('4 / 4');
  await story.getByRole('button',{name:'セリスを覚醒',exact:true}).click();
  const detail = page.getByRole('dialog');
  await expect(detail).toContainText('暁を返す剣');
  await expect(detail).toContainText('その先へ、一緒に歩く人がいる。');
  await expect.poll(()=>detail.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
  await expect(detail.locator('video')).toHaveJSProperty('videoWidth',720);
  await detail.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.reload();await enterGame(page);
  await expect(story.getByRole('button',{name:'覚醒済み',exact:true}).first()).toBeDisabled();
  const saved=await page.evaluate(async()=>(await (await import('/src/platform/save.ts')).loadSave())!);
  expect(saved.materials['seris-memory:rare']).toBe(0);expect(saved.leaderId).toBe('seris-awakened');
  expect(saved.ownedIds).toContain('seris');expect(saved.ownedIds).toContain('seris-awakened');
  await page.getByRole('navigation',{name:'モバイルメニュー',exact:true}).getByRole('button',{name:'パーティ',exact:true}).click();
  const card=page.locator('.character-card').filter({hasText:'暁を返す剣'});
  await card.scrollIntoViewIfNeeded();
  await expect.poll(()=>card.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
  await expect(card.locator('video')).toHaveJSProperty('videoWidth',320);
});

test('normal routes show fixed encounters, remembrance gates and fit mobile and desktop widths', async({page})=>{
  await page.goto('/#dungeons');await enterGame(page);
  await expect(page.locator('.dungeon-card')).toHaveCount(12);
  await page.evaluate(async()=>{ const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;save.completedDungeonIds=['hollow-gate'];save.revision++;await persistSave(save,revision); });
  await page.reload();await enterGame(page);
  await expect(page.locator('.dungeon-card')).toHaveCount(12);
  await expect(page.locator('.dungeon-card').filter({hasText:'白夜の玉座'})).toContainText('弔鐘の追憶 ×6');
  await page.getByRole('button',{name:'追憶・覚醒',exact:true}).click();
  await expect(page.locator('.dungeon-card')).toHaveCount(5);
  for(const button of await page.locator('.dungeon-card').getByRole('button',{name:'探索の準備',exact:true}).all())await expect(button).toBeDisabled();
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }
});

test('awakened Seris animates as an enemy and party member and obeys reduced motion',async({page})=>{
  await page.goto('/');await enterGame(page);
  await page.evaluate(async()=>{
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const {content}=await import('/src/content/index.ts');
    const {createBattle,advanceReplay,characterStats}=await import('/src/domain/engine.ts');
    const save=(await loadSave())!;const revision=save.revision;
    save.ownedIds.push('seris-awakened');save.partyIds=['elaine','liora','seris-awakened','noelle'];save.leaderId='seris-awakened';
    let b=createBattle(content,save.partyIds,save.leaderId,'memory-seris',5,42,'seris-motion');
    while(b.phase==='playing')b=advanceReplay(b,content);
    const enemy=b.units.find(u=>u.side==='enemy')!;const stats=characterStats(content.characters.find(c=>c.id==='seris-awakened')!);
    b.wave=2;b.units=[...b.units.filter(u=>u.side==='party'),{...enemy,characterId:'seris-awakened',boss:true,...stats,maxHp:stats.hp}];b.initialUnits=structuredClone(b.units);b.events=[];b.cursor=0;
    save.battle=b;save.revision++;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);
  const enemy=page.locator('.enemy-page video');
  await expect(enemy).toHaveAttribute('src',/seris-awakened.mp4/);
  await expect.poll(()=>enemy.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
  const portrait=page.locator('.party-strip video');
  await expect(portrait).toHaveAttribute('src',/seris-awakened-portrait.mp4/);
  await expect.poll(()=>portrait.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const video of await page.locator('video').all())await expect(video).not.toHaveAttribute('src');
});
