import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page: Page, caster = 'seris') {
  await page.goto('/'); await enterGame(page);
  await page.evaluate(async id => {
    const { content } = await import('/src/content/index.ts');
    const { createBattle, advanceReplay } = await import('/src/domain/engine.ts');
    const { loadSave, persistSave } = await import('/src/platform/save.ts');
    const previous = (await loadSave())!, save = structuredClone(previous);
    if(!save.partyIds.includes(id)) {
      save.ownedIds=[...new Set([...save.ownedIds,id])];
      const removed=save.partyIds[0];save.partyIds[0]=id;
      if(save.leaderId===removed)save.leaderId=id;
    }
    let battle = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 0, 42, 'ultimate-media');
    while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    for (const unit of battle.units) {
      if (unit.side === 'party') { unit.hp = Math.floor(unit.maxHp * .5); unit.speed = unit.characterId === id ? 100 : 1; unit.ultimateCharge = unit.characterId === id ? 100 : 0; unit.ultimateQueued = unit.characterId === id; }
      else { unit.hp = unit.maxHp = 100000; unit.attack = 0; unit.speed = 0; }
    }
    save.battle = battle; save.revision = previous.revision + 1;
    await persistSave(save, previous.revision);
  }, caster);
  await page.reload(); await enterGame(page);
  await page.getByRole('button', { name: 'ラウンドを進める', exact: true }).click();
  await expect(page.locator('.ultimate-cinematic')).toBeVisible();
}

