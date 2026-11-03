import{globalBank,MAIN_STAGES,TIERS,key,CORES,fixedBank}from'./study-space.mts';
import{OUT,write,summary,rankFast,sha}from'./study-io.mts';
import{content,run}from'./after-policy.mts';
const stage=process.argv[2]!,tier=Number(process.argv[3]);if(!MAIN_STAGES.includes(stage)||!TIERS.includes(tier))throw Error('Unknown case');
const cap=content.dungeons.find(d=>d.id===stage)!.waves.length*40;
function evaluate(config:any,seeds:number[]){return summary(config,key(config),seeds.map(seed=>{const r=run(config,seed,false,stage);return{seed,applicationSeed:seed,win:r.win,rounds:r.rounds,cappedRounds:r.win?r.rounds:cap,potionsUsed:r.pots,survivors:r.survivors,telemetry:r.telemetry};}));}
const sources=Object.fromEntries(['after-policy.mts','study-space.mts','global-search.mts'].map(p=>[p,sha('scripts/this-girl-01/'+p)]));
const train=globalBank(tier).map(c=>evaluate(c,[910001,910002,910003,910004])).sort(rankFast);
const selected=train.slice(0,8).map(c=>evaluate(c.config,Array.from({length:100},(_,i)=>920001+i))).sort(rankFast);
// Existing24-stage difficulty overview: same finite eight-team panel, one exploratory seed.
write(`${OUT}/global/${stage}-${tier}.json.gz`,{stage,tier,sources,budget:{trainCandidates:96,trainSeeds:4,selectionCandidates:8,selectionSeeds:100},train,selected,status:'limited bestKnown search; no confirmation'});
