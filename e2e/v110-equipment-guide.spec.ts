import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { skipStory } from './boot';

async function boot(page: Page) {
  await page.waitForFunction(() => document.querySelector('.title-screen__start, .app-shell, [role=alert]'));
  if (!await page.locator('.title-screen__start, .app-shell').count()) throw new Error('Game could not start: '+await page.locator('[role=alert]').allTextContents());
  if (await page.locator('.title-screen').count()) await page.locator('.title-screen__start').click();
  await skipStory(page);
}
async function fixture(page: Page) {
  await page.goto('/'); await boot(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave }=await import('/src/platform/save.ts');
    const { emptyGemInventory }=await import('/src/domain/memory-gems.ts');
    const save=(await loadSave())!,revision=save.revision;
    save.memoryGems=emptyGemInventory();
    save.memoryGems.items=['star-furnace','star-furnace','pale-ward','echo-shard','hollow-lantern'].map((defId,i)=>({id:`guide-${i}`,defId,variant:'pure' as const,roll:{power:80,trait:'none' as const,value:0}}));
    save.memoryGems.seen=[...new Set(save.memoryGems.items.map(g=>g.defId))];
    save.memoryGems.dust={sanctuary:20,clock:20,grave:20};
    save.settings.reducedMotion=true;save.revision++;
    await persistSave(save,revision);
  });
  await page.goto('/#bag');await page.reload();await boot(page);
  await page.locator('.bag-gem-entry .button').first().click();
  await expect(page.getByTestId('memory-gems')).toBeVisible();
}

for (const language of ['ja','en'] as const) for (const width of [320,390]) {
  test(`${language} ${width}px: equipment purpose preserves stacks and long guides start folded`,async({page})=>{
    await page.setViewportSize({width,height:844});
    await page.addInitScript(locale=>localStorage.setItem('stillveil-language',locale),language);
    await fixture(page);
    const inventory=page.locator('[data-inventory-section="memory-stones"]');
    await expect(inventory).not.toHaveAttribute('open','');
    await inventory.locator(':scope > summary').click();
    await page.locator('.memory-gems__purpose select').selectOption('support');
    await expect(page.getByTestId('memory-gem-card')).toHaveCount(1);
    const star=page.locator('[data-gem-stack="star-furnace:pure"]');
    await expect(star.locator('.memory-gems__stack-count')).toHaveText('×2');
    await star.click();
    const guide=page.locator('[data-inventory-section="memory-tactics"]');
    await expect(guide).not.toHaveAttribute('open','');
    await guide.locator(':scope > summary').click();
    await expect(guide.locator('dd').nth(1)).toContainText('65');
    await expect(guide.locator('dd').nth(2)).toContainText('10%');
    for(const id of ['memory-refinement','memory-crafting','memory-sources']) await expect(page.locator(`[data-inventory-section="${id}"]`)).not.toHaveAttribute('open','');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await mkdir('artifacts/v110-inventory/screenshots',{recursive:true});
    await guide.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/v110-inventory/screenshots/gem-guide-${language}-${width}.png`});
    await page.goto('/#bag/builds');await page.reload();await boot(page);
    const tactics=page.locator('[data-inventory-section="build-matchups"]');
    await expect(tactics).not.toHaveAttribute('open','');
    await tactics.locator(':scope > summary').click();
    await expect(tactics.locator('dd')).toHaveCount(4);
    await expect(page.locator('[data-inventory-section="build-recipe"]')).not.toHaveAttribute('open','');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await tactics.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/v110-inventory/screenshots/build-guide-${language}-${width}.png`});
  });
}
