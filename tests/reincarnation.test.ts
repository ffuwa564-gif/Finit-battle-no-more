import {describe,it,expect} from 'vitest';
import {content,validateContent} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import {reincarnationLock,REBIRTH_SHELL,REBIRTH_CORE,ASCENDED_RECIPES} from '../src/domain/reincarnation';
import {storyNext,storyNodeAvailable,worldStoryLock,validateWorldStorySave} from '../src/domain/world-story';
import {dungeonLock} from '../src/domain/events';
import {novelAvailable} from '../src/domain/novels';
import {assertSaveCompatibility,assertValidSave} from '../src/platform/save';
import {decodeBackup,encodeBackup} from '../src/platform/save-backup';
import {migrateSaveTo110} from '../src/platform/save-migration';
import {createBattle,advanceReplay,resolveRound} from '../src/domain/engine';
import {gemPowerTier,gemTraitTier,emptyGemInventory,rollGemDrop,craftAscendedGem,gemSkill,validMemoryGem,startGemRefinement,resolveGemRefinement} from '../src/domain/memory-gems';
import {advanceHarvest,createBattleHarvest} from '../src/domain/battle-harvest';
import {roughMemoryGem} from '../src/domain/gem-polishing';
import type {GameSave} from '../src/domain/types';
export function finishedStory():GameSave{
 const s=createInitialSave(content,42);s.novels={seen:[]};s.worldStory={version:1,profile:{name:'ユイ',voice:'soft',favorite:'tea'},carriedChapters:[],completed:content.worldStory!.nodes.map(n=>n.id),choices:{},position:{x:.47,y:.77}};
 s.completedDungeonIds=content.worldStory!.chapters.flatMap(c=>c.dungeonIds);return s;
}
function reborn(){return applyCommand(finishedStory(),{type:'reincarnate'},content);}
function finishIntro(s:GameSave){return applyCommand(s,{type:'novelFinish'},content);}
describe('story-only reincarnation',()=>{
 it('requires the actual main and seven-administrator endings, with no pending work',()=>{
  const s=finishedStory();expect(reincarnationLock(s,content)).toBeNull();
  for(const id of ['c7-together','seven-breakfast']){const bad=structuredClone(s);bad.worldStory!.completed=bad.worldStory!.completed.filter(v=>v!==id);expect(()=>applyCommand(bad,{type:'reincarnate'},content)).toThrow();}
  expect(()=>applyCommand(createInitialSave(content),{type:'reincarnate'},content)).toThrow();
  s.battle=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',0,42,'active');expect(()=>applyCommand(s,{type:'reincarnate'},content)).toThrow();
 });
 it('keeps every possession, unlock and first-clear ledger while rewinding narrative state',()=>{
  const s=finishedStory();s.gold=100000;s.stones=210;s.materials={'palimpsest:common':10};s.ownedIds=[...new Set([...s.ownedIds,'astraea','mireille'])];s.claimedExplorationIds=['old-clear'];s.towerRecord={version:'1.10',completedFloors:[1,2],legacyHighest:2};
  const before=structuredClone(s),r=applyCommand(s,{type:'reincarnate'},content);
  for(const key of ['gold','stones','materials','ownedIds','partyIds','leaderId','memoryGems','settings','industry','towerRecord','claimedExplorationIds','completedDungeonIds','seed']as const)expect(r[key],key).toEqual(before[key]);
  expect(r.worldStory!.completed).toEqual([]);expect(r.worldStory!.dungeonProgress).toEqual([]);expect(r.worldStory!.profile).toEqual(s.worldStory!.profile);expect(r.reincarnation!.count).toBe(1);
  expect(r.novels!.active!.sceneId).toBe(content.reincarnation!.introSceneId);expect(s).toEqual(before);
 });
 it('old clears cannot satisfy a fresh story, and transfer cannot be clicked twice',()=>{
  let s=reborn();expect(()=>applyCommand(s,{type:'reincarnate'},content)).toThrow();s=finishIntro(s);
  const next=storyNext(s,content.worldStory!)!;expect(next.node?.chapter).toBe(1);
  const oldGate=content.worldStory!.nodes.find(n=>n.requiresDungeons.length>0&&!n.optional)!;
  expect(storyNodeAvailable(oldGate,s,content.worldStory!)).toBe(false);
  const late=content.worldStory!.chapters.at(-1)!.dungeonIds[0];expect(worldStoryLock(late,s,content)).toBeTruthy();
  expect(()=>applyCommand(s,{type:'reincarnate'},content)).toThrow();
 });
 it('resumes a reincarnated save and preserves ongoing progress through backup',()=>{
  const s=reborn();expect(()=>assertSaveCompatibility(s,content)).not.toThrow();expect(decodeBackup(encodeBackup(s,content),content).save).toEqual(s);
  const malformed=structuredClone(s);malformed.worldStory!.dungeonProgress=['unknown'];expect(()=>assertSaveCompatibility(malformed,content)).toThrow();
  const bad=structuredClone(s);bad.reincarnation!.count=-1;expect(()=>assertValidSave(bad)).toThrow();
 });
 it('allows another transfer only after the current loop ending, keeping permanent route unlocks and T7',()=>{
  let s=finishIntro(reborn());s.completedDungeonIds.push('rebirth-1');s.novels!.seen.push('rebirth-1-after');s.memoryGems!.items.push({id:'seven',defId:'pale-ward',variant:'pure',roll:{power:290,trait:'bulwark',value:290}});
  expect(reincarnationLock(s,content)).not.toBeNull();s.worldStory!.completed=content.worldStory!.nodes.map(n=>n.id);s.worldStory!.dungeonProgress=content.worldStory!.chapters.flatMap(c=>c.dungeonIds);
  s=applyCommand(s,{type:'reincarnate'},content);expect(s.reincarnation!.count).toBe(2);expect(s.worldStory!.dungeonProgress).toEqual([]);expect(s.memoryGems!.items.some(g=>g.id==='seven')).toBe(true);expect(s.novels!.seen).toContain('rebirth-1-after');expect(()=>assertSaveCompatibility(s,content)).not.toThrow();
 });
 it('upgrades an in-flight 1.29 battle without changing combat events or the random stream',()=>{
  const s=createInitialSave(content,77);s.novels={seen:[]};s.battle=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',1,77,'legacy-129');
  s.appVersion='1.29.0';s.contentVersion='v1.29-r1';s.battle.contentVersion='v1.29-r1';
  const before=structuredClone(s.battle),m=migrateSaveTo110(s,content)!;expect(m.battle).toEqual({...before,contentVersion:content.contentVersion});expect(m.seed).toBe(s.seed);expect(m.memoryGems).toEqual(s.memoryGems);
 });
 it('only grants the lifetime first-clear currency once in the second story',()=>{
  let s=finishIntro(reborn());const d=content.worldStory!.chapters[0].dungeonIds[0];const stones=s.stones;
  s.battle=createBattle(content,s.partyIds,s.leaderId,d,0,42,'reclear');s.battle.phase='reward';s.battle.events=[];s.battle.cursor=0;s.battle.nextPhase='reward';
  s=applyCommand(s,{type:'claim'},content);expect(s.stones).toBe(stones);expect(s.worldStory!.dungeonProgress).toContain(d);expect(s.completedDungeonIds.filter(id=>id===d)).toHaveLength(1);
 });
});
describe('T7 and high-tier crafting',()=>{
 it('gates crafting and the reverse route before reincarnation',()=>{
  const s=finishedStory(),d=content.dungeons.find(d=>d.rebirth)!;expect(dungeonLock(d,s,content)).toBeTruthy();expect(()=>applyCommand(s,{type:'depart',dungeonId:d.id,potions:0},content)).toThrow();
  expect(()=>applyCommand(s,{type:'craftAscendedGem',defId:'pale-ward',variant:'pure',tier:7,trait:'bulwark'},content)).toThrow();
  expect(novelAvailable(content.novels!.find(n=>n.id===content.reincarnation!.introSceneId)!,s)).toBe(false);
 });
 it.each([6,7]as const)('crafts legal T%s power AND trait deterministically, paying exactly once',tier=>{
  let s=finishIntro(reborn());s.gold=100000;s.materials[REBIRTH_SHELL]=100;s.materials[REBIRTH_CORE]=100;s.memoryGems=emptyGemInventory();s.memoryGems.seen=['pale-ward'];s.memoryGems.dust.sanctuary=1000;
  const command={type:'craftAscendedGem' as const,defId:'pale-ward',variant:'pure' as const,tier,trait:'bulwark' as const};const before=structuredClone(s),r=applyCommand(s,command,content),g=r.memoryGems!.items[0];
  expect(gemPowerTier(g)).toBe(tier);expect(gemTraitTier(g)).toBe(tier);expect(g.locked).toBe(true);expect(r.gold).toBe(s.gold-ASCENDED_RECIPES[tier].gold);expect(r.materials[REBIRTH_SHELL]).toBe(s.materials[REBIRTH_SHELL]-ASCENDED_RECIPES[tier].shell);expect(r.materials[REBIRTH_CORE]).toBe(s.materials[REBIRTH_CORE]-ASCENDED_RECIPES[tier].core);expect(r.memoryGems!.dust.sanctuary).toBe(1000-ASCENDED_RECIPES[tier].dust);expect(r.seed).not.toBe(s.seed);expect(r).toEqual(applyCommand(s,command,content));expect(s).toEqual(before);
  expect(()=>assertSaveCompatibility(r,content)).not.toThrow();const poor=structuredClone(s);poor.gold=0;expect(()=>applyCommand(poor,command,content)).toThrow();expect(poor.memoryGems!.items).toEqual([]);
 });
 it('rejects unknown/fixed recipes, and refinement never promotes a lower tier into T7',()=>{
  const inv=emptyGemInventory();inv.seen=['white-flower-seed'];expect(()=>craftAscendedGem(inv,'white-flower-seed','pure',7,'none',42)).toThrow();expect(()=>craftAscendedGem(inv,'pale-ward','pure',7,'bulwark',42)).toThrow();
  inv.items=[{id:'existing',defId:'pale-ward',variant:'pure',roll:{power:230,trait:'bulwark',value:230}}];inv.dust.sanctuary=1000;
  for(let i=0;i<10;i++){startGemRefinement(inv,'existing','power',i);resolveGemRefinement(inv,true);expect(gemPowerTier(inv.items[0])).toBe(6);}
 });
 it('T7 is legal, stays sealed through polishing, and is rejected in a pre-transfer save',()=>{
  const gem={id:'seven',defId:'pale-ward',variant:'pure' as const,roll:{power:299,trait:'bulwark' as const,value:280}};expect(validMemoryGem(gem)).toBe(true);expect(()=>roughMemoryGem(gem,42)).not.toThrow();
  const s=finishedStory();s.memoryGems!.items=[gem];expect(()=>assertSaveCompatibility(s,content)).toThrow('T7');
 });
 it('only reverse bosses promote rolls to T7, retaining deterministic old RNG contracts',()=>{
  const stage=content.dungeons.find(d=>d.rebirth)!;let found=false;
  for(let seed=1;seed<=1200;seed++){const r=rollGemDrop(stage,Math.imul(seed,2654435761)>>>0,`drop-${seed}`,{boss:true});if(r.gem&&gemPowerTier(r.gem)===7)found=true;
   const ordinary=rollGemDrop(stage,seed,`ordinary-${seed}`);if(ordinary.gem)expect(gemPowerTier(ordinary.gem)).toBeLessThanOrEqual(3);
  }expect(found).toBe(true);
 });
 it('reserves T7 for a won clear chest, excluding extraction drops before victory',()=>{
  const custom=structuredClone(content),stage=custom.dungeons.find(d=>d.rebirth)!;stage.gemLoot={tier4Chance:0,tier5Chance:0,tier6Chance:0,tier7Chance:1};
  const b=createBattle(custom,['seris','noelle','elaine','liora'],'liora',stage.id,0,42,'extract');b.phase='ready';b.wave=stage.waves.length-1;b.harvest=createBattleHarvest(b.id);let gems=0;
  for(let i=0;i<600;i++){b.harvest.offers=[];advanceHarvest(b,{id:`drop-${i}`,kind:'drop',text:'drop'},custom);for(const o of b.harvest.offers)if(o.gem){gems++;expect(gemPowerTier(o.gem.result)).toBeLessThan(7);expect(gemTraitTier(o.gem.result)).toBeLessThan(7);}}
  expect(gems).toBeGreaterThan(0);const drops=Array.from({length:100},(_,i)=>rollGemDrop(stage,i+1,'chest',{boss:true}).gem).filter(Boolean);expect(drops.length).toBeGreaterThan(0);for(const g of drops)expect(gemPowerTier(g!)).toBe(7);
 });
 it('publishes a locked six-stage chain with a record after every clear',()=>{
  expect(validateContent(content)).toEqual([]);let s=finishIntro(reborn());
  const ids=content.reincarnation!.dungeonIds;for(let i=0;i<ids.length;i++){
   const d=content.dungeons.find(d=>d.id===ids[i])!;expect(dungeonLock(d,s,content)).toBeNull();
   s.completedDungeonIds.push(d.id);const scene=content.novels!.find(n=>n.id===`${d.id}-after`)!;expect(novelAvailable(scene,s)).toBe(true);
   if(ids[i+1])expect(dungeonLock(content.dungeons.find(d=>d.id===ids[i+1])!,s,content)).toBeTruthy();
   s=applyCommand(s,{type:'novelStart',sceneId:scene.id},content);s=applyCommand(s,{type:'novelFinish'},content);
  }
 });
});
