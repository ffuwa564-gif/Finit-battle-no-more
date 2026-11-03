import {test,expect} from '@playwright/test';
import {content} from '../src/content';
import {createInitialSave} from '../src/application/game';
import {createBattle,advanceReplay} from '../src/domain/engine';
import {characterSkills} from '../src/domain/character-skills';
import {markBarrierReturn} from '../src/domain/barrier-return';
import {bootMetadata,SAVE_DATABASE,SAVE_STORE} from '../src/platform/save';
import {skipStory} from '../e2e/boot';

test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ja-JP'});
test('research override and charged flower stay readable without shifting battle controls',async({page},info)=>{
  expect(content.contentVersion).toBe('sakuya-research-v2');
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const game=page.frameLocator('iframe');
  const begin=async()=>{await game.getByRole('button',{name:'タップしてはじめる',exact:true}).click();await skipStory(game);};
  await begin();
  const save=createInitialSave(content,42);
  save.ownedIds=[...new Set([...save.ownedIds,'mireille','seris','elaine','noelle'])];
  save.partyIds=['mireille','seris','elaine','noelle'];save.leaderId='mireille';
  save.completedDungeonIds=['last-safety-key'];save.settings.reducedMotion=true;save.settings.bgmVolume=0;save.settings.seVolume=0;save.revision=100;
  const put=async(hash:string)=>{await game.locator('.app-shell').evaluate(async(_,fixture)=>{
    await new Promise<void>((resolve,reject)=>{const request=indexedDB.open(fixture.database);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(fixture.store,'readwrite'),store=tx.objectStore(fixture.store);store.put(fixture.save,'save');store.put(fixture.boot,'boot');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});location.hash=fixture.hash;
  },{save,boot:bootMetadata(save),database:SAVE_DATABASE,store:SAVE_STORE,hash});await page.reload();await begin();await game.locator('.app-shell').evaluate((_,next)=>{location.hash=next;},hash);};
  await put('codex');
  const card=game.locator('.character-card').filter({has:game.getByRole('heading',{name:'コノハナサクヤヒメ',exact:true})}).first();
  await card.getByRole('button',{name:'物語を読む',exact:true}).click();
  const detail=game.getByRole('dialog');await expect(detail).toContainText('桜の返礼');await expect(detail).toContainText('90%');
  await detail.getByRole('button',{name:'閉じる',exact:true}).click();
  let b=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,42,'research-ui-only');while(b.phase==='playing')b=advanceReplay(b,content);
  const source=b.units.find(u=>u.characterId==='mireille')!,target=b.units.find(u=>u.characterId==='seris')!;
  markBarrierReturn(source,target,characterSkills(content.characters.find(c=>c.id==='mireille')!,content).find(s=>s.id==='barrier-18')!,b.round);
  b.initialUnits=structuredClone(b.units);save.battle=b;save.revision++;
  await put('dungeons');await expect(game.locator('.battle-layout')).toBeVisible();
  const before=await game.locator('.battle-control-pad').boundingBox();expect(before).not.toBeNull();
  await expect(game.getByRole('button',{name:/付与効果:.*桜の返礼/})).toHaveCount(0);
  // UI-only state fixture; not a win-rate measurement or a new encounter.
  target.barrierReturn!.power=35;b.initialUnits=structuredClone(b.units);save.revision++;
  await put('dungeons');const flower=game.getByRole('button',{name:/付与効果:.*桜の返礼 \+35%/});await expect(flower).toBeVisible();
  const after=await game.locator('.battle-control-pad').boundingBox();expect(Math.abs(after!.y-before!.y)).toBeLessThanOrEqual(1);expect(Math.abs(after!.height-before!.height)).toBeLessThanOrEqual(1);
  const unit=game.locator(`[data-unit="${target.uid}"]`),unitBox=await unit.boundingBox(),flowerBox=await flower.boundingBox();expect(flowerBox!.y).toBeGreaterThanOrEqual(unitBox!.y);expect(flowerBox!.y+flowerBox!.height).toBeLessThanOrEqual(unitBox!.y+unitBox!.height+1);
  await expect(game.locator('.battle-control-pad')).not.toContainText(/桜の返礼|花びら|スキルの説明/);
  await flower.click();const effects=game.getByRole('dialog',{name:'付与効果',exact:true});await expect(effects).toContainText('追撃は対象外');await effects.getByRole('button',{name:'閉じる',exact:true}).click();
  expect(await flower.evaluate(el=>['contextmenu','selectstart','dragstart'].map(type=>!el.dispatchEvent(new Event(type,{bubbles:true,cancelable:true}))))).toEqual([true,true,true]);
  expect(await game.locator('.app-shell').evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:info.outputPath('sakuya-flower-mobile.png')});
});
