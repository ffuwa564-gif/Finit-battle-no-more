import {mkdir,writeFile} from 'node:fs/promises';
import {content} from '../src/content';
import {advanceReplay,createBattle,resolveRound,useBattleBloom,useBattleFairy,usePotion,dungeonDifficulty} from '../src/domain/engine';
import {partyOrderOptions} from '../src/domain/party-orders';
import {bossWindupStatus} from '../src/domain/boss-pressure';
import {gemSkill,gemPowerMultiplier,type MemoryGem} from '../src/domain/memory-gems';
import {ivoryTowerId,IVORY_TOWER_VERSION} from '../src/domain/ivory-tower';
import type {Content} from '../src/domain/types';

export interface TowerProbeProfile {name:string;party:string[];leader:string;gems:(MemoryGem|null)[];reserveAttackUltimates?:boolean}
const gem=(defId:string,power:number,trait:'none'|'mercy'|'bulwark'='none'):MemoryGem=>({id:defId,defId,variant:'pure',roll:{power,trait,value:trait==='none'?0:power}});
const referenceGems=[gem('echo-shard',239,'mercy'),{...gem('echo-shard',239,'bulwark'),variant:'swift' as const},gem('dream-lace',239,'bulwark'),gem('dream-lace',239,'bulwark')];
export const towerV110Profiles:TowerProbeProfile[]=[
  {name:'bare-SSR',party:['nox','athena','selene','asteria'],leader:'athena',gems:[null,null,null,null]},
  {name:'T3-SSR',party:['nox','athena','selene','asteria'],leader:'athena',gems:[gem('shield-break',80),gem('pale-ward',80),gem('hollow-lantern',80),gem('dawn-crown',80)]},
  {name:'previous59-T6',party:['seris-awakened','kuzuha-awakened','athena','benzaiten'],leader:'athena',gems:referenceGems},
  {name:'previous59-T6-reserve',party:['seris-awakened','kuzuha-awakened','athena','benzaiten'],leader:'athena',gems:referenceGems,reserveAttackUltimates:true},
];

