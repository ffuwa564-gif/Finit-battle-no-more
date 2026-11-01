import { expect, test, type Page } from '@playwright/test';
import { skipStory } from './boot';

test.use({ baseURL:process.env.V110_BASE_URL ?? 'http://127.0.0.1:4194' });
const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
async function enter(page: Page) {
  await page.waitForFunction(() => Boolean(document.querySelector('.title-screen__start,.app-shell,[role=alert]')));
  const fatal=page.locator('.app-loading [role=alert]');
  if(await fatal.count()) throw new Error('Boot rejected content/save: '+await fatal.innerText());
  if (await page.locator('.title-screen').count()) await page.locator('.title-screen__start').click();
  await skipStory(page);
}
async function saveNow(page: Page) {
  return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
}
async function label(page: Page, value: string) {
  return page.evaluate(async value => (await import('/src/locales/i18n.ts')).tr(value), value);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
}
async function installLegacyRecord(page: Page) {
  return page.evaluate(async () => {
    const {loadSave,bootMetadata,SAVE_DATABASE,SAVE_STORE}=await import('/src/platform/save.ts');
    const old=(await loadSave())!;
    old.appVersion='0.1.0';old.contentVersion='initial-r1';old.rulesVersion='1';delete old.towerRecord;
    old.completedDungeonIds=['silent-cathedral',...Array.from({length:59},(_,i)=>`ivory-tower-${String(i+1).padStart(3,'0')}`)];
    old.gold=173;old.stones=11;old.seed=0x12345678;old.settings.reducedMotion=true;old.battle=null;
    old.memoryGems!.items=[{id:'old-browser-locked',defId:'echo-shard',variant:'pure',locked:true,roll:{power:80,trait:'none',value:0}}];
    old.memoryGems!.seen=['echo-shard'];old.memoryGems!.equipped={[old.partyIds[0]]:'old-browser-locked'};
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open(SAVE_DATABASE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction(SAVE_STORE,'readwrite');tx.objectStore(SAVE_STORE).put(old,'save');tx.objectStore(SAVE_STORE).put(bootMetadata(old),'boot');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
    return old;
  });
}

for (const language of ['ja','en'] as const) for(const width of [320,390]) {
  test(`${language} ${width}px: old ascent and locked loot survive migration while the new tower starts honestly`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:844});
    await page.addInitScript(locale=>{localStorage.setItem('stillveil-language',locale);localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));},language);
    await page.goto('/');await enter(page);
    const old=await installLegacyRecord(page);
    await page.goto('/#dungeons/tower');await page.reload();await enter(page);
    const migrated=await saveNow(page);
    expect(migrated.appVersion).toMatch(/^1\.10(?:\.0)?$/);
    expect(migrated.towerRecord).toEqual({version:'1.10',completedFloors:[],legacyHighest:59});
    for(const key of ['ownedIds','partyIds','gold','stones','seed','memoryGems'] as const) expect(migrated[key],key).toEqual(old[key]);
    const retained=await page.evaluate(async()=>{const {SAVE_DATABASE,SAVE_STORE}=await import('/src/platform/save.ts');const db=await new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open(SAVE_DATABASE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});return new Promise<unknown>((resolve,reject)=>{const tx=db.transaction(SAVE_STORE,'readonly');const q=tx.objectStore(SAVE_STORE).get('migration-v1.0');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>reject(tx.error);});});
    expect(retained).toEqual(old);
    const board=page.locator('.ivory-tower');await expect(board).toBeVisible();await expect(board).toContainText('59');
    await expect(board.locator('progress')).toHaveAttribute('value','0');
    const band=board.locator('[data-inventory-section="tower-1-10"]');
    if(!await band.evaluate(e=>(e as HTMLDetailsElement).open))await band.locator(':scope > summary').click();
    await expect(board.getByTestId('tower-floor-1')).toBeEnabled();await expect(board.getByTestId('tower-floor-2')).toBeDisabled();
    if(language==='en')expect(await board.innerText()).not.toMatch(japanese);
    await noOverflow(page);await page.screenshot({path:testInfo.outputPath(`tower-legacy-${language}-${width}.png`),fullPage:true});
    const before=await saveNow(page);await board.getByTestId('tower-floor-1').click();
    expect((await saveNow(page)).battle).toBeNull();
    await board.locator('.ivory-tower__frontier').getByRole('button',{name:await label(page,'次の階層に挑む'),exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();expect((await saveNow(page)).battle).toBeNull();expect((await saveNow(page)).seed).toBe(before.seed);
    await noOverflow(page);
    if(language==='en')expect(await page.getByRole('dialog').innerText()).not.toMatch(japanese);
    await page.screenshot({path:testInfo.outputPath(`tower-prepare-${language}-${width}.png`)});
  });
}

