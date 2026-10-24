import { test,expect } from '@playwright/test';
import { enterGame } from './boot';
const title='神々の装い ― 和の花宴 ―';
const legacy='ゴス☆イザナミコレクション';
async function saveState(page:import('@playwright/test').Page){return page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!);}

test('flower collection has four original kimono goddesses, readable skills and English support',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#gacha');await enterGame(page);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 for(const [name,skill] of [['セレネ','三日月の袖守り'],['アテナ','知恵の一閃'],['フローラ','花風の浄め'],['イリス','晴れ渡る空']]){
  const button=page.getByRole('button',{name:name==='セレネ'||name==='アテナ'?`SSR ${name}の詳細`:name,exact:true});
  await button.click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText(skill);
  await expect(dialog).toContainText('花宴への客人');
  await expect.poll(()=>dialog.locator('.character-artwork img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1024);
  const animated=name==='セレネ'||name==='アテナ';
  if(animated){
   await expect.poll(()=>dialog.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
   await expect(dialog.locator('video')).toHaveJSProperty('muted',true);
  }else await expect(dialog.locator('video')).toHaveCount(0);
  await dialog.getByRole('button',{name:'閉じる',exact:true}).click();
 }
 await page.screenshot({path:testInfo.outputPath('flower-banquet-mobile.png'),fullPage:true});
 await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#gacha');
 await expect(page.getByRole('heading',{name:'Divine Attire — A Kimono Flower Banquet',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'SSR Selene Details',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Crescent Sleeve Ward');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('the second wish warns before spending, cancellation preserves the save, and switching or reloading never renews the guarantee',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#gacha');await enterGame(page);
 await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const rev=save.revision;save.stones=30;save.seed=42;save.settings.reducedMotion=true;save.revision++;await persistSave(save,rev);});
 await page.reload();await enterGame(page);await page.getByRole('button',{name:legacy,exact:true}).click();
 await page.getByRole('button',{name:'石5個で祈願する',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:title,exact:true}).click();
 await page.getByRole('button',{name:'石5個で祈願する',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('他のシリーズでは再使用できず');
 const before=await saveState(page);expect(before.drawCount).toBe(1);
 await page.getByRole('button',{name:'取消',exact:true}).click();expect(await saveState(page)).toEqual(before);
 await page.getByRole('button',{name:'石5個で祈願する',exact:true}).click();
 await page.getByRole('button',{name:'保証を使って祈願する',exact:true}).click();
 await expect(page.locator('.gacha-reveal--ssr.is-revealed')).toBeVisible();
 await expect(page.getByRole('dialog')).toContainText('全ガチャ共通の初回SSR保証を使用しました');
 const used=await saveState(page);expect(used.drawCount).toBe(2);expect(['selene','athena']).toContain(used.lastGachaResult!.characterId);expect(used.ssrPity).toBe(0);
 await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:legacy,exact:true}).click();
 await expect(page.getByText('初回SSR保証は使用済みです。以降は共通90回天井です。',{exact:true})).toBeVisible();
 await page.reload();await enterGame(page);
 await expect(page.getByText('初回SSR保証は使用済みです。以降は共通90回天井です。',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'石5個で祈願する',exact:true}).click();
 await expect(page.locator('.gacha-reveal')).toBeVisible();await expect(page.getByRole('button',{name:'保証を使って祈願する',exact:true})).toHaveCount(0);
 expect((await saveState(page)).drawCount).toBe(3);
});
