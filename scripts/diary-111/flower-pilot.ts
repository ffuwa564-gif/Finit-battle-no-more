import{run,Config}from'./core';import{readFileSync,writeFileSync}from'node:fs';
const parent=JSON.parse(readFileSync('artifacts/diary-111/search/final-comparison.json','utf8')).find((x:any)=>x.id==='seed-nox-smart').config;const rows:any[]=[];
for(const pilot of ['fio','elaine-awakened','flora-standard','benzaiten'])for(const mode of ['smart','always']){
 const c:Config=structuredClone(parent);c.party=[pilot,'nox','athena',pilot==='benzaiten'?'fio':'benzaiten'];c.gems=[parent.gems[2],parent.gems[1],parent.gems[0],parent.gems[3]];c.guardSeeds=mode==='smart'?'smart':true;c.plantSeed=true;c.autoPilot=false;c.leader='athena';
 const outcomes=Array.from({length:24},(_,i)=>{const r=run(c,1001+i,true);return{seed:1001+i,win:r.win,rounds:r.rounds,survivors:r.survivors,blooms:r.events.filter((e:any)=>e?.text?.startsWith('摘まない白花 —')&&e.amount>0).length,overflow:r.events.filter((e:any)=>e?.text?.includes('余り布が障壁')).length};});
 rows.push({id:pilot+'-'+mode,config:c,wins:outcomes.filter(r=>r.win).length,total:24,outcomes});console.log(pilot,mode,rows.at(-1).wins,'bloomWins',outcomes.filter(r=>r.win&&r.blooms).length,'overflowWins',outcomes.filter(r=>r.win&&r.overflow).length);
 writeFileSync('artifacts/diary-111/search/flower-pilot.json',JSON.stringify(rows,null,2));
}
