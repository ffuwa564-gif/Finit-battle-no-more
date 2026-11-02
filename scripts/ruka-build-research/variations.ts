import{trial}from'./experiment';import{gem}from'/tmp/stillveil-ruka-build-lab/scripts/diary-part3/core';import{SPOOL}from'/tmp/stillveil-ruka-build-lab/src/domain/research-ruka';import{writeFileSync}from'node:fs';
const cases=[
 {id:'healer-benzaiten',party:['ruka','nox','athena','benzaiten']},
 {id:'healer-elaine',party:['ruka','nox','athena','elaine']},
 {id:'no-athena-no-fio',party:['ruka','nox','liora-awakened','benzaiten']},
 {id:'only-ruka-fixed-all-three-partners-replaced',party:['ruka','seris-awakened','liora-awakened','benzaiten']},
];const out=[];
for(const c of cases){const rows=[];const gems=[gem('echo-shard',4,'mercy',4),gem('echo-shard',4,'mercy',4),gem('pale-ward',4,'bulwark',4),{id:'spool',defId:SPOOL,variant:'pure',roll:{power:80,trait:'none',value:0}}];for(let seed=1;seed<=100;seed++)rows.push(trial({party:c.party,gems,tier:4,stock:false,emergencyFirst:true,releaseCapOnWound:true,stage:'research-loom-final'},seed));out.push({...c,n:100,wins:rows.filter(r=>r.win).length,meanRounds:rows.reduce((s,r)=>s+r.rounds,0)/100,rows});}
writeFileSync('artifacts/ruka-build-research/variation-results.json',JSON.stringify({cases:out},null,2));console.log(out.map(({rows,...x})=>x));
