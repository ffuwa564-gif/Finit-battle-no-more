import{OUT,read,write,summary,rankFast}from'./study-io.mts';import{CORES,fixedBank,globalBank,MAIN_STAGES,TIERS,key}from'./study-space.mts';
import*as before from'./before-policy.mts';import*as after from'./after-policy.mts';
import{duplicateFamily}from'../../artifacts/this-girl-01/baseline/src/domain/events';
const task=process.argv[2];
function evaluate(lib:any,config:any,stage:string,seeds:number[]){const cap=lib.content.dungeons.find((d:any)=>d.id===stage).waves.length*40;return summary(config,key(config),seeds.map(seed=>{const r=lib.run(config,seed,false,stage);return{seed,applicationSeed:seed,win:r.win,rounds:r.rounds,cappedRounds:r.win?r.rounds:cap,potionsUsed:r.pots,survivors:r.survivors,telemetry:r.telemetry};}));}
if(task==='roster'){
 const results:any[]=[];for(const character of before.content.characters.filter(c=>c.published)){
  const legal=Object.entries(CORES).filter(([,core])=>!core.includes(character.id)&&!duplicateFamily([...core,character.id],before.content)).slice(0,2);
  const contexts:any[]=[];for(const[coreId,core]of legal)for(const stage of MAIN_STAGES){const bank=fixedBank(6,character.id,core).filter((_,i)=>[0,5,10,15,21,29,42,61].includes(i));const b=bank.map(c=>evaluate(before,c,stage,[940001,940002,940003,940004])).sort(rankFast),a=bank.map(c=>evaluate(after,c,stage,[940001,940002,940003,940004])).sort(rankFast);contexts.push({coreId,stage,before:b,after:a});}
  results.push({id:character.id,status:'exploratory screen; not certified or failed',contexts});write(`${OUT}/roster-screen.json.gz`,{status:'equal eight-config/four-seed exploratory finite screen; no dominance proof',results});console.log('ROSTER',character.id);
 }
 if(results.length!==75)throw Error('Roster count changed');
}else if(task==='landscape'){
 const prereg=read('docs/media/this-girl/episodes/01/preregistration.json');const results:any[]=[];for(const stage of Object.values(prereg.stages).flat()as string[])for(const tier of TIERS){const free=globalBank(tier).filter((_,i)=>i%12===0),forced=fixedBank(tier,'mireille',CORES.F1).filter((_,i)=>i%8===0);results.push({stage,tier,unrestricted:free.map(c=>evaluate(before,c,stage,[940001])),sakuya:forced.map(c=>evaluate(before,c,stage,[940001]))});console.log('LANDSCAPE',stage,tier);}
 write(`${OUT}/landscape.json.gz`,{status:'24 existing stages; eight fixed configs/one exploratory seed each, equal budgets; no probability estimates',results});
}else throw Error('Unknown exploratory task');
