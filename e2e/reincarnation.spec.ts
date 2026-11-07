import {test,expect} from '@playwright/test';
import {enterGame,skipStory} from './boot';
test.use({viewport:{width:390,height:844}});
test('story-only transfer, protected T7 crafting, reload and separate route on mobile',async({page},info)=>{
 await page.goto('/#home');await enterGame(page);
 await page.locator('.reincarnation-entry').click();
 await page.locator('[data-inventory-section="reincarnation-rewind"] summary').click();
 await expect(page.getByRole('button',{name:'転生の内容を確認',exact:true})).toBeDisabled();
 await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
 // Completed-ending fixture only sets up UI access; combat results are tested separately with the native engine.
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');
  const s=(await loadSave())!,r=s.revision;s.battle=null;s.novels={seen:[]};s.worldStory={version:1,profile:{name:'ユイ',voice:'soft',favorite:'tea'},carriedChapters:[],completed:content.worldStory!.nodes.map(n=>n.id),choices:{},position:{x:.47,y:.77}};
  s.completedDungeonIds=content.worldStory!.chapters.flatMap(c=>c.dungeonIds);s.gold=100000;s.materials['palimpsest:common']=20;s.materials['palimpsest:rare']=6;s.memoryGems!.seen=['pale-ward'];s.memoryGems!.dust.sanctuary=1000;s.revision++;await persistSave(s,r);
 });
 await page.reload();await enterGame(page);await page.locator('.reincarnation-entry').click();
 await page.locator('[data-inventory-section="reincarnation-rewind"] summary').click();
 await page.getByRole('button',{name:'転生の内容を確認',exact:true}).click();await page.getByRole('button',{name:'引き継いで転生する',exact:true}).click();
 await expect(page.locator('.visual-novel')).toBeVisible();await skipStory(page);
 await page.locator('.reincarnation-entry').click();const stages=page.locator('.reincarnation-stage');await expect(stages).toHaveCount(6);await expect(stages.nth(0).getByRole('button',{name:'挑戦する',exact:true})).toBeEnabled();await expect(stages.nth(1).getByRole('button',{name:'挑戦する',exact:true})).toBeDisabled();
 await page.locator('[data-inventory-section="reincarnation-forge"] summary').click();const forge=page.locator('.reincarnation-forge');await forge.locator('select').nth(0).selectOption('7');await forge.locator('select').nth(3).selectOption('bulwark');
 await page.getByRole('button',{name:'T7を製作',exact:true}).click();
 const saved=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
 expect(saved.reincarnation?.count).toBe(1);expect(saved.gold).toBe(90000);expect(saved.worldStory?.completed).toEqual([]);expect(saved.memoryGems!.items.at(-1)!.roll!.power).toBeGreaterThanOrEqual(280);expect(saved.memoryGems!.items.at(-1)!.locked).toBe(true);
 for(const width of [320,390]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await page.screenshot({path:info.outputPath(`transfer-forge-${width}.png`)});}
 await page.reload();await enterGame(page);await page.locator('.reincarnation-entry').click();await expect(page.locator('.reincarnation-hub')).toContainText('転生回数：1');
 await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();await page.evaluate(()=>localStorage.setItem('stillveil-language','en'));await page.reload();await page.locator('.title-screen__start').click();
 await page.locator('.reincarnation-entry').click();const hub=page.locator('.reincarnation-hub');await expect(hub).toBeVisible();expect(await hub.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);await page.screenshot({path:info.outputPath('transfer-en.png')});
 await page.locator('.reincarnation-stage').first().getByRole('button').first().click();await expect(page.getByRole('button',{name:'Begin Expedition',exact:true})).toBeEnabled();
});
