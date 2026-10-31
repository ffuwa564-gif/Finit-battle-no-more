import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { enterGame } from './boot';

test.use({ viewport:{width:390,height:844}, locale:'ja-JP', isMobile:true, hasTouch:true });
async function save(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!); }
async function openTower(page: Page) {
  await page.goto('/#dungeons/tower'); await page.reload(); await enterGame(page);
  await page.getByRole('button', { name:'白亜の塔', exact:true }).click();
  return page.getByRole('region', { name:'白亜の塔', exact:true });
}

test('all100 floors exist without dumping100 rows and entry is gated by the first dungeon clear', async ({ page }) => {
  const tower = await openTower(page);
  await expect(tower).toBeVisible();
  await expect(tower.locator('.ivory-tower__limit')).toHaveText('各ウェーブ40ラウンド以内に踏破');
  await expect(page.getByRole('button', { name:'次の階層に挑む', exact:true })).toBeDisabled();
  const bands = tower.locator('[data-inventory-section]');
  await expect(bands).toHaveCount(10);
  for (const band of await bands.all()) await expect(band).not.toHaveAttribute('open');
  await expect(page.getByTestId('tower-floor-1')).toBeHidden();
  await bands.first().locator(':scope > summary').click();
  await expect(page.getByTestId('tower-floor-1')).toBeVisible();
  await expect(page.getByTestId('tower-floor-2')).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await mkdir('artifacts/ivory-tower/UI', { recursive:true });
  await page.screenshot({ path:'artifacts/ivory-tower/UI/tower-mobile-390-ja.png', fullPage:true });
});

test('claiming one floor saves progress and exposes the next challenge rather than skipping to floor100', async ({ page }) => {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const value = (await loadSave())!, revision=value.revision;
    value.completedDungeonIds = ['silent-cathedral'];
    value.settings.speed=2; value.settings.reducedMotion=true; value.revision++;
    await persistSave(value, revision);
  });
  await openTower(page);
  await page.getByRole('button', { name:'次の階層に挑む', exact:true }).click();
  await expect(page.getByRole('dialog')).toContainText('各Wave40ラウンド以内');
  await page.locator('[data-guide="depart"]').click();
  await expect.poll(async () => (await save(page)).battle?.phase).toBe('ready');
  await expect(page.locator('.enemy-carousel-meta')).toContainText('ROUND 1 / 40');
  const first = (await save(page)).battle!.dungeonId;
  expect(first).toBe('ivory-tower-001');
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const value = (await loadSave())!, revision=value.revision;
    for (const unit of value.battle!.units) {
      if (unit.side==='party') { unit.hp=unit.maxHp; unit.attack=100000; unit.speed=100; }
      else { unit.hp=1; unit.attack=0; unit.defense=0; unit.speed=0; }
    }
    value.battle!.initialUnits=structuredClone(value.battle!.units);value.revision++;
    await persistSave(value, revision);
  });
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name:'ラウンドを進める', exact:true }).click();
  await expect(page.locator('[data-guide="claim"]')).toBeVisible({timeout:40000});
  expect((await save(page)).completedDungeonIds).not.toContain(first);
  await page.locator('[data-guide="claim"]').click();
  await expect.poll(async () => (await save(page)).completedDungeonIds.includes(first)).toBe(true);
  await openTower(page);
  const tower = page.getByRole('region', { name:'白亜の塔', exact:true });
  await tower.locator('[data-inventory-section]').last().locator(':scope > summary').click();
  await expect(page.getByTestId('tower-floor-100')).toBeDisabled();
  await page.getByRole('button', { name:'次の階層に挑む', exact:true }).click();
  await page.locator('[data-guide="depart"]').click();
  await expect.poll(async () => (await save(page)).battle?.dungeonId).toBe('ivory-tower-002');
});

test('English tower progress and locked bands remain readable at320px', async ({ page }) => {
  await page.setViewportSize({ width:320, height:740 });
  await openTower(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const value = (await loadSave())!, revision=value.revision;
    value.completedDungeonIds=['silent-cathedral', ...Array.from({length:31}, (_, index) => `ivory-tower-${String(index+1).padStart(3,'0')}`)];
    value.revision++;
    await persistSave(value, revision);
  });
  await openTower(page);
  await page.evaluate(async () => (await import('/src/locales/i18n.ts')).setLanguage('en'));
  const tower=page.getByRole('region', {name:'Ivory Tower',exact:true});
  await expect(tower.locator('.ivory-tower__limit')).toHaveText('Clear each wave within 40 rounds');
  await expect(tower.locator('.ivory-tower__progress')).toContainText('31');
  expect(await tower.innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  for (const band of await tower.locator('[data-inventory-section]').all()) await expect(band).not.toHaveAttribute('open');
  expect(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await mkdir('artifacts/ivory-tower/UI', {recursive:true});
  await page.screenshot({path:'artifacts/ivory-tower/UI/tower-mobile-320-en.png',fullPage:true});
});
