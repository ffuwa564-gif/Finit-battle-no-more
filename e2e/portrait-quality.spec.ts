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
