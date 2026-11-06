import {describe,it,expect} from 'vitest';
import {content,validateContent} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import {defaultHero,nodeLines,storyActors,storyChapter,storyNext,storyNodeAvailable,worldStorySupportingSpeakers,type WorldStoryNode} from '../src/domain/world-story';
import {currentWorldObjective} from '../src/domain/world-objective';
import {emptyIndustry} from '../src/domain/industry';
import {assertSaveCompatibility} from '../src/platform/save';
import {decodeBackup,encodeBackup} from '../src/platform/save-backup';
import {migrateSaveTo110} from '../src/platform/save-migration';
import {validateWorldStoryContent} from '../src/content/world-story-validation';
import type {GameSave} from '../src/domain/types';
const def=content.worldStory!;
const scenes=def.nodes.filter(n=>n.continuation);
const begin=()=>applyCommand(createInitialSave(content,42),{type:'worldStoryBegin',profile:defaultHero,from:'beginning'},content);
function finish(s:GameSave,n:WorldStoryNode){
 s=applyCommand(s,{type:'worldTravel',destinationId:n.hubId},content,{now:1000});
 s=applyCommand(s,{type:'worldTalk',nodeId:n.id},content,{now:100000});
 for(let i=0;i<40;i++){
  const active=s.worldStory!.active!;
  if(active.line===nodeLines(n,s.worldStory!).length-1){
   if(n.choices&&!active.choiceId){s=applyCommand(s,{type:'worldTalkChoice',choiceId:n.choices[0].id},content);continue;}
   return applyCommand(s,{type:'worldTalkFinish'},content);
  }
  s=applyCommand(s,{type:'worldTalkNext'},content);
 }
 throw Error('Dialogue failed to finish');
}
function advanceTo(id:string){
 let s=begin();
 for(let i=0;i<220;i++){
  const next=storyNext(s,def);if(next?.node?.id===id)return s;
  if(!next)throw Error('Missing next scene '+id);
  if(next.recipeId){s.industry??=emptyIndustry(0);s.industry.stock[next.recipeId]=1;}
  if(next.node)s=finish(s,next.node);
  else s.completedDungeonIds.push(next.dungeonId!); // Graph fixture; no combat outcome is claimed.
 }
 throw Error('Graph did not reach '+id);
}
describe('seven administrators playable story',()=>{
 it('validates sixteen bilingual scenes and all seven managers, without new portraits or campaign gates',()=>{
  expect(validateContent(content)).toEqual([]);expect(scenes).toHaveLength(16);
  for(const n of scenes){expect(n.optional&&n.ambient).toBe(true);expect(n.lines.length).toBeLessThanOrEqual(12);}
  const speakers=new Set(scenes.flatMap(n=>n.lines.map(l=>l.speaker)));
  for(const id of ['garden-woman','ivra','zakuro','vesper','shion','azha','rize','towa','utsushi','ashita','guest'])expect(speakers.has(id)).toBe(true);
  expect(worldStorySupportingSpeakers.rize).not.toBe(content.characters.find(c=>c.id==='lisette')!.name);
 });
 it('keeps early-game goals intact and only recommends interludes after their real prerequisites',()=>{
  const s=begin();expect(storyNext(s,def)?.node?.id).toBe('c1-job');
  expect(storyNodeAvailable(scenes[0],s,def)).toBe(false);
  expect(()=>applyCommand(s,{type:'worldTalk',nodeId:scenes[0].id},content)).toThrow();
  const ready=advanceTo('seven-first-warrant');expect(currentWorldObjective(ready,content)).toMatchObject({kind:'talk',nodeId:'seven-first-warrant',goal:{ja:'七管理者編'}});
  const actor=storyActors(ready,def).find(a=>a.actorId===scenes[0].actorId)!;expect(actor.node.id).toBe(scenes[0].id);
 });
 it('does not infer new interlude readings from carried chapters',()=>{
  const old=createInitialSave(content,42);old.completedDungeonIds=content.chapters!.slice(0,6).flatMap(c=>c.dungeonIds);
  const s=applyCommand(old,{type:'worldStoryBegin',profile:defaultHero,from:'current'},content);
  expect(storyNodeAvailable(scenes[0],s,def)).toBe(true);expect(storyNodeAvailable(scenes[1],s,def)).toBe(false);
  const forged=structuredClone(s);forged.worldStory!.completed.push(scenes[1].id);expect(()=>assertSaveCompatibility(forged,content)).toThrow();
 });
 it('continues after chapter seven, finishes the entire arc, and changes no resources or campaign rewards',()=>{
  let s=advanceTo('seven-garden-siege');expect(storyChapter(s.worldStory!,def)).toBeUndefined();
  const before={gold:s.gold,stones:s.stones,seed:s.seed,partyIds:s.partyIds,completedDungeonIds:[...s.completedDungeonIds]};
  for(let i=0;i<20&&storyNext(s,def);i++){
   const n=storyNext(s,def)!.node!;expect(n.continuation).toBe(true);
   expect(storyActors(s,def).find(a=>a.actorId===n.actorId)!.node.id).toBe(n.id);
   s=finish(s,n);expect(()=>assertSaveCompatibility(s,content)).not.toThrow();
  }
  expect(s.worldStory!.completed).toEqual(expect.arrayContaining(scenes.map(n=>n.id)));
  expect(currentWorldObjective(s,content).kind).toBe('done');expect(s).toMatchObject(before);
  expect(new Set(s.worldStory!.completed).size).toBe(s.worldStory!.completed.length);
  const replay=finish(s,scenes.at(-1)!);expect(replay.worldStory!.completed).toEqual(s.worldStory!.completed);
 });
 it('persists mid-scene without granting reading credit on close, and preserves old save positions',()=>{
  let s=advanceTo('seven-first-warrant');s=applyCommand(s,{type:'worldTravel',destinationId:scenes[0].hubId},content,{now:1000});s=applyCommand(s,{type:'worldTalk',nodeId:scenes[0].id},content,{now:100000});s=applyCommand(s,{type:'worldTalkNext'},content);
  const restored=decodeBackup(encodeBackup(s,content),content).save;expect(restored.worldStory).toEqual(s.worldStory);
  const closed=applyCommand(restored,{type:'worldTalkClose'},content);expect(closed.worldStory!.completed).not.toContain(scenes[0].id);expect(storyNext(closed,def)?.node?.id).toBe(scenes[0].id);
  const old=begin();old.appVersion='1.27.0';old.contentVersion='v1.27-r1';const next=migrateSaveTo110(old,content);expect(next.worldStory).toEqual(old.worldStory);expect(next.worldStory!.completed).toEqual([]);
 });
 it('rejects continuation flags that would silently create mandatory or cycling daily stories',()=>{
  const n=scenes[0],original=n.optional;n.optional=false;
  try{expect(validateWorldStoryContent(content).some(e=>e.includes('continuations must'))).toBe(true);}finally{n.optional=original;}
 });
});
