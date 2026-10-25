import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

for (const [strategy, label, skill, reason] of [['aggressive', '攻撃重視', 'shatter-13', '突破優先'], ['survival', '生存重視', 'guard-13', '生存優先']] as const) {
  test(`tactical trial makes ${strategy} change the real action without extra controls`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#dungeons/trials'); await enterGame(page);
    await expect(page.getByRole('heading', { name: '月盾の稽古', exact: true })).toBeVisible();
    await page.evaluate(async () => {
      const { content } = await import('/src/content/index.ts'); const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
      const { loadSave, persistSave } = await import('/src/platform/save.ts');
      const save = (await loadSave())!; const revision = save.revision;
      const ids = ['iwanagahime', 'seris-awakened', 'selene', 'rainbow-iris'];
      let battle = createBattle(content, ids, 'seris-awakened', 'moonshield-rehearsal', 1, 42, 'tactical-e2e');
      while (battle.phase === 'playing') battle = advanceReplay(battle, content);
      for (const unit of battle.units) unit.cooldowns = Object.fromEntries(content.characters.find(char => char.id === unit.characterId)!.skillIds.map(id => [id, 999]));
      battle.units.find(unit => unit.characterId === 'iwanagahime')!.cooldowns = {};
      const hurt = battle.units.find(unit => unit.characterId === 'seris-awakened')!; hurt.hp = Math.floor(hurt.maxHp * .7);
      const boss = battle.units.find(unit => unit.boss)!; boss.barrier = 500; boss.barrierUntil = 4;
      battle.initialUnits = structuredClone(battle.units);
      save.ownedIds = [...new Set([...save.ownedIds, ...ids])]; save.partyIds = ids; save.leaderId = 'seris-awakened';
      save.battle = battle; save.settings.reducedMotion = true; save.revision++; await persistSave(save, revision);
    });
    await page.reload(); await enterGame(page);
    await expect(page.getByRole('status', { name: 'ボスの大技予告', exact: true })).toContainText('大技まで2ターン');
    await expect(page.getByRole('group', { name: '作戦を選ぶ', exact: true }).getByRole('button')).toHaveCount(3);
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
    await expect(page.locator('.battle-directive')).toHaveText(reason);
    await page.screenshot({ path: testInfo.outputPath(`${strategy}.png`) });
    const action = await page.evaluate(async () => {
      const { loadSave } = await import('/src/platform/save.ts');
      return (await loadSave())!.battle!.events.find(event => event.actorId === 'party:iwanagahime' && event.skillId)!;
    });
    expect(action.skillId).toBe(skill); expect(action.directive).toBe(strategy);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
