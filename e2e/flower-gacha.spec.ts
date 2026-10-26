import { test,expect } from '@playwright/test';
import { enterGame } from './boot';
const title='神々の装い ― 和の花宴 ―';
const legacy='ゴス☆イザナミコレクション';
async function saveState(page:import('@playwright/test').Page){return page.evaluate(async()=> (await(await import('/src/platform/save.ts')).loadSave())!);}

test('flower collection has six original kimono goddesses, readable skills and English support',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#gacha');await enterGame(page);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await expect(page.locator('.gacha-exclusive-pool > .character-card')).toHaveCount(8);
 for(const name of ['アメノウズメ','イワナガヒメ','ククリヒメ'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
 await expect(page.locator('.goddess-rates')).toHaveText('R 80%SR 17%SSR 3%');
 await page.getByRole('button',{name:legacy,exact:true}).click();
 await expect(page.locator('.gacha-exclusive-pool > .character-card')).toHaveCount(10);
 await expect(page.getByRole('button',{name:'アメノウズメ',exact:true})).toBeVisible();
 await page.getByRole('button',{name:title,exact:true}).click();
 for(const [name,skill] of [['セレネ','三日月の袖守り'],['アテナ','軍神の号令'],['フローラ','花風の浄め'],['イリス','晴れ渡る空'],['エオス','朝霞の袖守り'],['ニケ','追い風の一閃']]){
  const button=page.getByRole('button',{name:name==='セレネ'||name==='アテナ'?`SSR ${name}の詳細`:name,exact:true});
  await button.click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText(skill);
  await expect(dialog).toContainText('花宴への客人');
  const art={ 'セレネ':'motion-posters/gacha-selene-motion.png','アテナ':'motion-posters/gacha-athena-motion.png','フローラ':'gacha-flora-anime.webp','イリス':'gacha-rainbow-iris-anime.webp','エオス':'gacha-eos-anime.webp','ニケ':'gacha-nike-anime.webp' }[name];
  await expect(dialog.locator('.character-artwork img')).toHaveAttribute('src',new RegExp(art!));
  const animated=name==='セレネ'||name==='アテナ';
  await expect.poll(()=>dialog.locator('.character-artwork img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(animated?720:1024);
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

test('both exclusive R goddesses can be summoned, saved and placed in the party',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#gacha');await enterGame(page);
 await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!;const rev=save.revision;save.stones=15;save.seed=42;save.drawCount=10;save.settings.reducedMotion=true;save.revision++;await persistSave(save,rev);});
 await page.reload();await enterGame(page);
 for(const [id,name] of [['eos','エオス'],['nike','ニケ']] as const){
  // Find a real draw for the current pool instead of pinning seeds from an older roster.
  await page.evaluate(async id=>{
   const {loadSave,persistSave}=await import('/src/platform/save.ts');
   const {content}=await import('/src/content/index.ts');
   const {applyCommand}=await import('/src/application/game.ts');
   const save=(await loadSave())!,rev=save.revision;
   let selected=0;
   for(let seed=1;seed<=10000;seed++)if(applyCommand({...save,seed},{type:'draw',collectionId:'wa-flower-banquet'},content).lastGachaResult?.characterId===id){selected=seed;break;}
   if(!selected)throw new Error(`No fixture seed found for ${id}`);
   save.seed=selected;save.revision++;await persistSave(save,rev);
  },id);
  await page.reload();await enterGame(page);
  await page.getByRole('button',{name:'石5個で祈願する',exact:true}).click();
  const result=page.getByRole('dialog');await expect(result.getByRole('heading',{level:2})).toHaveText(name);
  await expect(result.locator('.gacha-reveal__rarity')).toHaveText('R');await expect(result.locator('video')).toHaveCount(0);
  await result.getByRole('button',{name:'女神を迎える',exact:true}).click();
 }
 await page.goto('/#party');
 for(const name of ['ノエル','セリス'])await page.locator('.character-card').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('button',{name:'編成中',exact:true}).click();
 for(const name of ['エオス','ニケ']){
  const card=page.locator('.character-card').filter({has:page.getByRole('heading',{name,exact:true})});
  await card.getByRole('button',{name:'編成する',exact:true}).click();
  await expect(card.getByRole('button',{name:'編成中',exact:true})).toBeVisible();
 }
 await page.reload();await enterGame(page);const save=await saveState(page);
 expect(save.partyIds).toEqual(expect.arrayContaining(['eos','nike']));expect(save.ownedIds).toEqual(expect.arrayContaining(['eos','nike']));expect(save.stones).toBe(5);expect(save.drawCount).toBe(12);
});
