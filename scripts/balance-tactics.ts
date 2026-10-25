import {content} from '../src/content';
import {createBattle,advanceReplay,resolveRound,usePotion} from '../src/domain/engine';
import type {Strategy} from '../src/domain/types';
const all=[];
for(const [team,ids,leader] of [['counter',['selene','seris-awakened','iwanagahime','rainbow-iris'],'selene'],['power',['selene','asteria','evelyn','athena'],'evelyn']] as const){
 for(const policy of ['balanced','aggressive','survival','one-opening'] as const){
  for(let seed=1;seed<=10;seed++){
   let b=createBattle(content,[...ids],leader,'moonshield-rehearsal',5,seed,`sim-${seed}`), rounds=0,changes=0,directives=0,usedOpening=false;
   b.strategy=policy==='one-opening'?'survival':policy;
   while(!['reward','failed'].includes(b.phase)&&rounds<210){
    if(b.phase==='playing'){b=advanceReplay(b,content);continue;}
    let s:Strategy=policy==='one-opening'?'survival':policy;
    if(policy==='one-opening'){
     const actor=b.units.find(u=>u.characterId==='iwanagahime')!;
     const canCounter=actor&&actor.hp>0&&(actor.cooldowns['shatter-13']??0)<=b.round&&(actor.cooldowns['guard-13']??0)<=b.round&&(!(actor.guardUntil)||actor.guardUntil<b.round);
     if(!usedOpening&&canCounter&&b.units.some(u=>u.boss&&(u.barrier??0)>0)){s='aggressive';usedOpening=true;}
    }
    if(b.strategy!==s)changes++;b.strategy=s;
    const weak=b.units.filter(u=>u.side==='party'&&u.hp>0).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
    if(weak&&weak.hp/weak.maxHp<.65&&b.potionsRemaining>0)b=usePotion(b,weak.uid);
    b=resolveRound(b,content).battle;rounds++;directives+=b.events.filter(e=>e.directive).length;
   }
   all.push({team,policy,seed,phase:b.phase,wave:b.wave,rounds,changes,directives,potions:5-b.potionsRemaining,partyHp:b.units.filter(u=>u.side==='party').reduce((sum,u)=>sum+u.hp,0)});
  }
 }
}
for(const team of ['counter','power'])for(const policy of ['balanced','aggressive','survival','one-opening']){const rows=all.filter(r=>r.team===team&&r.policy===policy);console.log(team,policy,{wins:rows.filter(r=>r.phase==='reward').length,rounds:rows.reduce((s,r)=>s+r.rounds,0)/10,directives:rows.reduce((s,r)=>s+r.directives,0),changes:rows.reduce((s,r)=>s+r.changes,0)/10});}
const {writeFileSync,mkdirSync}=await import('node:fs');mkdirSync('artifacts/tactical-combat',{recursive:true});writeFileSync('artifacts/tactical-combat/balance.json',JSON.stringify(all,null,2));
