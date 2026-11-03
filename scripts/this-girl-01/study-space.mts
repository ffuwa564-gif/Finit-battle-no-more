import{createHash}from'node:crypto';
import{content}from'./before-policy.mts';
import type{Config}from'./before-policy.mts';
import{GEM_DEFINITIONS,TIER_RANGES,supportedGemTraits,validMemoryGem,type MemoryGem,type GemTier,type GemTrait}from'../../artifacts/this-girl-01/baseline/src/domain/memory-gems';
import{duplicateFamily}from'../../artifacts/this-girl-01/baseline/src/domain/events';
export const CORES:Record<string,string[]>={F1:['athena','astraea','seris-awakened'],F4:['liora-awakened','astraea','seris-awakened'],F5:['noelle-awakened','evelyn','seris-awakened']};
export const MAIN_STAGES=['ivory-tower-010','kuzuha-awakening'];
export const TIERS=[3,4,6];
export const key=(config:Config)=>createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0,24);
const by=new Map(content.characters.map(c=>[c.id,c]));
export function gem(defId:string,tier:number,trait:GemTrait='mercy',variant='pure',slot=0):MemoryGem{
 const d=GEM_DEFINITIONS.find(d=>d.id===defId)!;if(!d)throw Error('Unknown gem '+defId);const supported=supportedGemTraits(d);const chosen=supported.includes(trait)?trait:supported.includes('bulwark')?'bulwark':'none';
 const result:MemoryGem={id:'slot-'+slot,defId,variant:d.variants.includes(variant as any)?variant as any:'pure',roll:d.fixedRoll?{...d.fixedRoll}:{power:TIER_RANGES[tier as GemTier][1],trait:chosen,value:chosen==='none'?0:TIER_RANGES[tier as GemTier][1]}};
 if(!validMemoryGem(result))throw Error('Illegal generated stone');return result;
}
/** Exactly64 legal candidates per replacement; every leader/pilot pair and all16 mercy/bulwark masks occur. */
export function fixedBank(tier:number,candidate:string,core:string[]):Config[]{
 const base=[...core,candidate];if(duplicateFamily(base,content)||new Set(base).size!==4)throw Error('Illegal family/core '+base);const result:Config[]=[];
 for(let n=0;n<64;n++){
  const leaderIndex=n<16?Math.floor(n/4):Math.floor((n-16)/12);const pilotIndex=n<16?n%4:(n-16)%4;const party=[base[pilotIndex],...base.filter((_,i)=>i!==pilotIndex)];const leader=base[leaderIndex];
  const style=n<16?0:1+Math.floor((n-16)%12/4);const mask=n<16?n:(n*7)%16;
  const gems=party.map((id,i)=>{const role=by.get(id)!.role;let def='echo-shard',trait:GemTrait=mask&(1<<i)?'bulwark':'mercy';
   if(style===1)def=role==='healer'||role==='tank'?'pale-ward':'dawn-crown';
   if(style===2)def=role==='healer'?'twin-tide':role==='tank'?'rewind-thread':'night-dew';
   if(style===3)def=GEM_DEFINITIONS[(n*5+i*3)%GEM_DEFINITIONS.length].id;
   return gem(def,tier,trait,(n+i)%3===0?'swift':'pure',i);});
  result.push({party,leader,gems,policy:n%8,command:['noelle','noelle-awakened'].includes(leader),commandMode:(['never','conditional','always']as const)[n%3],autoPilot:n%4===0,offensivePilot:n%7===0,potionThreshold:[.45,.6,.75][n%3],...(n%11===0?{prefer:['barrier']}:{}),...(gems[0].defId==='white-flower-seed'?{plantSeed:true,guardSeeds:'smart' as const}:{})});
 }
 if(new Set(result.map(key)).size!==64)throw Error('Candidate bank duplicate');return result;
}
export function mutationBank(config:Config,tier:number,count=24):Config[]{
 const result:Config[]=[];const seen=new Set<string>();const add=(c:Config)=>{const k=key(c);if(!seen.has(k)){seen.add(k);result.push(c);}};add(structuredClone(config));
 for(let mask=0;mask<16;mask++){const c=structuredClone(config);c.gems=c.gems.map((g,i)=>{if(!g)return null;const d=GEM_DEFINITIONS.find(d=>d.id===g.defId)!;if(d.fixedRoll)return g;return gem(g.defId,tier,mask&(1<<i)?'bulwark':'mercy',g.variant,i);});add(c);}
 for(const def of ['pale-ward','echo-shard','dawn-crown','night-dew','rewind-thread','star-furnace'])for(let i=0;i<4;i++){const c=structuredClone(config);c.gems[i]=gem(def,tier,def==='pale-ward'?'bulwark':'mercy',i%2?'swift':'pure',i);add(c);}
 if(result.length<count)throw Error('Could not fill mutation bank');return result.slice(0,count);
}
export function downroll(config:Config,tier:number):Config{return{...structuredClone(config),gems:config.gems.map((g,i)=>g?gem(g.defId,tier,g.roll?.trait??'none',g.variant,i):null)};}
export function globalBank(tier:number):Config[]{
 const teams=[['astraea','athena','benzaiten','seris-awakened'],['nox','liora-awakened','miette','seris-awakened'],['astraea','evelyn','mireille','zakuro'],['seris','liora-awakened','flora','nox'],['noelle-awakened','evelyn','mireille','seris-awakened'],['nox','fortuna','lunette-awakened','elaine-awakened'],['kuzuha-awakened','hecate','benzaiten','vespera'],['astraea','freyja','selene','zakuro']];
 let state=27182818;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
 while(teams.length<24){const team:string[]=[];for(const role of ['tank','attacker',random()<.6?'healer':'area_attacker','debuffer']){let pool=content.characters.filter(c=>c.published&&!duplicateFamily([...team,c.id],content)&&!team.includes(c.id));const matching=pool.filter(c=>c.role===role);if(matching.length)pool=matching;team.push(pool[Math.floor(random()*pool.length)].id);}teams.push(team);}
 return teams.flatMap(team=>{const candidate=team[3],core=team.slice(0,3);return fixedBank(tier,candidate,core).filter((_,i)=>[0,5,21,42].includes(i));});
}
export const STRESS_SCENARIOS=[{id:'high25',higherRarityStatsPercent:25},{id:'high50',higherRarityStatsPercent:50},{id:'enemyMinus10',enemyStatsPercent:-10},{id:'enemyPlus10',enemyStatsPercent:10}]as const;
