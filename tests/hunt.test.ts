import { describe, it, expect } from 'vitest';
import { content } from '../src/content';
import { createBattle, advanceReplay, resolveRound, useBattleAid } from '../src/domain/engine';
import { applyCommand, createInitialSave } from '../src/application/game';
import { HUNT_HANDS, huntRank, validHunt, canHunt } from '../src/domain/hunt';
import { createBattleHarvest, advanceHarvest, tapHarvest, chooseHarvest, harvestQuality, validBattleHarvest } from '../src/domain/battle-harvest';
import { assertValidSave, assertSaveCompatibility } from '../src/platform/save';
import { gemRoll } from '../src/domain/memory-gems';
const stage=content.dungeons.find(d=>d.id==='silent-cathedral')!;
function fixture(seed=42){const s=createInitialSave(content,seed);s.battle=createBattle(content,s.partyIds,s.leaderId,stage.id,5,seed,`hunt-${seed}`,'hunt');s.battle.harvest=createBattleHarvest(s.battle.id);return s;}
function ready(s:ReturnType<typeof fixture>){while(s.battle?.phase==='playing')s=applyCommand(s,{type:'replay'},content);return s;}
describe('continuous hunt',()=>{
 it('does not apply legacy rare-wave replacement before constructing a hunt roster',()=>{
  const source=content.dungeons.find(d=>d.rareEncounter)!;
  const d={...stage,waves:[stage.waves[0]!,stage.waves.at(-1)!],rareEncounter:{...source.rareEncounter!,chance:100}};
  const c={...content,dungeons:content.dungeons.map(x=>x.id===d.id?d:x)},s=createInitialSave(c);
  const hunt=createBattle(c,s.partyIds,s.leaderId,d.id,0,42,'rare-opening','hunt');
  expect(hunt.units.filter(u=>u.side==='enemy'&&u.hp>0)).toHaveLength(3);
  expect(hunt.events.every(e=>!e.actorId||hunt.units.some(u=>u.uid===e.actorId))).toBe(true);
  const wave=createBattle(c,s.partyIds,s.leaderId,d.id,0,42,'rare-legacy');
  expect(wave.units.some(u=>d.rareEncounter.characterIds.includes(u.characterId))).toBe(true);
  expect(wave.events.some(e=>e.kind==='dialogue'&&e.text.startsWith('希少な気配'))).toBe(true);
 });

 it('keeps existing saves and special battles in their original mode',()=>{
  const s=createInitialSave(content);expect(createBattle(content,s.partyIds,s.leaderId,stage.id,0,42,'old').hunt).toBeUndefined();
  expect(canHunt({...stage,kind:'trial'})).toBe(false);expect(canHunt({...stage,towerFloor:1})).toBe(false);
  expect(()=>createBattle({...content,dungeons:[{...stage,kind:'trial'}]},s.partyIds,s.leaderId,stage.id,0,42,'trial','hunt')).toThrow();
 });
 it('refills killed enemies immediately, assigns unique IDs and keeps the live roster bounded',()=>{
  let s=ready(fixture());const b=s.battle!;b.units.filter(u=>u.side==='enemy').forEach(u=>u.hp=1);
  const old=new Set(b.units.filter(u=>u.side==='enemy').map(u=>u.uid));
  const next=resolveRound(b,content).battle;
  expect(next.hunt!.kills).toBeGreaterThan(0);expect(next.units.filter(u=>u.side==='enemy'&&u.hp>0)).toHaveLength(3);
  expect(next.units.filter(u=>u.side==='enemy').some(u=>!old.has(u.uid))).toBe(true);
  expect(next.nextPhase).toBe('ready');expect(new Set(next.units.map(u=>u.uid)).size).toBe(next.units.length);
  expect(next.events.some(e=>e.huntKill&&e.unitsAfter?.some(u=>!old.has(u.uid)&&u.side==='enemy'))).toBe(true);
 });
 it('spends exactly 100 party actions, then goes straight to the final boss with existing party HP',()=>{
  let s=ready(fixture());s.battle!.hunt!.actions=99;
  const hp=s.battle!.units.find(u=>u.side==='party')!.hp;
  s.battle=resolveRound(s.battle!,content).battle;
  expect(s.battle.hunt!.actions).toBe(HUNT_HANDS);expect(s.battle.nextPhase).toBe('wave');
  s=ready(s);expect(s.battle!.hunt!.stage).toBe('boss');expect(s.battle!.wave).toBe(stage.waves.length-1);
  expect(s.battle!.units.some(u=>u.boss)).toBe(true);expect(s.battle!.units.find(u=>u.side==='party')!.hp).toBeLessThanOrEqual(hp);
  assertValidSave(s);assertSaveCompatibility(s,content);
 });
 it('off-turn strikes consume a hand and cannot farm an unlimited chain of aid drops',()=>{
  const s=ready(fixture());s.battle!.hunt!.actions=99;s.battle!.units.filter(u=>u.side==='enemy').forEach(u=>u.hp=1);
  const b=useBattleAid(s.battle!,'strike',content).battle;expect(b.hunt!.actions).toBe(100);expect(b.nextPhase).toBe('wave');
 });
 it('persists exact hunt and drop state through reload, with no replay duplication',()=>{
  let s=ready(fixture());s=applyCommand(s,{type:'round'},content);s=applyCommand(s,{type:'replay'},content);
  const restored=structuredClone(s);assertValidSave(restored);assertSaveCompatibility(restored,content);
  expect(ready(restored)).toEqual(ready(s));expect(validHunt({...s.battle!.hunt!,actions:101})).toBe(false);
 });
 it('does not create loot by guarding, idling, or sending arbitrary non-kill replay effects',()=>{
  const b=fixture().battle!;for(let n=0;n<200;n++)advanceHarvest(b,{id:`idle${n}`,kind:'heal',text:'heal'},content);
  expect(b.harvest!.offers).toHaveLength(0);expect(b.harvest!.materials).toEqual({});
 });
 it('rank increases rare parts and genuine high-tier rolls, not just the glow',()=>{
  const sample=(kills:number)=>{let parts=0,power=0,gems=0;
   for(let seed=1;seed<=400;seed++){
    const b=fixture(seed).battle!;b.hunt!.kills=kills;b.hunt!.serial=kills+3;
    for(let n=0;n<12;n++){
     advanceHarvest(b,{id:`drop${n}`,kind:'drop',text:'drop',huntKill:true,huntProgress:{...b.hunt!}},content);
     for(const o of [...b.harvest!.offers]){if(o.kind==='material'&&harvestQuality(o)!=='common')parts++;if(o.gem){power+=gemRoll(o.gem.result).power;gems++;}for(let tap=0;tap<6;tap++)tapHarvest(b,o.id);}
    }
    expect(validBattleHarvest(b.harvest,b)).toBe(true);
   }return {parts,mean:power/gems,gems};};
  const low=sample(0),high=sample(60);expect(high.parts).toBeGreaterThan(low.parts*2);expect(high.mean).toBeGreaterThan(low.mean);expect(high.gems).toBeGreaterThan(low.gems);
 });
 it('loses all hunt loot on failure, and settles successful loot only once',()=>{
  let s=ready(fixture());s.battle!.harvest!.materials={iron:2};s.battle!.units.filter(u=>u.side==='party').forEach(u=>u.hp=0);
  s.battle=resolveRound(s.battle!,content).battle;s=ready(s);expect(s.battle!.phase).toBe('failed');expect(s.memoryGems!.rough??[]).toHaveLength(0);
  s=applyCommand(s,{type:'leaveFailure'},content);expect(s.industry?.stock.iron??0).toBe(0);
  let won=ready(fixture());won.battle!.hunt!.actions=100;won.battle!.hunt!.stage='boss';won.battle!.wave=stage.waves.length-1;won.battle!.harvest!.materials={iron:2};
  won.battle!.phase='reward';won.battle!.nextPhase='reward';won.battle!.cursor=won.battle!.events.length;
  won=applyCommand(won,{type:'claim'},content);expect(won.industry!.stock.iron).toBe(2);expect(()=>applyCommand(won,{type:'claim'},content)).toThrow();
 });
 it('rank thresholds are monotonic and reward real kills only',()=>{expect([0,12,24,40,60].map(n=>huntRank(n).rank)).toEqual(['C','B','A','S','SS']);});
});
describe('hunt audit regressions',()=>{
 it('keeps a defeated status source until its affliction expires, and clears dead focus pins',()=>{
  const s=ready(fixture()),b=s.battle!,source=b.units.find(u=>u.side==='enemy')!;
  b.units.find(u=>u.side==='party')!.ailments={sleep:{turns:2,sourceId:source.uid}};
  b.focusTargetId=source.uid;source.hp=1;
  s.battle=resolveRound(b,content).battle;
  expect(s.battle.units.find(u=>u.uid===source.uid)?.hp).toBe(0);expect(s.battle.focusTargetId).toBeUndefined();
  assertValidSave(s);assertSaveCompatibility(s,content);
 });
 it('protects rare component capacity even after common resources are full',()=>{
  const b=fixture().battle!;b.hunt!.kills=60;b.hunt!.serial=63;b.harvest!.materials={ore:120};let components=0;
  for(let n=0;n<200;n++){
   advanceHarvest(b,{id:`cap-${n}`,kind:'drop',text:'drop',huntKill:true,huntProgress:{...b.hunt!}},content);
   for(const o of [...b.harvest!.offers]){if(o.kind==='material'&&harvestQuality(o)!=='common'){components++;const before=b.harvest!.materials[o.itemId!]??0;for(let i=0;i<6;i++)tapHarvest(b,o.id);expect(b.harvest!.materials[o.itemId!]!-before).toBe(o.amount);}else for(let i=0;i<6;i++)tapHarvest(b,o.id);}
  }
  expect(components).toBeGreaterThan(0);expect(b.harvest!.materials.ore).toBe(120);expect(validBattleHarvest(b.harvest,b)).toBe(true);
 });
 it('uses party-action spacing for hunt cards so effect-heavy builds do not create more menus',()=>{
  const b=fixture().battle!;b.hunt!.actions=2;
  advanceHarvest(b,{id:'first',kind:'buff',text:'effect',huntProgress:{...b.hunt!}},content);
  const c=b.harvest!.choice!;expect(chooseHarvest(b,c.id,c.options[0]!)).toBe(true);
  for(let i=0;i<100;i++)advanceHarvest(b,{id:`same-action-${i}`,kind:'buff',text:'effect',huntProgress:{...b.hunt!}},content);
  expect(b.harvest!.choice).toBeUndefined();
 });
});
it('records the claimed hunt rank inputs and includes collected rough stones in the expedition ledger',()=>{
 let s=applyCommand(createInitialSave(content),{type:'depart',dungeonId:stage.id,potions:0,mode:'hunt'},content,{now:1000});
 const b=s.battle!;b.hunt={actions:100,kills:40,serial:44,stage:'boss'};b.wave=stage.waves.length-1;
 b.phase='reward';b.nextPhase='reward';b.cursor=b.events.length;
 b.harvest!.gems=[{id:`${b.id}:harvest:1`,promise:'radiant',result:{id:`${b.id}:harvest:1`,defId:'pale-ward',variant:'pure'}}];
 s=applyCommand(s,{type:'claim'},content,{now:2000});
 expect(s.expeditionHistory![0].hunt!.kills).toBe(40);expect(s.expeditionHistory![0].earned.gemCount).toBe(1);assertValidSave(s);assertSaveCompatibility(s,content);
});
it('completes a real command-driven hunt and validates every persisted replay snapshot',()=>{
 let s=applyCommand(createInitialSave(content,42),{type:'depart',dungeonId:stage.id,potions:0,mode:'hunt'},content,{now:1000});
 let commands=0;
 while(s.battle&&!['reward','failed'].includes(s.battle.phase)&&commands<2000){
  const b=s.battle;
  s=applyCommand(s,b.phase==='playing'?{type:'replay'}:{type:'round',targetId:b.units.find(u=>u.side==='enemy'&&u.hp>0)!.uid},content,{now:1001+commands++});
  assertValidSave(s);assertSaveCompatibility(s,content);
 }
 expect(s.battle!.phase).toBe('reward');expect(s.battle!.hunt!.actions).toBe(100);
 expect(s.memoryGems!.rough??[]).toHaveLength(0);
 s=applyCommand(s,{type:'claim'},content,{now:4000});assertValidSave(s);assertSaveCompatibility(s,content);
 expect(s.expeditionHistory![0].hunt!.actions).toBe(100);
});
