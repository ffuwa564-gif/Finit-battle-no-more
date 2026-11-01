import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { enterGame } from './boot';

test.use({ viewport: { width:390, height:844 }, locale:'ja-JP', isMobile:true, hasTouch:true });

async function saved(page: Page) {
  return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
}
async function openPlanner(page: Page) {
  await page.goto('/#bag/builds');
  await page.reload();
  await enterGame(page);
  await expect(page.getByTestId('build-planner')).toBeVisible();
  return page.getByTestId('build-planner');
}
async function openSection(page: Page, id: string) {
  const section=page.locator(`[data-inventory-section="${id}"]`);
  if (!await section.evaluate(element => (element as HTMLDetailsElement).open)) await section.locator(':scope > summary').click();
  return section;
}
async function assertNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
}
async function snapshot(page: Page, file: string) {
  await mkdir('artifacts/build-planner/UI', {recursive:true});
  await page.screenshot({path:`artifacts/build-planner/UI/${file}`,fullPage:true});
}

/** Base stones deliberately miss the quality target, while each recipe slot gets its own physical item. */
async function installOwnedRecipe(page: Page) {
  await page.goto('/'); await enterGame(page);
  return page.evaluate(async () => {
    const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const {BUILD_DEFINITIONS,getBuildPlan}=await import('/src/domain/builds.ts');
    const {content}=await import('/src/content/index.ts');
    const {emptyGemInventory}=await import('/src/domain/memory-gems.ts');
    const save=(await loadSave())!,revision=save.revision;
    const build=BUILD_DEFINITIONS.find(build => build.id==='shield-cannon')!;
    const stage=build.stages.perfect;
    const ids=stage.slots.map(slot => slot.characterIds[0]);
    const other=content.characters.find(character => character.published && !ids.includes(character.id))!.id;
    save.ownedIds=[...new Set([...save.ownedIds,...ids,other])];
    save.memoryGems=emptyGemInventory();
    save.memoryGems.items=stage.slots.map((slot,index) => ({id:`build-browser-${index}`,defId:slot.gem.defId,variant:slot.gem.variant,locked:index===0,roll:{power:0,trait:'none' as const,value:0}}));
    save.memoryGems.seen=[...new Set(save.memoryGems.items.map(gem=>gem.defId))];
    save.memoryGems.equipped[other]=save.memoryGems.items[0].id;
    save.buildGoal={buildId:build.id,stage:'perfect'};
    save.settings.reducedMotion=true;save.revision++;
    await persistSave(save,revision);
    const plan=getBuildPlan(content,save,build.id,'perfect');
    return {buildId:build.id,partyIds:plan.partyIds,leaderId:plan.leaderId,gemIds:plan.slots.map(slot=>slot.gem!.id),readyCount:plan.readyCount,complete:plan.complete,canApply:plan.canApply,other};
  });
}

test('zero-stone inventory exposes build goals, preserves the chosen stage, and keeps long collections folded', async ({page}) => {
  await page.goto('/#bag');await enterGame(page);
  expect((await saved(page)).memoryGems?.items ?? []).toHaveLength(0);
  await page.getByRole('button',{name:'おすすめビルド',exact:true}).click();
  const planner=page.getByTestId('build-planner');
  await expect(planner).toBeVisible();
  await expect(planner.locator('[data-testid^="build-card-"]')).toHaveCount(6);
  await expect(planner.getByRole('button',{name:'編成の変更内容を確認',exact:true})).toBeDisabled();
  for(const section of await planner.locator('[data-inventory-section]').all()) await expect(section).not.toHaveAttribute('open');
  await planner.getByRole('button',{name:'厳選',exact:true}).click();
  await planner.getByRole('button',{name:'このビルドを目標にする',exact:true}).click();
  await expect.poll(async () => (await saved(page)).buildGoal).toEqual({buildId:'echo-chain',stage:'perfect'});
  await page.reload();await enterGame(page);
  await expect(page.getByTestId('build-planner')).toBeVisible();
  await expect(page.getByRole('button',{name:'この目標を解除',exact:true})).toBeVisible();
  await expect.poll(async () => (await saved(page)).buildGoal).toEqual({buildId:'echo-chain',stage:'perfect'});
  await assertNoOverflow(page);
  await snapshot(page,'planner-empty-goal-390-ja.png');
  await page.getByTestId('build-planner').getByRole('button',{name:'閉じる',exact:true}).click();
  await expect(page.getByTestId('tracked-build-summary')).toContainText('残響連鎖');
  await expect(page.getByTestId('tracked-build-summary')).toContainText('厳選');
  await page.getByRole('button',{name:'目標の続きを見る',exact:true}).click();
  await expect(page.getByTestId('build-planner')).toBeVisible();
  await expect(page.getByRole('button',{name:'この目標を解除',exact:true})).toBeVisible();
});

