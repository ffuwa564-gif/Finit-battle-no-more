import{createHash}from'node:crypto';import{writeFileSync}from'node:fs';import{performance}from'node:perf_hooks';import{content,run,gem}from'./policy.mts';
const seed=(n:number)=>createHash('sha256').update('STILLVEIL:this-girl-03:development:v1:'+n).digest().readUInt32LE(0);
const cores=[['seris-awakened','athena','astraea'],['lunette-awakened','liora-awakened','asteria']];const out=[];const start=performance.now();
for(const core of cores)for(const tier of[3,6])for(const stage of['ivory-tower-010','ivory-tower-012','ivory-tower-014','ivory-tower-016','kuzuha-awakening','lunette-awakening'])for(const healer of['miette','benzaiten']){
 const cfg={party:[...core,healer],leader:core[1],gems:Array.from({length:4},()=>gem('echo-shard',tier,'bulwark',tier)),policy:1};const rows=Array.from({length:8},(_,i)=>run(cfg,seed(i),false,stage));out.push({core,tier,stage,healer,wins:rows.filter(r=>r.win).length,rounds:rows.reduce((s,r)=>s+r.rounds,0)/8,pots:rows.reduce((s,r)=>s+r.pots,0)/8});
}
writeFileSync('artifacts/this-girl-03/research/development.json',JSON.stringify({scope:'Development seeds only; no heldout used',milliseconds:performance.now()-start,rows:out},null,2));console.log('Development cases',out.length,'ms',performance.now()-start);
console.log(out.filter(r=>r.tier===6));
