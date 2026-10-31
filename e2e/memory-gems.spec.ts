import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
async function inventoryFixture(page: Page, battle = false) {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async battle => {
    const { content } = await import('/src/content/index.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const { emptyGemInventory } = await import('/src/domain/memory-gems.ts');
    const { applyCommand } = await import('/src/application/game.ts');
    let save = (await loadSave())!; const revision = save.revision;
    save.memoryGems = emptyGemInventory();
    save.memoryGems.items = [
      { id: 'qa-night-dew', defId: 'night-dew', variant: 'pure' },
      { id: 'qa-pale-ward', defId: 'pale-ward', variant: 'pure', locked: true },
      { id: 'qa-echo-shard', defId: 'echo-shard', variant: 'swift' },
    ];
    save.memoryGems.seen = save.memoryGems.items.map(item => item.defId);
    save.memoryGems.dust = { sanctuary: 6, clock: 6, grave: 6 };
    save.settings.reducedMotion = true;
    if (battle) {
      save = applyCommand(save, { type: 'equipMemoryGem', characterId: save.partyIds[0], gemId: 'qa-night-dew' }, content);
      save = applyCommand(save, { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }, content);
      while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
      for (const unit of save.battle!.units) {
        if (unit.side === 'enemy') { unit.hp = unit.maxHp = 100000; unit.speed = 0; }
        else { unit.hp = unit.maxHp = 10000; unit.speed = 100; }
      }
      save.battle!.initialUnits = structuredClone(save.battle!.units);
    }
    save.revision = revision + 1;
    await persistSave(save, revision);
  }, battle);
  await page.goto('/#bag'); await page.reload(); await enterGame(page);
}

async function currentSave(page: Page) {
  return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
}

async function openGemInventory(page: Page) {
  const section = page.locator('[data-inventory-section="memory-stones"]');
  if (!await section.evaluate(el => (el as HTMLDetailsElement).open)) await section.locator(':scope > summary').click();
}

