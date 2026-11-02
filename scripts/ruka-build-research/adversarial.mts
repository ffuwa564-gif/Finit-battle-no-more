import{writeFileSync}from'node:fs';
import{trial}from'./experiment.mts';
import{content}from'/tmp/stillveil-ruka-build-lab/src/content/index';
const chars=content.characters.filter(c=>c.published&&!c.id.startsWith('research-')&&!['ruka','nox','athena','fio'].includes(c.id)&&!['ruka','nox','athena','fio'].includes(c.familyId??c.id));const rows=[];
for(const c of chars){const outcomes=[];for(let seed=1;seed<=20;seed++)outcomes.push(trial({party:[c.id,'nox','athena','fio'],leader:'athena',tier:6,stock:false,releaseCapOnWound:true,stage:'research-loom-final'},seed));rows.push({id:c.id,name:c.name,n:outcomes.length,wins:outcomes.filter(x=>x.win).length,meanRounds:outcomes.reduce((a,x)=>a+x.rounds,0)/outcomes.length});}
const controls=[];
for(const opt of[
 {id:'durable-negative-no-reset',party:['benzaiten','nox','athena','selene'],leader:'athena',noReset:true},
 {id:'tier6-early-window',party:['ruka','nox','athena','fio'],timing:'early'},
 {id:'tier6-late-window',party:['ruka','nox','athena','fio'],timing:'late'},
]as const){const outcomes=[];for(let seed=1;seed<=100;seed++)outcomes.push(trial({...opt,party:[...opt.party],tier:6,stock:false,releaseCapOnWound:true,stage:'research-loom-final'},seed));controls.push({...opt,n:100,wins:outcomes.filter(x=>x.win).length,meanRounds:outcomes.reduce((a,x)=>a+x.rounds,0)/100,meanBlocked:outcomes.reduce((a,x)=>a+x.blocked,0)/100});}
const report={characters:chars.length,totalBattles:rows.reduce((a,x)=>a+x.n,0)+300,counterReplacementCases:rows,controls};writeFileSync('artifacts/ruka-build-research/adversarial-results.json',JSON.stringify(report,null,2));console.log('ADVERSARIAL COMPLETE',report.totalBattles,'no-ruka wins',rows.reduce((a,x)=>a+x.wins,0),controls);
