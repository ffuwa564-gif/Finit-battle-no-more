import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

async function blank(page: Page) {
  await page.route('**/__scene_probe', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><body><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;
    window.__vite_plugin_react_preamble_installed__=true;
  </script></body>` }));
  await page.goto('/__scene_probe');
  await page.waitForFunction(() => (window as any).__vite_plugin_react_preamble_installed__);
}

test('ambient motion continues, impacts wake immediately, and overlay pause reuses the renderer', async ({ page }) => {
  await blank(page);
  await page.clock.install({ time: new Date('2026-11-04T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-04T00:00:10Z'));
  await page.evaluate(() => {
    (window as any).sceneDraws = 0; (window as any).scenePrograms = 0;
    const draw = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (...args) { (window as any).sceneDraws++; return draw.apply(this,args); };
    const create = WebGLRenderingContext.prototype.createProgram;
    WebGLRenderingContext.prototype.createProgram = function () { (window as any).scenePrograms++; return create.call(this); };
  });
  await page.evaluate(async () => (await import('/e2e/fixtures/scene-optimization.tsx')).mount());
  await expect(page.locator('.scene-effects')).toHaveAttribute('data-fx-backend','webgl');
  await page.clock.runFor(200);
  const count = () => page.evaluate(() => (window as any).sceneDraws as number);
  let before = await count(); await page.clock.runFor(1000);
  const ambientFrames = ((await count())-before)/2;
  expect(ambientFrames).toBeGreaterThanOrEqual(10); expect(ambientFrames).toBeLessThanOrEqual(17);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('game:fx',{detail:{kind:'attack',x:120,y:120}})));
  // Allow one 30fps display interval, including the fake clock's 16ms quantization.
  before=await count();await page.clock.runFor(34);expect(await count()).toBeGreaterThan(before);
  before=await count();await page.clock.runFor(1000);
  expect(((await count())-before)/2).toBeGreaterThanOrEqual(25);
  const programs = await page.evaluate(() => (window as any).scenePrograms);
  await page.evaluate(() => (window as any).setSceneSuspended(true));
  await expect(page.locator('.scene-atmosphere--battle')).toHaveAttribute('data-suspended','true');
  await expect(page.locator('.scene-atmosphere--battle .scene-atmosphere__grain')).toHaveCSS('animation-play-state','paused');
  await expect(page.locator('.scene-atmosphere--memory')).toHaveAttribute('data-suspended','false');
  await expect(page.locator('.scene-atmosphere--memory .scene-atmosphere__grain')).toHaveCSS('animation-play-state','running');
  before=await count();await page.clock.runFor(1000);expect(await count()).toBe(before);
  await page.evaluate(() => (window as any).setSceneSuspended(false));
  await page.clock.runFor(200);expect(await count()).toBeGreaterThan(before);
  expect(await page.evaluate(() => (window as any).scenePrograms)).toBe(programs);
  await page.clock.runFor(3000);before=await count();await page.clock.runFor(1000);
  expect(((await count())-before)/2).toBeLessThanOrEqual(17);
});

test('optimized shaders preserve the released pixels for all cue kinds and clock rebasing', async ({ page }) => {
  await blank(page);
  // Immutable visual reference: original renderer from release source 96d2e00.
  const original=readFileSync(new URL('./fixtures/scene-renderer-96d2e00.ts.txt',import.meta.url),'utf8');
  const compiled=ts.transpileModule(original,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  await page.addScriptTag({type:'module',content:compiled+'\nwindow.baselineSceneRenderer=createSceneRenderer;'});
  const result=await page.evaluate(async()=>{
    const {createSceneRenderer}=await import('/src/platform/fx-renderer.ts');
    const makers=[(window as any).baselineSceneRenderer,createSceneRenderer];
    const surfaces=makers.map(make=>{const c=document.createElement('canvas');const renderer=make(c,'battle');if(!renderer)throw Error('GLSL failed');renderer.resize(160,160,1);renderer.render(0);return{renderer,gl:c.getContext('webgl')!};});
    const samples:any[]=[];
    const snapshot=(label:string,time:number)=>{
      const pixels=surfaces.map(({renderer,gl})=>{renderer.render(time);const data=new Uint8Array(160*160*4);gl.readPixels(0,0,160,160,gl.RGBA,gl.UNSIGNED_BYTE,data);if(gl.getError())throw Error('GL error');return data;});
      let max=0,total=0;for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);max=Math.max(max,d);total+=d;}
      samples.push({label,maxChannelDelta:max,meanChannelDelta:total/pixels[0].length});
    };
    snapshot('idle',1000);
    const kinds=['attack','area','heal','guard','buff','debuff','drop','wave','defeat']as const;
    for(const[index,kind]of kinds.entries()){
      const start=3000+index*3500;for(const{renderer}of surfaces){renderer.render(start);renderer.cue({kind,x:.5,y:.5,rarity:'epic'});}
      snapshot(kind,start+350);snapshot(kind+'-expired',start+3000);
    }
    snapshot('after-hour',3_600_000);
    // A cue between ambient frames must start at its real impact, not the old frame.
    surfaces[0].renderer.render(3_600_100);
    surfaces[0].renderer.cue({kind:'attack',x:.5,y:.5});
    surfaces[1].renderer.cue({kind:'attack',x:.5,y:.5},3_600_100);
    snapshot('timestamped-impact',3_600_450);
    for(const{renderer}of surfaces)renderer.dispose();return samples;
  });
  expect(result).toHaveLength(21);
  for(const r of result){expect(r.maxChannelDelta,r.label).toBeLessThanOrEqual(2);expect(r.meanChannelDelta,r.label).toBeLessThan(.01);}
});
