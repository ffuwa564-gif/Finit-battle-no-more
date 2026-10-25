import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('rare visitors display original art, keep their encounter after reload, and show recruitment portraits', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await enterGame(page);
  for (const [stageId, id, name] of [['silent-cathedral', 'lucielle', 'リュシエル'], ['hollow-gate', 'nemuria', 'ネムリア']]) {
    await page.evaluate(async ({ stageId, id }) => {
      const { content } = await import('/src/content/index.ts');
      const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
      const { loadSave, persistSave } = await import('/src/platform/save.ts');
      const save = (await loadSave())!; const revision = save.revision;
      for (let seed = 0; seed < 1000; seed++) {
        let battle = createBattle(content, save.partyIds, save.leaderId, stageId, 0, seed, `rare-e2e-${id}`);
        battle.events = []; battle.cursor = 0; battle.nextPhase = 'wave';
        battle = advanceReplay(battle, content);
        if (!battle.units.some(unit => unit.characterId === id)) continue;
        save.battle = battle; save.settings.reducedMotion = true; save.revision++;
        await persistSave(save, revision); return;
      }
      throw new Error('No seeded rare encounter found');
    }, { stageId: stageId!, id: id! });
    await page.reload(); await enterGame(page);
    const heading = page.locator('.enemy-carousel-name');
    await expect(heading).toContainText(name!);
    await expect(heading.getByLabel('希少な敵', { exact: true })).toHaveText('RARE');
    await expect(page.locator('.enemy-carousel img').first()).toHaveJSProperty('complete', true);
    await expect(page.locator('.enemy-carousel img').first()).not.toHaveJSProperty('naturalWidth', 0);
    await page.screenshot({ path: testInfo.outputPath(`${id}-battle.png`) });
    const before = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.battle!);
    await page.reload(); await enterGame(page); await expect(heading).toContainText(name!);
    const after = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.battle!);
    expect(after.seed).toBe(before.seed);
    expect(after.units.map(unit => unit.characterId)).toEqual(before.units.map(unit => unit.characterId));
  }
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!; const revision = save.revision;
    save.battle = null;
    save.discoveredIds = [...new Set([...save.discoveredIds, 'lucielle', 'nemuria'])];
    save.revision++; await persistSave(save, revision);
  });
  await page.goto('/#recruit'); await page.reload(); await enterGame(page);
  for (const name of ['リュシエル', 'ネムリア']) {
    const card = page.locator('.character-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await card.scrollIntoViewIfNeeded();
    const portrait = card.locator('img.portrait-art');
    await expect(portrait).toBeVisible(); await expect(portrait).toHaveJSProperty('complete', true);
    await expect(portrait).not.toHaveJSProperty('naturalWidth', 0);
    await expect(card.locator('video')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${name}-recruit.png`) });
  }

});
