import {run,Config}from './core';import{writeFileSync}from'node:fs';
const g=(defId:string,trait:any='none',power=125)=>({id:'g'+defId,defId,variant:'pure' as const,roll:{power,trait,value:trait==='none'?0:125}});
let rows:any[]=[];
for(const follower of ['nox','persephone','hecate','ruka','seris-awakened'])for(const healer of ['benzaiten','fio','flora-standard'])for(const command of [true,false]){
 const c:Config={party:['athena',follower,'noelle-awakened',healer],leader:'noelle-awakened',autoPilot:true,command,policy:2,gems:[g('pale-ward','bulwark'),g('echo-shard','mercy'),g('clear-tear','bulwark'),g('twin-tide','bulwark')]};
 const outcomes=Array.from({length:16},(_,i)=>({seed:1001+i,...run(c,1001+i)}));const wins=outcomes.filter(x=>x.win).length;rows.push({id:follower+'-'+healer+'-'+command,config:c,wins,total:16,outcomes});console.log(follower,healer,command,wins,'remaining',outcomes.reduce((s,r)=>s+r.remaining,0)/16);
 writeFileSync('artifacts/diary-111/search/command.json',JSON.stringify(rows,null,2));
}
