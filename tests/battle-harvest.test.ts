import {describe,it,expect} from 'vitest';
import {content} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import {advanceReplay,createBattle,resolveRound} from '../src/domain/engine';
import {advanceHarvest,createBattleHarvest,tapHarvest,chooseHarvest,validBattleHarvest,nextHarvestAid} from '../src/domain/battle-harvest';
import {roughMemoryGem} from '../src/domain/gem-polishing';
import {assertValidSave} from '../src/platform/save';
function fixture(){
 const s=createInitialSave(content,42);s.battle=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',5,42,'harvest-test');
 while(s.battle.phase==='playing')s.battle=advanceReplay(s.battle,content);
 s.battle.harvest=createBattleHarvest(s.battle.id);return s;
}
function finish(s:ReturnType<typeof createInitialSave>){while(s.battle?.phase==='playing')s=applyCommand(s,{type:'replay'},content);return s;}
const collect=(s:ReturnType<typeof fixture>,id:string,n=3)=>{for(let i=0;i<n;i++)s=applyCommand(s,{type:'harvestTap',battleId:s.battle!.id,offerId:id},content);return s;};
describe('battle harvest interactions',()=>{
 it('offers advance once per observed event, with a separate RNG and bounded slots',()=>{
  const b=fixture().battle!,seed=b.seed;
  for(let i=0;i<150;i++){
   const e={id:`observed-${i}`,kind:'attack' as const,text:'hit'};
   advanceHarvest(b,e,content);const state=structuredClone(b.harvest);advanceHarvest(b,e,content);expect(b.harvest).toEqual(state);
   expect(b.harvest!.offers.length).toBeLessThanOrEqual(4);expect(validBattleHarvest(b.harvest,b)).toBe(true);
  }
  expect(b.seed).toBe(seed);expect(b.harvest!.missed).toBeGreaterThan(0);
 });
 it('reserves the resource budget before spawning, so every collected cluster grants its advertised amount',()=>{
  const b=fixture().battle!;
  for(let i=0;i<700;i++){
   advanceHarvest(b,{id:`budget-${i}`,kind:'attack',text:''},content);
   for(const o of [...b.harvest!.offers].filter(o=>o.kind==='material')){
    const before=b.harvest!.materials[o.itemId!]??0;
    for(let t=0;t<3;t++)tapHarvest(b,o.id);
    expect(b.harvest!.materials[o.itemId!]! - before).toBe(o.amount);
   }
   expect(validBattleHarvest(b.harvest,b)).toBe(true);
  }
  expect(Object.values(b.harvest!.materials).reduce((a,b)=>a+b,0)).toBe(120);
 });
 it('requires repeated taps, preserves partial progress, and never collects an ID twice',()=>{
  const s=fixture(),b=s.battle!,h=b.harvest!;
  h.offers=[{id:`${b.id}:harvest:1`,kind:'material',slot:0,hits:0,required:3,expires:10,itemId:'ore',amount:4}];
  const first=collect(s,h.offers[0].id,1);expect(first.battle!.harvest!.offers[0].hits).toBe(1);assertValidSave(first);
  const won=collect(first,h.offers[0].id,2),again=collect(won,h.offers[0].id,10);
  expect(again.battle!.harvest!.materials.ore).toBe(4);expect(again.industry).toEqual(s.industry);expect(again.battle!.harvest!.collected).toBe(1);
 });
 it('only one of three choices applies and it does not modify equipped stone skills or combat stats',()=>{
  const b=fixture().battle!,before=structuredClone(b.units);advanceHarvest(b,{id:'a',kind:'attack',text:''},content);advanceHarvest(b,{id:'b',kind:'attack',text:''},content);
  const choice=structuredClone(b.harvest!.choice!);
  expect(chooseHarvest(b,choice.id,choice.options[0])).toBe(true);expect(chooseHarvest(b,choice.id,choice.options[1])).toBe(false);
  expect(Object.values(b.harvest!.upgrades).reduce((a,b)=>a+b,0)).toBe(1);expect(b.units).toEqual(before);
 });
 it('fills three sockets and explicitly replaces one, removing the old modifier',()=>{
  const b=fixture().battle!;
  for(const [i,upgrade] of ['touch','linger','abundance'].entries()){
   b.harvest!.choice={id:`${b.id}:choice:${i}`,options:[upgrade as 'touch'],expires:20};
   expect(chooseHarvest(b,b.harvest!.choice.id,upgrade as 'touch')).toBe(true);
  }
  b.harvest!.choice={id:`${b.id}:choice:replace`,options:['mercy'],expires:20};
  expect(chooseHarvest(b,b.harvest!.choice.id,'mercy')).toBe(false);
  expect(chooseHarvest(b,b.harvest!.choice.id,'mercy',1)).toBe(true);
  expect(b.harvest!.sockets).toEqual(['touch','mercy','abundance']);expect(b.harvest!.upgrades.linger).toBe(0);expect(b.harvest!.upgrades.mercy).toBe(1);
  expect(Object.values(b.harvest!.upgrades).reduce((a,b)=>a+b,0)).toBe(3);expect(validBattleHarvest(b.harvest,b)).toBe(true);
 });
 it('expired offers cannot be rescued by stale queued taps',()=>{
  const b=fixture().battle!;b.harvest!.offers=[{id:`${b.id}:harvest:1`,kind:'material',slot:0,hits:2,required:3,expires:1,itemId:'ore',amount:5}];
  advanceHarvest(b,{id:'expire',kind:'attack',text:''},content);expect(tapHarvest(b,`${b.id}:harvest:1`)).toBe('miss');expect(b.harvest!.materials).toEqual({});
 });
 it('collecting aid while a round replays never rewrites replay snapshots or potions',()=>{
  let s=fixture();s.battle=resolveRound(s.battle!,content).battle;
  const b=s.battle!,h=b.harvest!,units=structuredClone(b.units),events=structuredClone(b.events);
  h.offers=[{id:`${b.id}:harvest:1`,kind:'heal',slot:0,hits:0,required:2,expires:10}];s=collect(s,h.offers[0].id,2);
  expect(s.battle!.units).toEqual(units);expect(s.battle!.events).toEqual(events);expect(s.battle!.harvest!.aids).toEqual(['heal']);expect(s.potions).toBe(10);
  s=finish(s);
  s.battle!.potionUsed=true;const round=s.battle!.round;s=applyCommand(s,{type:'harvestAid',battleId:b.id},content);
  expect(s.battle!.phase).toBe('playing');expect(s.battle!.round).toBe(round);expect(s.battle!.events[0].harvestAction).toBe('heal');s=finish(s);expect(s.battle!.potionUsed).toBe(true);assertValidSave(s);
 });
 it('keeps full-HP healing queued and can use a strike behind it',()=>{
  const b=fixture().battle!;b.harvest!.aids=['heal','strike'];expect(nextHarvestAid(b)).toBe(1);
  b.units.find(u=>u.side==='party')!.hp--;expect(nextHarvestAid(b)).toBe(0);
 });
 it('claims extra raw resources and rough stones once; retreat loses both',()=>{
  const s=fixture(),b=s.battle!;
  b.harvest!.materials={ore:7};b.harvest!.gems=[roughMemoryGem({id:`${b.id}:harvest:1`,defId:'pale-ward',variant:'pure'},42)];
  const lost=applyCommand(applyCommand(s,{type:'retreat'},content),{type:'leaveFailure'},content);expect(lost.industry?.stock.ore??0).toBe(0);expect(lost.memoryGems!.rough??[]).toHaveLength(0);
  b.phase='reward';b.nextPhase='reward';b.cursor=b.events.length;
  const claimed=applyCommand(s,{type:'claim'},content);expect(claimed.industry!.stock.ore).toBeGreaterThanOrEqual(7);expect(claimed.memoryGems!.rough).toHaveLength(1);
  expect(()=>applyCommand(claimed,{type:'claim'},content)).toThrow();assertValidSave(claimed);
 });
 it('cancels a queued potion if the target is full before it is applied',()=>{
  let s=fixture();s.battle=resolveRound(s.battle!,content).battle;
  const u=s.battle.units.find(u=>u.side==='party'&&u.hp===u.maxHp)!;
  s=applyCommand(s,{type:'potion',unitId:u.uid},content);
  s=finish(s);
  s=applyCommand(s,{type:'potion',unitId:u.uid},content);expect(s.potions).toBe(10);expect(s.battle!.pendingPotionId).toBeUndefined();
 });
 it('rejects corrupt saved harvest without throwing from its validator',()=>{
  const b=fixture().battle!;
  for(const v of [null,{},[],{...b.harvest,choice:null},{...b.harvest,offers:[null]},{...b.harvest,gems:[{}]},{...b.harvest,upgrades:{touch:999}}])expect(validBattleHarvest(v,b)).toBe(false);
 });
 it('queues an item during replay and spends it only at the next ready boundary',()=>{
  let s=fixture();s.battle=resolveRound(s.battle!,content).battle;
  const u=s.battle.units.find(u=>u.side==='party'&&u.hp>0&&u.hp<u.maxHp)!;
  s=applyCommand(s,{type:'potion',unitId:u.uid},content);expect(s.potions).toBe(10);expect(s.battle!.pendingPotionId).toBe(u.uid);
  s=finish(s);
  s=applyCommand(s,{type:'potion',unitId:u.uid},content);expect(s.potions).toBe(9);expect(s.battle!.pendingPotionId).toBeUndefined();assertValidSave(s);
 });
});
