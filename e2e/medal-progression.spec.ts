import {test,expect} from '@playwright/test';
import {enterGame} from './boot';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../src/content/medals.json',import.meta.url),'utf8')) as {branches:{id:string;name:{ja:string;en:string}}[];medals:{branch:string}[]};
test.use({viewport:{width:390,height:844}});

test('six full branches stay readable and do not overlap at mobile and desktop widths in both languages',async({page},info)=>{
 await page.goto('/#codex/medals');await enterGame(page);
 await expect(page.locator('.medals__heading')).toContainText('/ 57');
 await expect(page.locator('.medals__tabs>.button')).toHaveCount(6);
 await expect(page.locator('.medal-node')).toHaveCount(13);
 await expect(page.locator('[data-medal-id="craft-hundred-thousand"]')).toContainText('???');
 for(const language of ['ja','en'] as const){
  if(language==='en'){
   await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#codex/medals');
  }
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});
   for(const branch of catalog.branches){
    await page.locator('.medals__tabs').getByRole('button',{name:branch.name[language],exact:true}).click();
    expect(await page.locator('.medal-node').count()).toBe(catalog.medals.filter(m=>m.branch===branch.id).length);
    const layout=await page.evaluate(()=>{
     const rects=[...document.querySelectorAll('.medal-node')].map(n=>n.getBoundingClientRect());
     const crosses:string[]=[];
     for(const path of document.querySelectorAll<SVGPathElement>('.medals__links path')){
      const svg=path.ownerSVGElement!,matrix=svg.getScreenCTM()!;
      const others=[...document.querySelectorAll<HTMLElement>('.medal-node')].filter(n=>n.dataset.medalId!==path.dataset.parent&&n.dataset.medalId!==path.dataset.child).map(n=>n.getBoundingClientRect());
      for(let i=1;i<120;i++){const p=path.getPointAtLength(path.getTotalLength()*i/120),q=new DOMPoint(p.x,p.y).matrixTransform(matrix);if(others.some(r=>q.x>r.left+2&&q.x<r.right-2&&q.y>r.top+2&&q.y<r.bottom-2)){crosses.push(path.dataset.child!);break;}}
     }
     return{crosses,overflow:document.documentElement.scrollWidth>innerWidth,overlap:rects.some((a,i)=>rects.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)),heights:rects.map(r=>r.height),clipped:[...document.querySelectorAll<HTMLElement>('.medal-node strong')].some(e=>e.scrollHeight>e.clientHeight+1)};
    });
    expect(layout.crosses,branch.id).toEqual([]);expect(layout.overflow,branch.id).toBe(false);expect(layout.overlap,branch.id).toBe(false);expect(layout.clipped,branch.id).toBe(false);expect(layout.heights.every(h=>h===132)).toBe(true);
   }
  }
  if(language==='en')expect(await page.locator('.medals').innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:info.outputPath('medal-tree-mobile.png')});
});

test('carried chapters can earn The Broken Girl by reading; incomplete readings give no credit and titles survive reload',async({page},info)=>{
 await page.goto('/#codex/medals');await enterGame(page);
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');const {applyCommand}=await import('/src/application/game.ts');const {defaultHero}=await import('/src/domain/world-story.ts');
  const s=(await loadSave())!,revision=s.revision;s.completedDungeonIds=content.chapters!.slice(0,2).flatMap(ch=>ch.dungeonIds);
  const next=applyCommand(s,{type:'worldStoryBegin',profile:defaultHero,from:'current'},content,{now:0});await persistSave(next,revision);
 });
 await page.reload();await enterGame(page);
 await page.locator('.medals__tabs').getByRole('button',{name:'物語',exact:true}).click();
 await expect(page.locator('.medals')).not.toContainText('壊れた彼女');
 // Read the prerequisite memories too, without pretending the carried chapters were read already.
 for(const id of ['story-garden','story-tea','broken-girl']){
  await page.locator(`[data-medal-id="${id}"]`).click();
  await page.getByRole('dialog').getByRole('button',{name:'引き継いだ章を読み返す',exact:true}).click();
  await expect(page.locator('.world-conversation')).toBeVisible();
  if(id==='broken-girl'){
   await page.getByRole('button',{name:'会話を閉じる',exact:true}).click();
   await expect(page.locator(`[data-medal-id="${id}"]`)).not.toHaveClass(/is-earned/);
   await page.locator(`[data-medal-id="${id}"]`).click();await page.getByRole('dialog').getByRole('button',{name:'引き継いだ章を読み返す',exact:true}).click();
  }
  for(let line=0;line<20&&await page.locator('.world-conversation').count();line++){
   const back=page.getByRole('button',{name:'勲章へ戻る',exact:true});
   if(await back.count()){await back.click();break;}
   await page.getByRole('button',{name:'次の台詞',exact:true}).click();
  }
  await expect(page.locator(`[data-medal-id="${id}"]`)).toHaveClass(/is-earned/);
 }
 await page.locator('[data-medal-id="broken-girl"]').click();
 const detail=page.getByRole('dialog',{name:'壊れた彼女',exact:true});await expect(detail).toContainText('今日は眠っています');
 await detail.getByRole('button',{name:'称号にする',exact:true}).click();await expect(detail.getByRole('button',{name:'称号を外す',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('broken-girl-medal.png')});
 await detail.getByRole('button',{name:'閉じる',exact:true}).click();await page.reload();await enterGame(page);
 await expect(page.locator('.medals__heading')).toContainText('壊れた彼女');
 const state=await page.evaluate(async()=>{const s=(await(await import('/src/platform/save.ts')).loadSave())!;return{completed:s.worldStory!.completed,carried:s.worldStory!.carriedChapters,earned:s.medals!.earned};});
 expect(state.completed).toEqual([]);expect(state.carried).toEqual([1,2]);expect(state.earned.filter(id=>id==='broken-girl')).toHaveLength(1);
});

test('stone medals open the real stone inventory and secret-only unfinished collections are not announced as complete',async({page})=>{
 await page.goto('/#codex/medals');await enterGame(page);
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');const {applyCommand}=await import('/src/application/game.ts');const {emptyGemInventory,GEM_DEFINITIONS}=await import('/src/domain/memory-gems.ts');
  const s=(await loadSave())!,r=s.revision;s.memoryGems=emptyGemInventory();const d=GEM_DEFINITIONS[0];s.memoryGems.items=[{id:'medal-stone',defId:d.id,variant:d.variants[0]}];await persistSave(applyCommand(s,{type:'medalSync'},content),r);
 });
 await page.reload();await enterGame(page);await page.locator('.medals__tabs').getByRole('button',{name:'記憶石',exact:true}).click();
 await page.locator('[data-medal-id="gems-first"]').click();await page.getByRole('dialog').getByRole('button',{name:'記憶石を開く',exact:true}).click();await expect(page).toHaveURL(/#bag\/gems$/);
 await page.goto('/#codex/medals');
 await page.evaluate(async()=>{
  const {loadSave,persistSave}=await import('/src/platform/save.ts');const {medalCatalog}=await import('/src/domain/medals.ts');
  const s=(await loadSave())!,r=s.revision;s.medals={version:1,earned:medalCatalog.medals.filter(m=>!m.secret).map(m=>m.id),feats:[]};s.revision++;await persistSave(s,r);
 });
 await page.reload();await enterGame(page);await expect(page.locator('.medals__complete')).toHaveCount(0);
 await expect(page.locator('.medals__heading')).toContainText('55 / 57');
});
