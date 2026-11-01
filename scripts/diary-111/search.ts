import {writeFileSync} from 'node:fs';import {content,run,gem,Config} from './core';import type{MemoryGem}from '../../src/domain/memory-gems';
const g=(defId:string,power=125,trait:any='none',value=125):MemoryGem=>({id:'g-'+defId,defId,variant:'pure',roll:{power,trait,value:trait==='none'?0:value}});
const prior=[g('pale-ward',125),g('night-dew',99,'mercy',91),g('night-dew',100,'mercy',93),g('clear-tear',134,'bulwark',135)];
const defs:{id:string;c:Config}[]=[
{id:'prior',c:{party:['athena','nox','hecate','flora-standard'],leader:'hecate',gems:prior}},
{id:'new-scouts',c:{party:['athena','ruka','hecate','fio'],leader:'hecate',gems:prior}},
{id:'fio-replace',c:{party:['athena','nox','hecate','fio'],leader:'hecate',gems:prior}},
{id:'ruka-replace',c:{party:['athena','ruka','hecate','flora-standard'],leader:'hecate',gems:prior}},
{id:'rewind',c:{party:['seris-awakened','vespera','athena','benzaiten'],leader:'athena',gems:[g('echo-shard',125,'mercy'),g('rewind-thread',125,'bulwark'),g('pale-ward',125,'bulwark'),g('twin-tide',125,'bulwark')]}},
{id:'rewind-elaine',c:{party:['seris-awakened','vespera','athena','elaine-awakened'],leader:'athena',gems:[g('echo-shard',125,'mercy'),g('rewind-thread',125,'bulwark'),g('pale-ward',125,'bulwark'),g('twin-tide',125,'bulwark')]}},
{id:'command-sleep',c:{party:['liora-awakened','persephone','noelle-awakened','benzaiten'],leader:'noelle-awakened',command:true,gems:[g('pale-ward',125,'bulwark'),g('dream-lace',125,'bulwark'),g('white-flower-seed',80),g('twin-tide',125,'bulwark')],guardSeeds:true,autoPilot:true}},
{id:'seed-scout',c:{party:['athena','ruka','fio','benzaiten'],leader:'athena',gems:[g('pale-ward',125,'bulwark'),g('echo-shard',125,'mercy'),g('white-flower-seed',80),g('twin-tide',125,'bulwark')],guardSeeds:true,autoPilot:true}},
{id:'seed-nox',c:{party:['athena','nox','fio','benzaiten'],leader:'athena',gems:[g('pale-ward',125,'bulwark'),g('echo-shard',125,'mercy'),g('white-flower-seed',80),g('twin-tide',125,'bulwark')],guardSeeds:true,autoPilot:true}},
{id:'command-tikka',c:{party:['athena','tikka','noelle-awakened','benzaiten'],leader:'noelle-awakened',command:true,gems:[g('pale-ward',125,'bulwark'),g('echo-shard',125,'mercy'),g('night-dew',125,'mercy'),g('twin-tide',125,'bulwark')],autoPilot:true}},
];
let rows:any[]=[];
for(const def of defs){
 for(const policy of [0,1,2,5,6]){
  const config={...def.c,policy};const outcomes=Array.from({length:12},(_,i)=>({seed:1001+i,...run(config,1001+i)}));
  const row={id:def.id,config,wins:outcomes.filter(x=>x.win).length,total:outcomes.length,outcomes};rows.push(row);
 }
 const best=rows.filter(x=>x.id===def.id).sort((a,b)=>b.wins-a.wins||a.outcomes.reduce((s:number,x:any)=>s+x.remaining,0)-b.outcomes.reduce((s:number,x:any)=>s+x.remaining,0))[0];console.log(def.id,best.config.policy,best.wins+'/'+best.total,'meanEnemies',best.outcomes.reduce((s:number,x:any)=>s+x.remaining,0)/12);
 writeFileSync('artifacts/diary-111/search/coarse.json',JSON.stringify(rows,null,2));
}
