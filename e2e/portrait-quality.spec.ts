import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});

test('retina battle faces retain high-resolution framing during video failure and reduced motion', async ({page},info) => {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave,persistSave } = await import('/src/platform/save.ts');
    const { content } = await import('/src/content/index.ts');
    const { createBattle,advanceReplay } = await import('/src/domain/engine.ts');
    const save=(await loadSave())!,revision=save.revision;
    save.ownedIds=[...new Set([...save.ownedIds,'nox','lunette-awakened'])];
    save.partyIds=['nox','lunette-awakened','seris','elaine'];save.leaderId='seris';
    let battle=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,42,'quality');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    save.battle=battle;save.revision++;await persistSave(save,revision);
  });
  await page.route('**/video/nox-portrait-hq.mp4',route=>route.abort());
  await page.reload(); await enterGame(page);
  const faces=page.locator('.party-strip .animated-illustration');
  await expect(faces).toHaveCount(2);
  const failed=faces.filter({has:page.locator('video[src$="nox-portrait-hq.mp4"]')});
  await expect(failed).toHaveAttribute('data-animation-state','error');
  await expect(failed.locator('video')).toHaveCSS('opacity','0');
  for(const image of await faces.locator('img').all()) {
    await expect.poll(()=>image.evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBe(640);
    await expect(image).toBeVisible();
  }
  const live=page.locator('.party-strip video[src$="lunette-awakened-portrait-loop-hq.mp4"]');
  await expect(live).toHaveJSProperty('videoWidth',640);
  await expect.poll(()=>live.evaluate((video:HTMLVideoElement)=>video.currentTime)).toBeGreaterThan(0);
  const frame=page.locator('.party-strip .portrait-image').first();
  const before=await frame.boundingBox();
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const face of await faces.all()) {
    await expect(face).toHaveAttribute('data-animation-state','static');
    await expect(face.locator('video')).not.toHaveAttribute('src');
    await expect.poll(()=>face.locator('img').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBe(640);
  }
  const after=await frame.boundingBox();
  expect(after!.width).toBeCloseTo(before!.width,1); expect(after!.height).toBeCloseTo(before!.height,1);
  await page.screenshot({path:info.outputPath('retina-static-faces.png')});
});

for (const width of [320,390,1024]) test(`scout heads stay inside real battle tiles at ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:844});
  await page.goto('/');await enterGame(page);
  await page.evaluate(async()=>{
    const{loadSave,persistSave}=await import('/src/platform/save.ts');
    const{content}=await import('/src/content/index.ts');
    const{createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const save=(await loadSave())!,revision=save.revision;
    const ids=['ione','neri','fio','ruka'];save.ownedIds=[...new Set([...save.ownedIds,...ids])];save.partyIds=ids;save.leaderId='ione';
    let battle=createBattle(content,ids,'ione','silent-cathedral',0,42,'face-framing');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    save.battle=battle;save.revision++;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);
  for(const id of ['ione','neri','fio','ruka']){
    const image=page.locator(`.party-strip img[src$="scout-${id}.webp"]`);
    await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1024);
    const projected=await image.evaluate(async(img:HTMLImageElement)=>{
      const{content}=await import('/src/content/index.ts');
      const asset=content.assets.find(a=>img.src.endsWith(a.path)&&a.kind==='portrait')!,head=asset.portraitHead!;
      const box=img.getBoundingClientRect(),frame=img.closest('.portrait-image')!.getBoundingClientRect(),style=getComputedStyle(img);
      const [ax,ay]=style.objectPosition.split(' ').map(v=>parseFloat(v)/100);
      const scale=Math.max(box.width/img.naturalWidth,box.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
      const left=box.left+(box.width-w)*ax!+head.x*w,top=box.top+(box.height-h)*ay!+head.y*h;
      return{fit:style.objectFit,left:left-frame.left,top:top-frame.top,right:frame.right-(left+head.width*w),bottom:frame.bottom-(top+head.height*h)};
    });
    expect(projected.fit).toBe('cover');
    for(const edge of ['left','top','right','bottom']as const)expect(projected[edge],`${id}/${edge}`).toBeGreaterThanOrEqual(-1);
  }
  await page.screenshot({path:info.outputPath(`scout-heads-${width}.png`)});
});

test('1.10 boot upgrades atomically without losing tower progress, a battle, or the original 1.0 backup',async({page})=>{
  await page.goto('/');await enterGame(page);
  const fixture=await page.evaluate(async()=>{
    const{loadSave,bootMetadata,SAVE_DATABASE,SAVE_STORE}=await import('/src/platform/save.ts');
    const{content}=await import('/src/content/index.ts');
    const{createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const old=(await loadSave())!;old.appVersion='1.10.0';old.towerRecord={version:'1.10',completedFloors:[1,2,3],legacyHighest:9};
    old.completedDungeonIds.push(...[1,2,3].map(n=>`ivory-tower-${String(n).padStart(3,'0')}`));old.gold=173;old.stones=11;
    let battle=createBattle({...content,appVersion:'1.10.0'},old.partyIds,old.leaderId,'silent-cathedral',0,42,'portrait-update');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    old.battle=battle;
    const original=structuredClone(old);original.appVersion='0.1.0';original.contentVersion='initial-r1';original.rulesVersion='1';delete original.towerRecord;original.battle=null;
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open(SAVE_DATABASE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction(SAVE_STORE,'readwrite'),store=tx.objectStore(SAVE_STORE);store.put(old,'save');store.put(bootMetadata(old),'boot');store.put(original,'migration-v1.0');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});
    return{old,original};
  });
  await page.reload();await enterGame(page);
  const records=await page.evaluate(async()=>{
    const{loadSave,SAVE_DATABASE,SAVE_STORE}=await import('/src/platform/save.ts');const save=await loadSave();
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open(SAVE_DATABASE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
    return new Promise<any>((resolve,reject)=>{const tx=db.transaction(SAVE_STORE,'readonly'),store=tx.objectStore(SAVE_STORE),old=store.get('migration-v1.10'),original=store.get('migration-v1.0');tx.oncomplete=()=>{db.close();resolve({save,old:old.result,original:original.result});};tx.onerror=()=>reject(tx.error);});
  });
  expect(records.save).toEqual({...fixture.old,appVersion:'1.11.0',revision:fixture.old.revision+1});
  expect(records.old).toEqual(fixture.old);expect(records.original).toEqual(fixture.original);
});
