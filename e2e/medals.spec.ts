import {test,expect} from '@playwright/test';
import {enterGame} from './boot';
test.use({viewport:{width:390,height:844}});
test('medals form a tree, reveal conditions, track a goal and link to the real workshop',async({page})=>{
 await page.goto('/#codex/medals');await enterGame(page);
 await expect(page.getByRole('region',{name:'勲章ツリー',exact:true})).toBeVisible();
 await expect(page.locator('.medals__links path')).not.toHaveCount(0);
 await page.locator('.medal-node').filter({hasText:'最初の作業台'}).click();
 const detail=page.getByRole('dialog',{name:'最初の作業台',exact:true});await expect(detail).toContainText('作業台を1台設置する。');
 await detail.getByRole('button',{name:'この勲章を目指す',exact:true}).click();await expect(detail.getByRole('button',{name:'目標を外す',exact:true})).toBeVisible();
 await detail.getByRole('button',{name:'工房を開く',exact:true}).click();await expect(page.locator('.industry-workshop')).toBeVisible();
 await page.goto('/#codex/medals');await enterGame(page);await expect(page.locator('.medals__next')).toContainText('最初の作業台');
 await page.getByRole('group',{name:'勲章の系統',exact:true}).getByRole('button',{name:'仲間',exact:true}).click();
 await expect(page.locator('.medals__tree')).not.toContainText('最初の作業台');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
 await page.getByRole('group',{name:'図鑑の種類',exact:true}).getByRole('button',{name:'少女たち',exact:true}).click();await expect(page.locator('.character-grid')).toBeVisible();
});
test('real workshop installation awards a persistent medal and cosmetic title without duplicate awards',async({page},info)=>{
 await page.goto('/#codex/medals');await enterGame(page);
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');const {applyCommand}=await import('/src/application/game.ts');const {emptyIndustry}=await import('/src/domain/industry.ts');
  const s=(await loadSave())!,r=s.revision;s.industry=emptyIndustry(0);s.industry.stock.bench=1;const next=applyCommand(s,{type:'industryInstall',itemId:'bench'},content,{now:0});await persistSave(next,r);
 });
 await page.reload();await enterGame(page);
 await expect(page.locator('.medal-node.is-earned')).toContainText('最初の作業台');
 await page.locator('.medal-node.is-earned').filter({hasText:'最初の作業台'}).click();const detail=page.getByRole('dialog',{name:'最初の作業台',exact:true});
 await detail.getByRole('button',{name:'称号にする',exact:true}).click();await expect(detail.getByRole('button',{name:'称号を外す',exact:true})).toBeVisible();
 await detail.getByRole('button',{name:'閉じる',exact:true}).click();await page.reload();await enterGame(page);
 await expect(page.locator('.medals__heading')).toContainText('最初の作業台');await page.screenshot({path:info.outputPath('medals-mobile.png')});
 await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#codex/medals');
 await expect(page.getByRole('region',{name:'Medal Tree',exact:true})).toBeVisible();expect(await page.locator('.medals').innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
});

test('claiming a real expedition awards medals and announces them once',async({page})=>{
 await page.goto('/#home');await enterGame(page);
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');const {applyCommand}=await import('/src/application/game.ts');
  let s=(await loadSave())!;const r=s.revision;s=applyCommand(s,{type:'depart',dungeonId:'silent-cathedral',potions:0},content);
  for(let i=0;i<500&&s.battle&&!['reward','failed'].includes(s.battle.phase);i++)s=applyCommand(s,{type:s.battle.phase==='playing'?'replay':'round'},content);
  if(s.battle?.phase!=='reward')throw Error('The real expedition did not win');s.revision=r+1;await persistSave(s,r);
 });
 await page.reload();await enterGame(page);await page.getByRole('button',{name:'獲得を確定',exact:true}).click();
 await expect(page.locator('.toast')).toContainText('勲章を獲得：');
 await page.goto('/#codex/medals');await enterGame(page);await page.getByRole('group',{name:'勲章の系統',exact:true}).getByRole('button',{name:'探索',exact:true}).click();
 await expect(page.locator('.medal-node.is-earned')).toContainText('初めての踏破');
 const earned=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.medals!.earned);
 expect(new Set(earned).size).toBe(earned.length);
});
