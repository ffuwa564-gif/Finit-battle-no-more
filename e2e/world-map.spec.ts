import { test, expect } from '@playwright/test';
import { enterGame } from './boot';
test('world map pans, zooms, persists travel, arrives and opens a real expedition', async ({page}, info) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#dungeons'); await enterGame(page);
  const map=page.getByRole('region',{name:'世界地図',exact:true}); await expect(map).toBeVisible();
  const art=map.locator('.world-map__art'); await expect(art).toHaveJSProperty('complete',true);
  await expect(map.getByRole('button',{name:'自動移動',exact:true})).toBeEnabled();
  await page.screenshot({path:info.outputPath('world-map-mobile.png')});
  const land=map.locator('.world-map__land');const original=await land.getAttribute('style');
  await map.getByRole('button',{name:'拡大',exact:true}).click();expect(await land.getAttribute('style')).not.toBe(original);
  await page.mouse.move(180,320);await page.mouse.down();await page.mouse.move(230,360,{steps:8});await page.mouse.up();
  await map.getByRole('button',{name:'自動移動',exact:true}).click(); await expect(map.getByRole('button',{name:'移動を中止'})).toBeVisible();
  await page.reload(); await enterGame(page); await expect(map.getByRole('button',{name:'移動を中止'})).toBeVisible();
  await page.clock.install();await page.clock.fastForward(46000);
  await expect(map.getByRole('button',{name:'探索の準備',exact:true})).toBeEnabled();
  await map.getByRole('button',{name:'探索の準備',exact:true}).click();
  await expect(page.getByRole('button',{name:'探索を始める',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
  for(const width of [320,390,1440]) { await page.setViewportSize({width,height:900}); expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false); }
});
test('locked places stay locked and directories remain accessible',async({page})=>{
 await page.goto('/#dungeons');await enterGame(page);
 const pin=page.locator('.world-pin.is-locked').first();await pin.click();await expect(page.locator('.world-map__travel')).toBeDisabled();
 await page.getByRole('button',{name:'探索地点の一覧',exact:true}).click();await page.getByRole('button',{name:'すべての探索を一覧で見る',exact:true}).click();await expect(page.getByRole('group',{name:'通常ダンジョンの章',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'世界地図へ',exact:true}).click();await expect(page.locator('.world-map')).toBeVisible();
});
test('a story destination opens the available novel library after traveling',async({page})=>{
 await page.goto('/#dungeons');await enterGame(page);await page.clock.install();
 await page.getByRole('button',{name:'旅人の灯',exact:true}).click();
 await page.getByRole('button',{name:'自動移動',exact:true}).click();await page.clock.fastForward(46000);
 await page.getByRole('button',{name:'物語を読む',exact:true}).click();await expect(page.locator('.novel-library')).toContainText('物語の記録');
});
