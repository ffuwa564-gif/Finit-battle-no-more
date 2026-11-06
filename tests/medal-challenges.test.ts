import {describe,it,expect} from 'vitest';
import {content} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import {createBattle} from '../src/domain/engine';
import {createMedalRun,medalById,medalProgress,trackMedalBatch,validMedals,validMedalRun,synchronizeMedals} from '../src/domain/medals';
import {characterMedalChallenges,commitMedalChallenges} from '../src/domain/medal-challenges';
import {GEM_DEFINITIONS,emptyGemInventory,type MemoryGem} from '../src/domain/memory-gems';
import {emptyIndustry,industryCatalog} from '../src/domain/industry';
import {decodeBackup,encodeBackup} from '../src/platform/save-backup';
import type {MedalState} from '../src/domain/medals';
const initial=()=>createInitialSave(content,42);
const record=():MedalState=>({version:1,earned:[],feats:[]});
const gem=(family='sanctuary',power=0):MemoryGem=>{const d=GEM_DEFINITIONS.find(d=>d.family===family)!;return{id:family,defId:d.id,variant:d.variants[0],roll:{power,trait:'none',value:0}};};
function won(ids=initial().partyIds,dungeon='silent-cathedral'){
 const b=createBattle(content,ids,ids[0],dungeon,0,42,'proof');b.medalRun=createMedalRun();
 b.initialUnits.find(u=>u.side==='enemy')!.boss=true;
 b.units=b.units.map(u=>({...u,hp:u.side==='enemy'?0:u.hp}));b.phase='reward';b.nextPhase='reward';b.cursor=b.events.length;return b;
}
function observed(id:typeof characterMedalChallenges[number]['id']){
 const contract=characterMedalChallenges.find(c=>c.id===id)!,actorId=contract.actorIds[0];
 const b=won([actorId,'elaine','liora','noelle']),before=structuredClone(b.initialUnits);
 const actor=before.find(u=>u.side==='party'&&u.characterId===actorId)!;
 const skill=content.characters.find(c=>c.id===actorId)!.skillIds.map(id=>content.skills.find(s=>s.id===id)!).find(s=>s.template===contract.template);
 const enemy=before.find(u=>u.side==='enemy')!;
 while(before.filter(u=>u.side==='enemy').length<3)before.push({...enemy,uid:'extra-'+before.length});
 const friends=before.filter(u=>u.side==='party');for(const f of friends)f.hp=Math.max(1,f.maxHp-50);
 friends[1].ailments={sleep:{turns:2,sourceId:enemy.uid}};enemy.barrier=80;enemy.barrierUntil=b.round+1;
 const after=structuredClone(before);
 for(const u of after){
  if(u.side==='party'){u.hp=u.maxHp;u.barrier=50;u.barrierUntil=b.round+1;u.ailments={};}
  else{u.hp=0;u.barrier=0;u.debuffStrength=20;u.debuffUntil=b.round+1;u.ailments={sleep:{turns:2,sourceId:actor.uid}};}
 }
 b.initialUnits=before;b.events=[{id:'action',kind:'attack',text:'actual delta',actionSelection:true,actorId:actor.uid,skillId:skill?.id,ultimate:contract.template===null,targetIds:before.map(u=>u.uid),unitsAfter:after,statusAction:contract.effect==='sleep'?'inflict':undefined,ailment:contract.effect==='sleep'?'sleep':undefined}];
 b.units=structuredClone(after);b.cursor=b.events.length;return b;
}
describe('expanded medal challenge proofs',()=>{
 it.each(characterMedalChallenges.map(c=>c.id))('observes %s from actual skill deltas, not narration or replay',id=>{
  const b=observed(id),state=record(),seed=b.seed,units=structuredClone(b.units);trackMedalBatch(b,content);trackMedalBatch(b,content);
  expect(b.medalRun!.challenges).toEqual([id]);expect(b.units).toEqual(units);expect(b.seed).toBe(seed);
  commitMedalChallenges(state,b,content);expect(state.challenges).toContain(id);
  const noEffect=observed(id);noEffect.events[0].unitsAfter=structuredClone(noEffect.initialUnits);trackMedalBatch(noEffect,content);expect(noEffect.medalRun!.challenges).toEqual([]);
 });
 it('requires a personal action and survival, and leaves old expedition records incomplete',()=>{
  for(const variant of ['borrowed','enemy','friendly','old','dead'] as const){
   const b=observed('sakuya-ward');
   if(variant==='borrowed')b.events[0].skillId=content.skills.find(s=>s.template==='barrier'&&!content.characters.find(c=>c.id==='mireille')!.skillIds.includes(s.id))!.id;
   if(variant==='enemy')b.events[0].actorId=b.initialUnits.find(u=>u.side==='enemy')!.uid;
   if(variant==='friendly')b.events[0].statusAction='friendly_fire';
   if(variant==='old')delete b.medalRun!.challenges;
   if(variant==='dead')b.units.find(u=>u.characterId==='mireille')!.hp=0;
   trackMedalBatch(b,content);const s=record();commitMedalChallenges(s,b,content);expect(s.challenges??[]).not.toContain('sakuya-ward');
  }
 });
 it('requires completed reward playback, defeated enemies and a boss for new formation proofs',()=>{
  for(const variant of ['failed','playing','cursor','enemy','no-boss'] as const){
   const b=won();if(variant==='failed')b.phase='failed';if(variant==='playing')b.nextPhase='ready';if(variant==='cursor')b.cursor=-1;if(variant==='enemy')b.units.find(u=>u.side==='enemy')!.hp=1;if(variant==='no-boss')for(const u of b.initialUnits)u.boss=false;
   const s=record();commitMedalChallenges(s,b,content);expect(s.challenges??[]).toEqual([]);expect(s.victories??0).toBe(variant==='no-boss'?1:0);
  }
 });
 it('recognizes a four-role all-R victory, but rejects missing, dead or duplicated members',()=>{
  const b=won(),s=record();commitMedalChallenges(s,b,content);expect(s.challenges).toEqual(expect.arrayContaining(['four-roles','only-r-sr','only-r','no-stones']));
  for(const variant of ['dead','missing','duplicate'] as const){const n=structuredClone(b);if(variant==='dead')n.units.find(u=>u.side==='party')!.hp=0;if(variant==='missing')n.partyIds.pop();if(variant==='duplicate')n.partyIds[3]=n.partyIds[0];const r=record();commitMedalChallenges(r,n,content);expect(r.challenges??[]).toEqual([]);}
 });
 it('uses the departure stone snapshot and the higher of power and trait tier',()=>{
  const b=won(undefined,'ivory-tower-010');b.memoryGems=Object.fromEntries(b.partyIds.map(id=>[id,gem()]));
  let s=record();commitMedalChallenges(s,b,content);expect(s.challenges).toEqual(expect.arrayContaining(['one-family','budget-tower','without-athena']));expect(s.challenges).not.toContain('no-stones');
  b.memoryGems[b.partyIds[1]]=gem('clock');b.memoryGems[b.partyIds[2]]=gem('grave');s=record();commitMedalChallenges(s,b,content);expect(s.challenges).toContain('three-families');expect(s.challenges).not.toContain('one-family');
  b.memoryGems[b.partyIds[0]]={...gem(),roll:{power:0,trait:'bulwark',value:220}};s=record();commitMedalChallenges(s,b,content);expect(s.challenges).not.toContain('budget-tower');
  delete b.memoryGems[b.partyIds[0]];s=record();commitMedalChallenges(s,b,content);expect(s.challenges).not.toContain('budget-tower');
  for(const athena of ['athena','athena-standard']){const n=won([athena,...initial().partyIds.slice(1)],'ivory-tower-010'),r=record();commitMedalChallenges(r,n,content);expect(r.challenges).not.toContain('without-athena');}
 });
 it('records one real legal starter victory only at claim; persists through backup and cannot duplicate the claim',()=>{
  let s=applyCommand(initial(),{type:'depart',dungeonId:'silent-cathedral',potions:0},content);
  for(let i=0;i<500&&s.battle&&!['reward','failed'].includes(s.battle.phase);i++)s=applyCommand(s,{type:s.battle.phase==='playing'?'replay':'round'},content);
  expect(s.battle!.phase).toBe('reward');expect(s.medals?.victories??0).toBe(0);
  s=applyCommand(s,{type:'claim'},content);expect(s.medals!.victories).toBe(1);expect(s.medals!.earned).toEqual(expect.arrayContaining(['four-roles','only-r-sr','only-r','no-stones']));
  expect(()=>applyCommand(s,{type:'claim'},content)).toThrow();expect(decodeBackup(encodeBackup(s,content),content).save.medals).toEqual(s.medals);
  s=applyCommand(s,{type:'medalSync'},content);expect(s.medals!.victories).toBe(1);
  const older=initial();older.completedDungeonIds=content.dungeons.filter(d=>d.published).map(d=>d.id);synchronizeMedals(older,content);expect(older.medals!.victories??0).toBe(0);expect(older.medals!.challenges??[]).toEqual([]);expect(older.medals!.earned).toContain('boss-three');
 });
 it('preserves the original twelve-feat challenge and validates optional new save fields',()=>{
  const s=initial();s.medals={...record(),challenges:[...characterMedalChallenges.map(c=>c.id)]};expect(medalProgress(medalById('tactics-twelve')!,s,content).value).toBe(0);
  expect(validMedals(record())).toBe(true);expect(validMedalRun({...createMedalRun(),challenges:undefined})).toBe(true);
  for(const patch of [{victories:-1},{victories:1.2},{victories:NaN},{victories:1_000_001},{challenges:['missing']},{challenges:['only-r','only-r']}])expect(validMedals({...record(),...patch})).toBe(false);
  expect(validMedalRun({...createMedalRun(),challenges:['only-r']})).toBe(false);
 });
 it('counts accepted variants and equipped party stones rather than stones equipped by reserve characters',()=>{
  const s=initial();s.memoryGems=emptyGemInventory();s.memoryGems.items=['pure','echo','swift'].map((variant,i)=>({...gem(),id:'g'+i,variant} as MemoryGem));
  expect(medalProgress(medalById('gems-variants')!,s,content).value).toBe(3);
  s.memoryGems.equipped={...Object.fromEntries(s.partyIds.map((id,i)=>[id,'g'+i])),mireille:'g0'};
  expect(medalProgress(medalById('gems-equipped')!,s,content).value).toBe(3);
 });
 it('counts different installed kinds and completed recipes, without credit for stock or unfinished jobs',()=>{
  const s=initial();s.industry=emptyIndustry(0);s.industry.stock.bench=999;
  const progress=(id:string)=>medalProgress(medalById(id)!,s,content).value;
  expect(progress('craft-ten-kinds')).toBe(0);expect(progress('craft-twenty-recipes')).toBe(0);
  s.industry.machines={a:{kind:'bench',enabled:true,progress:0},b:{kind:'bench',enabled:true,progress:0}};
  expect(progress('craft-ten-kinds')).toBe(1);
  s.industry.crafted=Object.fromEntries(industryCatalog.recipes.slice(0,20).map(r=>[r.id,1]));
  expect(progress('craft-twenty-recipes')).toBe(20);
  s.industry.crafted[industryCatalog.recipes[0].id]=500;expect(progress('craft-twenty-recipes')).toBe(20);
 });

});
