import {bossWindupStatus} from '../../src/domain/boss-pressure';
import {content} from '../../src/content';
import {createBattle,advanceReplay,resolveRound,usePotion,useBattleBloom,useBattleFairy} from '../../src/domain/engine';
import {partyOrderOptions} from '../../src/domain/party-orders';
import {duplicateFamily} from '../../src/domain/events';
import {gemPowerTier,gemTraitTier,TIER_RANGES,validMemoryGem,gemPowerMultiplier,gemSkill,gemDefinitionForSkill} from '../../src/domain/memory-gems';
import type {MemoryGem,GemTier,GemTrait,GemVariant} from '../../src/domain/memory-gems';
import type {Battle,PartyOrder} from '../../src/domain/types';
export {content};
export interface Config {party:string[];leader:string;gems:(MemoryGem|null)[];policy?:number}
export function gem(defId:string,tier:number,trait:GemTrait='none',traitTier=0,variant:GemVariant='pure'):MemoryGem{return{id:'g'+defId,defId,variant,roll:{power:TIER_RANGES[tier as GemTier][1],trait,value:trait==='none'?0:TIER_RANGES[traitTier as GemTier][1]}}}
export function score(c:Config){const C=c.party.reduce((s,id)=>s+content.characters.find(c=>c.id===id)!.strength,0);const T=c.gems.reduce((s,g)=>s+(g?gemPowerTier(g)+gemTraitTier(g):0),0);return{C:C/10,T,score:(C+T)/10};}
export function valid(c:Config){return c.party.length>0&&c.party.length<=4&&c.party.includes(c.leader)&&!duplicateFamily(c.party,content)&&c.gems.length===c.party.length&&c.gems.every(g=>!g||validMemoryGem(g));}
export function boundary(b:Battle){if(b.phase==='playing'){b.cursor=b.events.length-1;return advanceReplay(b,content);}return b;}
export function run(c:Config,seed:number,keep=false,floor=1){
 if(!valid(c))throw Error('Invalid config '+JSON.stringify(c));
 let b=createBattle(content,c.party,c.leader,'ivory-tower-'+String(floor).padStart(3,'0'),5,seed,'run-1000-'+seed);
 b.memoryGems=Object.fromEntries(c.party.flatMap((id,i)=>c.gems[i]?[[id,{...c.gems[i]!,id:'slot-'+i}]]:[]));
 let steps=0,rounds=0;const history:any[]=[];let flower=0,fairy=0,pots=0;const pol=c.policy??0;
 while(!['reward','failed'].includes(b.phase)&&steps++<2000){
  if(b.phase==='playing'){b=boundary(b);continue;}
  const allies=b.units.filter(u=>u.side==='party'&&u.hp>0),enemies=b.units.filter(u=>u.side==='enemy'&&u.hp>0);
  if(!allies.length||!enemies.length)throw Error('Bad phase');
  const lowest=[...allies].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(lowest.hp<lowest.maxHp*(pol===3?.7:.6)&&b.potionsRemaining>0&&!b.potionUsed){if(keep)history.push({round:b.round,type:'potion',unitId:lowest.uid});b=usePotion(b,lowest.uid);pots++;continue;}
  if(b.fairies?.visitor){if(keep)history.push({round:b.round,type:'battleFairy',fairyId:b.fairies.visitor.id});b=useBattleFairy(b,b.fairies.visitor.id,content);fairy++;continue;}
  if(b.blooms?.flower){if(keep)history.push({round:b.round,type:'battleBloom',bloomId:b.blooms.flower.id});b=useBattleBloom(b,b.blooms.flower.id,content).battle;flower++;continue;}
  const pilot=allies.find(u=>u.characterId===c.party[0]);const healer=allies.find(u=>content.characters.find(c=>c.id===u.characterId)!.role==='healer');
  b.strategy=[2,5,7].includes(pol)?'survival':[1,6].includes(pol)?'aggressive':'balanced';
  b.crystalRole=lowest.hp<lowest.maxHp*(pol===1?.45:.75)&&healer?'healer':pilot?content.characters.find(c=>c.id===pilot.characterId)!.role:content.characters.find(c=>c.id===allies[0].characterId)!.role;
  for(const u of allies)if(u!==pilot&&u.ultimateCharge===100&&!u.ultimateQueued){const role=content.characters.find(c=>c.id===u.characterId)!.role;if(role!=='healer'||allies.some(u=>u.hp<u.maxHp*.8))u.ultimateQueued=true;}
  const def=content.dungeons.find(d=>d.id===b.dungeonId)!;const boss=enemies.find(u=>u.boss);const pressure=boss&&def.bossStrike?bossWindupStatus(boss,def.bossStrike,b.round):undefined;
  const target=pol>=5&&pressure?.phase==='charging'?boss!:pol===4?(enemies.find(u=>u.boss)??[...enemies].sort((a,b)=>a.hp-b.hp)[0]):[...enemies].sort((a,b)=>a.hp-b.hp)[0];b.focusTargetId=target.uid;
  if(pilot){
   const opts=partyOrderOptions(pilot,b,content).filter(o=>!o.disabled);const ult=opts.find(o=>o.id==='ultimate');const healing=opts.find(o=>['heal','mend_pair','cleanse','barrier_mend'].includes(o.template));
   const gems=opts.filter(o=>o.id.startsWith('skill:memory:'));const ward=opts.find(o=>o.template==='barrier');
   const dmg=opts.filter(o=>o.order?.kind==='skill'&&['attack','area','drain','pierce','shatter','dawn'].includes(o.template));
   const scored=dmg.map(o=>{const sk=o.order?.kind==='skill'?(content.skills.find(s=>s.id===o.order!.skillId)??gemSkill(b.memoryGems![pilot.characterId])):undefined;const mg=o.id.startsWith('skill:memory:')?b.memoryGems![pilot.characterId]:undefined;return{o,v:(sk!.strength+30)*(mg?gemPowerMultiplier(mg):1)*(o.template==='area'?enemies.length*.55:o.template==='drain'?.65:o.template==='pierce'||o.template==='dawn'?1.2:1)};}).sort((a,b)=>b.v-a.v);
   const shield=ward&&((pilot.barrier??0)<pilot.maxHp*.3||lowest.hp<lowest.maxHp*.5)?ward:undefined;
   const ownGem=gems[0];const supportGem=ownGem&&['barrier','buff','overclock','sleep','dispel'].includes(ownGem.template)?ownGem:undefined;
   b.partyOrder=(pol>=5&&pressure?.phase==='striking'?{kind:'guard'}:lowest.hp<lowest.maxHp*(pol===1?.28:.5)&&healing?healing.order:ult&&!(ult.template==='heal'&&lowest.hp>lowest.maxHp*.85)?ult.order:[2,5,7].includes(pol)&&shield?shield.order:scored[0]?.o.order??supportGem?.order??shield?.order)??undefined;
  }
  if(keep)history.push({round:b.round,type:'round',strategy:b.strategy,crystalRole:b.crystalRole,focus:b.focusTargetId,order:b.partyOrder,queued:allies.filter(u=>u.ultimateQueued).map(u=>u.uid),before:allies.map(u=>({id:u.characterId,hp:u.hp,gauge:u.ultimateCharge})),enemyHP:enemies.map(u=>({id:u.characterId,hp:u.hp}))});
  b=resolveRound(b,content).battle;rounds++;
 }
 const alive=b.units.filter(u=>u.side==='party'&&u.hp>0);const rem=b.units.filter(u=>u.side==='enemy').reduce((s,u)=>s+u.hp/Math.max(1,u.maxHp),0);
 return{win:b.phase==='reward',rounds,survivors:alive.length,remaining:rem,fitness:(b.phase==='reward'?10000:0)+b.wave*1000+(3-rem)*100+rounds*.08+alive.reduce((s,u)=>s+u.hp/u.maxHp,0)*5,wave:b.wave,flower,fairy,pots,...(keep?{history,battle:b}:{})};
}