for (const [caster, clip, theme] of [['seris','blade','blade'],['noelle','arcane','stars'],['kuzuha','thunder','eclipse'],['elaine','sanctuary','bloom'],['liora','shield','aegis'],['iris','rally','dawn'],['nox','bits','clockwork'],['lunette','rabbits','rabbit-bits'],['lunette-awakened','awakened-rabbits','rabbit-bits']]) {
  test(`${clip} renders a transparent Pixi effect over the battlefield`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page, caster);
    const effect = page.locator('.ultimate-cinematic');
    // Observe before the phase begins; CDP polling plus screenshots can outlast a tail.
    // Hold the actual CSS opacity transition at 250 ms to check its intermediate frame.
    const tailSample = page.evaluate(() => new Promise<{opacity:number;recipients?:string}>((resolve,reject) => {
      const element=document.querySelector<HTMLElement>('.ultimate-cinematic')!;
      const observer=new MutationObserver(() => {
        if(element.dataset.phase!=='tail')return;
        observer.disconnect();
        requestAnimationFrame(() => {
          if(element.dataset.visual==='rabbit-bits'){resolve({opacity:Number(getComputedStyle(element).opacity)});return;}
          const fade=element.getAnimations().find(animation=>animation instanceof CSSTransition && animation.transitionProperty==='opacity');
          if(!fade){reject(new Error('Expected an opacity transition on the ultimate tail'));return;}
          fade.pause();fade.currentTime=250;
          const recipients=element.querySelector('.ultimate-recipients');
          resolve({opacity:Number(getComputedStyle(element).opacity),recipients:recipients?getComputedStyle(recipients).opacity:undefined});
        });
      });
      observer.observe(element,{attributes:true,attributeFilter:['data-phase']});
    }));
    await expect(effect).toHaveAttribute('data-visual',theme);
    await expect(effect.locator('video')).toHaveCount(0);
    await expect(effect).toHaveAttribute('data-fx-state', 'pixi');
    await expect(effect.locator('canvas')).toBeVisible();
    await expect(effect).toHaveAttribute('data-phase', 'impact');
    if (['sanctuary','shield','rally'].includes(clip)) await expect(effect.locator('.ultimate-recipients .ultimate-recipient__art')).toHaveCount(4);
    await expect(effect.locator('.ultimate-cinematic__finish')).toHaveCount(0);
    await expect(effect.locator('.ultimate-cinematic__intro')).toHaveCSS('opacity', '0');
    await page.waitForTimeout(220);
    await page.screenshot({ path: `artifacts/ultimates/${clip}-impact-390.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const fade = await tailSample;
    expect(fade.opacity).toBeGreaterThan(0);
    if(theme==='rabbit-bits')expect(fade.opacity).toBe(1); // Canvas owns barrage, finisher and fade.
    else expect(fade.opacity).toBeLessThan(.95);
    // Sample recipients at the same frame, even when screenshot/CI work takes time.
    if (['sanctuary','shield','rally'].includes(clip)) expect(fade.recipients).toBe('1');
  });
}

test('Lunette fallback keeps the four rabbit illustrations instead of a generic star', async ({ page }) => {
  await page.route('**/src/ui/ultimate-pixi.ts*', route => route.abort());
  await prepare(page, 'lunette');
  const effect = page.locator('.ultimate-cinematic');
  await expect(effect).toHaveAttribute('data-visual', 'rabbit-bits');
  await expect(effect).toHaveAttribute('data-fx-state', 'fallback');
  await expect(effect.locator('.ultimate-fallback--rabbit-bits image')).toHaveCount(4);
  await expect(effect.locator('.rabbit-fallback-beam')).toHaveCount(4);
});

test('a failed renderer import uses the fallback and still finishes the round', async ({ page }) => {
  await page.route('**/src/ui/ultimate-pixi.ts*', route => route.abort());
  await prepare(page);
  const effect = page.locator('.ultimate-cinematic');
  await expect(effect).toHaveAttribute('data-fx-state', 'fallback');
  await expect(effect.locator('.ultimate-fallback')).toBeAttached();
  await expect(effect).toHaveAttribute('data-phase', 'impact');
  await expect(page.locator('.combat-number--ultimate')).not.toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ラウンドを進める', exact: true })).toBeVisible({ timeout: 20000 });
});

test('unavailable WebGL falls back instead of holding combat', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind: any, options: any) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
      return original.call(this, kind, options);
    } as typeof original;
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page);
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-fx-state', 'fallback');
  await page.getByRole('button', { name: '次の演出へ', exact: true }).click();
  await expect(page.locator('.ultimate-cinematic')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('data saving does not load Pixi or download effect videos', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = new EventTarget(); Object.assign(connection, { saveData: true });
    Object.defineProperty(navigator, 'connection', { value: connection });
  });
  const requests: string[] = [];
  page.on('request', request => { if (/ultimate-fx-.*\.mp4|ultimate-pixi|lunette-bit-/.test(request.url())) requests.push(request.url()); });
  await prepare(page,'lunette');
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-fx-state', 'static');
  await expect(page.locator('.ultimate-pixi-canvas')).toHaveCount(0);
  await expect(page.locator('.ultimate-whiteout')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('skipping a cut-in cancels its delayed impact sound and destroys its canvas', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__impactSounds = [];
    window.addEventListener('game:se', (event: Event) => { const kind = (event as CustomEvent).detail.kind; if (kind.startsWith('ultimate-')) (window as any).__impactSounds.push(kind); });
  });
  await prepare(page);
  await page.getByRole('button', { name: '次の演出へ', exact: true }).click();
  await expect(page.locator('.ultimate-pixi-canvas')).toHaveCount(0);
  await page.waitForTimeout(1800);
  expect(await page.evaluate(() => (window as any).__impactSounds)).toEqual([]);
});

test('losing the live WebGL context releases the canvas and keeps the fallback', async ({ page }) => {
  await prepare(page);
  const effect = page.locator('.ultimate-cinematic');
  await expect(effect).toHaveAttribute('data-fx-state','pixi');
  await effect.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', {cancelable:true})));
  await expect(effect).toHaveAttribute('data-fx-state','fallback');
  await expect(effect.locator('canvas')).toHaveCount(0);
  await expect(effect.locator('.ultimate-fallback')).toBeAttached();
  await page.getByRole('button', {name:'次の演出へ',exact:true}).click();
  await expect(page.locator('.ultimate-cinematic')).toHaveCount(0);
});

test('returning from a hidden tab does not replay a missed ultimate impact', async ({page}) => {
  await page.addInitScript(()=>{
    (window as any).__fakeHidden=false;(window as any).__hiddenImpacts=[];
    Object.defineProperty(document,'hidden',{get:()=>(window as any).__fakeHidden});
    window.addEventListener('game:se',event=>{const kind=(event as CustomEvent).detail.kind;if(kind.startsWith('ultimate-'))(window as any).__hiddenImpacts.push(kind);});
  });
  await prepare(page);
  await page.evaluate(()=>{(window as any).__fakeHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(1600);
  await page.evaluate(()=>{(window as any).__fakeHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(150);
  expect(await page.evaluate(()=>(window as any).__hiddenImpacts)).toEqual([]);
});

test('speed change after impact retains the voice so NEXT can stop its tail', async ({page}) => {
  await page.addInitScript(()=>{
    (window as any).__tailStops=0;
    const stop=AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop=function(...args:any[]){
      if(this.buffer && Math.abs(this.buffer.duration-1.05)<.001)(window as any).__tailStops++;
      return stop.apply(this,args as any);
    };
  });
  await prepare(page);
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-phase','impact');
  await page.getByTitle('演出速度',{exact:true}).click();
  await page.getByRole('button',{name:'次の演出へ',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__tailStops)).toBeGreaterThan(0);
});

test('Lunette has no extra buff cue and removes her whiteout when skipped', async ({page}) => {
  await page.addInitScript(()=>{
    (window as any).__summonCues=[];
    window.addEventListener('game:se',event=>{if((event as CustomEvent).detail.kind==='buff')(window as any).__summonCues.push(performance.now());});
  });
  await prepare(page,'lunette');
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-phase','effect');
  expect(await page.evaluate(()=>(window as any).__summonCues.length)).toBe(0);
  const peak=page.locator('.ultimate-whiteout').evaluate(e=>new Promise<boolean>(resolve=>{const watch=()=>{if(Number((e as HTMLElement).style.opacity)>.98){observer.disconnect();resolve(true);}};const observer=new MutationObserver(watch);observer.observe(e,{attributes:true,attributeFilter:['style']});watch();}));
  await page.getByTitle('演出速度',{exact:true}).click();
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-phase','impact');
  expect(await page.evaluate(()=>(window as any).__summonCues.length)).toBe(0);
  const whiteout=page.locator('.battle-layout > .ultimate-whiteout');
  expect(await peak).toBe(true);
  const flash=await whiteout.boundingBox(),battle=await page.locator('.battle-layout').boundingBox();
  expect(flash!.width).toBeGreaterThan(battle!.width-5);
  expect(flash!.height).toBeGreaterThan(battle!.height-5);
  expect(flash!.y).toBeCloseTo(battle!.y+1,0);
  await page.getByRole('button',{name:'次の演出へ',exact:true}).click();
  await expect(page.locator('.ultimate-whiteout')).toHaveCount(0);
  await prepare(page,'lunette');
  await page.evaluate(()=>(window as any).__summonCues=[]);
  await page.getByRole('button',{name:'次の演出へ',exact:true}).click();
  await page.waitForTimeout(1100);
  expect(await page.evaluate(()=>(window as any).__summonCues)).toEqual([]);
});

test('Lunette reacts through the late volley, holds HP until the finisher and cleans up on skip',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await prepare(page,'lunette-awakened');
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-phase','impact');
  await expect(page.locator('.combat-number--ultimate')).toHaveCount(0);
  const result=await page.evaluate(()=>new Promise<{shots:number[];motion:number;commands:number;hud:number;numberAt:number;finish:boolean}>(resolve=>{
    const art=document.querySelector<HTMLElement>('.enemy-page > .enemy-page-art, .enemy-page > .animated-illustration')!;
    const controls=document.querySelector<HTMLElement>('.battle-control-pad')!,hud=document.querySelector<HTMLElement>('.enemy-carousel-status')!;
    const c=controls.getBoundingClientRect(),h=hud.getBoundingClientRect(),start=performance.now();
    const shots=new Set<number>();let motion=0,commands=0,hudMotion=0,numberAt=-1;
    const sample=()=>{
      const now=performance.now()-start;shots.add(Number(art.dataset.rabbitShot??-1));
      motion=Math.max(motion,Math.abs(parseFloat(art.style.translate)||0));
      const cb=controls.getBoundingClientRect(),hb=hud.getBoundingClientRect();commands=Math.max(commands,Math.hypot(cb.x-c.x,cb.y-c.y));hudMotion=Math.max(hudMotion,Math.hypot(hb.x-h.x,hb.y-h.y));
      if(numberAt<0&&document.querySelector('.combat-number--ultimate'))numberAt=now;
      const white=document.querySelector<HTMLElement>('.ultimate-whiteout');
      if(white&&Number(white.style.opacity)>.98){resolve({shots:[...shots],motion,commands,hud:hudMotion,numberAt,finish:art.dataset.rabbitFinish==='true'});return;}
      if(now>4000)throw new Error('Finishing whiteout was not reached');
      requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
  }));
  expect(Math.max(...result.shots)).toBe(15);expect(result.shots.filter(x=>x>=0).length).toBeGreaterThanOrEqual(10);
  expect(result.motion).toBeGreaterThan(3);expect(result.commands).toBeLessThan(.1);expect(result.hud).toBeLessThan(.1);
  expect(result.numberAt).toBeGreaterThan(1100);expect(result.finish).toBe(true);
  await page.getByRole('button',{name:'次の演出へ',exact:true}).click();
  await expect(page.locator('.ultimate-whiteout')).toHaveCount(0);
  expect(await page.locator('.enemy-page > .enemy-page-art, .enemy-page > .animated-illustration').evaluate((e:HTMLElement)=>({translate:e.style.translate,scale:e.style.scale}))).toEqual({translate:'',scale:''});
});

test('Lunette speed changes retime the sounding volley without restarting it from zero',async({page})=>{
  await page.addInitScript(()=>{
    (window as any).__rabbitVoices=[];
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args:any[]){
      if(this.buffer&&this.buffer.duration>1.8&&this.buffer.duration<2.3)(window as any).__rabbitVoices.push({duration:this.buffer.duration,offset:args[1]??0});
      return start.apply(this,args as any);
    };
  });
  await prepare(page,'lunette');
  await expect(page.locator('.ultimate-cinematic')).toHaveAttribute('data-phase','impact');
  await page.waitForTimeout(180);
  await page.getByTitle('演出速度',{exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__rabbitVoices.filter((v:any)=>v.offset>0).length)).toBeGreaterThan(0);
  const voices=await page.evaluate(()=>(window as any).__rabbitVoices);
  expect(voices.some((v:any)=>Math.abs(v.duration-2.17)<.01)).toBe(true);
  expect(voices.some((v:any)=>Math.abs(v.duration-1.808)<.01&&v.offset>.1)).toBe(true);
  await page.getByRole('button',{name:'次の演出へ',exact:true}).click();
  await expect(page.locator('[data-rabbit-shot]')).toHaveCount(0);
});
