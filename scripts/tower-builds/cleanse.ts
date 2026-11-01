import{run}from'./search-core';import{readFileSync,writeFileSync}from'node:fs';
const file='artifacts/tower-builds/search.json';const rows=JSON.parse(readFileSync(file,'utf8'));const row=rows.find((r:any)=>r.id==='cleanse');let chosen:any;
for(let seed=1001;seed<=1060;seed++){
 const proof=run(row.config,seed,true);let before:any[]=[];let cures=0;
 for(const e of proof.events??[]){if(e.skillId?.startsWith('memory:clear-tear:')&&e.unitsAfter){for(const uid of e.targetIds??[]){const a=before.find(u=>u.uid===uid),b=e.unitsAfter.find((u:any)=>u.uid===uid);if(a?.ailments&&!b?.ailments)cures++;}}if(e.unitsAfter)before=e.unitsAfter;}
 if(proof.win&&cures){chosen={seed,proof,cures};break;}
}
if(!chosen)throw Error('No native cleanse example');
row.representative={seed:chosen.seed,...run(row.config,chosen.seed)};row.proof=chosen.proof;row.holdout=Array.from({length:60},(_,i)=>({seed:70001+i,...run(row.config,70001+i)}));row.actualCures=chosen.cures;
writeFileSync(file,JSON.stringify(rows,null,2));console.log('cleanse selected',chosen.seed,chosen.cures,row.holdout.filter((r:any)=>r.win).length);
