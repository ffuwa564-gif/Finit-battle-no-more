import{run,content,Config,valid}from'./core';import{existsSync,readFileSync,writeFileSync}from'node:fs';
const prior=existsSync('artifacts/diary-111/search/confirmatory.json')?JSON.parse(readFileSync('artifacts/diary-111/search/confirmatory.json','utf8')):JSON.parse(readFileSync('artifacts/athena-council/research/native-study.json','utf8')).filter((r:any)=>r.id==='baseline').map((r:any)=>({id:r.build,config:r.config}));const seeds=Array.from({length:100},(_,i)=>90001+i);const rows:any[]=[];
for(const old of prior){const original:Config=old.config;const cases:any[]=[{id:'baseline',config:original,kind:'native'},
...['liora-awakened','hecate','iris','flora-standard','noelle-awakened'].map(cid=>{const c=structuredClone(original);c.party[2]=cid;c.leader=cid;return{id:'replace-athena-'+cid,config:c,kind:'native'};}),
{id:'no-leader-hp',config:{...original,intervention:'no-leader-hp'},kind:'counterfactual'},
{id:'no-athena-ultimate',config:{...original,intervention:'no-athena-ultimate'},kind:'counterfactual'},
{id:'no-athena-guard',config:original,kind:'counterfactual',remove:'guard-23'},
{id:'no-athena-rally',config:original,kind:'counterfactual',remove:'rally-23'},
{id:'no-leader-dr',config:original,kind:'counterfactual',noDR:true},
{id:'no-athena-stone',config:{...original,gems:original.gems.map((g,i)=>i===2?null:g)},kind:'native'}];
for(const row of cases){if(!valid(row.config)){console.log(old.id,row.id,"SKIP duplicate-family/invalid party");continue;}const athena=content.characters.find(c=>c.id==='athena')!;const beforeSkills=[...athena.skillIds],beforeEffect=athena.leaderEffect;if(row.remove)athena.skillIds=athena.skillIds.filter(x=>x!==row.remove);if(row.noDR)delete athena.leaderEffect;
const outcomes=seeds.map(seed=>({seed,...run(row.config,seed)}));athena.skillIds=beforeSkills;athena.leaderEffect=beforeEffect;const wins=outcomes.filter(o=>o.win);rows.push({...row,build:old.id,wins:wins.length,total:100,averageWinningRounds:wins.length?wins.reduce((s,r)=>s+r.rounds,0)/wins.length:null,averageWinningPotions:wins.length?wins.reduce((s,r)=>s+r.pots,0)/wins.length:null,outcomes});writeFileSync('artifacts/athena-council/research/native-study.json',JSON.stringify(rows,null,2));console.log(old.id,row.id,wins.length+'/100');}}
