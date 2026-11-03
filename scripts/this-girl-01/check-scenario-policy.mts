import{createHash}from'node:crypto';import{OUT,read,write,sha}from'./study-io.mts';import{MAIN_STAGES,CORES,fixedBank}from'./study-space.mts';import{runScenario}from'./scenario-policy.mts';import{run}from'./after-policy.mts';import{confirmationSeed}from'./seed-bank.mts';import{rng}from'../../src/domain/engine';
const hash=(v:any)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');const checks=[];
for(const stage of MAIN_STAGES)for(const coreId of ['F1','F4']){
 const path=`${OUT}/optimization/${stage}-6-after-${coreId}.json.gz`;const c=read(path).results[0].best.config;
 const ordinary=run(c,910025,true,stage),scenario=runScenario(c,910025,stage,{},100,true);
 const a=hash(ordinary),b=hash(scenario);checks.push({stage,coreId,developmentSeed:910025,ordinarySha:a,zeroScenarioSha:b,passed:a===b});if(a!==b)throw Error('Zero transform diverged '+stage+coreId);
}
const mapping=[930001,950001,960001].flatMap(start=>Array.from({length:256},(_,i)=>{const logical=start+i,applicationSeed=confirmationSeed(logical);return{logical,applicationSeed,departureSeed:rng(applicationSeed).seed};}));
if(mapping.length!==768||new Set(mapping.map(r=>r.applicationSeed)).size!==768||new Set(mapping.map(r=>r.departureSeed)).size!==768)throw Error('Seed collision');
const train=Array.from({length:100},(_,i)=>920001+i).concat(Array.from({length:30},(_,i)=>910001+i),Array.from({length:30},(_,i)=>940001+i));if(mapping.some(r=>train.includes(r.applicationSeed)||train.map(s=>rng(s).seed).includes(r.departureSeed)))throw Error('Train collision');
write(`${OUT}/scenario-preflight.json`,{passed:true,status:'four ordinary-vs-zero native development comparisons; no heldout battle opened',checks,seedRows:768,sourceHashes:Object.fromEntries(['scenario-policy.mts','check-scenario-policy.mts','seed-bank.mts','after-policy.mts'].map(p=>['scripts/this-girl-01/'+p,sha('scripts/this-girl-01/'+p)]))});console.log('Zero scenario equality and seed-map preflight PASS');
