import { test, expect } from '@playwright/test';
import { enterGame } from './boot';
test('personal research skill is opt-in, saved, and available in a real battle palette',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#party');await enterGame(page);
 await page.evaluate(async()=>{
  const {loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,r=s.revision;
  s.ownedIds.push('ruka');s.partyIds=['ruka','seris','elaine','liora'];s.leaderId='ruka';s.revision++;await persistSave(s,r);
 });await page.reload();await enterGame(page);
 const card=page.locator('.character-card').filter({has:page.getByRole('heading',{name:'ルカ',exact:true})});
 await card.getByRole('button',{name:'研究技能に切替',exact:true}).click();await expect(card).toContainText('留め縫い');
 await page.reload();await enterGame(page);await expect(card.getByRole('button',{name:'通常技能に戻す'})).toBeVisible();
 await page.goto('/#dungeons/list');await enterGame(page);await page.getByRole('button',{name:'探索の準備',exact:true}).first().click();await page.getByRole('button',{name:'探索を始める',exact:true}).click();
 await page.getByRole('button',{name:'ルカ：行動を選ぶ',exact:true}).click();await expect(page.locator('.command-dial').getByRole('button',{name:'留め縫い',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
