import {run,Config}from'./core';import{readFileSync,writeFileSync}from'node:fs';
const coarse=JSON.parse(readFileSync('artifacts/diary-111/search/coarse.json','utf8'));const rows:any[]=[];
for(const id of ['rewind','seed-nox','seed-scout']){
 const best=coarse.filter((r:any)=>r.id===id).sort((a:any,b:any)=>b.wins-a.wins)[0];const base:Config=best.config;
 const changes:[string,number,string][] = id==='rewind'?[['Nox',0,'nox'],['Iris',1,'iris'],['Noelle',1,'noelle-awakened'],['Liora',2,'liora-awakened'],['Elaine',3,'elaine-awakened'],['Fio',3,'fio']]:[['Ruka',1,'ruka'],['Elaine',2,'elaine-awakened'],['Flora-R',2,'flora-standard'],['Elaine-mainhealer',3,'elaine-awakened']];
 const variants:[string,Config][]=[['baseline',base],...changes.map(([name,index,cid])=>{const c=structuredClone(base);const old=c.party[index];c.party[index]=cid;if(c.leader===old)c.leader=cid;return[name,c]as[string,Config];})];
 if(id.startsWith('seed')){const noGuard=structuredClone(base);noGuard.guardSeeds=false;variants.push(['no-seed-guard',noGuard]);const noSeed=structuredClone(base);noSeed.gems[2]={id:'clear-tear',defId:'clear-tear',variant:'pure',roll:{power:125,trait:'bulwark',value:125}};noSeed.guardSeeds=false;variants.push(['clear-tear-instead',noSeed]);}
 for(const[name,config]of variants){const outcomes=Array.from({length:40},(_,i)=>({seed:50001+i,...run(config,50001+i)}));const row={id,name,config,wins:outcomes.filter(r=>r.win).length,total:40,outcomes};rows.push(row);console.log(id,name,row.wins+'/40');writeFileSync('artifacts/diary-111/search/comparison.json',JSON.stringify(rows,null,2));}
}