for(const language of ['ja','en']as const){
  test(`${language}: all four recruited scouts expose readable portraits and skill details after reload`,async({page},testInfo)=>{
    await page.setViewportSize({width:390,height:844});await page.addInitScript(locale=>{localStorage.setItem('stillveil-language',locale);localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));},language);
    await page.goto('/');await enter(page);
    await page.evaluate(async()=>{const{loadSave,persistSave}=await import('/src/platform/save.ts');const s=(await loadSave())!,rev=s.revision;s.ownedIds=[...new Set([...s.ownedIds,'ione','neri','fio','ruka'])];s.discoveredIds=[...new Set([...s.discoveredIds,'ione','neri','fio','ruka'])];s.partyIds=['ione','neri','fio','ruka'];s.leaderId='ione';s.settings.reducedMotion=true;s.revision++;await persistSave(s,rev);});
    await page.goto('/#party');await page.reload();await enter(page);
    for(const id of ['ione','neri','fio','ruka']){
      await page.locator(`.party-formation [data-member-id="${id}"]`).click();
      await page.locator('.party-formation__selection button').click();
      const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
      const picture=dialog.locator('.detail-art img');
      await expect.poll(()=>picture.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThanOrEqual(768);
      if(language==='en')expect(await dialog.innerText()).not.toMatch(japanese);
      await noOverflow(page);await page.screenshot({path:testInfo.outputPath(`scout-${id}-${language}.png`)});
      await dialog.getByRole('button',{name:await label(page,'閉じる'),exact:true}).click();
    }
    expect((await saveNow(page)).partyIds).toEqual(['ione','neri','fio','ruka']);
    const buttons=page.locator('.party-member-actions button');
    for(const button of await buttons.all()){const box=await button.boundingBox();if(box)expect(box.height).toBeGreaterThanOrEqual(44);}
    await noOverflow(page);
  });
}

test('en 320px: home journey opens the first campaign preparation without spending resources',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:844});
  await page.addInitScript(()=>{localStorage.setItem('stillveil-language','en');localStorage.setItem('stillveil-fairy-tutorial-v1',JSON.stringify({version:2,enrolled:false,dismissed:true,seen:[]}));});
  await page.goto('/');await enter(page);
  const target=await page.evaluate(async()=>{const{content}=await import('/src/content/index.ts');const{loadSave}=await import('/src/platform/save.ts');const{homeJourneyTarget}=await import('/src/domain/home-journey.ts');return homeJourneyTarget(content,(await loadSave())!)!;});
  expect(target.kind).toBe('campaign');expect(target.firstClearStones).toBe(3);
  const goal=page.getByTestId('home-journey-goal');await expect(goal).toBeVisible();await expect(goal).toHaveAttribute('data-dungeon-id',target.dungeon.id);
  expect(await goal.innerText()).not.toMatch(japanese);
  const before=await saveNow(page);await goal.getByRole('button').click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  const name=await label(page,target.dungeon.name);await expect(dialog).toContainText(name);
  expect(page.url()).toContain(`dungeons/prepare/${target.dungeon.id}`);
  const after=await saveNow(page);for(const key of ['gold','stones','seed','battle']as const)expect(after[key]).toEqual(before[key]);
  expect(await dialog.innerText()).not.toMatch(japanese);await noOverflow(page);
  await dialog.evaluate(async element=>{await Promise.all(element.parentElement!.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
  await page.screenshot({path:testInfo.outputPath('home-journey-en-320.png')});
});
