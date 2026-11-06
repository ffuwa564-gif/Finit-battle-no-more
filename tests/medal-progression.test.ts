import {describe,expect,it} from 'vitest';
import {applyCommand,createInitialSave} from '../src/application/game';
import {content} from '../src/content';
import {medalCatalog,medalById,medalProgress,medalRevealed,nextMedal,synchronizeMedals,validMedals,validateMedals} from '../src/domain/medals';
import {GEM_DEFINITIONS,emptyGemInventory,type MemoryGem} from '../src/domain/memory-gems';
import {roughMemoryGem,polishWindow} from '../src/domain/gem-polishing';
import {defaultHero,nodeLines,storyChapter} from '../src/domain/world-story';
import {assertSaveCompatibility} from '../src/platform/save';
import {decodeBackup,encodeBackup} from '../src/platform/save-backup';

const initial=()=>createInitialSave(content,42);
function stones():MemoryGem[]{return ['sanctuary','clock','grave'].map(f=>{const d=GEM_DEFINITIONS.find(d=>d.family===f)!;return{id:'family-'+f,defId:d.id,variant:d.variants[0],roll:{power:0,trait:'none',value:0}};});}
describe('expanded medal progression',()=>{
 it('keeps all eight routes valid, with reachable references and distinct tree cells',()=>{
  expect(medalCatalog.medals).toHaveLength(100);expect(medalCatalog.branches).toHaveLength(8);expect(validateMedals(content)).toEqual([]);
  const node=medalCatalog.medals[1],previous=node.column;node.column=medalCatalog.medals[0].column;
  const rank=node.rank;node.rank=0;
  try{expect(validateMedals(content).some(e=>e.includes('Overlapping'))).toBe(true);}finally{node.column=previous;node.rank=rank;}
 });
 it('awards The Broken Girl only after finishing its conversation, and keeps the title through backup',()=>{
  let s=applyCommand(initial(),{type:'worldStoryBegin',profile:defaultHero,from:'beginning'},content,{now:0});
  const record=(id:string)=>{const n=content.worldStory!.nodes.find(n=>n.id===id)!;for(const p of n.requiresNodes)if(!s.worldStory!.completed.includes(p))record(p);for(const d of n.requiresDungeons)if(!s.completedDungeonIds.includes(d))s.completedDungeonIds.push(d);if(!s.worldStory!.completed.includes(id))s.worldStory!.completed.push(id);};
  record('c1-return');for(const id of content.worldStory!.nodes.find(n=>n.id==='c2-after')!.requiresNodes)record(id);
  for(const id of content.worldStory!.nodes.find(n=>n.id==='c2-after')!.requiresDungeons)if(!s.completedDungeonIds.includes(id))s.completedDungeonIds.push(id);
  s.worldStory!.active={nodeId:'c2-after',line:0,replay:false};
  synchronizeMedals(s,content);expect(medalRevealed(medalById('broken-girl')!,s)).toBe(false);
  expect(()=>applyCommand(s,{type:'worldTalkFinish'},content)).toThrow();
  const closed=applyCommand(s,{type:'worldTalkClose'},content);expect(closed.medals?.earned).not.toContain('broken-girl');
  const node=content.worldStory!.nodes.find(n=>n.id==='c2-after')!;
  while(s.worldStory!.active!.line<nodeLines(node,s.worldStory!).length-1)s=applyCommand(s,{type:'worldTalkNext'},content);
  const before={gold:s.gold,stones:s.stones,seed:s.seed,partyIds:s.partyIds};
  s=applyCommand(s,{type:'worldTalkFinish'},content);
  expect(s.medals!.earned).toContain('broken-girl');expect(s).toMatchObject(before);
  s=applyCommand(s,{type:'medalTitle',medalId:'broken-girl'},content);
  const restored=decodeBackup(encodeBackup(s,content),content).save;
  expect(restored.medals!.titleId).toBe('broken-girl');expect(medalRevealed(medalById('broken-girl')!,restored)).toBe(true);
  s=applyCommand(s,{type:'medalSync'},content);expect(s.medals!.earned.filter(id=>id==='broken-girl')).toHaveLength(1);
 });
 it('does not reveal secret names through recommendations or accept them as early goals',()=>{
  const s=initial();s.medals={version:1,earned:medalCatalog.medals.filter(m=>!m.secret).map(m=>m.id),feats:[]};
  expect(nextMedal(s)).toBeUndefined();expect(medalRevealed(medalById('broken-girl')!,s)).toBe(false);
  expect(()=>applyCommand(s,{type:'medalTrack',medalId:'broken-girl'},content)).toThrow();
 });
 it('records historical conditions behind locked parents, even if the stones are consumed before unlocking',()=>{
  const s=initial();s.memoryGems=emptyGemInventory();s.memoryGems.items=stones();synchronizeMedals(s,content);
  expect(s.medals!.proofs!['gems-families']).toBe(3);expect(s.medals!.earned).not.toContain('gems-families');
  s.memoryGems.items=[{...stones()[0],roll:{power:67,trait:'none',value:0}}];synchronizeMedals(s,content);
  expect(s.medals!.earned).toContain('gems-families');
  s.memoryGems.items=[];synchronizeMedals(s,content);expect(medalProgress(medalById('gems-families')!,s,content)).toEqual({value:3,target:3});
  expect(decodeBackup(encodeBackup(s,content),content).save.medals!.proofs).toEqual(s.medals!.proofs);
 });
 it('ignores sealed T6 results and pending candidates, counting accepted inventory only',()=>{
  const s=initial(),gem:MemoryGem={...stones()[0],id:'six',roll:{power:220,trait:'none',value:0}};
  s.memoryGems=emptyGemInventory();s.memoryGems.rough=[roughMemoryGem(gem,1)];s.memoryGems.pending={gemId:'absent',candidate:gem};
  expect(medalProgress(medalById('gems-six')!,s,content).value).toBe(0);
  s.memoryGems.items=[gem];expect(medalProgress(medalById('gems-six')!,s,content).value).toBe(1);
  expect(medalProgress(medalById('gems-types')!,{...s,memoryGems:{...s.memoryGems,items:[gem,{...gem,id:'another',variant:'echo'}]}},content).value).toBe(1);
 });
 it('awards a newly polished T6 stone through real commands, without rerolling it',()=>{
  let s=initial();s.memoryGems=emptyGemInventory();s.memoryGems.items=stones();
  const gem:MemoryGem={...stones()[0],id:'polished-six',roll:{power:220,trait:'none',value:0}};
  s.memoryGems.rough=[roughMemoryGem(gem,1)];s=applyCommand(s,{type:'startGemPolish',rawId:gem.id},content,{now:1000});
  expect(s.medals?.earned??[]).not.toContain('gems-six');let time=1000;
  for(let n=0;n<30&&s.memoryGems!.polish;n++){
   const session=s.memoryGems!.polish!,raw=s.memoryGems!.rough![0];time=Math.max(time+280,session.lastTapAt+280);
   while(Math.abs(((polishWindow(session,raw,time).angle-polishWindow(session,raw,time).center+540)%360)-180)>8)time+=5;
   s=applyCommand(s,{type:'tapGemPolish',rawId:gem.id},content,{now:time});
  }
  expect(s.memoryGems!.polish).toBeUndefined();expect(s.memoryGems!.items.find(g=>g.id===gem.id)).toEqual(gem);
  expect(s.medals!.earned).toContain('gems-six');expect(s.seed).toBe(42);
 });
 it('counts actual stone crafting immediately while keeping medals cosmetic',()=>{
  const s=initial();s.memoryGems=emptyGemInventory();s.memoryGems.dust.grave=6;s.memoryGems.seen=['night-dew'];
  const next=applyCommand(s,{type:'craftMemoryGem',defId:'night-dew',variant:'pure'},content);
  expect(next.medals!.earned).toContain('gems-first');expect(next.memoryGems!.dust.grave).toBe(0);
  expect(next.gold).toBe(s.gold);expect(next.stones).toBe(s.stones);expect(next.seed).toBe(s.seed);
 });
 it('extends existing tower milestones to floor 100 from confirmed tower records',()=>{
  const s=initial();s.completedDungeonIds=[...content.chapters![0].dungeonIds];s.towerRecord={version:'1.10',completedFloors:Array.from({length:100},(_,i)=>i+1),legacyHighest:0};
  synchronizeMedals(s,content);expect(s.medals!.earned).toEqual(expect.arrayContaining(['explore-fifty','explore-seventy-five','explore-hundred']));
 });
 it('lets carried chapters earn reading proofs without changing travel, plot choices or the current chapter',()=>{
  const older=initial();older.completedDungeonIds=content.chapters!.slice(0,2).flatMap(ch=>ch.dungeonIds);
  let s=applyCommand(older,{type:'worldStoryBegin',profile:defaultHero,from:'current'},content,{now:0});
  s=applyCommand(s,{type:'worldTravel',destinationId:'hub-infirmary'},content,{now:1000});
  const journey=structuredClone(s.worldStory),chapter=storyChapter(s.worldStory!,content.worldStory!)!.number;
  s=applyCommand(s,{type:'worldTalk',nodeId:'c2-after'},content,{now:1000000});
  expect(s.worldStory!.active!.recall).toBe(true);expect(s.worldStory!.journey).toEqual(journey!.journey);
  expect(()=>applyCommand(s,{type:'worldTalkFinish'},content)).toThrow();
  const closed=applyCommand(s,{type:'worldTalkClose'},content);expect(closed.medals?.proofs?.['broken-girl']??0).toBe(0);
  s=applyCommand(s,{type:'worldTalkNext'},content);s=decodeBackup(encodeBackup(s,content),content).save;
  expect(s.worldStory!.active!.recall).toBe(true);
  const node=content.worldStory!.nodes.find(n=>n.id==='c2-after')!;
  while(s.worldStory!.active!.line<nodeLines(node,s.worldStory!).length-1)s=applyCommand(s,{type:'worldTalkNext'},content);
  s=applyCommand(s,{type:'worldTalkFinish'},content);
  expect(s.medals!.proofs!['broken-girl']).toBe(1);expect(s.worldStory).toEqual(journey);
  expect(storyChapter(s.worldStory!,content.worldStory!)!.number).toBe(chapter);expect(s.seed).toBe(older.seed);
  expect(()=>applyCommand(s,{type:'worldTalk',nodeId:'c7-door'},content)).toThrow();
  const forged=structuredClone(s);forged.worldStory!.active={nodeId:'c7-door',line:0,replay:false,recall:true};
  expect(()=>assertSaveCompatibility(forged,content)).toThrow();
 });
 it('does not rewrite a carried chapter’s decisions when selecting a response during a reading',()=>{
  const older=initial();older.completedDungeonIds=content.chapters!.slice(0,6).flatMap(ch=>ch.dungeonIds);
  let s=applyCommand(older,{type:'worldStoryBegin',profile:defaultHero,from:'current'},content,{now:0});
  const before=structuredClone(s.worldStory),node=content.worldStory!.nodes.find(n=>n.id==='c6-breakfast')!;
  s=applyCommand(s,{type:'worldTalk',nodeId:node.id},content);
  while(s.worldStory!.active!.line<node.lines.length-1)s=applyCommand(s,{type:'worldTalkNext'},content);
  expect(()=>applyCommand(s,{type:'worldTalkFinish'},content)).toThrow();
  s=applyCommand(s,{type:'worldTalkChoice',choiceId:node.choices![0].id},content);
  while(s.worldStory!.active!.line<nodeLines(node,s.worldStory!).length-1)s=applyCommand(s,{type:'worldTalkNext'},content);
  s=applyCommand(s,{type:'worldTalkFinish'},content);
  expect(s.worldStory).toEqual(before);expect(s.medals!.proofs!['story-breakfast']).toBe(1);
  expect(decodeBackup(encodeBackup(s,content),content).save.worldStory).toEqual(before);
 });
 it('accepts older medal records without proofs and rejects malformed or unknown proof values',()=>{
  const older={version:1,earned:['craft-bench'],feats:[],titleId:'craft-bench'};
  expect(validMedals(older)).toBe(true);
  for(const proofs of [{missing:1},{'gems-six':2},{'gems-six':-1},{'gems-six':.5},{'gems-six':NaN}])expect(validMedals({...older,proofs})).toBe(false);
  expect(validMedals({...older,proofs:{'gems-six':1}})).toBe(true);
 });
});
