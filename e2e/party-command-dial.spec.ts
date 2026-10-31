import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
async function setup(page: Page, reduced = false) {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async reduced => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const save = (await loadSave())!, revision = save.revision;
    save.partyIds = ['seris', 'elaine', 'liora', 'noelle']; save.leaderId = 'liora';
    let b = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 2, 42, 'dial-browser');
    while (b.phase === 'playing') b = advanceReplay(b, content);
    for (const u of b.units) { u.hp = u.maxHp = 10000; u.speed = u.characterId === 'seris' ? 100 : u.side === 'enemy' ? 0 : 20; }
    b.initialUnits = structuredClone(b.units); save.battle = b; save.settings.reducedMotion = reduced; save.revision++;
    await persistSave(save, revision);
  }, reduced);
  await page.reload(); await enterGame(page);
}
async function battle(page: Page) { return page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.battle!); }

test('real touch hold-drag-release queues a focused attack while companions reveal their actual actions', async ({page}, info) => {
  await setup(page);
  await page.getByRole('button', {name:'次の敵を表示',exact:true}).click();
  await expect(page.getByLabel('狙っている敵', {exact:true})).toBeVisible();
  const pinned = (await battle(page)).focusTargetId;
  const face = (await page.locator('[data-pilot] .portrait-image').boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:face.x+face.width/2,y:face.y+face.height/2}]});
  await expect(page.locator('.command-dial')).toBeVisible();
  const attack = (await page.locator('[data-command="attack"]').boundingBox())!;
  await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:attack.x+attack.width/2,y:attack.y+attack.height/2}]});
  await expect(page.locator('[data-command="attack"]')).toHaveClass(/is-hovered/);
  await page.screenshot({path:info.outputPath('touch-command-390.png')});
  await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  await expect(page.locator('.command-dial')).toHaveCount(0);
  await expect.poll(async()=> (await battle(page)).partyOrder?.kind).toBe('attack');
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  await expect.poll(async()=> (await battle(page)).events.find(e=>e.actionSelection && e.actorId==='party:seris')?.targetIds).toEqual([pinned]);
  const companion = page.locator('.companion-choice').first(); await expect(companion).toBeVisible();
  const skillId = await companion.getAttribute('data-choice-skill');
  expect((await battle(page)).events.some(e=>e.actionSelection && (e.skillId ?? e.kind)===skillId)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('keyboard, unavailable skills, cancellation and save restore work on a narrow reduced-motion screen', async ({page}, info) => {
  await page.setViewportSize({width:320,height:740}); await setup(page,true);
  await page.evaluate(async()=>{
    const {loadSave,persistSave}=await import('/src/platform/save.ts');const save=(await loadSave())!,revision=save.revision;
    save.battle!.units.find(u=>u.characterId==='seris')!.cooldowns['pierce-14']=99;save.revision++;await persistSave(save,revision);
  });
  await page.reload();await enterGame(page);
  const pilot=page.getByRole('button',{name:/行動を選ぶ$/}); await pilot.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.command-dial')).toBeVisible();
  const unavailable=page.locator('[data-command="skill:pierce-14"]');await expect(unavailable).toHaveAttribute('aria-disabled','true');
  await unavailable.dispatchEvent('click');await expect(page.locator('.command-dial')).toBeVisible();expect((await battle(page)).partyOrder).toBeUndefined();
  await page.keyboard.press('Escape');await expect(page.locator('.command-dial')).toHaveCount(0);
  await pilot.click();await page.locator('[data-command="guard"]').click();
  await expect.poll(async()=> (await battle(page)).partyOrder?.kind).toBe('guard');
  await page.reload();await enterGame(page);await expect(page.locator('.party-command-badge')).toBeVisible();
  await pilot.click();await page.locator('[data-command="auto"]').click();
  await expect.poll(async()=> (await battle(page)).partyOrder).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:info.outputPath('pilot-320.png')});
});

test('touch cancellation keeps automatic play and commands during replay only reserve the next round', async ({page}) => {
  await setup(page);
  const cdp=await page.context().newCDPSession(page);
  const face=(await page.locator('[data-pilot] .portrait-image').boundingBox())!;
  const point={x:face.x+face.width/2,y:face.y+face.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await expect(page.locator('.command-dial')).toBeVisible();
  const choice=(await page.locator('[data-command="attack"]').boundingBox())!;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:choice.x+choice.width/2,y:choice.y+choice.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('.command-dial')).toHaveCount(0);expect((await battle(page)).partyOrder).toBeUndefined();
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  const committed=await battle(page);
  await page.getByRole('button',{name:/行動を選ぶ$/}).click();
  await expect(page.locator('.command-dial__caption')).toContainText('次ラウンドに予約');
  await page.locator('[data-command="guard"]').click();
  await expect.poll(async()=> (await battle(page)).partyOrder?.kind).toBe('guard');
  const queued=await battle(page);expect(queued.events).toEqual(committed.events);expect(queued.seed).toBe(committed.seed);
});
