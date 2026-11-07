import {mkdirSync,writeFileSync} from 'node:fs';
import {content} from '../src/content';
import {createInitialSave} from '../src/application/game';
import {createBattle,advanceReplay,resolveRound,proceedToHuntBoss} from '../src/domain/engine';
import {battleEventDuration} from '../src/platform/battle-timing';
const rows=[];
for(const seed of [42,123,504,1024,8801])for(const early of [false,true]){
 const save=createInitialSave(content,seed);let b=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',0,seed,`timing-${seed}-${early}`,'hunt'),events=0,rounds=0,seconds=0;
 while(!['reward','failed'].includes(b.phase)&&rounds<100){
  if(b.phase==='playing'){const e=b.events[b.cursor];if(e){seconds+=battleEventDuration(e,1)/1000;events++;}b=advanceReplay(b,content);}
  else if(early&&b.hunt!.stage==='hunting'&&b.hunt!.kills>=12)b=proceedToHuntBoss(b,content);
  else{b=resolveRound(b,content).battle;rounds++;seconds+=1.2;}
 }
 rows.push({seed,mode:early?'boss-at-B':'full',phase:b.phase,partyActions:b.hunt!.actions,kills:b.hunt!.kills,rounds,replayEvents:events,estimatedAutoSeconds:Math.round(seconds)});
}
mkdirSync('artifacts/supply-loop',{recursive:true});writeFileSync('artifacts/supply-loop/timing.json',JSON.stringify({conditions:'Same starter party and leader. No equipment or stat edits, no optional aid, potions or ultimate reservations. Estimated configured 1x replay durations plus auto-ready waits, not measured wall-clock play time.',rows},null,2));console.table(rows);
