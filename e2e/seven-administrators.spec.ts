import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
test.use({viewport:{width:390,height:844}});
/** Story graph fixture: clears are supplied, never presented as combat verification. */
async function ready(page:Page,target:string,open=true){
 await page.goto('/#dungeons');await enterGame(page);
 const result=await page.evaluate(async({target,open})=>{
  const {content}=await import('/src/content/index.ts');
  const {applyCommand}=await import('/src/application/game.ts');
  const {loadSave,persistSave}=await import('/src/platform/save.ts');
  const {storyNext,nodeLines,defaultHero}=await import('/src/domain/world-story.ts');
  const {emptyIndustry}=await import('/src/domain/industry.ts');
  let s=(await loadSave())!;const revision=s.revision;
  s.completedDungeonIds=content.chapters!.flatMap(c=>c.dungeonIds);
  s=applyCommand(s,{type:'worldStoryBegin',profile:defaultHero,from:'current'},content);
  for(let i=0;i<100;i++){
   const next=storyNext(s,content.worldStory!);if(!next?.node)throw Error('Missing story step');
   const n=next.node;
   if(next.recipeId){s.industry??=emptyIndustry(0);s.industry.stock[next.recipeId]=1;}
   s=applyCommand(s,{type:'worldTravel',destinationId:n.hubId},content,{now:1000});
   if(n.id===target&&!open)break;
   s=applyCommand(s,{type:'worldTalk',nodeId:n.id},content,{now:100000});
   if(n.id===target)break;
   while(s.worldStory!.active){
    const a=s.worldStory!.active!;
    if(a.line===nodeLines(n,s.worldStory!).length-1){
     if(n.choices&&!a.choiceId)s=applyCommand(s,{type:'worldTalkChoice',choiceId:n.choices[0].id},content);
     else s=applyCommand(s,{type:'worldTalkFinish'},content);
    }else s=applyCommand(s,{type:'worldTalkNext'},content);
   }
  }
  const n=content.worldStory!.nodes.find(n=>n.id===target)!;
  if(open&&s.worldStory!.active?.nodeId!==target)throw Error('Target not reached');
  s.revision=revision+1;await persistSave(s,revision);
  return{lines:n.lines.length,gold:s.gold,stones:s.stones,seed:s.seed};
 },{target,open});
 await page.reload();await enterGame(page);return result;
}

test('new narrative-only speakers remain readable on mobile, save mid-line, and translate into English',async({page},info)=>{
 await ready(page,'seven-four-girls');
 await expect(page.locator('.world-conversation')).toHaveAttribute('data-scene','seven-four-girls');
 await page.getByRole('button',{name:'次の台詞',exact:true}).click();
 await expect(page.locator('.world-conversation__line')).toHaveAttribute('data-world-line','1');
 await expect(page.locator('.novel-speaker')).toHaveText('トワ');
 await page.reload();await enterGame(page);
 await expect(page.locator('.world-conversation__line')).toHaveAttribute('data-world-line','1');
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await expect(page.locator('#world-novel-text')).toBeVisible();
 }
 await page.screenshot({path:info.outputPath('four-girls-mobile.png')});
 await page.getByRole('button',{name:'会話ログ',exact:true}).click();await expect(page.locator('.novel-log')).toContainText('トワ');
 await page.getByRole('button',{name:'物語に戻る',exact:true}).click();
 await page.getByRole('button',{name:'会話を閉じる',exact:true}).click();await expect(page.locator('.world-conversation')).toHaveCount(0);
 await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');const {applyCommand}=await import('/src/application/game.ts');
  let s=(await loadSave())!;const r=s.revision;s=applyCommand(s,{type:'worldTalk',nodeId:'seven-four-girls'},content,{now:1000000});await persistSave(s,r);
 });
 await page.reload();await page.locator('.title-screen__start').click();await expect(page.locator('.title-screen')).toHaveCount(0);await page.getByRole('button',{name:'Next Line',exact:true}).click();
 await expect(page.locator('.novel-speaker')).toHaveText('Towa');
 expect(await page.locator('.world-conversation').innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
});

