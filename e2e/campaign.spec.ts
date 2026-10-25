import {test,expect} from '@playwright/test';
import {enterGame} from './boot';

test('new campaigns open in chapter one, lock later routes, and retain independent remembrance routes',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/#dungeons');await enterGame(page);
  const chapters=page.getByRole('group',{name:'通常ダンジョンの章',exact:true});
  await expect(chapters.getByRole('button',{name:'第1章 霧に沈む聖域',exact:true})).toBeEnabled();
  await expect(chapters.getByRole('button',{name:'第2章 ふたりぶんの空席',exact:true})).toBeDisabled();
  await expect(chapters.getByRole('button',{name:'第3章 白夜の約束',exact:true})).toBeDisabled();
  const cards=page.locator('.dungeon-card');await expect(cards).toHaveCount(12);
  await expect(cards.nth(0).getByRole('button',{name:'探索の準備',exact:true})).toBeEnabled();
  await expect(cards.nth(1).getByRole('button',{name:'探索の準備',exact:true})).toBeDisabled();
  await expect(cards.nth(11)).toHaveClass(/dungeon-card--finale/);
  await page.screenshot({path:testInfo.outputPath('chapter-one-mobile.png')});
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
  await page.getByRole('button',{name:'追憶・覚醒',exact:true}).click();await expect(page.locator('.dungeon-card')).toHaveCount(5);
});

test('confirming a chapter boss clear opens chapter two and returns to campaign instead of memories',async({page})=>{
  await page.goto('/#dungeons');await enterGame(page);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts');const {applyCommand}=await import('/src/application/game.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');let save=(await loadSave())!;const revision=save.revision;
    save.completedDungeonIds=content.chapters![0]!.dungeonIds.slice(0,-1);save=applyCommand(save,{type:'depart',dungeonId:'stone-fountain',potions:0},content);
    for(let n=0;n<200&&save.battle?.phase!=='reward';n++){
      if(save.battle!.phase==='ready')for(const unit of save.battle!.units.filter(u=>u.side==='party')){unit.attack=10000;unit.speed=100;}
      save=applyCommand(save, save.battle?.omens?.pending ? { type: 'chooseOmen', choiceId: save.battle.omens.pending[0]! } : { type: save.battle!.phase==='playing'?'replay':'round' }, content);
    }
    save.revision=revision+1;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);await expect(page.locator('.result-panel')).toContainText('初踏破 +3');
  await page.getByRole('button',{name:'獲得を確定',exact:true}).click();
  await expect(page.locator('.chapter-heading')).toContainText('ふたりぶんの空席');
  await expect(page.getByRole('button',{name:'第2章 ふたりぶんの空席',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.dungeon-card').first()).toContainText('白帳の回廊');expect(page.url()).not.toContain('/memories');
  await page.reload();await enterGame(page);await expect(page.locator('.chapter-heading')).toContainText('ふたりぶんの空席');
});

test('an old deep clear keeps all reached chapters accessible without inventing earlier rewards',async({page})=>{
  await page.goto('/#dungeons');await enterGame(page);
  await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!,rev=save.revision;save.completedDungeonIds=['last-observatory'];save.stones=42;save.revision++;await persistSave(save,rev);});
  await page.reload();await enterGame(page);await expect(page.locator('.chapter-heading')).toContainText('白夜の約束');
  await expect(page.getByRole('button',{name:'第1章 霧に沈む聖域',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'第1章 霧に沈む聖域',exact:true}).click();await expect(page.getByText('初踏破 石3個',{exact:true})).toHaveCount(12);
  const save=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);expect(save.completedDungeonIds).toEqual(['last-observatory']);expect(save.stones).toBe(42);
  await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#dungeons');
  await expect(page.getByRole('group',{name:'Campaign Chapters',exact:true})).toContainText('Chapter 3');await expect(page.locator('.chapter-boss')).toContainText('Tolling Bell Slash');
});

