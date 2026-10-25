import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('both sides deal accelerated damage and the mobile HUD follows the replayed turn in both languages', async ({page},testInfo) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/');await enterGame(page);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const save=(await loadSave())!,rev=save.revision;save.leaderId='elaine';let b=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,42,'accelerated-ui');while(b.phase==='playing')b=advanceReplay(b,content);
    b.round=5;for(const u of b.units){u.hp=u.maxHp=10000;u.attack=100;u.defense=0;u.cooldowns=Object.fromEntries(content.characters.find(c=>c.id===u.characterId)!.skillIds.map(id=>[id,1000]));}
    b.initialUnits=structuredClone(b.units);save.battle=b;save.settings.reducedMotion=true;save.revision++;await persistSave(save,rev);
  });
  await page.reload();await enterGame(page);const hud=page.getByRole('status',{name:'戦闘加速',exact:true});
  await expect(hud).toContainText('敵味方の攻撃 +20%');await expect(hud).toContainText('Wave切替でリセット');
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  await expect(page.getByRole('button',{name:'次の演出へ',exact:true})).toBeVisible();await expect(hud).toContainText('+20%');
  await expect(page.getByRole('button',{name:'ラウンドを進める',exact:true})).toBeVisible({timeout:30000});await expect(hud).toContainText('+25%');
  const attacks=await page.evaluate(async()=>((await(await import('/src/platform/save.ts')).loadSave())!.battle!.events.filter(e=>e.kind==='attack')));
  expect(attacks.filter(e=>e.actorId!.startsWith('party:')).every(e=>e.amount===120)).toBe(true);expect(attacks.filter(e=>e.actorId!.startsWith('enemy:')).every(e=>e.amount===120)).toBe(true);
  for(const width of [320,390]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
  await page.screenshot({path:testInfo.outputPath('battle-acceleration-mobile.png')});
  await page.evaluate(async()=>(await import('/src/locales/i18n.ts')).setLanguage('en'));
  await expect(page.getByRole('status',{name:'Battle Acceleration',exact:true})).toContainText('both sides ATK +25%');
});

test('a new wave resets acceleration instead of carrying the last wave attack bonus',async({page})=>{
  await page.goto('/');await enterGame(page);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const save=(await loadSave())!,rev=save.revision;save.leaderId='elaine';let b=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,42,'acceleration-reset');while(b.phase==='playing')b=advanceReplay(b,content);
    b.round=10;for(const u of b.units){if(u.side==='party'){u.hp=u.maxHp=10000;u.attack=10000;u.speed=100;}else u.hp=1;}
    b.initialUnits=structuredClone(b.units);save.battle=b;save.settings.reducedMotion=true;save.revision++;await persistSave(save,rev);
  });
  await page.reload();await enterGame(page);await expect(page.getByRole('status',{name:'戦闘加速',exact:true})).toContainText('+45%');
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();await expect(page.getByRole('status',{name:'戦闘加速',exact:true})).toContainText('+0%',{timeout:30000});
  const b=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.battle!);expect(b.wave).toBe(1);expect(b.round).toBe(1);
});
