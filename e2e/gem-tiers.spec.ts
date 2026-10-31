import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { enterGame } from './boot';

test.use({viewport:{width:390,height:844},locale:'ja-JP',isMobile:true,hasTouch:true});
const saved = (page: Page) => page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
async function openSection(page: Page, id: string) {
  const section = page.locator(`[data-inventory-section="${id}"]`);
  if (!await section.evaluate(element => (element as HTMLDetailsElement).open)) await section.locator(':scope > summary').click();
}

/** Supply a defeated final wave; the real replay command secures its seeded chest.
 * Combat effectiveness is covered separately, not simulated by this UI fixture.
 */
async function securedChest(page: Page, claimInFixture = false) {
  await page.goto('/'); await enterGame(page);
  const result = await page.evaluate(async claimInFixture => {
    const { content } = await import('/src/content/index.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const { loadSave,persistSave } = await import('/src/platform/save.ts');
    const { dungeonGemFamily,emptyGemInventory,gemPowerTier,gemTraitTier,rollGemDrop } = await import('/src/domain/memory-gems.ts');
    let save = (await loadSave())!, revision = save.revision;
    save.memoryGems = emptyGemInventory();
    save.memoryGems.items = [
      {id:'tier-old-230',defId:'night-dew',variant:'pure',roll:{power:87,trait:'mercy',value:50}},
      {id:'tier-old-230-copy',defId:'night-dew',variant:'pure',roll:{power:87,trait:'mercy',value:50}},
      {id:'tier-old-250',defId:'night-dew',variant:'pure',roll:{power:100,trait:'mercy',value:50}},
    ];
    save.memoryGems.seen = ['night-dew']; save.memoryGems.dust.grave = 1000;
    save.completedDungeonIds = content.dungeons.filter(dungeon => !dungeon.towerFloor).map(dungeon => dungeon.id);
    save.settings.reducedMotion = true;
    const dungeon = content.dungeons.filter(dungeon => dungeon.chapterId && dungeonGemFamily(dungeon) === 'grave' && (dungeon.gemLoot?.tier5Chance ?? 0) > 0)
      .sort((a,b) => b.gemLoot!.tier5Chance-a.gemLoot!.tier5Chance)[0]!;
    if (!dungeon) throw new Error('No ordinary route offers high-tier grave stones');
    let chestSeed: number | undefined;
    for (let index = 0; index < 24000; index++) {
      const candidateSeed = Math.imul(index+1,0x9e3779b1) >>> 0;
      const candidate = rollGemDrop(dungeon,candidateSeed,'preview',{boss:true}).gem;
      if (candidate?.defId === 'night-dew' && gemPowerTier(candidate) === 4 && gemTraitTier(candidate) === 5) { chestSeed = candidateSeed; break; }
    }
    if (chestSeed === undefined) throw new Error('No seeded upper-tier chest found');
    save = applyCommand(save,{type:'depart',dungeonId:dungeon.id,potions:0},content);
    while (save.battle!.phase === 'playing') save = applyCommand(save,{type:'replay'},content);
    const battle = save.battle!;
    battle.wave = dungeon.waves.length-1; battle.seed = chestSeed;
    for (const unit of battle.units) if (unit.side === 'enemy') unit.hp = 0;
    battle.initialUnits = structuredClone(battle.units);
    battle.phase = 'playing'; battle.nextPhase = 'reward'; battle.cursor = 0;
    battle.events = [{id:'tier-fixture-final-wave',kind:'dialogue',text:'The final wave is defeated.',unitsAfter:structuredClone(battle.units)}];
    save = applyCommand(save,{type:'replay'},content);
    const stone = save.battle!.gemFinds!.at(-1)!;
    if (gemPowerTier(stone) !== 4 || gemTraitTier(stone) !== 5) throw new Error('Secured chest differs from its seeded preview');
    if (claimInFixture) save = applyCommand(save,{type:'claim'},content);
    save.revision = revision+1; await persistSave(save,revision);
    return {id:stone.id,roll:stone.roll!,pilot:save.partyIds[0],dungeonId:dungeon.id,profile:dungeon.gemLoot!};
  },claimInFixture);
  await page.goto(claimInFixture ? '/#bag' : '/#dungeons'); await page.reload(); await enterGame(page);
  return result;
}

test('secures a real high-tier chest, equips it, and finishes its acquired tier through a restored paid offer',async ({page}) => {
  const stone = await securedChest(page);
  await expect(page.locator('.memory-gem-summary .memory-gem-tier[data-tier="5"]')).toBeVisible();
  expect((await saved(page)).memoryGems!.items.find(item => item.id === stone.id)!.roll).toEqual(stone.roll);
  await page.locator('[data-guide="claim"]').click();
  await expect.poll(async () => (await saved(page)).battle).toBeNull();
  await page.goto('/#bag'); await page.reload(); await enterGame(page);
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  for (const id of ['memory-stones','memory-refinement','memory-crafting','memory-sources']) await expect(page.locator(`[data-inventory-section="${id}"]`)).not.toHaveAttribute('open');
  await openSection(page,'memory-stones');
  await expect(page.getByTestId('memory-gem-card')).toHaveCount(3);
  await expect(page.locator('.memory-gems__stack-count',{hasText:'×2'})).toHaveCount(1);
  await page.getByRole('combobox',{name:'記憶石の並び順'}).selectOption('tier');
  expect(await page.getByTestId('memory-gem-card').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-gem-tier')))).toEqual(['5','3','3']);
  await page.locator(`[data-gem-id="${stone.id}"]`).click();
  const detail = page.getByRole('article',{name:'記憶石の詳細'});
  await expect(detail.locator('[data-gem-stat="power"]')).toHaveAttribute('data-tier','4');
  await expect(detail.locator('[data-gem-stat="trait"]')).toHaveAttribute('data-tier','5');
  await mkdir('artifacts/gem-tiers',{recursive:true});
  await detail.scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/gem-tiers/tier5-detail-mobile-390-ja.png'});
  await page.getByRole('button',{name:'この仲間に託す',exact:true}).click();
  await expect.poll(async () => (await saved(page)).memoryGems!.equipped[stone.pilot]).toBe(stone.id);
  await openSection(page,'memory-refinement');
  await page.locator('.memory-gems__refinement-modes > div').filter({hasText:'技効力を調律'}).getByRole('button',{name:'調律する',exact:true}).click();
  const offer = page.getByTestId('gem-refinement-offer');
  await expect(offer).toBeVisible();
  const proposed = (await saved(page)).memoryGems!, paid = proposed.dust.grave;
  expect(proposed.pending!.candidate.roll!.power).toBeGreaterThanOrEqual(120);
  expect(proposed.pending!.candidate.roll!.power).toBeLessThanOrEqual(139);
  expect(proposed.pending!.candidate.roll!.trait).toBe(stone.roll.trait);
  expect(proposed.pending!.candidate.roll!.value).toBe(stone.roll.value);
  await offer.scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/gem-tiers/tier5-offer-mobile-390-ja.png'});
  await page.reload(); await enterGame(page);
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await expect(offer).toBeVisible();
  expect((await saved(page)).memoryGems!.pending).toEqual(proposed.pending);
  expect((await saved(page)).memoryGems!.dust.grave).toBe(paid);
  await offer.getByRole('button',{name:'新しい性能を採用',exact:true}).click();
  await expect(offer).toHaveCount(0);
  const accepted = (await saved(page)).memoryGems!;
  expect(accepted.items.find(item => item.id === stone.id)!.roll).toEqual(proposed.pending!.candidate.roll);
  expect(accepted.equipped[stone.pilot]).toBe(stone.id);
  expect(accepted.dust.grave).toBe(paid);
  await page.reload(); await enterGame(page);
  expect((await saved(page)).memoryGems).toEqual(accepted);
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await openSection(page,'memory-sources');
  const source = page.locator(`[data-gem-source="${stone.dungeonId}"]`);
  await expect(source).toContainText((stone.profile.tier6Chance ?? 0) > 0 ? 'T1–T6' : 'T1–T5');
  await expect(source).toContainText(`T4 ${Number((stone.profile.tier4Chance*100).toFixed(3))}%`);
  await expect(source).toContainText(`T5 ${Number((stone.profile.tier5Chance*100).toFixed(3))}%`);
  await expect(page.locator('[data-inventory-section="memory-sources"] .memory-gems__tier-rule')).toContainText('1周あたりの入手率ではありません');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('explains individual tiers and tuning in English without overflow at320px',async ({page}) => {
  const stone = await securedChest(page,true);
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await openSection(page,'memory-stones');
  await page.locator(`[data-gem-id="${stone.id}"]`).click();
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  const detail = page.getByRole('article',{name:'Memory Gem details'});
  await expect(detail).toBeVisible();
  expect(await detail.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await detail.scrollIntoViewIfNeeded();
  await mkdir('artifacts/gem-tiers',{recursive:true});
  await page.screenshot({path:'artifacts/gem-tiers/tier5-detail-mobile-320-en.png'});
  await openSection(page,'memory-refinement');
  await page.locator('.memory-gems__refinement-modes > div').first().getByRole('button').click();
  const offer = page.getByTestId('gem-refinement-offer');
  await expect(offer).toBeVisible();
  expect(await offer.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await expect(offer.getByRole('button',{name:'Keep new properties',exact:true})).toBeEnabled();
  await expect(offer.getByRole('button',{name:'Keep original properties',exact:true})).toBeEnabled();
  await offer.scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/gem-tiers/tier5-offer-mobile-320-en.png'});
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('shows the Dream Gem bonus and unchanged cooldown in English at320px',async ({page}) => {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave,persistSave } = await import('/src/platform/save.ts');
    const { emptyGemInventory } = await import('/src/domain/memory-gems.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.memoryGems = emptyGemInventory();
    save.memoryGems.items = [{id:'dream-tier5-ui',defId:'dream-lace',variant:'pure',roll:{power:160,trait:'bulwark',value:50}}];
    save.memoryGems.dust.grave = 100;
    save.memoryGems.seen = ['dream-lace']; save.settings.reducedMotion = true;
    save.revision++; await persistSave(save,revision);
  });
  await page.goto('/#bag'); await page.reload(); await enterGame(page);
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await openSection(page,'memory-stones');
  await page.locator('[data-gem-id="dream-tier5-ui"]').click();
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  const detail = page.getByRole('article',{name:'Memory Gem details'});
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('Gain 30 extra Ultimate charge whether sleep succeeds or fails.');
  await expect(detail).toContainText('Cooldown: 4 rounds');
  await expect(detail).toContainText('Reuse interval: 4 rounds.');
  expect(await detail.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  const equip = detail.getByRole('button',{name:'Equip on this companion',exact:true});
  await equip.scrollIntoViewIfNeeded();
  await expect(equip).toBeInViewport();
  await expect(equip).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await mkdir('artifacts/gem-tiers',{recursive:true});
  await detail.screenshot({path:'artifacts/gem-tiers/dream-tier5-mobile-320-en.png'});
  await openSection(page,'memory-refinement');
  const modes = page.locator('.memory-gems__refinement-modes > div');
  await expect(modes.first()).toContainText('This skill has the same effect throughout its Tier');
  await expect(modes.first().getByRole('button')).toBeDisabled();
  await expect(modes.nth(1).getByRole('button')).toBeEnabled();
  expect(await modes.first().innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await modes.nth(1).getByRole('button').click();
  await expect(page.getByTestId('gem-refinement-offer')).toBeVisible();
  expect((await saved(page)).memoryGems!.pending!.candidate.roll!.power).toBe(160);
});
