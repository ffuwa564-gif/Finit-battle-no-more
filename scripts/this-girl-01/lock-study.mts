import{readdirSync,readFileSync,existsSync}from'node:fs';import{join}from'node:path';import{execFileSync}from'node:child_process';
import{OUT,read,write,sha,rankFast,rankSafe,rankFrugal}from'./study-io.mts';import{MAIN_STAGES,TIERS,CORES,downroll,key}from'./study-space.mts';import{confirmationSeed}from'./seed-bank.mts';import{content,valid}from'./after-policy.mts';import{rng}from'../../src/domain/engine';
const invariance=read(`${OUT}/non-s-invariance.json`);if(invariance.passed!==true)throw Error('No verified non-S adapter invariance evidence');
const cases:any[]=[],growth:any[]=[];const inputs:Record<string,string>={};
const get=(path:string)=>{inputs[path]=sha(path);return read(path);};
const noel=MAIN_STAGES.map(stage=>{const r=get(`${OUT}/optimization/${stage}-6-after-F5.json.gz`).results[0];const bestFor=(id:string)=>r.selected.filter((v:any)=>v.config.leader===id).sort(rankFast)[0];const commander=bestFor('noelle-awakened'),sakuya=bestFor('mireille');if(!commander||!sakuya)throw Error('Missing equal-budget leader candidate');return{stage,coreId:'F5',commander:commander.config,sakuya:sakuya.config,modes:['never','conditional','always'],scope:'three command arms share exact commander build; S-leader variant separately selected in same finite budget; no simultaneous command and S-leader'}};});
for(const stage of MAIN_STAGES)for(const tier of TIERS){
 const all:any[]=[];const byCore:any={};
 for(const coreId of ['F1','F4']){
  const b=get(`${OUT}/optimization/${stage}-${tier}-before-${coreId}.json.gz`),a=get(`${OUT}/optimization/${stage}-${tier}-after-${coreId}.json.gz`);
  if(b.results.length!==17||a.results.length!==1)throw Error('Incomplete equal-budget healer selection');
  const alternatives=b.results.filter((x:any)=>x.id!=='mireille').flatMap((x:any)=>x.selected);all.push(...alternatives,...a.results[0].selected);byCore[coreId]={b,a,alternatives};
 }
 const g=get(`${OUT}/global/${stage}-${tier}.json.gz`);all.push(...g.selected);all.sort(rankFast);const A=all[0];
 for(const coreId of ['F1','F4']){const{b,a,alternatives}=byCore[coreId];const id=`${stage}-T${tier}-${coreId}`;const C=a.results[0].best;const arms:any={A:{mode:'after',config:A.config},B:{mode:'before',config:b.results.find((x:any)=>x.id==='mireille').best.config},C:{mode:'after',config:C.config},Dfast:{mode:'after',config:[...alternatives].sort(rankFast)[0].config},Dsafe:{mode:'after',config:[...alternatives].sort(rankSafe)[0].config},Dfrugal:{mode:'after',config:[...alternatives].sort(rankFrugal)[0].config},E:{mode:'after',config:C.config,payoutPercent:0}};
  for(const arm of Object.values(arms)as any[])if(!valid(arm.config))throw Error('Illegal locked config');
  const stageDef=content.dungeons.find(d=>d.id===stage)!;cases.push({id,stage,tier,coreId,core:CORES[coreId],cap:stageDef.waves.length*40,arms,comparisonIds:['A','B','Dfast','Dsafe','Dfrugal','E'].map(x=>`${id}:C-${x}`)});
  if(tier===6)for(const[tlo,thi]of[[3,4],[4,6],[3,6]])growth.push({id:`${stage}-${coreId}:T${thi}-T${tlo}`,stage,cap:stageDef.waves.length*40,lowTier:tlo,highTier:thi,low:downroll(C.config,tlo),high:downroll(C.config,thi),scope:'same T6-selected template downrolled; not independently reoptimized'});
 }
}
const walk=(base:string):string[]=>readdirSync(base,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(base,e.name)):[join(base,e.name)]);
const codeFiles=[...walk('src'),...walk('artifacts/this-girl-01/baseline/src'),...readdirSync('scripts/this-girl-01').filter(p=>/\.(mts|py)$/.test(p)).map(p=>'scripts/this-girl-01/'+p),...walk('scripts/this-girl-01/analysis').filter(p=>p.endsWith('.py')),'docs/media/this-girl/episodes/01/statistical-analysis-plan.md'];
const sourceHashes=Object.fromEntries(codeFiles.map(p=>[p,sha(p)]));
const seedMap=[930001,950001,960001].flatMap(start=>Array.from({length:256},(_,i)=>{const logical=start+i,applicationSeed=confirmationSeed(logical);return{logical,applicationSeed,departureSeed:rng(applicationSeed).seed};}));
if(new Set(seedMap.map(s=>s.applicationSeed)).size!==768||new Set(seedMap.map(s=>s.departureSeed)).size!==768)throw Error('Heldout seed collision');
const used=Array.from({length:100},(_,i)=>920001+i).concat(Array.from({length:30},(_,i)=>910001+i),Array.from({length:30},(_,i)=>940001+i));if(seedMap.some(s=>used.includes(s.applicationSeed)||used.map(x=>rng(x).seed).includes(s.departureSeed)))throw Error('Train/confirm collision');
write(`${OUT}/confirmation-lock.json`,{schema:1,sourceGameCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'locked before heldout battles; execution requires separately supplied exact lock SHA',sources:sourceHashes,inputs,seedMap,cases,growth,noel,mainHypotheses:288,growthHypotheses:48,simultaneousIntervals:516,seedModel:'fixed SHA256-derived pseudo-random panel; not exhaustive IID player guarantee',scope:'all-owned hypothetical XR, bounded finite search; not universal dominance',recordingRule:'ascending first A/C common victory with C petalsStored,petalsSpent,returnDamage all positive; mechanism illustration only',invarianceEvidence:sha(`${OUT}/non-s-invariance.json`)});
console.log('LOCK',sha(`${OUT}/confirmation-lock.json`));
