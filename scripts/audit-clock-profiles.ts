import {writeFileSync,mkdirSync} from 'node:fs';
import {clockTeams,simulateClock} from './balance-clock';
const records=[];
for(const index of [0,1,3,4,6]){
 const team=clockTeams[index],rows=Array.from({length:200},(_,i)=>simulateClock(team,30001+i,index<=1?'aggressive':'switch'));
 const avg=(f:(r:typeof rows[number])=>number)=>rows.reduce((n,r)=>n+f(r),0)/rows.length;
 records.push({team,gear:'One T3 power80 echo-shard on Seris / awakened Seris. Other slots empty; potions5; no frame aid.',policy:index<=1?'aggressive':'switch',seeds:[30001,30200],wins:rows.filter(r=>r.phase==='reward').length,meanRounds:avg(r=>r.turns.length),meanPotions:avg(r=>r.potions),allAlive:rows.filter(r=>r.phase==='reward'&&r.turns.at(-1)?.living===4).length,rows});
 console.log(team.name,JSON.stringify({...records.at(-1),rows:undefined}));
}
mkdirSync('artifacts/gem-diversity',{recursive:true});writeFileSync('artifacts/gem-diversity/clock-confirmation.json',JSON.stringify({scope:'Regression confirmation of existing published clock strategies, not a global optimizer.',records},null,2));