test('the arc remains the recommended next action after chapter seven and its ending can be reread in the journal',async({page},info)=>{
 await ready(page,'seven-garden-siege',false);
 await expect(page.locator('.world-next-action')).toContainText('庭へ来た七人');
 await page.locator('.world-next-action').getByRole('button').first().click();
 await page.getByRole('button',{name:'声をかける',exact:true}).click();
 await expect(page.locator('.world-conversation')).toHaveAttribute('data-scene','seven-garden-siege');
 await page.screenshot({path:info.outputPath('seven-siege-mobile.png')});
 await page.getByRole('button',{name:'会話を閉じる',exact:true}).click();await expect(page.locator('.world-conversation')).toHaveCount(0);
 // Continue the authored graph with actual story commands, using the same fixture approach.
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');const {applyCommand}=await import('/src/application/game.ts');const {storyNext,nodeLines}=await import('/src/domain/world-story.ts');
  let s=(await loadSave())!;const r=s.revision;
  for(let i=0;i<20&&storyNext(s,content.worldStory!);i++){
   const n=storyNext(s,content.worldStory!)!.node!;
   s=applyCommand(s,{type:'worldTravel',destinationId:n.hubId},content,{now:1000});s=applyCommand(s,{type:'worldTalk',nodeId:n.id},content,{now:100000});
   while(s.worldStory!.active!.line<nodeLines(n,s.worldStory!).length-1)s=applyCommand(s,{type:'worldTalkNext'},content);
   s=applyCommand(s,{type:'worldTalkFinish'},content);
  }
  s.revision=r+1;await persistSave(s,r);
 });
 await page.reload();await enterGame(page);
 // Open the existing objective dock to reach the journal.
 await page.locator('.world-next-action').getByRole('button').first().click();
 const journal=page.getByRole('dialog',{name:'旅の記録',exact:true});await expect(journal).toContainText('七管理者編');
 await journal.getByRole('button',{name:'まずは、食べましょうか',exact:false}).click();
 await expect(page.locator('.world-conversation')).toHaveAttribute('data-scene','seven-breakfast');
 const count=await page.evaluate(async()=>(await(await import('/src/platform/save.ts')).loadSave())!.worldStory!.completed.filter(id=>id.startsWith('seven-')).length);
 expect(count).toBe(16);
});

test('first-time chapter one dialogue shows the seven claims immediately while keeping the patrol instructions readable',async({page},info)=>{
 await page.goto('/#dungeons');await enterGame(page);
 await page.evaluate(async()=>{
  const {content}=await import('/src/content/index.ts');const {applyCommand}=await import('/src/application/game.ts');const {loadSave,persistSave}=await import('/src/platform/save.ts');const {defaultHero}=await import('/src/domain/world-story.ts');
  let s=(await loadSave())!;const r=s.revision;s=applyCommand(s,{type:'worldStoryBegin',profile:defaultHero,from:'beginning'},content);const n=content.worldStory!.nodes.find(n=>n.id==='c1-job')!;
  s=applyCommand(s,{type:'worldTravel',destinationId:n.hubId},content,{now:1000});s=applyCommand(s,{type:'worldTalk',nodeId:n.id},content,{now:100000});s.revision=r+1;await persistSave(s,r);
 });
 await page.reload();await enterGame(page);
 await expect(page.locator('.world-conversation__line')).toContainText('七つの印');
 await page.getByRole('button',{name:'次の台詞',exact:true}).click();await expect(page.locator('.world-conversation__line')).toContainText('私の名前');
 await page.getByRole('button',{name:'次の台詞',exact:true}).click();await expect(page.locator('.world-conversation__line')).toContainText('引き取る権利');
 await expect(page.locator('.world-conversation__line')).toContainText('地図の聖堂');
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});
  const text=(await page.locator('#world-novel-text').boundingBox())!,footer=(await page.locator('.novel-footer').boundingBox())!;
  expect(text.y).toBeGreaterThan(0);expect(text.y+text.height).toBeLessThan(footer.y);expect(footer.y+footer.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 }
 await page.screenshot({path:info.outputPath('first-chapter-seven-seals.png')});
});
