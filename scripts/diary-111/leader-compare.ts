import{run}from'./core';import{readFileSync,writeFileSync}from'node:fs';
const configs=JSON.parse(readFileSync('artifacts/diary-111/search/confirmatory.json','utf8'));const rows=[];
for(const x of configs)for(const leader of x.config.party){const c=structuredClone(x.config);c.leader=leader;const outcomes=Array.from({length:40},(_,i)=>({seed:50001+i,...run(c,50001+i)}));rows.push({id:x.id,leader,wins:outcomes.filter(x=>x.win).length,total:40,outcomes});console.log(x.id,leader,rows.at(-1)?.wins+'/40');}
writeFileSync('artifacts/diary-111/search/leader-comparison.json',JSON.stringify(rows,null,2));