test('chapter bosses visibly announce their periodic heavy attack and persist its real damage',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await enterGame(page);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!,rev=save.revision;
    let b=createBattle(content,save.partyIds,save.leaderId,'stone-fountain',0,42,'boss-warning');while(b.phase==='playing')b=advanceReplay(b,content);
    while(b.wave<2){b.phase='playing';b.nextPhase='wave';b.events=[];b.cursor=0;while(b.phase==='playing')b=advanceReplay(b,content);}
    b.round=3;for(const u of b.units){u.hp=u.maxHp=10000;u.attack=u.side==='party'?1:100;u.speed=u.side==='party'?100:0;u.cooldowns=Object.fromEntries(content.characters.find(c=>c.id===u.characterId)!.skillIds.map(id=>[id,999]));}
    b.initialUnits=structuredClone(b.units);save.battle=b;save.settings.reducedMotion=true;save.revision++;await persistSave(save,rev);
  });
  await page.reload();await enterGame(page);await expect(page.getByRole('status',{name:'ボスの大技予告',exact:true})).toContainText('このターンに大技');
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();await expect(page.locator('.boss-strike-status.is-striking')).toBeVisible({timeout:20000});
  await expect(page.locator('.battle-toast')).toContainText('石燐の突進');await page.screenshot({path:testInfo.outputPath('chapter-boss-strike.png')});
  const b=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.battle!);
  const strike=b.events.find(e=>e.bossStrike)!;expect(strike.kind).toBe('attack');expect(strike.amount).toBeGreaterThan(200);
});

test('chapter two shows its romance before departure and its tragic ending only after victory, with a persistent reread',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/#dungeons');await enterGame(page);
  await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!,rev=save.revision;save.completedDungeonIds=['last-safety-key'];save.revision++;await persistSave(save,rev);});
  await page.reload();await enterGame(page);
  await expect(page.locator('.chapter-heading')).toContainText('ふたりぶんの空席');
  const card=page.locator('.dungeon-card').filter({has:page.getByRole('heading',{name:'虚ろの門',exact:true})});
  await expect(card.locator('details')).toHaveCount(0);
  await card.getByRole('button',{name:'探索の準備',exact:true}).click();
  await expect(page.getByRole('region',{name:'探索前の物語',exact:true})).toContainText('防衛機構');
  await expect(page.getByText('炉は止まった。',{exact:false})).toHaveCount(0);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts');const {applyCommand}=await import('/src/application/game.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');
    let save=(await loadSave())!;const revision=save.revision;save=applyCommand(save,{type:'depart',dungeonId:'hollow-gate',potions:0},content);
    for(let n=0;n<200&&save.battle?.phase!=='reward';n++){
      if(save.battle!.phase==='ready')for(const unit of save.battle!.units.filter(u=>u.side==='party')){unit.attack=10000;unit.speed=100;}
      save=applyCommand(save, save.battle?.omens?.pending ? { type: 'chooseOmen', choiceId: save.battle.omens.pending[0]! } : { type: save.battle!.phase==='playing'?'replay':'round' }, content);
    }
    if(save.battle?.phase!=='reward')throw Error('No victory');save.revision=revision+1;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);
  await expect(page.getByRole('region',{name:'探索後の物語',exact:true})).toContainText('どなたですか');
  await page.screenshot({path:testInfo.outputPath('chapter-two-ending.png'),fullPage:true});
  await page.getByRole('button',{name:'獲得を確定',exact:true}).click();
  await page.getByRole('button',{name:'第2章 ふたりぶんの空席',exact:true}).click();
  await card.getByText('踏破した物語を読み返す',{exact:true}).click();
  await expect(card.getByRole('region',{name:'探索後の物語',exact:true})).toContainText('個体は生まれず');
  await page.reload();await enterGame(page);await page.getByRole('button',{name:'第2章 ふたりぶんの空席',exact:true}).click();
  await card.getByText('踏破した物語を読み返す',{exact:true}).click();await expect(card.locator('details')).toHaveAttribute('open','');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#dungeons');
  await page.getByRole('button',{name:'Chapter 2: Two Empty Chairs',exact:true}).click();
  const englishCard=page.locator('.dungeon-card').filter({has:page.getByRole('heading',{name:'The Hollow Gate',exact:true})});
  await englishCard.getByText('Reread this completed story',{exact:true}).click();
  await expect(englishCard.getByRole('region',{name:'Story After Victory',exact:true})).toContainText('Who are you?');
  expect(await englishCard.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
});
