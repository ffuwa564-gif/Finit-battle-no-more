import { describe, it, expect } from 'vitest';
import { content, validateContent } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { defaultHero, nodeLines, storyNext, storyTravelSeconds } from '../src/domain/world-story';
import { travelSeconds } from '../src/domain/world-map';
import { assertSaveCompatibility } from '../src/platform/save';
import { migrateSaveTo110 } from '../src/platform/save-migration';
import { encodeBackup, decodeBackup } from '../src/platform/save-backup';
import type { GameSave, Content } from '../src/domain/types';
const def=content.worldStory!, stages=def.chapters[0].dungeonIds;
function begin(){let s=createInitialSave(content,42,{opening:true});s=applyCommand(s,{type:'novelFinish'},content);return applyCommand(s,{type:'worldStoryBegin',profile:defaultHero,from:'beginning'},content,{now:1000});}
function talk(s:GameSave,id:string){const n=def.nodes.find(n=>n.id===id)!;s=applyCommand(s,{type:'worldTravel',destinationId:n.hubId},content,{now:1000});s=applyCommand(s,{type:'worldTalk',nodeId:id},content,{now:47000});return s;}
function finish(s:GameSave){const n=def.nodes.find(n=>n.id===s.worldStory!.active!.nodeId)!;while(s.worldStory!.active!.line<nodeLines(n,s.worldStory!).length-1)s=applyCommand(s,{type:'worldTalkNext'},content);return applyCommand(s,{type:'worldTalkFinish'},content);}
function clear(s:GameSave,id:string){s=applyCommand(s,{type:'depart',dungeonId:id,potions:0},content);for(let i=0;i<1000&&!['reward','failed'].includes(s.battle!.phase);i++)s=applyCommand(s,{type:s.battle!.phase==='playing'?'replay':'round'},content);expect(s.battle!.phase).toBe('reward');return applyCommand(s,{type:'claim'},content);}
describe('request-first opening and historical story saves',()=>{
 it('enters three real patrols with one short report between them, without requiring the garden tour',()=>{
  let s=begin();expect(content.novels!.find(n=>n.id===s.novels!.seen[0])!.pages).toHaveLength(2);
  expect(storyNext(s,def)!.node!.id).toBe('c1-job');s=talk(s,'c1-job');expect(nodeLines(def.nodes.find(n=>n.id==='c1-job')!,s.worldStory!)).toHaveLength(3);s=finish(s);
  expect(storyNext(s,def)!.dungeonId).toBe(stages[0]);expect(()=>talk(s,'c1-hill')).toThrow('まだ');
  s=clear(s,stages[0]);expect(storyNext(s,def)!.node!.id).toBe('c1-hill');s=finish(talk(s,'c1-hill'));
  expect(storyNext(s,def)!.dungeonId).toBe(stages[1]);s=clear(s,stages[1]);expect(storyNext(s,def)!.node!.id).toBe('c1-offerings');s=finish(talk(s,'c1-offerings'));
  expect(storyNext(s,def)!.dungeonId).toBe(stages[2]);s=clear(s,stages[2]);
  expect(s.completedDungeonIds).toEqual(stages.slice(0,3));expect(s.worldStory!.completed).not.toContain('c1-garden-rounds');expect(s.worldStory!.completed).not.toContain('c1-garden-night');expect(s.industry!.stock.timber).toBeGreaterThan(0);assertSaveCompatibility(s,content);
 });
 it('persists a short briefing mid-page and lets the full scene be reread voluntarily',()=>{
  let s=talk(begin(),'c1-job');s=applyCommand(s,{type:'worldTalkNext'},content);const restored=decodeBackup(encodeBackup(s,content),content).save;expect(restored.worldStory!.active).toEqual(s.worldStory!.active);expect(restored.worldStory!.active!.briefing).toBe(true);
  s=finish(restored);s=applyCommand(s,{type:'worldTalk',nodeId:'c1-job'},content);expect(s.worldStory!.active!.replay).toBe(true);expect(s.worldStory!.active!.briefing).toBeUndefined();expect(nodeLines(def.nodes.find(n=>n.id==='c1-job')!,s.worldStory!)).toHaveLength(6);
 });
 it('keeps the old pre-patrol history and last page of its long conversation intact through a v1.22 upgrade',()=>{
  const oldContent:Content={...content,appVersion:'1.22.0',contentVersion:'v1.22-r1',rulesVersion:'3'};let old=createInitialSave(oldContent,42);old=applyCommand(old,{type:'worldStoryBegin',profile:defaultHero,from:'beginning'},oldContent);
  old.worldStory!.completed=['c1-hill','c1-offerings','c1-generation','c1-garden-rounds'];const hub=def.hubs.find(h=>h.id==='hub-garden')!;old.worldStory!.position={x:hub.x,y:hub.y};
  old.worldStory!.active={nodeId:'c1-garden-night',line:16,replay:false};assertSaveCompatibility(old,oldContent);
  const upgraded=migrateSaveTo110(old,content);expect(upgraded.worldStory).toEqual(old.worldStory);expect(upgraded.completedDungeonIds).toEqual([]);expect(upgraded.gold).toBe(old.gold);expect(upgraded.seed).toBe(old.seed);expect(nodeLines(def.nodes.find(n=>n.id==='c1-garden-night')!,upgraded.worldStory!)).toHaveLength(17);
  const done=applyCommand(upgraded,{type:'worldTalkFinish'},content);assertSaveCompatibility(done,content);expect(storyNext(done,def)!.node!.id).toBe('c1-job');
  const novel=createInitialSave(oldContent,42);novel.novels={seen:[],active:{sceneId:'opening-desire-gate',page:20}};const resumed=migrateSaveTo110(novel,content);expect(resumed.novels).toEqual(novel.novels);expect(applyCommand(resumed,{type:'novelNext'},content).novels!.active!.page).toBe(21);
 });
 it('caps only the first three patrol routes and rejects corrupt briefings and branching short scenes',()=>{
  const s=begin(),from={x:.9,y:.9},to={x:.1,y:.1};expect(storyTravelSeconds(s,content,from,to,stages[0])).toBe(8);expect(storyTravelSeconds(s,content,from,to,'hub-forest')).toBe(travelSeconds(from,to));s.completedDungeonIds=stages.slice(0,3);expect(storyTravelSeconds(s,content,from,to,stages[0])).toBe(travelSeconds(from,to));
  const invalid=talk(begin(),'c1-job');invalid.worldStory!.active!.line=4;expect(()=>assertSaveCompatibility(invalid,content)).toThrow('再開');
  const bad=structuredClone(content),node=bad.worldStory!.nodes.find(n=>n.id==='c1-job')!;node.choices=[{id:'x',label:{ja:'選ぶ',en:'Choose'},response:node.lines.slice(0,1)}];expect(validateContent(bad).some(e=>e.includes('short first visits'))).toBe(true);
 });
});
