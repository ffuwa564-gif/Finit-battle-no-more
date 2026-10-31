import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { enterGame } from './boot';

test.use({ viewport:{width:390,height:844},locale:'ja-JP',isMobile:true,hasTouch:true });
async function saved(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!); }
async function openSection(page: Page, id: string) {
  const section=page.locator(`[data-inventory-section="${id}"]`);
  if (!await section.evaluate(element => (element as HTMLDetailsElement).open)) await section.locator(':scope > summary').click();
}
async function fixture(page: Page) {
  await page.goto('/');await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave,persistSave }=await import('/src/platform/save.ts');
    const { emptyGemInventory }=await import('/src/domain/memory-gems.ts');
    const save=(await loadSave())!,revision=save.revision;
    save.memoryGems=emptyGemInventory();
    save.memoryGems.items=[
      {id:'refine-low',defId:'night-dew',variant:'pure',roll:{power:15,trait:'none',value:0}},
      {id:'refine-high',defId:'night-dew',variant:'pure',roll:{power:90,trait:'chain',value:50}},
      {id:'refine-low-copy',defId:'night-dew',variant:'pure',roll:{power:15,trait:'none',value:0}},
    ];
    save.memoryGems.seen=['night-dew'];save.memoryGems.dust.grave=100;
    save.settings.reducedMotion=true;save.revision++;
    await persistSave(save,revision);
  });
  await page.goto('/#bag');await page.reload();await enterGame(page);
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await openSection(page,'memory-stones');
}

test('different effects remain separate stacks and a paid refinement survives reload until explicitly kept or accepted',async ({page}) => {
  await fixture(page);
  await expect(page.getByTestId('memory-gem-card')).toHaveCount(2);
  await expect(page.locator('.memory-gems__stack-count',{hasText:'×2'})).toHaveCount(1);
  await expect(page.locator('.memory-gems__stack-count',{hasText:'×1'})).toHaveCount(1);
  await mkdir('artifacts/ivory-tower/UI', { recursive:true });
  await page.locator('.memory-gems__grid').evaluate(element=>element.scrollIntoView({block:'start'}));
  await page.screenshot({path:'artifacts/ivory-tower/UI/gem-rolls-mobile-390.png'});
  await page.locator('[data-gem-id="refine-low-copy"]').click();
  await openSection(page,'memory-refinement');
  const mode=page.locator('.memory-gems__refinement-modes > div').filter({hasText:'技効力を調律'});
  await mode.getByRole('button',{name:'調律する',exact:true}).click();
  const offer=page.getByTestId('gem-refinement-offer');
  await expect(offer).toBeVisible();
  await offer.scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/ivory-tower/UI/refinement-offer-mobile-390.png'});
  const offered=(await saved(page)).memoryGems!;
  expect(offered.pending).toBeDefined();
  expect(offered.dust.grave).toBeLessThan(100);
  const paid=offered.dust.grave;
  const original=offered.items.find(item=>item.id===offered.pending!.gemId)!;
  const proposed=structuredClone(offered.pending);
  expect(original.roll!.power).toBe(15);
  await page.reload();await enterGame(page);
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await expect(offer).toBeVisible();
  const restored=(await saved(page)).memoryGems!;
  expect(restored.pending).toEqual(proposed);expect(restored.dust.grave).toBe(paid);
  await page.setViewportSize({width:320,height:740});
  await offer.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:'artifacts/ivory-tower/UI/refinement-offer-mobile-320.png'});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'元の性能を残す',exact:true}).click();
  await expect(offer).toHaveCount(0);
  expect((await saved(page)).memoryGems!.dust.grave).toBe(paid);
  expect((await saved(page)).memoryGems!.items.find(item=>item.id===original.id)!.roll).toEqual(original.roll);
  await openSection(page,'memory-refinement');
  await mode.getByRole('button',{name:'調律する',exact:true}).click();
  await expect(offer).toBeVisible();
  const second=(await saved(page)).memoryGems!.pending!;
  await page.getByRole('button',{name:'新しい性能を採用',exact:true}).click();
  await expect(offer).toHaveCount(0);
  const accepted=(await saved(page)).memoryGems!;
  expect(accepted.items.find(item=>item.id===second.gemId)!.roll).toEqual(second.candidate.roll);
  expect(accepted.items).toHaveLength(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('English rolled gem cards and a tuning offer remain translated and usable at320px', async ({page}) => {
  await fixture(page);
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  await page.locator('[data-gem-id="refine-low-copy"]').click();
  await expect(page.getByTestId('memory-gems')).toBeVisible();
  await openSection(page,'memory-refinement');
  await page.locator('.memory-gems__refinement-modes > div').first().getByRole('button').click();
  const offer=page.getByTestId('gem-refinement-offer');
  await expect(offer).toBeVisible();
  expect(await offer.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await expect(offer.getByRole('button',{name:'Keep new properties',exact:true})).toBeEnabled();
  await expect(offer.getByRole('button',{name:'Keep original properties',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await offer.scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/ivory-tower/UI/refinement-offer-mobile-320-en.png'});
});
