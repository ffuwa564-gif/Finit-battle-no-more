import {content,gem,run} from './search-core';import{readFileSync,writeFileSync}from'node:fs';
const skills=new Set(content.skills.filter(s=>s.template==='barrier_mend').map(s=>s.id));
const configs=[
 {party:['miette','liora-awakened','nox','lunette-awakened'],leader:'liora-awakened',gems:[gem('rewind-thread',4,'bulwark',4),gem('pale-ward',4,'bulwark',4),gem('night-dew',4,'bulwark',4),gem('echo-shard',4,'bulwark',4)],prefer:['barrier_mend'],policy:2},
 {party:['miette','athena','nox','selene'],leader:'athena',gems:[gem('pale-ward',3,'bulwark',3),gem('night-dew',3,'bulwark',3),gem('echo-shard',3,'bulwark',3),gem('twin-tide',3)],prefer:['barrier_mend'],policy:2},
];
let found=false;for(const c of configs){for(let seed=1001;seed<1061;seed++){const proof=run(c,seed,true);if(proof.win&&proof.battle!.events.length&&proof.history){
 // history includes pilot orders even when the resolved skill happens earlier in the round.
 const hits=proof.history.filter((h:any)=>h.type==='round'&&skills.has(h.order?.skillId));
 if(hits.length){const row:any={id:'recycle',title:'障壁を回復へ変える',config:c,tier:4,representative:{seed,...run(c,seed)},proof,holdout:Array.from({length:60},(_,i)=>({seed:70001+i,...run(c,70001+i)}))};
 const rows=JSON.parse(readFileSync('artifacts/tower-builds/search.json','utf8'));rows[rows.findIndex((r:any)=>r.id==='recycle')]=row;writeFileSync('artifacts/tower-builds/search.json',JSON.stringify(rows,null,2));console.log('FOUND',seed,hits.length,row.holdout.filter((x:any)=>x.win).length);found=true;break;
 }}}
 if(found)break;
}if(!found)throw Error('No representative barrier recycle');
