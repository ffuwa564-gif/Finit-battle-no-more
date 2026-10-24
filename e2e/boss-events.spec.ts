import {test, expect, type Page} from '@playwright/test';
import {enterGame} from './boot';
import type {GameSave} from '../src/domain/types';
async function stored(page: Page): Promise<GameSave> { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!); }
async function seed(page: Page, patch: Partial<GameSave>) {
  await page.evaluate(async patch => {
    const {loadSave,persistSave}=await import('/src/platform/save.ts'); const save=(await loadSave())!; const revision=save.revision;
    Object.assign(save,patch);save.revision=revision+1;await persistSave(save,revision);
  }, patch);
  await page.reload();await enterGame(page);
}

test('event previews, exclusive exchanges and form restrictions work with an existing save', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#dungeons/events');await enterGame(page);
  await expect(page.getByRole('heading',{name:'宵宮に咲く九尾',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'初級の探索準備',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'九尾・葛葉の姿を見る',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect.poll(()=>dialog.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
  await expect(page.locator('.event-form video')).toHaveJSProperty('paused',true);
  await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
  const completed=['silent-cathedral','kuzuha-beginner','kuzuha-intermediate','kuzuha-advanced','kuzuha-expert'];
  await seed(page,{completedDungeonIds:completed,materials:{'kuzuha-contract:rare':30}});
  await expect(page.getByRole('button',{name:'覚醒級の探索準備',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'葛葉を迎える',exact:true}).click();
  await expect(dialog).toContainText('参拝者の途絶えた稲荷');
  await expect(dialog.locator('video')).toHaveCount(0);
  await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
  await expect(page.getByRole('button',{name:'覚醒級の探索準備',exact:true})).toBeEnabled();
  expect((await stored(page)).materials['kuzuha-contract:rare']).toBe(0);
  await seed(page,{completedDungeonIds:[...completed,'kuzuha-awakening'],materials:{'kuzuha-contract:epic':5}});
  await page.getByRole('button',{name:'九尾の契りを結ぶ',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'九尾・葛葉',exact:true})).toBeVisible();
  await expect.poll(()=>dialog.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
  await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
  const save=await stored(page);expect(save.ownedIds).toEqual(expect.arrayContaining(['kuzuha','kuzuha-awakened']));
  expect(save.materials['kuzuha-contract:epic']).toBe(0);
  await page.goto('/#party');await enterGame(page);
  for(let i=0;i<2;i++)await page.getByRole('button',{name:'編成中',exact:true}).first().click();
  const normal=page.locator('.character-card').filter({has:page.getByRole('heading',{name:'葛葉',exact:true})});
  const awakened=page.locator('.character-card').filter({has:page.getByRole('heading',{name:'九尾・葛葉',exact:true})});
  await normal.getByRole('button',{name:'編成する',exact:true}).click();
  await expect(awakened.getByRole('button',{name:'編成する',exact:true})).toBeDisabled();
  expect((await stored(page)).partyIds).toHaveLength(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('a real event clear keeps currency provisional through reload and claims it once',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#dungeons/events');await enterGame(page);
  await seed(page,{completedDungeonIds:['silent-cathedral']});
  await page.getByRole('button',{name:'初級の探索準備',exact:true}).click();
  await page.getByRole('button',{name:'探索を始める',exact:true}).click();
  for(let i=0;i<150;i++){
    const save=await stored(page);if(save.battle?.phase==='reward')break;
    expect(save.battle?.phase).not.toBe('failed');
    await page.getByRole('button',{name:save.battle?.phase==='playing'?'次の演出へ':'ラウンドを進める',exact:true}).click();
    await expect.poll(async()=>(await stored(page)).revision).toBeGreaterThan(save.revision);
  }
  const reward=await stored(page);expect(reward.battle?.phase).toBe('reward');
  expect(reward.materials['kuzuha-contract:rare']).toBeUndefined();
  expect(reward.battle?.pendingMaterials['kuzuha-contract:rare']).toBe(1);
  await page.reload();await enterGame(page);
  await expect(page.getByText('契りの欠片',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'獲得を確定',exact:true}).click();
  await expect(page.getByRole('heading',{name:'宵宮に咲く九尾',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'中級の探索準備',exact:true})).toBeEnabled();
  const claimed=await stored(page);expect(claimed.materials['kuzuha-contract:rare']).toBe(1);expect(claimed.stones).toBe(1);
  await page.reload();await enterGame(page);expect((await stored(page)).materials['kuzuha-contract:rare']).toBe(1);
});
