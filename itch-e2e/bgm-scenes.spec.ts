import { test, expect, type Page } from '@playwright/test';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { encodeBackup } from '../src/platform/save-backup';
import type { GameSave } from '../src/domain/types';

// Produce real end-of-wave and end-of-boss saves without changing combat stats.
function transitions(dungeonId = content.dungeons[0].id) {
  let save = createInitialSave(content, 42);
  const party = ['elaine-awakened', 'liora-awakened', 'seris-awakened', 'lisette-awakened'];
  save.ownedIds = [...new Set([...save.ownedIds, ...party])];
  save.completedDungeonIds = content.dungeons.map(d => d.id);
  save.partyIds = party; save.leaderId = party[1];
  save.settings = { ...save.settings, speed: 2, bgmVolume: 0.5 };
  save = applyCommand(save, { type: 'depart', dungeonId, potions: 0 }, content);
  let beforeBoss: GameSave | undefined;
  for (let i = 0; i < 1000; i++) {
    const battle = save.battle!;
    if (battle.phase === 'playing') {
      if (battle.cursor === battle.events.length - 1) {
        if (battle.nextPhase === 'wave') beforeBoss = structuredClone(save);
        if (battle.nextPhase === 'reward' && beforeBoss) return { beforeBoss, beforeClear: save };
      }
      save = applyCommand(save, { type: 'replay' }, content);
    } else if (battle.phase === 'ready') save = applyCommand(save, { type: 'round' }, content);
    else throw new Error(`Unexpected phase: ${battle.phase}`);
  }
  throw new Error('Could not prepare BGM transitions');
}
async function restore(page: Page, save: GameSave) {
  await page.goto('/nested/game/index.html#settings');
  const begin = page.getByRole('button', { name: 'Tap to Begin', exact: true });
  await begin.click();
  await page.getByLabel('Backup file', { exact: true }).setInputFiles({ name: 'bgm-demo.json', mimeType: 'application/json', buffer: Buffer.from(encodeBackup(save, content)) });
  await page.getByRole('button', { name: 'Restore This Save', exact: true }).click();
  await begin.click();
}

for (const scenario of [{ dungeon: content.dungeons[0].id, scene: 'boss' }, { dungeon: 'kuzuha-beginner', scene: 'japaneseBoss' }]) {
  test(`BGM follows ${scenario.scene} and rewards within the same battle on mobile`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
    const page = await context.newPage();
    const { beforeBoss, beforeClear } = transitions(scenario.dungeon);
    await restore(page, beforeBoss);
    const audio = page.locator('audio[data-bgm]');
    await expect(audio).toHaveAttribute('data-scene', 'battle');
    await expect(audio).toHaveAttribute('data-scene', scenario.scene, { timeout: 12000 });
    await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => !el.paused && el.currentTime > 0)).toBe(true);
    await context.close();
    const clearContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
    const clearPage = await clearContext.newPage();
    await restore(clearPage, beforeClear);
    const clearAudio = clearPage.locator('audio[data-bgm]');
    await expect(clearAudio).toHaveAttribute('data-scene', scenario.scene);
    await expect(clearAudio).toHaveAttribute('data-scene', 'clear', { timeout: 12000 });
    await expect.poll(() => clearAudio.evaluate((el: HTMLAudioElement) => !el.paused && el.currentTime > 0)).toBe(true);
    await clearContext.close();
  });

}
