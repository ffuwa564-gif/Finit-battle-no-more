import{run,Config}from'./core';import{readFileSync,writeFileSync}from'node:fs';
const p=JSON.parse(readFileSync('artifacts/diary-111/search/flower-pilot.json','utf8')).find((x:any)=>x.id==='fio-smart');
const r=JSON.parse(readFileSync('artifacts/diary-111/search/validated.json','utf8')).find((x:any)=>x.id==='rewind');
const rows:any[]=[];for(const[id,config]of[['rewind',r.config],['flower',p.config]]as[string,Config][]){const outcomes=Array.from({length:100},(_,i)=>({seed:70001+i,...run(config,70001+i)}));rows.push({id,config,wins:outcomes.filter(o=>o.win).length,total:100,outcomes});console.log(id,rows.at(-1).wins+'/100');}
writeFileSync('artifacts/diary-111/search/confirmatory.json',JSON.stringify(rows,null,2));
const candidates=p.outcomes.filter((o:any)=>o.win&&o.blooms&&o.overflow).map((o:any)=>({seed:o.seed,result:run(p.config,o.seed,true)}));
const chosen=candidates.sort((a:any,b:any)=>b.result.events.filter((e:any)=>e?.statusAction==='inflict'&&e?.targetIds?.some((s:string)=>s.startsWith('party:'))).length-a.result.events.filter((e:any)=>e?.statusAction==='inflict'&&e?.targetIds?.some((s:string)=>s.startsWith('party:'))).length)[0];
writeFileSync('artifacts/diary-111/search/flower-representative.json',JSON.stringify({id:'flower',config:p.config,...chosen},null,2));console.log('flower representative',chosen.seed,chosen.result.rounds);
