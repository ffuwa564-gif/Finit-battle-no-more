import {describe,it,expect} from 'vitest';
import {content} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import {createBattle} from '../src/domain/engine';
import {createMedalRun,trackMedalBatch,commitMedalVictory,synchronizeMedals,medalById,nextMedal,validateMedals,validMedals,validMedalRun} from '../src/domain/medals';
import {emptyIndustry} from '../src/domain/industry';
import {assertValidSave} from '../src/platform/save';
import {encodeBackup,decodeBackup} from '../src/platform/save-backup';
import type {Battle,GameSave,Unit} from '../src/domain/types';
const initial=()=>createInitialSave(content,42);
function victory(save:GameSave){
 let s=save;
 for(let step=0;step<500&&s.battle&&!['reward','failed'].includes(s.battle.phase);step++)s=applyCommand(s,{type:s.battle.phase==='playing'?'replay':'round'},content);
 expect(s.battle?.phase).toBe('reward');return s;
}
function action(actorId:string,template:string,update:(before:Unit[])=>Unit[]){
 const party=['pale-wolf','elaine','liora','noelle'];if(!party.includes(actorId))party[3]=actorId;
 const b=createBattle(content,party,actorId,'silent-cathedral',0,42,'observed');b.medalRun=createMedalRun();
 const actor=b.units.find(u=>u.characterId===actorId&&u.side==='party')!;
 const skill=content.characters.find(c=>c.id===actorId)!.skillIds.map(id=>content.skills.find(s=>s.id===id)!).find(s=>s.template===template)!;
 b.initialUnits=structuredClone(b.units);b.events=[{id:'observed-action',kind:'attack',text:'observed',actionSelection:true,actorId:actor.uid,skillId:skill.id,targetIds:b.units.filter(u=>u.side==='party').map(u=>u.uid),unitsAfter:update(b.initialUnits)}];
 return b;
}
describe('earned medal proofs',()=>{
 it('validates every branch, prerequisite and content reference',()=>{expect(validateMedals(content)).toEqual([]);});
 it('backfills confirmed exploration and real crafting without inventing combat feats, and remains monotonic',()=>{
  const s=initial();s.industry=emptyIndustry(0);s.industry.machines.b={kind:'bench',enabled:true,progress:0};s.industry.crafted={'autonomous-core':1};s.industry.power={stored:0,generated:10000,consumed:100};s.completedDungeonIds=[...content.chapters![0].dungeonIds];
  synchronizeMedals(s,content);expect(s.medals!.earned).toEqual(expect.arrayContaining(['craft-bench','craft-t2','craft-t3','craft-t4','craft-t5','explore-first','explore-one']));expect(s.medals!.feats).toEqual([]);
  const earned=[...s.medals!.earned];s.industry=emptyIndustry(0);synchronizeMedals(s,content);expect(s.medals!.earned).toEqual(earned);
 });
 it('commits only claimed victory and does not count replayed events twice',()=>{
  let s=applyCommand(initial(),{type:'depart',dungeonId:'silent-cathedral',potions:0},content);
  expect(s.battle!.medalRun).toEqual(createMedalRun());
  while(s.battle!.phase==='playing')s=applyCommand(s,{type:'replay'},content);
  s=applyCommand(s,{type:'round'},content);const proof=structuredClone(s.battle!.medalRun);
  if(s.battle!.cursor<s.battle!.events.length){s=applyCommand(s,{type:'replay'},content);expect(s.battle!.medalRun).toEqual(proof);}
  s=victory(s);expect(s.medals?.earned??[]).toEqual([]);
  const before=structuredClone(s);s=applyCommand(s,{type:'claim'},content);expect(s.medals!.earned).toContain('explore-first');expect(s.medals!.feats).toContain('full-party');expect(s.medals!.feats).toContain('no-potion');
  expect(()=>applyCommand(s,{type:'claim'},content)).toThrow();expect(s.seed).toBe(before.seed);
  let failed=applyCommand(initial(),{type:'depart',dungeonId:'silent-cathedral',potions:0},content);while(failed.battle!.phase==='playing')failed=applyCommand(failed,{type:'replay'},content);failed.battle!.medalRun!.facts=['wolf-finish'];failed=applyCommand(failed,{type:'retreat'},content);
  failed=applyCommand(failed,{type:'leaveFailure'},content);expect(failed.medals?.feats??[]).toEqual([]);
 });
 it('leaves actions, battle seed and combat snapshots identical with and without observers',()=>{
  let a=applyCommand(initial(),{type:'depart',dungeonId:'silent-cathedral',potions:0},content),b=structuredClone(a);delete b.battle!.medalRun;
  for(let i=0;i<20&&!['reward','failed'].includes(a.battle!.phase);i++){
   const type=a.battle!.phase==='playing'?'replay':'round';a=applyCommand(a,{type},content);b=applyCommand(b,{type},content);
   const actual=structuredClone(a.battle!);delete actual.medalRun;expect(actual).toEqual(b.battle);
  }
 });
 it('requires a real Wolf boss kill and survival, and a real Seris piercing kill',()=>{
  const hit=action('pale-wolf','attack',units=>structuredClone(units));trackMedalBatch(hit,content);expect(hit.medalRun!.facts).not.toContain('wolf-finish');
  const boss=hit.initialUnits.find(u=>u.side==='enemy')!;boss.boss=true;boss.characterId='liora';hit.events[0].unitsAfter=hit.initialUnits.map(u=>({...u,hp:u.side==='enemy'?0:u.hp}));trackMedalBatch(hit,content);expect(hit.medalRun!.facts).toContain('wolf-finish');
  hit.units=hit.events[0].unitsAfter!;hit.units.find(u=>u.characterId==='pale-wolf'&&u.side==='party')!.hp=0;const s=initial();commitMedalVictory(s,hit,content);expect(s.medals!.feats).not.toContain('wolf-finish');
  const pierce=action('seris','pierce',units=>units.map(u=>({...u,hp:u.side==='enemy'?0:u.hp})));pierce.initialUnits.find(u=>u.side==='enemy')!.boss=true;trackMedalBatch(pierce,content);expect(pierce.medalRun!.facts).toContain('seris-pierce');
 });
 it('recognizes Elaine rescue, Liora guard and Noelle simultaneous kills from actual skill deltas',()=>{
  const heal=action('elaine','heal',units=>units.map(u=>({...u,hp:u.side==='party'?u.maxHp:u.hp})));heal.initialUnits.find(u=>u.characterId==='pale-wolf'&&u.side==='party')!.hp=1;trackMedalBatch(heal,content);expect(heal.medalRun!.facts).toContain('elaine-rescue');
  const guard=action('liora','guard',units=>structuredClone(units));guard.initialUnits.find(u=>u.side==='party')!.hp=1;trackMedalBatch(guard,content);expect(guard.medalRun!.facts).toContain('liora-guard');
  const area=action('noelle','area',units=>structuredClone(units));const enemy=area.initialUnits.find(u=>u.side==='enemy')!;area.initialUnits.push({...enemy,uid:'second-enemy'});area.events[0].unitsAfter=area.initialUnits.map(u=>({...u,hp:u.side==='enemy'?0:u.hp}));trackMedalBatch(area,content);expect(area.medalRun!.facts).toContain('noelle-double');
 });
 it('requires all four low-band companions and a surviving Wolf, rather than confusing tenths with coefficients',()=>{
  const s=initial(),b=createBattle(content,['pale-wolf','moon-moth','stone-drake','veil-priestess'],'pale-wolf','ivory-tower-001',0,42,'tower');
  commitMedalVictory(s,b,content);expect(s.medals!.feats).toContain('low-band-tower');
 });
 it('installs a real machine, awards once and persists a cosmetic title without currency changes',()=>{
  let s=initial();s.industry=emptyIndustry(0);s.industry.stock.bench=1;
  s=applyCommand(s,{type:'industryInstall',itemId:'bench'},content,{now:0});expect(s.medals!.earned).toContain('craft-bench');
  const earned=[...s.medals!.earned],gold=s.gold;s=applyCommand(s,{type:'medalTitle',medalId:'craft-bench'},content);s=applyCommand(s,{type:'medalSync'},content);
  expect(s.medals!.earned).toEqual(earned);expect(s.gold).toBe(gold);expect(decodeBackup(encodeBackup(s,content),content).save.medals!.titleId).toBe('craft-bench');
 });
 it('retains combat proofs behind prerequisites and only accepts three distinct ailments and a prevented clock finale',()=>{
  const s=initial(),b=action('noelle','area',units=>structuredClone(units));
  b.medalRun!.facts=['noelle-double'];b.medalRun!.linkedActions=3;b.medalRun!.ailments=['sleep','confusion'];
  b.dungeonId='frozen-dawn-clock';b.leaderId=content.characters.find(c=>c.leaderEffect==='acceleration')!.id;b.medalRun!.finale=true;
  commitMedalVictory(s,b,content);synchronizeMedals(s,content);expect(s.medals!.feats).toContain('noelle-double');expect(s.medals!.earned).not.toContain('noelle-double');expect(s.medals!.feats).not.toContain('three-ailments');expect(s.medals!.feats).not.toContain('clock-acceleration');
  b.medalRun!.ailments.push('charm');b.medalRun!.finale=false;commitMedalVictory(s,b,content);expect(s.medals!.feats).toContain('three-ailments');expect(s.medals!.feats).toContain('clock-acceleration');
  s.ownedIds.push('pale-wolf');synchronizeMedals(s,content);expect(s.medals!.earned).toContain('noelle-double');
 });
 it('rejects unearned titles, hidden targets, unknown proofs and corrupted imported records',()=>{
  let s=initial();expect(()=>applyCommand(s,{type:'medalTitle',medalId:'craft-t5'},content)).toThrow();expect(()=>applyCommand(s,{type:'medalTrack',medalId:'craft-t5'},content)).toThrow();
  s=applyCommand(s,{type:'medalTrack',medalId:'craft-bench'},content);expect(nextMedal(s)?.id).toBe('craft-bench');
  const restored=decodeBackup(encodeBackup(s,content),content).save;expect(restored.medals).toEqual(s.medals);
  expect(validMedals({...s.medals,earned:['missing']})).toBe(false);expect(validMedalRun({...createMedalRun(),linkedActions:-1})).toBe(false);
  const corrupt=structuredClone(s);corrupt.medals!.titleId='craft-t5';expect(()=>assertValidSave(corrupt)).toThrow();
 });
});