test('large inventories start folded and the management entry remains visible above them', async ({ page }) => {
  await inventoryFixture(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.materials = Object.fromEntries(content.species.flatMap(species => ['common','rare','epic'].map(rarity => [`${species.id}:${rarity}`, 50])));
    const examples = [...save.memoryGems!.items];
    save.memoryGems!.items = Array.from({ length: 60 }, (_, index) => ({ ...examples[index % examples.length], id: `large-${index}` }));
    save.revision++;
    await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  const entry = page.getByRole('button', { name: /記憶石の管理/ });
  await expect(entry).toBeInViewport();
  for (const id of ['materials','material-exchange']) {
    const section = page.locator(`[data-inventory-section="${id}"]`);
    await expect(section).not.toHaveAttribute('open');
    await expect(section.locator('.resource-list')).toBeHidden();
  }
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(1400);
  await page.screenshot({ path: 'artifacts/memory-gems/bag-collapsed-current.png' });
  await page.locator('[data-inventory-section="materials"] > summary').click();
  await expect(page.locator('[data-inventory-section="materials"] .resource-list')).toBeVisible();
  await page.locator('[data-inventory-section="materials"] > summary').click();
  await entry.click();
  for (const id of ['memory-stones','memory-crafting','memory-sources']) await expect(page.locator(`[data-inventory-section="${id}"]`)).not.toHaveAttribute('open');
  await expect(page.getByTestId('memory-gem-card').first()).toBeHidden();
  await page.screenshot({ path: 'artifacts/memory-gems/gem-overview-collapsed.png', fullPage:true });
  await openGemInventory(page);
  await expect(page.getByTestId('memory-gem-card')).toHaveCount(3);
  await expect(page.locator('.memory-gems__stack-count', { hasText: '×20' })).toHaveCount(3);
  await expect(page.getByTestId('memory-gem-card').first()).toBeVisible();
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: /記憶石の管理/ }).click();
  await expect(page.locator('[data-inventory-section="memory-stones"]')).not.toHaveAttribute('open');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('searches and transfers a worn stone directly after confirmation, returning the replaced stone to the bag', async ({ page }) => {
  await inventoryFixture(page);
  await page.getByRole('button', { name: '記憶石', exact: true }).click();
  await openGemInventory(page);
  const [source, target] = (await currentSave(page)).partyIds;
  await page.locator('[data-gem-id="qa-night-dew"]').click();
  await expect(page.getByRole('button', { name: 'この仲間に託す', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'この仲間に託す', exact: true }).click();
  await expect.poll(async () => (await currentSave(page)).memoryGems!.equipped[source]).toBe('qa-night-dew');
  await page.getByRole('combobox', { name: '石を託す仲間', exact: true }).selectOption(target);
  await page.locator('[data-gem-id="qa-pale-ward"]').click();
  await page.getByRole('button', { name: 'この仲間に託す', exact: true }).click();
  await expect.poll(async () => (await currentSave(page)).memoryGems!.equipped[target]).toBe('qa-pale-ward');
  const search = page.getByRole('searchbox', { name: '記憶石を検索' });
  await search.fill('夜露');
  await expect(page.getByTestId('memory-gem-card')).toHaveCount(1);
  await page.getByTestId('memory-gem-card').click();
  await page.getByRole('button', { name: 'この仲間へ移す', exact: true }).click();
  const confirmation = page.getByRole('group', { name: '記憶石の移動を確認' });
  await expect(confirmation).toBeVisible();
  expect((await currentSave(page)).memoryGems!.equipped[source]).toBe('qa-night-dew');
  await confirmation.getByRole('button', { name: 'やめる', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await page.getByRole('button', { name: 'この仲間へ移す', exact: true }).click();
  await page.getByRole('button', { name: '移動を確定', exact: true }).click();
  await expect.poll(async () => (await currentSave(page)).memoryGems!.equipped[target]).toBe('qa-night-dew');
  const transferred = (await currentSave(page)).memoryGems!;
  expect(transferred.equipped[source]).toBeUndefined();
  expect(Object.values(transferred.equipped)).not.toContain('qa-pale-ward');
  expect(transferred.items).toHaveLength(3);
  await search.fill('存在しない石');
  await expect(page.getByText('この条件の記憶石はありません。', { exact: true })).toBeVisible();
  await search.clear();
  await page.getByRole('combobox', { name: '記憶石の並び順' }).selectOption('cooldown');
  const ids = await page.getByTestId('memory-gem-card').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-gem-id')));
  expect(ids).toEqual(['qa-echo-shard', 'qa-pale-ward', 'qa-night-dew']);
});

test('stacks identical stones while equipping two distinct copies and salvaging only the unprotected spare', async ({ page }) => {
  await inventoryFixture(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.memoryGems!.items.push({ id:'qa-night-dew-copy', defId:'night-dew', variant:'pure' });
    save.revision++;
    await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name:'記憶石', exact:true }).click();
  await openGemInventory(page);
  await expect(page.getByTestId('memory-gem-card')).toHaveCount(3);
  const stack = page.locator('[data-gem-stack="night-dew:pure"]');
  await expect(stack.locator('.memory-gems__stack-count')).toHaveText('×2');
  await stack.click();
  await page.getByRole('button', { name:'記憶石を保護', exact:true }).click();
  await page.getByRole('button', { name:'この仲間に託す', exact:true }).click();
  const [source, target] = (await currentSave(page)).partyIds;
  await expect.poll(async () => (await currentSave(page)).memoryGems!.equipped[source]).toBeTruthy();
  const sourceGem = (await currentSave(page)).memoryGems!.equipped[source];
  await page.getByRole('combobox', { name:'石を託す仲間', exact:true }).selectOption(target);
  await page.getByRole('button', { name:'この仲間に託す', exact:true }).click();
  await expect.poll(async () => (await currentSave(page)).memoryGems!.equipped[target]).toBeTruthy();
  expect((await currentSave(page)).memoryGems!.equipped[target]).not.toBe(sourceGem);
  await expect(stack).toContainText('装備 2 · 未装備 0');
  await page.getByRole('button', { name:'外す', exact:true }).click();
  await expect.poll(async () => (await currentSave(page)).memoryGems!.equipped[target]).toBeUndefined();
  await page.getByRole('button', { name:'分解', exact:true }).click();
  await page.getByRole('button', { name:'分解を確定', exact:true }).click();
  await expect(stack.locator('.memory-gems__stack-count')).toHaveText('×1');
  const result = (await currentSave(page)).memoryGems!;
  expect(result.items).toHaveLength(3);
  expect(result.equipped[source]).toBe(sourceGem);
  expect(result.items.find(item => item.id === sourceGem)!.locked).toBe(true);
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name:'記憶石', exact:true }).click();
  await openGemInventory(page);
  await expect(page.locator('[data-gem-stack="night-dew:pure"] .memory-gems__stack-count')).toHaveText('×1');
});

test('a gem skill survives real persistence, queues through the existing dial and consumes one action', async ({ page }, info) => {
  await inventoryFixture(page, true);
  const pilot = page.getByRole('button', { name: /行動を選ぶ$/ });
  await pilot.click();
  const gem = page.locator('[data-command^="skill:memory:night-dew:"]');
  await expect(gem).toBeVisible();
  const caption = (await page.locator('.command-dial__caption').boundingBox())!;
  expect(caption.x).toBeGreaterThanOrEqual(0); expect(caption.y).toBeGreaterThanOrEqual(0);
  const boxes = await page.locator('.command-dial [data-command]').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { id:node.getAttribute('data-command'), x:r.x, y:r.y, width:r.width, height:r.height }; }));
  await page.screenshot({ path: 'artifacts/memory-gems/pilot-dial-mobile-390.png' });
  for (const box of boxes) expect(Math.min(caption.x+caption.width,box.x+box.width)-Math.max(caption.x,box.x) > 1 && Math.min(caption.y+caption.height,box.y+box.height)-Math.max(caption.y,box.y) > 1).toBe(false);
  for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) { const a=boxes[i],b=boxes[j]; expect(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x) > 1 && Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y) > 1).toBe(false); }
  await gem.click();
  await expect.poll(async () => (await currentSave(page)).battle!.partyOrder?.kind).toBe('skill');
  await page.reload(); await enterGame(page);
  expect((await currentSave(page)).battle!.partyOrder).toMatchObject({ kind: 'skill', skillId: 'memory:night-dew:pure:qa-night-dew' });
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect.poll(async () => { const value = await currentSave(page); return value.battle!.events.filter(event => event.actionSelection && event.actorId === `party:${value.partyIds[0]}`).length; }).toBe(1);
  const save = await currentSave(page);
  expect(save.battle!.events.find(event => event.actionSelection && event.actorId === `party:${save.partyIds[0]}`)?.skillId).toBe('memory:night-dew:pure:qa-night-dew');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

