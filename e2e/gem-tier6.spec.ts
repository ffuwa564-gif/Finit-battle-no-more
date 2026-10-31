import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { enterGame } from './boot';

test.use({viewport:{width:390,height:844},locale:'ja-JP',isMobile:true,hasTouch:true});
const saved = (page: Page) => page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
async function openSection(page: Page,id: string) {
  const section = page.locator(`[data-inventory-section="${id}"]`);
  if (!await section.evaluate(element => (element as HTMLDetailsElement).open)) await section.locator(':scope > summary').click();
}

/** A defeated-wave fixture exercises real drop generation and replay securing;
 * combat effectiveness is tested separately rather than claimed by this setup. */
test('secures an eligible Tier 6 chest and preserves its tier through equipment, tuning and backup',async ({page}) => {
  await page.goto('/'); await enterGame(page);
  const found = await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    const { loadSave,persistSave } = await import('/src/platform/save.ts');
    const { dungeonGemFamily,emptyGemInventory,gemPowerTier,rollGemDrop } = await import('/src/domain/memory-gems.ts');
    let save = (await loadSave())!, revision = save.revision;
    save.memoryGems = emptyGemInventory();
    save.memoryGems.items = [
      {id:'tier6-old-230',defId:'night-dew',variant:'pure',roll:{power:87,trait:'mercy',value:50}},
      {id:'tier6-old-5',defId:'night-dew',variant:'pure',roll:{power:179,trait:'mercy',value:179}},
    ];
    save.memoryGems.seen = ['night-dew']; save.memoryGems.dust.grave = 1000;
    save.completedDungeonIds = content.dungeons.filter(dungeon => !dungeon.towerFloor).map(dungeon => dungeon.id);
    save.settings.reducedMotion = true;
    const dungeon = content.dungeons.filter(dungeon => dungeon.chapterId && dungeonGemFamily(dungeon) === 'grave' && (dungeon.gemLoot?.tier6Chance ?? 0)>0)
      .sort((a,b) => b.gemLoot!.tier6Chance!-a.gemLoot!.tier6Chance!)[0];
    if (!dungeon) throw new Error('No ordinary Tier 6 grave destination');
    let chestSeed: number | undefined;
    for (let index=0;index<50000;index++) {
      const candidateSeed = Math.imul(index+1,0x9e3779b1)>>>0;
      const candidate = rollGemDrop(dungeon,candidateSeed,'preview',{boss:true}).gem;
      if (candidate?.defId==='night-dew' && gemPowerTier(candidate)===6) {chestSeed=candidateSeed;break;}
    }
    if (chestSeed===undefined) throw new Error('No seeded Tier 6 chest found');
    save = applyCommand(save,{type:'depart',dungeonId:dungeon.id,potions:0},content);
    while (save.battle!.phase==='playing') save=applyCommand(save,{type:'replay'},content);
    const battle = save.battle!;
    battle.wave=dungeon.waves.length-1; battle.seed=chestSeed;
    for (const unit of battle.units) if (unit.side==='enemy') unit.hp=0;
    battle.initialUnits=structuredClone(battle.units);
    battle.phase='playing'; battle.nextPhase='reward'; battle.cursor=0;
    battle.events=[{id:'tier6-defeated-final-wave',kind:'dialogue',text:'The final wave is defeated.',unitsAfter:structuredClone(battle.units)}];
    save=applyCommand(save,{type:'replay'},content);
    const stone=save.battle!.gemFinds!.at(-1)!;
    if (gemPowerTier(stone)!==6) throw new Error('Secured stone differs from preview');
    save.revision=revision+1; await persistSave(save,revision);
    return {id:stone.id,roll:stone.roll!,pilot:save.partyIds[0],dungeonId:dungeon.id,profile:dungeon.gemLoot!};
  });
  await page.goto('/#dungeons'); await page.reload(); await enterGame(page);
  await expect(page.locator('.memory-gem-summary .memory-gem-tier[data-tier="6"]')).toBeVisible();
  await page.locator('[data-guide="claim"]').click();
  await expect.poll(async () => (await saved(page)).battle).toBeNull();
  await page.goto('/#bag'); await page.reload(); await enterGame(page);
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await expect(page.locator('[data-inventory-section="memory-stones"]')).not.toHaveAttribute('open');
  await openSection(page,'memory-stones');
  await page.getByRole('combobox',{name:'記憶石の並び順'}).selectOption('tier');
  expect(await page.getByTestId('memory-gem-card').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-gem-tier')))).toEqual(['6','5','3']);
  await page.locator(`[data-gem-id="${found.id}"]`).click();
  const detail=page.getByRole('article',{name:'記憶石の詳細'});
  await expect(detail.locator('[data-gem-stat="power"]')).toHaveAttribute('data-tier','6');
  await mkdir('artifacts/gem-tier6',{recursive:true});
  await detail.scrollIntoViewIfNeeded(); await page.screenshot({path:'artifacts/gem-tier6/tier6-detail-mobile-390-ja.png'});
  await detail.getByRole('button',{name:'この仲間に託す',exact:true}).click();
  await expect.poll(async () => (await saved(page)).memoryGems!.equipped[found.pilot]).toBe(found.id);
  await openSection(page,'memory-sources');
  const source=page.locator(`[data-gem-source="${found.dungeonId}"]`);
  await expect(source).toContainText('T1–T6');
  await expect(source).toContainText(`T6 ${Number((found.profile.tier6Chance!*100).toFixed(3))}%`);
  const firstTowerFloor=await page.evaluate(async () => { const {content}=await import('/src/content/index.ts'); return Math.min(...content.dungeons.filter(dungeon => dungeon.published && dungeon.towerFloor!==undefined && (dungeon.gemLoot?.tier6Chance??0)>0).map(dungeon => dungeon.towerFloor!)); });
  await expect(page.getByTestId('tier6-tower-source')).toContainText(`白亜の塔のT6は第${firstTowerFloor}層から狙えます。`);
  await openSection(page,'memory-refinement');
  await page.locator('.memory-gems__refinement-modes > div').first().getByRole('button').click();
  const offer=page.getByTestId('gem-refinement-offer'); await expect(offer).toBeVisible();
  const proposed=(await saved(page)).memoryGems!, paid=proposed.dust.grave;
  expect(proposed.pending!.candidate.roll!.power).toBeGreaterThanOrEqual(220);
  expect(proposed.pending!.candidate.roll!.power).toBeLessThanOrEqual(239);
  expect(proposed.pending!.candidate.roll!.trait).toBe(found.roll.trait);
  expect(proposed.pending!.candidate.roll!.value).toBe(found.roll.value);
  await offer.scrollIntoViewIfNeeded(); await page.screenshot({path:'artifacts/gem-tier6/tier6-offer-mobile-390-ja.png'});
  await page.reload(); await enterGame(page);
  await page.getByRole('button',{name:/記憶石の管理/}).click(); await expect(offer).toBeVisible();
  expect((await saved(page)).memoryGems!.pending).toEqual(proposed.pending);
  expect((await saved(page)).memoryGems!.dust.grave).toBe(paid);
  await offer.getByRole('button',{name:'新しい性能を採用',exact:true}).click();
  await expect(offer).toHaveCount(0);
  const accepted=(await saved(page)).memoryGems!;
  expect(accepted.items.find(item => item.id===found.id)!.roll).toEqual(proposed.pending!.candidate.roll);
  expect(accepted.equipped[found.pilot]).toBe(found.id); expect(accepted.dust.grave).toBe(paid);
  expect(await page.evaluate(async () => {
    const { content }=await import('/src/content/index.ts');
    const { loadSave }=await import('/src/platform/save.ts');
    const { encodeBackup,decodeBackup }=await import('/src/platform/save-backup.ts');
    const save=(await loadSave())!;
    return JSON.stringify(decodeBackup(encodeBackup(save,content),content).save.memoryGems)===JSON.stringify(save.memoryGems);
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('keeps Tier 6 sleep useful and prevents effectless power tuning at320px in English',async ({page}) => {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave,persistSave }=await import('/src/platform/save.ts');
    const { emptyGemInventory }=await import('/src/domain/memory-gems.ts');
    const save=(await loadSave())!,revision=save.revision;
    save.memoryGems=emptyGemInventory();
    save.memoryGems.items=[{id:'tier6-dream-ui',defId:'dream-lace',variant:'pure',roll:{power:220,trait:'bulwark',value:170}}];
    save.memoryGems.dust.grave=1000; save.memoryGems.seen=['dream-lace']; save.settings.reducedMotion=true;
    save.revision++; await persistSave(save,revision);
  });
  await page.goto('/#bag'); await page.reload(); await enterGame(page);
  await page.getByRole('button',{name:/記憶石の管理/}).click(); await openSection(page,'memory-stones');
  await page.locator('[data-gem-id="tier6-dream-ui"]').click();
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  const detail=page.getByRole('article',{name:'Memory Gem details'});
  await expect(detail).toContainText('Gain 45 extra Ultimate charge whether sleep succeeds or fails.');
  await expect(detail).toContainText('Reuse interval: 4 rounds.');
  expect(await detail.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await detail.scrollIntoViewIfNeeded(); await mkdir('artifacts/gem-tier6',{recursive:true});
  await detail.screenshot({path:'artifacts/gem-tier6/tier6-dream-mobile-320-en.png'});
  await openSection(page,'memory-refinement');
  const modes=page.locator('.memory-gems__refinement-modes > div');
  await expect(modes.first().getByRole('button')).toBeDisabled();
  await expect(modes.nth(1).getByRole('button')).toBeEnabled();
  await modes.nth(1).getByRole('button').click();
  await expect(page.getByTestId('gem-refinement-offer')).toBeVisible();
  expect((await saved(page)).memoryGems!.pending!.candidate.roll!.power).toBe(220);
  expect(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
