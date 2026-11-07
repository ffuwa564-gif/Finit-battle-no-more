import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
const saved=(p:Page)=>p.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!);
async function fixture(page:Page){
 await page.goto('/');await enterGame(page);
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
  const {createBattleHarvest}=await import('/src/domain/battle-harvest.ts');const {roughMemoryGem}=await import('/src/domain/gem-polishing.ts');
  const {loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,revision=s.revision;
  let b=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',5,42,'harvest-browser');while(b.phase==='playing')b=advanceReplay(b,content);
  b.harvest=createBattleHarvest(b.id);const h=b.harvest;h.beat=2;h.serial=4;
  h.choice={id:`${b.id}:choice:2`,options:['touch','linger','abundance'],expires:20};h.nextChoice=26;
  h.offers=[{id:`${b.id}:harvest:1`,kind:'material',slot:0,hits:0,required:3,expires:16,itemId:'ore',amount:3},
   {id:`${b.id}:harvest:2`,kind:'heal',slot:1,hits:0,required:2,expires:16},
   {id:`${b.id}:harvest:3`,kind:'gem',slot:2,hits:0,required:6,expires:22,gem:roughMemoryGem({id:`${b.id}:harvest:3`,defId:'pale-ward',variant:'pure'},42)},
   {id:`${b.id}:harvest:4`,kind:'strike',slot:3,hits:0,required:2,expires:16}];
  s.battle=b;s.settings.reducedMotion=false;s.settings.speed=2;s.revision++;await persistSave(s,revision);
 });await page.reload();await enterGame(page);
}
test('static pickups and three choices stay reachable, preserve progress, and grant rewards once',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);
 await expect(page.locator('.harvest-drop')).toHaveCount(4);await expect(page.locator('.harvest-choice')).toHaveCount(3);
 for(const {width,height} of [{width:320,height:568},{width:390,height:660},{width:390,height:844},{width:768,height:844}]){
  await page.setViewportSize({width,height});
  for(const el of await page.locator('.harvest-choice').all()){
   const r=(await el.boundingBox())!;expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width);expect(r.y+r.height).toBeLessThanOrEqual(height);
   expect(await el.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(hit===el||el.contains(hit));})).toBe(true);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 }
 await page.setViewportSize({width:390,height:844});
 expect(await page.locator('.harvest-drop').first().evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('0px');
 expect(await page.locator('.harvest-drop__art').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('harvest-drift');
 await page.screenshot({path:info.outputPath('harvest-before.png')});
 await page.locator('[data-harvest-upgrade="touch"]').click();await expect(page.locator('.harvest-choice')).toHaveCount(0);await expect(page.locator('[data-harvest-socket="0"]')).toHaveAttribute('data-upgrade','touch');await expect(page.locator('.harvest-gem-flight')).toHaveCount(1);await page.screenshot({path:info.outputPath('gem-in-flight.png')});await expect(page.locator('.harvest-gem-flight')).toHaveCount(0);
 const ore=page.locator('.harvest-drop--material');await ore.click();await expect.poll(async()=>(await saved(page)).battle!.harvest!.offers.find(o=>o.kind==='material')?.hits).toBe(2);
 await page.reload();await enterGame(page);expect((await saved(page)).battle!.harvest!.upgrades.touch).toBe(1);
 await ore.click();await expect(ore).toHaveCount(0);expect((await saved(page)).battle!.harvest!.materials.ore).toBe(3);
 expect((await saved(page)).industry?.stock.ore??0).toBe(0);await page.screenshot({path:info.outputPath('harvest-after.png')});
});
test('auto advances rounds, accepts pickup taps during replay, and pauses under a dialog',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);
 await page.getByRole('button',{name:'カードをたたむ',exact:true}).click();
 await page.getByRole('button',{name:'オート進行を開始',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).battle!.round).toBeGreaterThan(1);
 await expect.poll(async()=>(await saved(page)).battle!.phase).toBe('playing');
 const ore=page.locator('.harvest-drop--material');await ore.click({clickCount:3,delay:70});
 await expect.poll(async()=>(await saved(page)).battle!.harvest!.materials.ore??0).toBe(3);
 await page.getByRole('button',{name:'記憶石を開く',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.waitForTimeout(250);const cursor=(await saved(page)).battle!.cursor;await page.waitForTimeout(1100);expect((await saved(page)).battle!.cursor).toBe(cursor);
 await page.getByRole('dialog').getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'オート進行を停止',exact:true}).click();
 await expect.poll(async()=>(await saved(page)).battle!.phase,{timeout:45000}).toBe('ready');
 const round=(await saved(page)).battle!.round;await page.waitForTimeout(2000);expect((await saved(page)).battle!.round).toBe(round);
});

test('full sockets require an explicit replacement and reduced motion skips the flying gem',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});await fixture(page);
 await page.evaluate(async()=>{
  const {loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,revision=s.revision,h=s.battle!.harvest!;
  h.sockets=['touch','linger','abundance'];h.upgrades={touch:1,linger:1,abundance:1,mercy:0,focus:0};h.choice!.options=['mercy','focus','touch'];
  s.settings.reducedMotion=true;s.revision++;await persistSave(s,revision);
 });await page.reload();await enterGame(page);
 await page.locator('[data-harvest-upgrade="mercy"]').click();await expect(page.locator('.harvest-sockets')).toHaveAttribute('data-awaiting','true');
 expect((await saved(page)).battle!.harvest!.sockets).toEqual(['touch','linger','abundance']);
 const socket=(await page.locator('.harvest-sockets').boundingBox())!;for(const card of await page.locator('.harvest-card').all()){const r=(await card.boundingBox())!;expect(r.y+r.height).toBeLessThan(socket.y);}
 await page.screenshot({path:info.outputPath('replace-320.png')});
 await page.locator('[data-harvest-socket="1"]').click();await expect(page.locator('[data-harvest-socket="1"]')).toHaveAttribute('data-upgrade','mercy');
 await expect(page.locator('.harvest-gem-flight')).toHaveCount(0);
 const h=(await saved(page)).battle!.harvest!;expect(h.sockets).toEqual(['touch','mercy','abundance']);expect(h.upgrades.linger).toBe(0);
 expect(await page.locator('.harvest-drop__art').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});
test('a real ultimate hides pickups so its cinematic cannot trigger invisible collection',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);
 await page.evaluate(async()=>{
  const {loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,revision=s.revision;
  s.battle!.units.find(u=>u.characterId==='seris')!.ultimateCharge=100;s.revision++;await persistSave(s,revision);
 });await page.reload();await enterGame(page);
 await page.getByRole('button',{name:'カードをたたむ',exact:true}).click();
 await page.getByRole('button',{name:'セリス：必殺技を予約',exact:true}).click();
 await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
 await expect(page.locator('.ultimate-cinematic')).toBeVisible({timeout:30000});
 await expect(page.locator('.battle-harvest')).toBeHidden();
 expect((await saved(page)).battle!.harvest!.collected).toBe(0);
});