/** Fresh per-floor probes, not a continuous save ascent or an exhaustive best-build search. */
export function probeTowerFloor(floor:number,profile:TowerProbeProfile,seed:number,C:Content=content){
 let battle=createBattle(C,profile.party,profile.leader,ivoryTowerId(floor),5,seed,`tower-v110-${seed}`);
 battle.memoryGems=Object.fromEntries(profile.party.flatMap((id,index)=>profile.gems[index]?[[id,{...profile.gems[index]!,id:'probe-'+index}]]:[]));
 let steps=0,rounds=0;
 while(!['reward','failed'].includes(battle.phase)&&steps++<2500){
  if(battle.phase==='playing'){battle.cursor=battle.events.length-1;battle=advanceReplay(battle,C);continue;}
  const allies=battle.units.filter(u=>u.side==='party'&&u.hp>0),enemies=battle.units.filter(u=>u.side==='enemy'&&u.hp>0);
  if(!allies.length||!enemies.length)throw Error('Invalid ready phase');
  const low=[...allies].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]!;
  if(low.hp<low.maxHp*.6&&battle.potionsRemaining>0&&!battle.potionUsed){battle=usePotion(battle,low.uid);continue;}
  if(battle.fairies?.visitor){battle=useBattleFairy(battle,battle.fairies.visitor.id,C);continue;}
  if(battle.blooms?.flower){battle=useBattleBloom(battle,battle.blooms.flower.id,C).battle;continue;}
  const pilot=allies.find(u=>u.characterId===profile.party[0]),healer=allies.find(u=>C.characters.find(c=>c.id===u.characterId)?.role==='healer');
  battle.strategy=profile.reserveAttackUltimates?'balanced':'survival';
  battle.crystalRole=low.hp<low.maxHp*.75&&healer?'healer':pilot?C.characters.find(c=>c.id===pilot.characterId)!.role:C.characters.find(c=>c.id===allies[0]!.characterId)!.role;
  for(const actor of allies)if(actor!==pilot&&actor.ultimateCharge===100&&!actor.ultimateQueued){const role=C.characters.find(c=>c.id===actor.characterId)!.role;if((!profile.reserveAttackUltimates||['healer','tank','supporter'].includes(role))&&(role!=='healer'||allies.some(u=>u.hp<u.maxHp*.8)))actor.ultimateQueued=true;}
  const stage=C.dungeons.find(d=>d.id===battle.dungeonId)!,boss=enemies.find(u=>u.boss),pressure=boss&&stage.bossStrike?bossWindupStatus(boss,stage.bossStrike,battle.round):undefined;
  const target=pressure?.phase==='charging'?boss!:enemies.find(u=>C.characters.find(c=>c.id===u.characterId)?.role==='healer')??[...enemies].sort((a,b)=>a.hp-b.hp)[0]!;
  battle.focusTargetId=target.uid;
  if(pilot){
   const opts=partyOrderOptions(pilot,battle,C).filter(o=>!o.disabled),ult=opts.find(o=>o.id==='ultimate'),healing=opts.find(o=>['heal','mend_pair','cleanse','barrier_mend'].includes(o.template)),ward=opts.find(o=>o.template==='barrier');
   const dmg=opts.filter(o=>o.order?.kind==='skill'&&['attack','area','drain','pierce','shatter','dawn'].includes(o.template)).map(o=>{
    const memory=o.id.startsWith('skill:memory:'),sk=memory?gemSkill(battle.memoryGems![pilot.characterId]!):C.skills.find(s=>o.order?.kind==='skill'&&s.id===o.order.skillId)!;
    const power=(sk.strength+30)*(memory?gemPowerMultiplier(battle.memoryGems![pilot.characterId]!):1)*(o.template==='area'?enemies.length*.55:o.template==='drain'?.65:['pierce','dawn'].includes(o.template)?1.2:1)*(o.template==='shatter'&&enemies.some(u=>(u.barrier??0)>0)?1.4:1);
    return{o,power};
   }).sort((a,b)=>b.power-a.power);
   const shield=ward&&((pilot.barrier??0)<pilot.maxHp*.3||low.hp<low.maxHp*.5)?ward:undefined;
   const useUlt=ult&&(!profile.reserveAttackUltimates||['heal','barrier','rally'].includes(ult.template))&&!(ult.template==='heal'&&low.hp>low.maxHp*.85);
   battle.partyOrder=(pressure?.phase==='striking'?{kind:'guard'}:low.hp<low.maxHp*.5&&healing?healing.order:useUlt?ult.order:shield?.order??dmg[0]?.o.order)??undefined;
  }
  battle=resolveRound(battle,C).battle;rounds++;
 }
 if(steps>=2500)throw Error('Probe did not terminate');
 return{win:battle.phase==='reward',rounds,survivors:battle.units.filter(u=>u.side==='party'&&u.hp>0).length,potionsUsed:5-battle.potionsRemaining,wave:battle.wave};
}

if(process.argv[1]?.endsWith('balance-tower-v110.ts')){
 const seeds=Number(process.argv.find(a=>a.startsWith('--seeds='))?.split('=')[1]??10);
 if(!Number.isInteger(seeds)||seeds<1||seeds>100)throw Error('--seeds=1..100');
 const selected=process.argv.find(a=>a.startsWith('--profile='))?.split('=')[1],records=[];
 for(const profile of towerV110Profiles.filter(p=>!selected||p.name===selected)){
  const rows=[];
  for(let floor=1;floor<=100;floor++){
   const outcomes=Array.from({length:seeds},(_,i)=>({seed:31001+i,...probeTowerFloor(floor,profile,31001+i)}));
   const stage=content.dungeons.find(d=>d.id===ivoryTowerId(floor))!;
   rows.push({floor,main:stage.waves.at(-1)![0]!.characterId,constant:dungeonDifficulty(stage,content),wins:outcomes.filter(r=>r.win).length,total:seeds,outcomes});
  }
  let prefix=0;for(const row of rows){if(!row.wins)break;prefix=row.floor;}
  records.push({profile:profile.name,contiguousAnyWinPrefix:prefix,rows});console.log(profile.name,'prefix',prefix,'1F',rows[0]!.wins,'100F',rows[99]!.wins);
 }
 await mkdir('docs/reports',{recursive:true});
 await writeFile('docs/reports/ivory-tower-v110.json',JSON.stringify({version:IVORY_TOWER_VERSION,scope:'Fixed legal party/gear/action policies, independent floor probes, not a global highest floor or continuous climb.',trials:records.length*100*seeds,seeds:Array.from({length:seeds},(_,i)=>31001+i),reference:'The preceding research found a59F fixed T6 example under1.00. The same party and gear are probed here; enemy content and native1.10 rules differ.',records},null,2));
}