test('lower-quality owned recipes remain incomplete and apply only after the exact equipment transfer is confirmed', async ({page}) => {
  const fixture=await installOwnedRecipe(page);
  expect(fixture.complete).toBe(false);expect(fixture.canApply).toBe(true);
  const planner=await openPlanner(page);
  await expect(planner.locator('.build-planner__progress strong')).toContainText(`${fixture.readyCount}`);
  const recipe=await openSection(page,'build-recipe');
  await expect(recipe.getByText('石は所持・性能は未達成',{exact:true})).toHaveCount(4);
  await expect(planner.getByText('性能目標に届いていない石も含みます。',{exact:true})).toBeVisible();
  const before=await saved(page);
  await planner.getByRole('button',{name:'編成の変更内容を確認',exact:true}).click();
  const confirmation=planner.getByRole('region',{name:'編成変更の確認',exact:true});
  await expect(confirmation).toBeVisible();
  await expect(confirmation.locator('li')).toHaveCount(4);
  await expect(confirmation).toContainText('ほかの仲間が装備している石は移動します。');
  expect(await saved(page)).toEqual(before);
  await confirmation.scrollIntoViewIfNeeded();
  await mkdir('artifacts/build-planner/UI',{recursive:true});
  await page.screenshot({path:'artifacts/build-planner/UI/planner-transfer-confirmation-390-ja.png'});
  await confirmation.getByRole('button',{name:'キャンセル',exact:true}).click();
  await expect(confirmation).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
  await planner.getByRole('button',{name:'編成の変更内容を確認',exact:true}).click();
  await planner.getByRole('button',{name:'この内容で編成する',exact:true}).click();
  await expect.poll(async () => (await saved(page)).partyIds).toEqual(fixture.partyIds);
  const after=await saved(page);
  expect(after.leaderId).toBe(fixture.leaderId);
  expect(after.memoryGems!.items).toEqual(before.memoryGems!.items);
  expect(after.memoryGems!.equipped[fixture.other]).toBeUndefined();
  for(let index=0;index<fixture.partyIds.length;index++) expect(after.memoryGems!.equipped[fixture.partyIds[index]]).toBe(fixture.gemIds[index]);
  expect(after.gold).toBe(before.gold);expect(after.seed).toBe(before.seed);expect(after.stones).toBe(before.stones);
  await assertNoOverflow(page);
  await snapshot(page,'planner-owned-quality-390-ja.png');
});

test('a sample combat demo advances real frames without changing the saved party, loot, resources or RNG', async ({page}) => {
  const planner=await openPlanner(page);
  const before=await saved(page);
  const demo=planner.getByTestId('build-demo');
  await expect(demo).toBeVisible();
  const frame=demo.getByTestId('build-demo-frame');
  const initial=await frame.getAttribute('data-frame-index');
  await demo.getByTestId('build-demo-play').click();
  await expect.poll(async () => frame.getAttribute('data-frame-index')).not.toBe(initial);
  expect(await saved(page)).toEqual(before);
});

