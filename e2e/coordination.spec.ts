import { test, expect, type Page } from '@playwright/test';
import { enterGame, skipStory } from './boot';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test.beforeEach(({ page }) => page.setDefaultTimeout(15000));
async function setup(page: Page, english = false) {
  if (english) await page.addInitScript(() => localStorage.setItem('stillveil-language', 'en'));
  await page.goto('/');
  if (english) { await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click(); await skipStory(page); }
  else await enterGame(page);
  await page.evaluate(async reduced => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.partyIds = ['liora', 'seris']; save.leaderId = 'liora';
    let battle = createBattle(content, save.partyIds, save.leaderId, 'oath-chain-rehearsal', 0, 42, 'coordination-browser');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    for (const unit of battle.units) {
      unit.hp = unit.maxHp = 10000;
      unit.attack = unit.side === 'enemy' ? 0 : 40;
      unit.defense = 0;
      unit.speed = unit.characterId === 'liora' ? 100 : unit.side === 'party' ? 80 : 0;
    }
    battle.initialUnits = structuredClone(battle.units); save.battle = battle; save.settings.reducedMotion = reduced; save.revision++;
    await persistSave(save, revision);
  }, english);
  await page.reload();
  if (english) await page.getByRole('button', { name: 'Tap to Begin', exact: true }).click();
  else await enterGame(page);
}
async function battle(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.battle!); }
async function display(page: Page, id: string) {
  for (let attempts = 0; attempts < 8; attempts++) {
    if (await page.locator('.enemy-page').getAttribute('data-enemy-id') === id) return;
    await page.getByRole('button', { name: /^(次の敵を表示|Next Enemy)$/ }).click();
  }
  throw new Error('Expected target never appeared');
}

test('gestures hide exact commands and targets until the player commits the round', async ({page},info)=>{
 await setup(page);
 const signal=page.locator('.companion-signal').first();await expect(signal).toBeVisible();
 await expect(signal).toHaveText('武器に手を添える');
 expect(await signal.innerText()).not.toMatch(/#|銀閃|通常攻撃/);
 await expect(page.locator('[data-choice-skill]')).toHaveCount(0);
 await expect(page.locator('[data-planned-targets],[data-coordination-reference],[data-coordination-partner]')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('gestures-before-input.png')});
 await page.getByRole('button',{name:/行動を選ぶ$/}).click();await page.locator('[data-command="attack"]').click();
 await expect(signal).toHaveText('武器に手を添える');
 await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
 await expect(page.locator('.companion-signal')).toHaveCount(0);
 const revealed=page.locator('.companion-choice__bubble[data-choice-state="selected"]').first();
 await expect(revealed).toBeVisible();await expect(revealed).toContainText('銀閃の貫突');await expect(revealed).toContainText('#');
 await page.screenshot({path:info.outputPath('commands-after-input.png')});
 const committed=await battle(page);expect(committed.events.some(e=>e.coordinationAction==='linked')).toBe(true);
 expect(committed.events.some(e=>e.coordinationAction==='isolated')).toBe(false);
});

test('a gesture opens combat tendencies and changing targets no longer triggers a fixed penalty',async({page})=>{
 await setup(page);await page.locator('.companion-signal').first().click();
 await expect(page.locator('.companion-tendency')).toContainText('弱った敵');
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'次の敵を表示',exact:true}).click();
 const target=await page.locator('.enemy-page').getAttribute('data-enemy-id');
 await page.getByRole('button',{name:/行動を選ぶ$/}).click();await page.locator('[data-command="attack"]').click();
 await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
 const after=await battle(page);expect(after.focusTargetId).toBe(target);
 expect(after.events.some(e=>e.coordinationAction==='isolated')).toBe(false);
 expect(after.units.find(u=>u.characterId==='liora')!.hp).toBeGreaterThan(9900);
});

test('English gestures and tendencies fit a narrow reduced-motion screen without exposing plans',async({page},info)=>{
 await page.setViewportSize({width:320,height:740});await setup(page,true);
 const signal=page.locator('.companion-signal').first();await expect(signal).toBeVisible();
 expect(await signal.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
 await signal.click();await expect(page.locator('.companion-tendency')).toContainText('weakened enemies');
 await page.keyboard.press('Escape');
 await page.locator('[data-pilot] .character-portrait').focus();
 await page.keyboard.press('Enter');await expect(page.locator('[data-coordination-reference]')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('gesture-palette-english-320.png')});
 await page.locator('[data-command="guard"]').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('boss heavy attacks are warned independently of the hidden companion choices',async({page})=>{
 await setup(page);
 await page.evaluate(async()=>{const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!,revision=save.revision;save.battle!.round=3;save.revision++;await persistSave(save,revision);});
 await page.reload();await enterGame(page);
 await expect(page.locator('.boss-strike-status')).toContainText('このターンに大技');
 await expect(page.locator('.boss-strike-status')).toContainText('先頭狙い');
 await expect(page.locator('.companion-signal')).toBeVisible();
 await expect(page.locator('[data-choice-skill]')).toHaveCount(0);
});
