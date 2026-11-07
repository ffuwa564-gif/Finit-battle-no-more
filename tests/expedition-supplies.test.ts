import {describe,it,expect} from 'vitest';
import {content} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import {emptyIndustry,industryRecipe,industryEnergyCost,settleIndustry} from '../src/domain/industry';
import {DEFAULT_RECYCLING,recyclingPlan,materialReserves,quickPolish,replenishPowder,consumeExpeditionLoadout} from '../src/domain/expedition-supplies';
import {advanceReplay,createBattle,proceedToHuntBoss} from '../src/domain/engine';
import {createBattleHarvest,advanceHarvest,tapHarvest} from '../src/domain/battle-harvest';
import {assertValidSave,assertSaveCompatibility} from '../src/platform/save';
const base=()=>{const s=createInitialSave(content,42);s.industry=emptyIndustry(1000);return s;};
const raw=(id:string,promise:'ordinary'|'glimmering'|'radiant'='ordinary')=>({id,promise,result:{id,defId:'pale-ward',variant:'pure' as const,roll:{power:34,trait:'none' as const,value:0}}});
describe('surplus materials and expedition supplies',()=>{
 it('protects the reserve and recruitment/awakening needs, with a preview matching the actual debit',()=>{
  const s=base(),wolf=content.characters.find(c=>c.origin.includes('recruit')&&c.speciesId==='mist')!;
  const c={...content,characters:[{...wolf,recruitCost:[{materialId:'mist:common',count:4}]}],events:[],awakenings:[{id:'test',baseId:wolf.id,awakenedId:'future',cost:{materialId:'mist:common',count:100},requiredOwnedIds:[],requiredDungeonIds:[]}]};
  s.materials={'mist:common':500};expect(materialReserves(s,c)['mist:common']).toBe(104);
  const p=recyclingPlan(s,c,1000);expect(p.materials['mist:common']).toBe(396);
  const next=applyCommand(s,{type:'recycleMaterials',powder:1000},c);expect(next.materials['mist:common']).toBe(104);expect(next.industry!.stock['polishing-powder']).toBe(p.powder);expect(s.materials['mist:common']).toBe(500);
 });
 it('does not consume isolated event/story materials; normal materials go before rare ones',()=>{
  const s=base();s.recycling={...DEFAULT_RECYCLING,keep:0,protectNeeds:false};s.materials={'mist:common':10,'mist:rare':3};
  const special=content.materials?.[0]?.id;if(special)s.materials[special]=999;
  const p=recyclingPlan(s,content,11);expect(p.materials['mist:common']).toBe(10);expect(p.materials['mist:rare']).toBe(1);expect(p.powder).toBe(15);if(special)expect(p.materials[special]).toBeUndefined();
 });
 it('refills only when opted in, keeps reserves, and stops around its powder target',()=>{
  const s=base();s.materials={'mist:common':1000};replenishPowder(s,content,1000);expect(s.materials['mist:common']).toBe(1000);
  s.recycling={keep:30,protectNeeds:false,automatic:true};replenishPowder(s,content,1000);expect(s.industry!.stock['polishing-powder']).toBe(200);const before=structuredClone(s);replenishPowder(s,content,2000);expect(s).toEqual(before);
 });
 it('batch polish preserves sealed contents exactly, consumes one tool per stone, and is atomic',()=>{
  const s=base();s.memoryGems!.rough=[raw('one'),raw('two','radiant')];s.industry!.stock['polishing-kit']=2;
  const before=structuredClone(s.memoryGems!.rough.map(g=>g.result));const next=applyCommand(s,{type:'quickPolish',rawIds:['one','two'],tool:'polishing-kit'},content,{now:1000});
  expect(next.memoryGems!.items).toEqual(before);expect(next.memoryGems!.rough).toHaveLength(0);expect(next.industry!.stock['polishing-kit']).toBe(0);expect(s.industry!.stock['polishing-kit']).toBe(2);
  expect(()=>applyCommand(next,{type:'quickPolish',rawIds:['one'],tool:'polishing-kit'},content)).toThrow();assertValidSave(next);assertSaveCompatibility(next,content);
  expect(()=>quickPolish(s,['one','one'],'polishing-kit',1000)).toThrow();expect(s.industry!.stock['polishing-kit']).toBe(2);
 });
 it('cannot quick polish during combat, bypass active hand polishing, or spend too few tools',()=>{
  const s=base();s.memoryGems!.rough=[raw('one'),raw('two')];s.industry!.stock['polishing-cloth']=1;
  expect(()=>quickPolish(s,['one','two'],'polishing-cloth',1000)).toThrow();expect(()=>quickPolish(s,['one'],'polishing-kit',1000)).toThrow();
  const active=applyCommand(s,{type:'startGemPolish',rawId:'one'},content,{now:1000});expect(()=>applyCommand(active,{type:'quickPolish',rawIds:['one'],tool:'polishing-cloth'},content,{now:1001})).toThrow();
  s.battle=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',0,42,'busy','hunt');expect(()=>applyCommand(s,{type:'quickPolish',rawIds:['one'],tool:'polishing-cloth'},content)).toThrow();
 });
 it('uses genuine tiered recipes, consumes ingredients and can automate polishing cloth',()=>{
  const s=base();s.industry!.machines['bench:1']={kind:'bench',enabled:true,progress:0};s.industry!.stock={'polishing-powder':8,fiber:2};
  let next=applyCommand(s,{type:'industryCraft',recipeId:'polishing-cloth',count:2},content,{now:1000});expect(next.industry!.stock['polishing-powder']).toBe(0);next=applyCommand(next,{type:'industryCollect'},content,{now:9000});expect(next.industry!.stock['polishing-cloth']).toBe(2);
  const efficient=industryRecipe('polishing-kit-efficient')!,normal=industryRecipe('polishing-kit')!;expect(efficient.inputs['polishing-cloth']/efficient.outputs['polishing-kit']).toBeLessThan(normal.inputs['polishing-cloth']/normal.outputs['polishing-kit']);
 });
 it('consumes selected supplies only on successful departure, and applies only to available resources',()=>{
  const s=base();s.industry!.stock={'recovery-lantern':1,'exploration-incense':1};
  expect(()=>applyCommand(s,{type:'depart',dungeonId:'silent-cathedral',potions:999,mode:'hunt',supplies:{collection:'gem',incense:'ore'}},content)).toThrow();expect(s.industry!.stock['recovery-lantern']).toBe(1);
  const next=applyCommand(s,{type:'depart',dungeonId:'silent-cathedral',potions:0,mode:'hunt',supplies:{collection:'gem',incense:'ore'}},content);expect(next.industry!.stock['recovery-lantern']).toBe(0);expect(next.industry!.stock['exploration-incense']).toBe(0);expect(next.battle!.supplies).toEqual({collection:'gem',incense:'ore'});
  expect(()=>consumeExpeditionLoadout(s,content,'silent-cathedral',{incense:'not-real'})).toThrow();assertValidSave(next);assertSaveCompatibility(next,content);
 });
 it('a gathering light reduces real tap count, without changing stones or card sockets',()=>{
  const s=base(),b=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',0,42,'light','hunt');b.harvest=createBattleHarvest(b.id);b.supplies={collection:'gem'};
  b.harvest.offers=[{id:`${b.id}:harvest:1`,kind:'gem',slot:0,hits:0,required:6,expires:20,gem:raw(`${b.id}:harvest:1`)}];
  expect(tapHarvest(b,b.harvest.offers[0].id)).toBe('tap');expect(tapHarvest(b,b.harvest.offers[0].id)).toBe('tap');expect(tapHarvest(b,b.harvest.offers[0].id)).toBe('gem');expect(b.harvest.gems[0].result).toEqual(raw(`${b.id}:harvest:1`).result);expect(b.harvest.sockets).toEqual([]);
 });
 it('incense changes real drop distribution, including the selected raw resource',()=>{
  const counts=(incense?:string)=>{let gems=0,ore=0;for(let seed=1;seed<=300;seed++){const s=base(),b=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',0,seed,`rates-${seed}`,'hunt');b.harvest=createBattleHarvest(b.id);b.supplies={incense};advanceHarvest(b,{id:'drop',kind:'drop',text:'drop',huntKill:true,huntProgress:{...b.hunt!}},content);gems+=b.harvest.offers.filter(o=>o.kind==='gem').length;ore+=b.harvest.offers.filter(o=>o.itemId==='ore').length;}return {gems,ore};};
  const normal=counts();expect(counts('gem').gems).toBeGreaterThan(normal.gems);expect(counts('ore').ore).toBeGreaterThan(normal.ore*2);
 });
 it('early boss entry keeps the actual hand count and loot, and cannot jump to victory',()=>{
  const s=base();s.battle=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',0,42,'early','hunt');while(s.battle.phase==='playing')s.battle=advanceReplay(s.battle,content);
  expect(()=>proceedToHuntBoss(s.battle!,content)).toThrow();s.battle!.hunt={actions:45,kills:12,serial:15,stage:'hunting'};s.battle!.harvest=createBattleHarvest(s.battle!.id);s.battle!.harvest!.materials={iron:3};
  let next=applyCommand(s,{type:'huntBoss',battleId:'early'},content);while(next.battle!.phase==='playing')next=applyCommand(next,{type:'replay'},content);
  expect(next.battle!.hunt!.actions).toBe(45);expect(next.battle!.hunt!.finishAt).toBe(45);expect(next.battle!.hunt!.stage).toBe('boss');expect(next.battle!.phase).toBe('ready');expect(next.battle!.units.some(u=>u.boss)).toBe(true);expect(next.battle!.harvest!.materials.iron).toBe(3);expect(()=>applyCommand(next,{type:'claim'},content)).toThrow();assertValidSave(next);assertSaveCompatibility(next,content);
 });
});
it('automates cloth production using normal installed-machine processing',()=>{
 const s=base();s.industry!.machines['bench:1']={kind:'bench',enabled:true,progress:0};s.industry!.stock={'polishing-powder':4,fiber:1};
 let next=applyCommand(s,{type:'industryConfigure',machineId:'bench:1',recipeId:'polishing-cloth'},content,{now:1000});
 next=applyCommand(next,{type:'industrySync'},content,{now:5000});expect(next.industry!.stock['polishing-cloth']).toBe(1);expect(next.industry!.stock['polishing-powder']).toBe(0);
});
it('records gross earned materials even when automatic powder conversion spends them at claim',()=>{
 let s=applyCommand(base(),{type:'depart',dungeonId:'silent-cathedral',potions:0,mode:'hunt'},content,{now:1000});const b=s.battle!;
 b.hunt={actions:100,kills:12,serial:15,stage:'boss'};b.wave=content.dungeons.find(d=>d.id===b.dungeonId)!.waves.length-1;b.phase='reward';b.nextPhase='reward';b.cursor=b.events.length;b.pendingMaterials={'mist:common':5};
 s.recycling={keep:0,protectNeeds:false,automatic:true};s=applyCommand(s,{type:'claim'},content,{now:2000});expect(s.materials['mist:common']).toBe(0);expect(s.industry!.stock['polishing-powder']).toBe(5);expect(s.expeditionHistory![0].earned.materials['mist:common']).toBe(5);
});
