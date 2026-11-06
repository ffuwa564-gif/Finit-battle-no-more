import { describe, it, expect } from 'vitest';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { emptyIndustry, settleIndustry, industryCatalog, industryRecipe, industryItem, industryEnergyCapacity, industryEnergyCost, validIndustry, nextIndustryNeed, industryLoot } from '../src/domain/industry';
import { encodeBackup, decodeBackup } from '../src/platform/save-backup';
import { migrateSaveTo110 } from '../src/platform/save-migration';
import { createBattle } from '../src/domain/engine';
import type { IndustryState } from '../src/domain/industry';
const machine=(kind:string,recipeId?:string)=>({kind,enabled:Boolean(recipeId),progress:0,...(recipeId?{recipeId}:{})});
function powered(){const s=emptyIndustry(0);s.stock={charcoal:20,precision:50,'charged-crystal':30,wire:80};s.machines={'wick-generator:1':{...machine('wick-generator'),enabled:true},'assembler:1':machine('assembler','resonant-circuit'),'assembler:2':machine('assembler','resonant-circuit')};return s;}
function player(){const s=createInitialSave(content,42);s.completedDungeonIds=content.chapters!.flatMap(c=>c.dungeonIds);s.industry=emptyIndustry(0);return s;}
describe('tiered workshop and finite light power',()=>{
 it('assigns every craft a tier, requires lower-tier components, and retains three distinct generation options',()=>{
  expect([...new Set(industryCatalog.recipes.map(r=>r.tier))].sort()).toEqual([1,2,3,4,5]);
  for(const r of industryCatalog.recipes){expect(r.tier).toBeGreaterThanOrEqual(Math.max(...Object.keys(r.outputs).map(id=>industryItem(id).tier)));if(r.tier>1)expect(Object.keys(r.inputs).some(id=>industryItem(id).tier<r.tier),r.id).toBe(true);}
  expect(Object.keys(industryCatalog.power.generators)).toHaveLength(3);
  expect(industryRecipe('resonance-drill')!.inputs.drill).toBe(1);expect(industryRecipe('autonomous-drill')!.inputs['resonance-drill']).toBe(1);
 });
 it('burns finite fuel, banks neither fuel starvation nor full-buffer time, and pauses combustion at capacity',()=>{
  const s=emptyIndustry(0);s.stock.charcoal=10;s.machines={'wick-generator:1':{...machine('wick-generator'),enabled:true}};
  settleIndustry(s,67000);expect(s.power?.stored).toBe(200);expect(s.stock.charcoal).toBe(7);const left=s.machines['wick-generator:1'].fuelSeconds;
  settleIndustry(s,600000);expect(s.machines['wick-generator:1'].fuelSeconds).toBe(left);expect(s.stock.charcoal).toBe(7);
  const starved=emptyIndustry(0);starved.stock.charcoal=1;starved.machines={'wick-generator:1':{...machine('wick-generator'),enabled:true}};
  settleIndustry(starved,100000);expect(starved.power?.stored).toBe(90);expect(starved.stock.charcoal).toBe(0);
  settleIndustry(starved,200000);expect(starved.power?.stored).toBe(90);
 });
 it('pauses powered work during an outage, shares scarce power, and gives identical results across reload intervals',()=>{
  const s=powered();settleIndustry(s,40000);expect(s.stock['resonant-circuit']).toBe(4);expect(s.crafted?.['resonant-circuit']).toBe(2);expect(s.power?.consumed).toBe(120);
  const chunked=powered();for(const t of[1000,7000,17000,23000,40000])settleIndustry(chunked,t);expect(chunked).toEqual(s);
  const outage=powered();delete outage.machines['wick-generator:1'];outage.power={stored:3,generated:3,consumed:0};settleIndustry(outage,1000);
  const progress=Object.values(outage.machines).map(m=>m.progress);expect(progress.reduce((a,b)=>a+b,0)).toBe(1000);
  settleIndustry(outage,10000);expect(Object.values(outage.machines).map(m=>m.progress)).toEqual(progress);expect(validIndustry(outage)).toBe(true);
 });
 it('reserves manual craft energy inside battery capacity and refunds exactly once without creating light',()=>{
  let s=player();s.industry=powered();for(const m of Object.values(s.industry.machines))if(m.kind==='assembler')m.enabled=false;
  s.industry.power={stored:200,generated:200,consumed:0};const energy=industryEnergyCost(industryRecipe('resonant-circuit')!);expect(energy).toBe(60);
  const before=structuredClone(s);s=applyCommand(s,{type:'industryCraft',recipeId:'resonant-circuit',count:1},content,{now:0});expect(s.industry!.power!.stored).toBe(140);expect(s.industry!.job!.energy).toBe(60);
  s=decodeBackup(encodeBackup(s,content),content).save;s=applyCommand(s,{type:'industrySync'},content,{now:10000});expect(s.industry!.power!.generated).toBe(200);expect(s.industry!.stock.charcoal).toBe(before.industry!.stock.charcoal);
  s=applyCommand(s,{type:'industryCancel'},content,{now:10000});expect(s.industry!.power).toEqual(before.industry!.power);expect(s.industry!.stock).toEqual(before.industry!.stock);
  expect(()=>applyCommand(s,{type:'industryCancel'},content,{now:10000})).toThrow();
  s=applyCommand(s,{type:'industryCraft',recipeId:'resonant-circuit',count:1},content,{now:10000});s=applyCommand(s,{type:'industrySync'},content,{now:30000});
  expect(s.industry!.power!.consumed).toBe(60);expect(s.industry!.crafted?.['resonant-circuit']).toBe(1);expect(s.industry!.power!.stored+s.industry!.power!.consumed).toBe(s.industry!.power!.generated);
 });
 it('caps offline generation, prevents clock-rollback duplication and lets reservoirs increase real capacity',()=>{
  const s=emptyIndustry(0);s.machines={'moon-waterwheel:1':{...machine('moon-waterwheel'),enabled:true}};settleIndustry(s,7*86400000);expect(s.power!.generated).toBe(200);
  const before=structuredClone(s);settleIndustry(s,7*86400000);settleIndustry(s,0);expect(s).toEqual(before);
  s.machines['light-reservoir:1']=machine('light-reservoir');expect(industryEnergyCapacity(s)).toBe(1200);settleIndustry(s,7*86400000+1000000);expect(s.power!.stored).toBe(1200);expect(s.power!.generated).toBe(1200);
  const loaded=powered();loaded.stock={precision:10000,'charged-crystal':10000,wire:10000,charcoal:10000,crate:9};settleIndustry(loaded,7*86400000);expect(loaded.power!.generated).toBeLessThanOrEqual(3*7200);
 });
 it('rejects corrupt energy reservations and generator state instead of resetting the saved workshop',()=>{
  const s=powered();expect(validIndustry(s)).toBe(true);
  for(const patch of[{power:0},{power:{stored:201,generated:1,consumed:0}},{power:{stored:NaN,generated:1,consumed:0}},{crafted:{invented:1}},{machines:{'wick-generator:1':{...s.machines['wick-generator:1'],fuelSeconds:31}}},{job:{recipeId:'resonant-circuit',count:1,readyAt:20000,energy:1}}])expect(validIndustry({...s,...patch})).toBe(false);
 });
 it('uses fuel for an efficient tier-two sawmill without creating raw resources',()=>{
  const s=emptyIndustry(0);s.stock={timber:12,charcoal:1};s.machines={'wick-generator:1':{...machine('wick-generator'),enabled:true},'sawmill:1':machine('sawmill','light-sawn-plank')};
  settleIndustry(s,60000);expect(s.stock).toMatchObject({timber:2,charcoal:0,plank:60});expect(s.power).toEqual({stored:30,generated:90,consumed:60});expect(s.crafted?.['light-sawn-plank']).toBe(10);
 });
 it('applies a harvesting tool that finishes during exploration to the real claimed resources',()=>{
  const s=createInitialSave(content,42),id=content.chapters![0].dungeonIds[0],d=content.dungeons.find(d=>d.id===id)!;
  s.battle=createBattle(content,s.partyIds,s.leaderId,id,0,42,'finished-tool');s.battle.phase=s.battle.nextPhase='reward';s.battle.cursor=s.battle.events.length;
  s.industry=emptyIndustry(0);s.industry.power={stored:0,generated:120,consumed:0};s.industry.job={recipeId:'resonance-drill',count:1,readyAt:30000,energy:120};
  const base=industryLoot(d,s,content).ore,result=applyCommand(s,{type:'claim'},content,{now:30000});expect(result.industry!.stock['resonance-drill']).toBe(1);expect(result.industry!.stock.ore).toBeGreaterThan(base);expect(result.industry!.power!.consumed).toBe(120);
 });
 it('keeps the unused light of a fuel tick instead of burning three units to replace one',()=>{
  const s=emptyIndustry(0);s.stock={charcoal:2,timber:100};s.power={stored:200,generated:200,consumed:0};s.machines={'wick-generator:1':{...machine('wick-generator'),enabled:true},'sawmill:1':machine('sawmill','light-sawn-plank')};
  settleIndustry(s,91000);expect(s.stock.charcoal).toBe(1);expect(s.power).toEqual({stored:199,generated:290,consumed:91});expect(validIndustry(s)).toBe(true);
 });
 it('keeps a 1.23 workshop, running job, stock and combat seed intact during version upgrade',()=>{
  const old=player();old.appVersion='1.23.0';old.contentVersion='v1.23-r1';old.industry!.stock={timber:2,stone:1};old.industry!.job={recipeId:'bench',count:1,readyAt:12000};
  const upgraded=migrateSaveTo110(old,content);expect(upgraded.industry).toEqual(old.industry);expect(upgraded.seed).toBe(old.seed);expect(upgraded.gold).toBe(old.gold);
  const finished=applyCommand(upgraded,{type:'industrySync'},content,{now:12000});expect(finished.industry!.stock.bench).toBe(1);expect(finished.industry!.power).toBeUndefined();
 });
 it('bootstraps a tier-five harvesting tool from raw resources through the actual craft planner and commands',()=>{
  let s=player(),now=0;s.industry!.stock=Object.fromEntries(industryCatalog.items.filter(i=>i.kind==='raw').map(i=>[i.id,10000]));
  for(let step=0;step<1200;step++){
   const need=nextIndustryNeed(s.industry!,'autonomous-drill',7);if(!need)break;
   if(need.kind==='raw'||need.kind==='chapter')throw Error(JSON.stringify(need));
   if(need.kind==='waiting'){now=s.industry!.job!.readyAt;s=applyCommand(s,{type:'industrySync'},content,{now});}
   else if(need.kind==='power'){now+=100000;s=applyCommand(s,{type:'industrySync'},content,{now});}
   else s=applyCommand(s,need.kind==='install'?{type:'industryInstall',itemId:need.id}:{type:'industryCraft',recipeId:need.id,count:need.count},content,{now});
  }
  expect(s.industry!.stock['autonomous-drill']).toBe(1);expect(s.industry!.stock['resonance-drill']??0).toBe(0);expect(s.industry!.power!.consumed).toBeGreaterThan(0);expect(s.industry!.crafted!['autonomous-core']).toBeGreaterThan(0);expect(validIndustry(s.industry)).toBe(true);
  const plain=createInitialSave(content,42);const d=content.dungeons.find(d=>d.id===content.chapters![0].dungeonIds[0])!;expect(industryLoot(d,s,content).ore).toBeGreaterThan(industryLoot(d,plain,content).ore);
  const rich=structuredClone(plain);rich.industry=s.industry;expect(applyCommand(rich,{type:'depart',dungeonId:d.id,potions:0},content,{now}).battle).toEqual(applyCommand(plain,{type:'depart',dungeonId:d.id,potions:0},content,{now}).battle);
 });
});
