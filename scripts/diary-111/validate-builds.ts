import{run,Config}from'./core';import{readFileSync,writeFileSync}from'node:fs';
const a=JSON.parse(readFileSync('artifacts/diary-111/search/comparison.json','utf8'));const b=JSON.parse(readFileSync('artifacts/diary-111/search/final-comparison.json','utf8'));const original:Config=structuredClone(a.find((x:any)=>x.id==='rewind'&&x.name==='baseline').config);original.party[1]='iris';
const mainSeed:Config=structuredClone(b.find((x:any)=>x.id==='seed-nox-smart').config);
const selected=[{id:'rewind',title:'低レア巻戻し',config:original},{id:'flower',title:'白花と余り布',config:mainSeed}];
const rows:any[]=[];
for(const x of selected){const outcomes=Array.from({length:100},(_,i)=>({seed:30001+i,...run(x.config,30001+i)}));const row={...x,wins:outcomes.filter(o=>o.win).length,total:100,outcomes};rows.push(row);console.log(x.id,row.wins+'/100');}
writeFileSync('artifacts/diary-111/search/validated.json',JSON.stringify(rows,null,2));
for(const x of rows){
 const candidates=Array.from({length:20},(_,i)=>({seed:1001+i,result:run(x.config,1001+i,true)})).filter(o=>o.result.win);
 const ordered=candidates.sort((a,b)=>{
  const count=(o:any)=>o.result.events.filter((e:any)=>e.ailment&&e.statusAction==='inflict'&&e.targetIds?.some((s:string)=>s.startsWith('party:'))).length;
  return count(b)-count(a)||a.result.rounds-b.result.rounds;
 });
 const pick=ordered[0];if(!pick)throw Error('No representative '+x.id);writeFileSync('artifacts/diary-111/search/'+x.id+'-representative.json',JSON.stringify({...x,...pick},null,2));console.log(x.id,'representative',pick.seed,pick.result.rounds,'R');
}
