import { GEM_DEFINITIONS } from '../src/domain/memory-gems';
import {mkdirSync,writeFileSync} from 'node:fs';
import {content} from '../src/content';
import {createBattle,resolveRound,advanceReplay} from '../src/domain/engine';
import {createInitialSave} from '../src/application/game';
import {createBattleHarvest,advanceHarvest,tapHarvest,chooseHarvest,harvestQuality} from '../src/domain/battle-harvest';
import {huntRank} from '../src/domain/hunt';
const initialSave=createInitialSave(content),initial=initialSave.partyIds;
const ssr=content.characters.filter(c=>c.published&&c.rarity==='SSR'&&c.origin.includes('gacha'));
const veterans=['tank','healer','area_attacker','attacker'].map(role=>ssr.find(c=>c.role===role)?.id).filter((x):x is string=>!!x);
const cases=[{name:'initial',party:initial},{name:'initial-aggressive',party:initial},{name:'initial-survival',party:initial},{name:'initial-wick',party:initial},{name:'veteran',party:[...new Set(veterans)].slice(0,4)}];
const rows=[];
for(const scenario of cases)for(const seed of [42,123,504,1024,8801]){
 let b=createBattle(content,scenario.party,scenario.name.startsWith('initial')?initialSave.leaderId:scenario.party[0]!,'silent-cathedral',5,seed,`audit-${scenario.name}-${seed}`,'hunt');b.harvest=createBattleHarvest(b.id);if(scenario.name.endsWith('aggressive'))b.strategy='aggressive';if(scenario.name.endsWith('survival'))b.strategy='survival';
 if(scenario.name==='initial-wick')b.memoryGems=Object.fromEntries(scenario.party.map((id,i)=>[id,{id:`audit-wick-${i}`,defId:'wick-stone',variant:'pure' as const,roll:structuredClone(GEM_DEFINITIONS.find(g=>g.id==='wick-stone')!.fixedRoll!)}]));
 let rounds=0,events=0,maxUnits=0;const rareParts:Record<string,number>={};
 while(!['reward','failed'].includes(b.phase)&&rounds<120){
  if(b.phase==='ready'){b=resolveRound(b,content).battle;rounds++;}
  else{const event=b.events[b.cursor];b=advanceReplay(b,content);if(event){events++;advanceHarvest(b,event,content);}
   const choice=b.harvest?.choice;if(choice)chooseHarvest(b,choice.id,choice.options.includes('abundance')?'abundance':choice.options[0]!,b.harvest!.sockets!.length>=3?2:undefined);
   for(const o of [...(b.harvest?.offers??[])]){if(o.kind==='material'&&harvestQuality(o)!=='common')rareParts[o.itemId!]=(rareParts[o.itemId!]??0)+o.amount!;for(let t=0;t<6;t++)tapHarvest(b,o.id);}
  }maxUnits=Math.max(maxUnits,b.units.length);
 }
 rows.push({party:scenario.name,partyIds:scenario.party,seed,phase:b.phase,actions:b.hunt!.actions,kills:b.hunt!.kills,rank:huntRank(b.hunt!.kills).rank,rounds,replayEvents:events,maxUnits,materials:b.harvest!.materials,gems:b.harvest!.gems.map(g=>g.promise),rareParts,remainingHp:b.units.filter(u=>u.side==='party').map(u=>({id:u.characterId,hp:u.hp,max:u.maxHp}))});
}
mkdirSync('artifacts/hunt',{recursive:true});writeFileSync('artifacts/hunt/balance.json',JSON.stringify(rows,null,2));console.table(rows.map(({party,seed,phase,actions,kills,rank,rounds,gems,maxUnits})=>({party,seed,phase,actions,kills,rank,rounds,gems:gems.length,maxUnits})));
