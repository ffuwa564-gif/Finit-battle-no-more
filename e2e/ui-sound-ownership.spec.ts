import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page, route = 'settings') {
  await page.addInitScript(() => {
    (window as any).__actionCues = [];
    window.addEventListener('game:se', event => (window as any).__actionCues.push((event as CustomEvent).detail.kind));
  });
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async () => {
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.settings.bgmVolume = 0; save.settings.seVolume = 1;
    save.memoryGems = { items: [{id:'audio-stone',defId:'night-dew',variant:'pure'}], equipped:{}, dust:{grave:100}, seen:['night-dew'] };
    save.revision++; await persistSave(save,revision);
  });
  await page.goto(`/#${route}`); await page.reload(); await enterGame(page);
  await page.evaluate(async () => { await (await import('/src/platform/audio.ts')).enableAudio(); });
}
const clear = (page: Page) => page.evaluate(() => { (window as any).__actionCues = []; });
async function cues(page: Page, expected: string[]) {
  // Catch a delayed second cue from persistence, rather than accepting the first.
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => (window as any).__actionCues)).toEqual(expected);
}

test('gem equipment, removal and another saved command each sound exactly once', async ({page}) => {
  await prepare(page,'bag');
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await page.locator('[data-inventory-section="memory-stones"] > summary').click();
  await page.getByTestId('memory-gem-card').click();
  await clear(page);
  await page.getByRole('button',{name:'この仲間に託す',exact:true}).click();
  await expect(page.getByRole('button',{name:'装備中',exact:true})).toBeVisible();
  await cues(page,['confirm']);
  await clear(page);
  await page.getByRole('button',{name:'外す',exact:true}).click();
  await expect(page.getByRole('button',{name:'この仲間に託す',exact:true})).toBeEnabled();
  await cues(page,['confirm']);
  await clear(page);
  await page.getByRole('button',{name:'記憶石を保護',exact:true}).click();
  await expect(page.getByRole('button',{name:'記憶石の保護を解除',exact:true})).toBeVisible();
  await cues(page,['select']);
  await clear(page);
  await page.getByRole('group',{name:'記憶石の系統',exact:true}).getByRole('button',{name:'聖域',exact:true}).click();
  await cues(page,['confirm']);
});

test('BGM volume feedback plays once, including zero BGM, and obeys SE mute', async ({page}) => {
  await prepare(page);
  const music = page.getByRole('group',{name:'BGM音量',exact:true});
  for (const value of ['25%','0%','100%']) {
    await clear(page);
    await music.getByRole('button',{name:value,exact:true}).click();
    await expect(music.getByRole('button',{name:value,exact:true})).toHaveAttribute('aria-pressed','true');
    await cues(page,['confirm']);
  }
  await page.getByRole('group',{name:'効果音',exact:true}).getByRole('button',{name:'0%',exact:true}).click();
  await clear(page);
  await music.getByRole('button',{name:'50%',exact:true}).click();
  await expect(music.getByRole('button',{name:'50%',exact:true})).toHaveAttribute('aria-pressed','true');
  await cues(page,[]);
  await clear(page);
  await page.getByRole('group',{name:'効果音',exact:true}).getByRole('button',{name:'100%',exact:true}).click();
  await cues(page,['confirm']);
});

test('a rejected save plays only an error, without a premature success beep', async ({page}) => {
  await prepare(page,'bag');
  await page.getByRole('button',{name:/記憶石の管理/}).click();
  await page.locator('[data-inventory-section="memory-stones"] > summary').click();
  await page.getByTestId('memory-gem-card').click();
  await page.evaluate(async () => {
    const { loadSave,persistSave } = await import('/src/platform/save.ts');
    const current = (await loadSave())!, revision = current.revision;
    current.revision++; await persistSave(current,revision);
  });
  await clear(page);
  await page.getByRole('button',{name:'この仲間に託す',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await cues(page,['error']);
  expect(await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.memoryGems!.equipped)).toEqual({});
});
