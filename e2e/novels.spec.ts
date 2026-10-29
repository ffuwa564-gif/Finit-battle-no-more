import { test, expect, type Page } from '@playwright/test';
import { skipStory } from './boot';
async function begin(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.title-screen')).toHaveCount(0);
}
async function saved(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!); }

test('new game opens the full-screen OP, saves its place and never restarts it after completion', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  const story = page.locator('.visual-novel');
  await expect(story).toHaveAttribute('data-scene', 'opening-desire-gate');
  await expect(story).toContainText('死にたがりの世界');
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
  await expect(page.locator('.fairy-invitation')).toHaveCount(0);
  const box = await story.boundingBox(); expect(box!.width).toBe(390); expect(box!.height).toBe(844);
  await page.screenshot({ path: info.outputPath('opening-gate-390.png') });
  await story.getByRole('button', { name: '次の台詞', exact: true }).click();
  await expect(story).toHaveAttribute('data-page', '1');
  await page.reload(); await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(story).toHaveAttribute('data-page', '1');
  await story.getByRole('button', { name: '会話ログ', exact: true }).click();
  await expect(page.locator('.novel-log')).toContainText('死にたがりの世界');
  await page.getByRole('button', { name: '物語に戻る', exact: true }).click();
  const before = await saved(page);
  for (let index = 1; index < 9; index++) await story.getByRole('button', { name: '次の台詞', exact: true }).click();
  await expect(story).toContainText('あら、やっとお目覚め？');
  await expect.poll(() => story.locator('.novel-backgrounds img.is-current').evaluate(image => getComputedStyle(image).opacity)).toBe('1');
  await expect.poll(() => story.locator('.novel-text').evaluate(text => getComputedStyle(text).opacity)).toBe('1');
  await page.screenshot({ path: info.outputPath('opening-garden-390.png') });
  expect((await saved(page)).gold).toBe(before.gold);
  await story.getByRole('button', { name: '前の台詞', exact: true }).click();
  await expect(story).toHaveAttribute('data-page', '8');
  await skipStory(page);
  await expect(page.locator('.fairy-invitation')).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.title-screen')).toHaveCount(0);
  await expect(story).toHaveCount(0);
  await page.goto('/#settings');
  await page.getByRole('button', { name: /序章 ― 欲望の扉、その向こう/ }).click();
  await expect(story).toHaveAttribute('data-page', '0');
});

test('first chapter clear commits rewards before the epilogue, with no duplicate rewards on replay', async ({ page }) => {
  await begin(page); await skipStory(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts'); const { content } = await import('/src/content/index.ts'); const { createBattle } = await import('/src/domain/engine.ts');
    const save = (await loadSave())!, revision = save.revision;
    const stageId = content.chapters![0]!.dungeonIds.at(-1)!;
    save.completedDungeonIds = content.chapters![0]!.dungeonIds.slice(0, -1);
    const battle = createBattle(content, save.partyIds, save.leaderId, stageId, 0, 42, 'story-chapter-clear');
    battle.wave = content.dungeons.find(stage => stage.id === stageId)!.waves.length - 1;
    battle.phase = 'reward'; battle.nextPhase = 'reward'; battle.cursor = battle.events.length;
    battle.pendingMaterials = { 'stone:common': 2 }; save.battle = battle;
    save.revision++; await persistSave(save, revision);
  });
  await page.reload(); await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await page.getByRole('button', { name: '獲得を確定', exact: true }).click();
  await expect(page.locator('.visual-novel')).toHaveAttribute('data-scene', 'chapter-1-epilogue');
  const claimed = await saved(page); expect(claimed.battle).toBeNull(); expect(claimed.materials['stone:common']).toBe(2);
  await skipStory(page);
  const after = await saved(page); expect(after.gold).toBe(claimed.gold); expect(after.stones).toBe(claimed.stones);
  await page.goto('/#settings');
  await page.getByRole('button', { name: /第1章 ― 霧に沈む聖域/ }).click();
  await skipStory(page);
  expect((await saved(page)).gold).toBe(after.gold); expect((await saved(page)).materials).toEqual(after.materials);
});

test('old profiles receive no forced OP and English reduced-motion reading fits narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await begin(page); await skipStory(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts'); const save = (await loadSave())!, revision = save.revision;
    delete save.novels; save.settings.reducedMotion = true; save.revision++; await persistSave(save, revision);
    localStorage.setItem('stillveil-language', 'en');
  });
  await page.reload(); await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  await expect(page.locator('.title-screen')).toHaveCount(0);
  await expect(page.locator('.visual-novel')).toHaveCount(0);
  await page.goto('/#settings');
  await page.getByRole('button', { name: /Prologue — Beyond the Gate of Desire/ }).click();
  const story = page.locator('.visual-novel');
  await expect(story).toHaveClass(/visual-novel--reduced/);
  await expect(story).toContainText('In a world longing for death');
  expect(await story.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await story.focus(); await page.keyboard.press('Enter');
  await expect(story).toHaveAttribute('data-page', '1');
  await page.keyboard.press('Escape');
  await expect(page.locator('.novel-confirm')).toBeVisible();
  await page.getByRole('button', { name: 'Keep Reading', exact: true }).click();
  await expect(story).toBeVisible();
});

for (const language of ['ja','en'] as const) {
  test(`rebuilt opening and all garden returns can be read to the end in ${language} without changing rewards`, async ({page},info) => {
    await page.setViewportSize({width:language==='en'?320:390,height:740});
    await begin(page);await skipStory(page);
    const scenes=await page.evaluate(async language=>{
      const {content}=await import('/src/content/index.ts');
      const {loadSave,persistSave}=await import('/src/platform/save.ts');
      const save=(await loadSave())!,revision=save.revision;
      save.completedDungeonIds=content.chapters!.flatMap(chapter=>chapter.dungeonIds);
      save.settings.reducedMotion=true;save.revision++;
      await persistSave(save,revision);localStorage.setItem('stillveil-language',language);
      return content.novels!.map(scene=>({id:scene.id,pages:scene.pages.length}));
    },language);
    await page.reload();
    await page.getByRole('button',{name:language==='en'?'Tap to Begin':'タップしてはじめる',exact:true}).click();
    await page.goto('/#settings');
    const before=await saved(page);
    for(const [index,scene] of scenes.entries()) {
      await page.locator('.novel-library__list button').nth(index).click();
      const story=page.locator('.visual-novel');
      await expect(story).toHaveAttribute('data-scene',scene.id);
      for(let position=0;position<scene.pages;position++){
        await expect(story).toHaveAttribute('data-page',String(position));
        if(language==='en')expect(await story.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
        if(position+1<scene.pages)await story.getByRole('button',{name:language==='en'?'Next Line':'次の台詞',exact:true}).click();
      }
      if(scene.id==='chapter-3-epilogue'){
        await expect(story).toContainText(language==='en'?'Even so, I knocked.':'それでも、私は扉を叩いた。');
        await page.screenshot({path:info.outputPath(`chosen-door-${language}.png`)});
      }
      await story.getByRole('button',{name:language==='en'?'Close Story':'物語を閉じる',exact:true}).click();
      await expect(story).toHaveCount(0);
    }
    const after=await saved(page);
    expect(after.gold).toBe(before.gold);expect(after.stones).toBe(before.stones);
    expect(after.materials).toEqual(before.materials);expect(after.completedDungeonIds).toEqual(before.completedDungeonIds);
    expect(after.novels!.seen).toEqual(expect.arrayContaining(scenes.map(scene=>scene.id)));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  });
}