// Inventory actions below intentionally use actual UI commands and IndexedDB,
// rather than calling the mutation helpers directly.
test('mobile inventory protects favorites, equips one stone, crafts a chosen skill and survives reload', async ({ page }, info) => {
  await inventoryFixture(page);
  await page.getByRole('button', { name: '記憶石', exact: true }).click();
  await openGemInventory(page);
  const inventory = page.getByTestId('memory-gems');
  await expect(inventory).toBeVisible();
  const card = page.locator('[data-testid="memory-gem-card"][data-gem-id="qa-night-dew"]');
  await card.click();
  await page.getByRole('button', { name: 'この仲間に託す', exact: true }).click();
  await expect.poll(async () => Object.values((await currentSave(page)).memoryGems!.equipped)).toContain('qa-night-dew');
  await expect(page.getByRole('button', { name: '分解', exact: true })).toBeDisabled();
  await page.locator('[data-testid="memory-gem-card"][data-gem-id="qa-pale-ward"]').click();
  await expect(page.getByRole('button', { name: '分解', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '記憶石の保護を解除', exact: true }).click();
  await expect(page.getByRole('button', { name: '分解', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '記憶石を保護', exact: true }).click();
  await expect(page.getByRole('button', { name: '分解', exact: true })).toBeDisabled();
  await page.getByText('欠片から記憶石を紡ぐ', { exact: true }).click();
  await page.locator('.memory-gems__recipe').first().getByRole('button', { name: '紡ぐ', exact: true }).click();
  await expect.poll(async () => (await currentSave(page)).memoryGems!.items.length).toBe(4);
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: '記憶石', exact: true }).click();
  await openGemInventory(page);
  expect(Object.values((await currentSave(page)).memoryGems!.equipped)).toContain('qa-night-dew');
  expect((await currentSave(page)).memoryGems!.items.find(gem => gem.id === 'qa-pale-ward')!.locked).toBe(true);
  await page.screenshot({ path: 'artifacts/memory-gems/inventory-mobile-390.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(inventory).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: 'artifacts/memory-gems/inventory-mobile-320.png', fullPage: true });
});

test('the first chest is nonblocking, equips at the next wave and stays secured after UI retreat', async ({ page }) => {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const { applyCommand, createInitialSave } = await import('/src/application/game.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!, revision = previous.revision;
    let save = createInitialSave(content, 42);
    save.novels = previous.novels;
    save.settings.reducedMotion = true;
    save = applyCommand(save, { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }, content);
    while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
    for (const unit of save.battle!.units) {
      if (unit.side === 'party') { unit.attack = 100000; unit.speed = 100; }
      else { unit.hp = 1; unit.attack = 0; unit.speed = 0; }
    }
    save.battle!.initialUnits = structuredClone(save.battle!.units);
    save = applyCommand(save, { type: 'round' }, content);
    while (save.battle!.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
    save.revision = revision + 1;
    await persistSave(save, revision);
  });
  await page.reload(); await enterGame(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeEnabled();
  const gem = (await currentSave(page)).memoryGems!.items[0];
  expect(gem).toBeDefined();
  await expect(page.getByRole('button', { name: '獲得した記憶石を見る', exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/memory-gems/chest-find-mobile-390.png' });
  await page.getByRole('button', { name: '獲得した記憶石を見る', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await openGemInventory(page);
  await page.locator(`[data-testid="memory-gem-card"][data-gem-id="${gem.id}"]`).click();
  await page.getByRole('button', { name: 'この仲間に託す', exact: true }).click();
  await expect.poll(async () => Object.values((await currentSave(page)).battle!.memoryGems ?? {}).map(item => item.id)).toContain(gem.id);
  await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await page.getByRole('button', { name: '撤退', exact: true }).click();
  await page.getByRole('button', { name: '撤退する', exact: true }).click();
  await page.getByRole('button', { name: /街へ戻る/ }).click();
  await page.reload(); await enterGame(page);
  expect((await currentSave(page)).memoryGems!.items.map(item => item.id)).toContain(gem.id);
});
