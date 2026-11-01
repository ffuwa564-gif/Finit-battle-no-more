import{run,Config}from'./core';import{readFileSync,writeFileSync}from'node:fs';
const previous=JSON.parse(readFileSync('artifacts/diary-111/search/comparison.json','utf8'));
const rows:any[]=[];let c:Config=structuredClone(previous.find((x:any)=>x.id==='rewind'&&x.name==='baseline').config);c.party[1]='iris';c.party[3]='elaine-awakened';
const combos:[string,Config][]=[['rewind-budget',c]];
for(const id of ['seed-nox','seed-scout']){const c:Config=structuredClone(previous.find((x:any)=>x.id===id&&x.name==='baseline').config);c.guardSeeds='smart';combos.push([id+'-smart',c]);}
for(const[id,config]of combos){const outcomes=Array.from({length:40},(_,i)=>({seed:50001+i,...run(config,50001+i)}));rows.push({id,config,wins:outcomes.filter(x=>x.win).length,total:40,outcomes});console.log(id,rows.at(-1).wins+'/40');}
writeFileSync('artifacts/diary-111/search/final-comparison.json',JSON.stringify(rows,null,2));
