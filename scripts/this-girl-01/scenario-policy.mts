/** Research-only unit-stat perturbations; default {} must match ordinary native run. */
import*as lib from'./after-policy.mts';import{createBattle,rng}from'../../src/domain/engine';
export function runScenario(config:any,applicationSeed:number,stage:string,scenario:any={},payout=100,keep=false){
 const departure=rng(applicationSeed).seed;
 const b=createBattle(lib.content,config.party,config.leader,stage,5,departure,'run-1000-'+departure);
 b.memoryGems=Object.fromEntries(config.party.flatMap((id:string,i:number)=>config.gems[i]?[[id,{...config.gems[i],id:'slot-'+i}]]:[]));
 const seen=new Set<string>();const transform=(battle:any)=>{for(const u of battle.units){if(seen.has(u.uid))continue;seen.add(u.uid);const rarity=lib.content.characters.find(c=>c.id===u.characterId)!.rarity;
  const percent=u.side==='party'&&['SSR','XR'].includes(rarity)?scenario.high??0:u.side==='enemy'?scenario.enemy??0:0;
  for(const k of u.side==='enemy'?['maxHp','attack']:['maxHp','attack','defense'])if(percent)u[k]=Math.max(1,Math.round(u[k]*(100+percent)/100));u.hp=u.maxHp;
 }};
 transform(b);b.initialUnits=structuredClone(b.units);
 const contract=lib.content.characters.find(c=>c.id==='mireille')!.skillOverrides!['barrier-18'].barrierReturn!,old=contract.payoutPercent;contract.payoutPercent=payout;
 try{return lib.play(config,b,keep,Infinity,transform);}finally{contract.payoutPercent=old;}
}