test('English build guidance and folded recipe sources remain readable at320px', async ({page}) => {
  await installOwnedRecipe(page);
  const planner=await openPlanner(page);
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  await expect(planner.getByRole('heading',{name:'Build Atelier',exact:true})).toBeVisible();
  for(const section of await planner.locator('[data-inventory-section]').all()) await expect(section).not.toHaveAttribute('open');
  expect(await planner.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  const recipe=await openSection(page,'build-recipe');
  expect(await recipe.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  const sources=await openSection(page,'build-farm-sources');
  expect(await sources.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await assertNoOverflow(page);
  await snapshot(page,'planner-owned-320-en.png');
});

test('farm destinations respect locks and open the actual preparation screen without starting an expedition', async ({page}) => {
  await installOwnedRecipe(page);
  await page.evaluate(async () => {
    const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const {content}=await import('/src/content/index.ts');
    const save=(await loadSave())!,revision=save.revision;
    save.completedDungeonIds=content.dungeons.filter(dungeon=>dungeon.published && !dungeon.towerFloor && !dungeon.eventId && (dungeon.kind ?? 'normal')==='normal').map(dungeon=>dungeon.id);
    save.revision++;await persistSave(save,revision);
  });
  await openPlanner(page);
  const sources=await openSection(page,'build-farm-sources');
  await expect(sources).toContainText('狙った石や特性の入手は保証されません。');
  const locked=sources.locator('button[data-dungeon-id]:disabled');
  expect(await locked.count()).toBeGreaterThan(0);
  const destination=sources.locator('button[data-dungeon-id]:not(:disabled)').first();
  await expect(destination).toBeVisible();
  const id=(await destination.getAttribute('data-dungeon-id'))!;
  const expectedName=await page.evaluate(async id => (await import('/src/content/index.ts')).content.dungeons.find(dungeon=>dungeon.id===id)!.name,id);
  const before=await saved(page);
  await destination.click();
  await expect(page).toHaveURL(new RegExp(`#dungeons/prepare/${encodeURIComponent(id)}$`));
  await expect(page.getByRole('dialog')).toContainText(expectedName);
  const after=await saved(page);
  expect(after.battle).toBeNull();
  expect(after.memoryGems).toEqual(before.memoryGems);
  expect(after.seed).toBe(before.seed);
});

test('a funded goal opens its exact crafting recipe and progress increases only after crafting is confirmed', async ({page}) => {
  await openPlanner(page);
  await page.evaluate(async () => {
    const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const {GEM_CRAFT_COST}=await import('/src/domain/memory-gems.ts');
    const save=(await loadSave())!,revision=save.revision;
    save.memoryGems!.dust.sanctuary=GEM_CRAFT_COST;save.revision++;
    await persistSave(save,revision);
  });
  const planner=await openPlanner(page);
  await planner.getByTestId('build-card-shield-cannon').click();
  await planner.getByRole('button',{name:'このビルドを目標にする',exact:true}).click();
  await expect.poll(async () => (await saved(page)).buildGoal).toEqual({buildId:'shield-cannon',stage:'starter'});
  const before=await saved(page);
  await planner.getByTestId('build-next-action').getByRole('button',{name:'石の製作へ',exact:true}).click();
  await expect(page).toHaveURL(/#bag\/gems\/shield-break$/);
  const target=page.getByTestId('build-craft-target');
  await expect(target).toContainText('砕盾石');
  expect((await saved(page)).memoryGems).toEqual(before.memoryGems);
  expect((await saved(page)).seed).toBe(before.seed);
  await target.getByRole('button',{name:'この石を製作',exact:true}).click();
  await expect.poll(async () => (await saved(page)).memoryGems!.items.length).toBe(1);
  const after=await saved(page);
  expect(after.memoryGems!.items[0].defId).toBe('shield-break');
  expect(after.memoryGems!.dust.sanctuary).toBe(0);
  await page.getByTestId('tracked-build-summary').getByRole('button',{name:'目標の続きを見る',exact:true}).click();
  await expect(page.getByTestId('build-planner').locator('.build-planner__progress strong')).toHaveText('1 / 4');
  await assertNoOverflow(page);
});

test('a new player can follow a locked family goal toward an available prerequisite instead of an empty inventory', async ({page}) => {
  const planner=await openPlanner(page);
  const next=planner.getByTestId('build-next-action');
  await expect(next).toContainText('入手先の解放を目指す');
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  await expect(planner.getByRole('heading',{name:'Build Atelier',exact:true})).toBeVisible();
  expect(await next.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await assertNoOverflow(page);
  await snapshot(page,'planner-unlock-320-en.png');
  const route=next.locator('button[data-dungeon-id]');
  await expect(route).toBeEnabled();
  const id=(await route.getAttribute('data-dungeon-id'))!;
  const destination=await page.evaluate(async id => {
    const {content}=await import('/src/content/index.ts');
    const {dungeonLock}=await import('/src/domain/events.ts');
    const {loadSave}=await import('/src/platform/save.ts');
    const dungeon=content.dungeons.find(dungeon=>dungeon.id===id)!;
    const {tr}=await import('/src/locales/i18n.ts');
    return {name:tr(dungeon.name),locked:dungeonLock(dungeon,(await loadSave())!,content)};
  },id);
  expect(destination.locked).toBeNull();
  const before=await saved(page);
  await route.click();
  await expect(page.getByRole('dialog')).toContainText(destination.name);
  expect((await saved(page)).battle).toBeNull();
  expect((await saved(page)).memoryGems).toEqual(before.memoryGems);
  expect((await saved(page)).seed).toBe(before.seed);
});

async function installTierRecipe(page: Page, mode:'t3'|'power-gap'|'trait-gap') {
  await page.goto('/');await enterGame(page);
  return page.evaluate(async mode => {
    const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const {BUILD_DEFINITIONS,getBuildPlan}=await import('/src/domain/builds.ts');
    const {content}=await import('/src/content/index.ts');
    const {emptyGemInventory,gemTier,gemPowerTier,gemTraitTier}=await import('/src/domain/memory-gems.ts');
    const save=(await loadSave())!,revision=save.revision;
    const build=BUILD_DEFINITIONS.find(build=>build.id==='shield-cannon')!,stage=build.stages.perfect;
    if(stage.slots[0].gem.power<220) throw new Error('The perfect recipe must use the current T6 power target.');
    const available=content.characters.filter(character=>character.published && !character.origin.includes('xr_gacha') && !character.origin.includes('trial')).map(character=>character.id);
    save.ownedIds=[...new Set([...save.ownedIds,...available,...stage.slots.map(slot=>slot.characterIds[0])])];
    save.completedDungeonIds=content.dungeons.filter(dungeon=>dungeon.published && !dungeon.towerFloor && !dungeon.eventId && (dungeon.kind ?? 'normal')==='normal').map(dungeon=>dungeon.id);
    save.memoryGems=emptyGemInventory();
    save.memoryGems.dust={sanctuary:1000,clock:1000,grave:1000};
    save.memoryGems.items=stage.slots.map((slot,index)=>({id:`tier-browser-${index}`,defId:slot.gem.defId,variant:slot.gem.variant,roll:mode==='t3'?{power:100,trait:slot.gem.trait ?? 'none',value:slot.gem.trait?100:0}:{power:slot.gem.power,trait:slot.gem.trait ?? 'none',value:slot.gem.trait?(slot.gem.value ?? 0):0}}));
    const first=save.memoryGems.items[0];
    if(mode==='power-gap') first.roll={power:100,trait:stage.slots[0].gem.trait!,value:220};
    if(mode==='trait-gap') first.roll={power:220,trait:stage.slots[0].gem.trait!,value:40};
    save.memoryGems.seen=[...new Set(save.memoryGems.items.map(gem=>gem.defId))];
    save.buildGoal={buildId:build.id,stage:'perfect'};
    save.settings.reducedMotion=true;save.revision++;
    await persistSave(save,revision);
    const plan=getBuildPlan(content,save,build.id,'perfect');
    return {readyCount:plan.readyCount,complete:plan.complete,firstSlot:stage.slots[0].id,overallTier:gemTier(first),powerTier:gemPowerTier(first),traitTier:gemTraitTier(first)};
  },mode);
}

test('T6 goals inspect each affix and direct ordinary stones toward real upper-tier drops rather than basic crafting', async ({page}) => {
  for(const mode of ['t3','power-gap','trait-gap'] as const) {
    const fixture=await installTierRecipe(page,mode);
    expect(fixture.complete).toBe(false);
    expect(fixture.readyCount).toBe(mode==='t3'?0:3);
    const planner=await openPlanner(page),next=planner.getByTestId('build-next-action');
    await expect(planner.locator('.build-planner__progress strong')).toHaveText(`${fixture.readyCount} / 4`);
    await expect(planner.getByRole('button',{name:'この目標を解除',exact:true})).toBeVisible();
    const recipe=await openSection(page,'build-recipe');
    const first=recipe.locator(`[data-slot-id="${fixture.firstSlot}"]`);
    await expect(first.locator('[data-tier-kind="target"][data-gem-stat="power"]')).toHaveAttribute('data-tier','6');
    await expect(first.locator('[data-tier-kind="owned"][data-gem-stat="power"]')).toHaveAttribute('data-tier',String(fixture.powerTier));
    await expect(first.locator('[data-tier-kind="owned"][data-gem-stat="trait"]')).toHaveAttribute('data-tier',String(fixture.traitTier));
    if(mode==='trait-gap') {
      expect(fixture.overallTier).toBe(6);
      await expect(next.getByRole('button',{name:'記憶石を整える',exact:true})).toBeEnabled();
      await expect(next.locator('button[data-dungeon-id]')).toHaveCount(0);
    } else {
      if(mode==='power-gap') expect(fixture.overallTier).toBe(6);
      await expect(next).toContainText('上位Tierの石を探す');
      await expect(next.getByRole('button',{name:'石の製作へ',exact:true})).toHaveCount(0);
      await expect(next.getByRole('button',{name:'記憶石を整える',exact:true})).toHaveCount(0);
      const farm=next.locator('button[data-dungeon-id]');
      await expect(farm).toBeEnabled();
      const id=(await farm.getAttribute('data-dungeon-id'))!;
      const profile=await page.evaluate(async id => {
        const {content}=await import('/src/content/index.ts');
        const {dungeonGemLootProfile}=await import('/src/domain/memory-gems.ts');
        return dungeonGemLootProfile(content.dungeons.find(dungeon=>dungeon.id===id)!);
      },id);
      expect(profile.tier6Chance ?? 0).toBeGreaterThan(0);
      const sources=await openSection(page,'build-farm-sources');
      const source=sources.locator(`.build-planner__source:has(button[data-dungeon-id="${id}"])`).first();
      await expect(source).toContainText('T6');
      await expect(source).toContainText('踏破宝箱で石が出た後の、各項目の確率です。');
      await expect(source).toContainText(`${Number(((profile.tier6Chance ?? 0)*100).toFixed(2))}%`);
      await assertNoOverflow(page);
      if(mode==='power-gap') {
        await snapshot(page,'planner-mixed-affix-390-ja.png');
        await page.setViewportSize({width:320,height:740});
        await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
        await expect(planner.getByRole('heading',{name:'Build Atelier',exact:true})).toBeVisible();
        expect(await planner.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
        await assertNoOverflow(page);
        await snapshot(page,'planner-mixed-affix-320-en.png');
        await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('ja'));
        await page.setViewportSize({width:390,height:844});
      }
    }
    await planner.getByRole('button',{name:'閉じる',exact:true}).click();
    const summary=page.getByTestId('tracked-build-summary');
    await expect(summary).toContainText(mode==='trait-gap'?'を調律':'を探す');
    expect((await saved(page)).buildGoal).toEqual({buildId:'shield-cannon',stage:'perfect'});
  }
});
