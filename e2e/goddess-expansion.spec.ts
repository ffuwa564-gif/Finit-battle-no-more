import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('four new lower-rarity goddesses have distinct artwork, readable abilities and real summon ownership', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#gacha'); await enterGame(page);
  await expect(page.locator('.goddess-feature')).toHaveCount(2);
  await expect(page.locator('.character-grid > .character-card')).toHaveCount(6);
  const additions = [
    {name:'トヨタマヒメ',file:'gacha-toyotama.png',skill:'傷ついた味方2人'},
    {name:'ワカヒルメ',file:'gacha-wakahirume.png',skill:'天衣の結界'},
    {name:'イワナガヒメ',file:'gacha-iwanagahime.png',skill:'障壁を破壊'},
    {name:'ククリヒメ',file:'gacha-kukurihime.png',skill:'攻撃強化と再生'},
  ];
  for(const character of additions){
    await page.getByRole('button',{name:character.name,exact:true}).click();
    const dialog=page.getByRole('dialog');
    await expect(dialog).toContainText(character.skill);
    await expect(dialog.locator('.character-artwork img')).toHaveAttribute('src',new RegExp(character.file));
    await expect.poll(()=>dialog.locator('.character-artwork img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1024);
    await expect(dialog.locator('video')).toHaveCount(0);
    await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
  }
  await page.evaluate(async()=>{
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;
    save.seed=1309757276;save.stones=5;save.revision++;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);
  await page.getByRole('button',{name:'石5個で祈願する',exact:true}).click();
  await page.getByRole('button',{name:'演出をスキップ',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('トヨタマヒメ');
  await page.getByRole('button',{name:'女神を迎える',exact:true}).click();
  await page.reload();await enterGame(page);
  const save=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
  expect(save.ownedIds).toContain('toyotama');expect(save.stones).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('paired healing displays two actual healing amounts in battle',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await enterGame(page);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const revision=save.revision;
    save.ownedIds.push('toyotama','iwanagahime','kukurihime','wakahirume');save.partyIds=['toyotama','iwanagahime','kukurihime','wakahirume'];save.leaderId='wakahirume';
    let battle=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,42,'paired-heal');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    battle.units.find(u=>u.characterId==='toyotama')!.speed=100;
    battle.units.find(u=>u.characterId==='iwanagahime')!.hp=145;
    battle.units.find(u=>u.characterId==='kukurihime')!.hp=100;
    battle.initialUnits=structuredClone(battle.units);save.battle=battle;save.settings.reducedMotion=true;
    save.revision++;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  await expect(page.locator('.battle-toast')).toContainText('返し潮の抱擁');
  const numbers=page.locator('.combat-number--heal');await expect(numbers).toHaveCount(2);
  expect((await numbers.evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-hp-delta'))))).sort((a,b)=>a-b)).toEqual([40,50]);
});
