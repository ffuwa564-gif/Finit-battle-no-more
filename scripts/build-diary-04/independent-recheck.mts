/** Independent Part4 contract execution. Does not mutate producer evidence or capture inputs. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {supplySkill,paySupplyAfterAction,expireSupply,SUPPLY} from './research-native/src/domain/research-fio';
const O='artifacts/build-diary-04/research';
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const checks:any[]=[];
function check(id:string,passed:boolean,detail:any={}){checks.push({id,passed,...detail});}
function fixture(){const fio:any={uid:'p:fio',characterId:'fio',side:'party',hp:100,maxHp:100,attack:100,ultimateCharge:0};const x:any={uid:'p:x',characterId:'nox',side:'party',hp:100,maxHp:100};const y:any={uid:'p:y',characterId:'ione',side:'party',hp:200,maxHp:200};const e:any={uid:'e:ordinary',characterId:'ordinary',side:'enemy',hp:100,maxHp:100};return{b:{round:1,leaderId:'fio',units:[fio,x,y,e]}as any,fio,x,y,e};}
let {b,fio,x,y,e}=fixture();
supplySkill(b,fio,SUPPLY,1);
check('own-overheal-75pct-capped60-and-first-charge10',b.researchSupplyBoxes[fio.uid].amount===60&&b.researchSupplyBoxes[fio.uid].until===4&&fio.ultimateCharge===10);
b.round=2;supplySkill(b,fio,SUPPLY,1);
check('no-refill-refresh-or-second-charge',b.researchSupplyBoxes[fio.uid].amount===60&&b.researchSupplyBoxes[fio.uid].until===4&&fio.ultimateCharge===10);
let before=structuredClone(b.units);x.hp=80;y.hp=100;
let ev=paySupplyAfterAction(b,e,before,{power:260});
check('ordinary-power-aoe-one-lowest-ratio-patient',ev.length===1&&ev[0].targetIds[0]===y.uid&&y.hp===130&&x.hp===80&&b.researchSupplyBoxes[fio.uid].amount===30);
before=structuredClone(b.units);x.hp-=10;
check('same-round-second-action-no-payment',paySupplyAfterAction(b,e,before,{}).length===0&&b.researchSupplyBoxes[fio.uid].amount===30);
b.round=3;fio.hp=0;fio.ailments={sleep:{turns:2}};before=structuredClone(b.units);x.hp=95;
// x was 70 before, so this increase is not damage: the old wound alone cannot claim a payment.
check('old-injury-or-positive-net-change-not-eligible',paySupplyAfterAction(b,e,before,{}).length===0);
before=structuredClone(b.units);x.hp=93;ev=paySupplyAfterAction(b,e,before,{});
check('dead-source-stock-still-finite-spend-actual7',ev.length===1&&ev[0].amount===7&&x.hp===100&&b.researchSupplyBoxes[fio.uid].amount===23);
for(const [id,actor,action] of [['true-ultimate',e,{ultimate:true}],['clock-finale',e,{clockFinale:true}],['forced-enemy-action',e,{forcedBy:'charm'}],['friendly-fire',x,{}],['memory-action',e,{skill:{id:'memory:edge'}}]]as any){const f=fixture();supplySkill(f.b,f.fio,SUPPLY,1);const snapshot=structuredClone(f.b.units);f.y.hp-=1;const acting=actor.side==='party'?f.x:f.e;check(id+'-excluded',paySupplyAfterAction(f.b,acting,snapshot,action).length===0&&f.b.researchSupplyBoxes[f.fio.uid].amount===60);}
({b,fio,x,y,e}=fixture());supplySkill(b,fio,SUPPLY,1);before=structuredClone(b.units);x.hp=0;check('no-death-rescue',paySupplyAfterAction(b,e,before,{}).length===0&&x.hp===0&&b.researchSupplyBoxes[fio.uid].amount===60);
b.round=4;check('creation-plus3-inclusive',expireSupply(b).length===0&&b.researchSupplyBoxes[fio.uid].amount===60);b.round=5;check('next-round-expired',expireSupply(b).length===1&&!b.researchSupplyBoxes[fio.uid]);
({b,fio,x,y,e}=fixture());x.hp=1;const r=supplySkill(b,fio,SUPPLY,1);check('healing-first-then-true-surplus-only',r?.amount===99&&x.hp===100&&b.researchSupplyBoxes[fio.uid].amount===13);
process.env.LIB_ONLY='1';
const {trial}=await import('./research-runner.mts');
const summary=JSON.parse(readFileSync(`${O}/research-summary.json`,'utf8'));
const alternatives=JSON.parse(readFileSync(`${O}/research-counterexamples.json`,'utf8'));
for(const [id,seed] of [['fio-main',65],['fio-payment-disabled',65],['fio-old-overflow',65],['old-fio-pilot-cleanse',1],['elaine-regen-same-tier',1],['selene-standard-regen-same-tier',1],['athena-no-healer-same-tier-higher-rarity',1]]as any){
 const c=summary.cases.find((x:any)=>x.id===id)??alternatives.counterexamples.find((x:any)=>x.id===id),saved=JSON.parse(readFileSync(`${O}/${id}-seed${seed}.json`,'utf8'));
 const actual=JSON.parse(JSON.stringify(trial({...c.opt??c.configuration,record:true},seed)));
 check(`${id}-seed${seed}-native-replay-exact`,isDeepStrictEqual(saved.captureFixture,actual.captureFixture)&&isDeepStrictEqual(saved.captureSteps,actual.captureSteps)&&isDeepStrictEqual(saved.finalBattle,actual.finalBattle),{win:actual.win,rounds:actual.rounds,remainingHP:actual.remainingHP,sourceSha256:sha(`${O}/${id}-seed${seed}.json`)});
}
const load=(id:string)=>JSON.parse(readFileSync(`${O}/${id}-seed65.json`,'utf8'));
const main=load('fio-main'),disabled=load('fio-payment-disabled'),old=load('fio-old-overflow');
function beforeFioR2(d:any){const step=d.captureSteps.find((s:any)=>s.kind==='round'&&s.before.round===2),events=step.after.events,at=events.findIndex((e:any)=>e.actorId==='party:fio'&&e.actionSelection);return {before:events[at-1].unitsAfter,action:events[at]};}
const ma=beforeFioR2(main),da=beforeFioR2(disabled),oa=beforeFioR2(old),noelle=(a:any)=>a.before.find((u:any)=>u.characterId==='noelle-awakened');
check('seed65-native-hp-threshold-crossing',noelle(ma).hp===186&&noelle(da).hp===156&&noelle(oa).hp===156&&noelle(ma).hp/noelle(ma).maxHp>.8&&noelle(da).hp/noelle(da).maxHp<.8,{main:186,disabled:156,old:156,maxHp:204});
check('seed65-real-next-action-differs',ma.action.skillId?.startsWith('memory:echo-shard:')&&ma.action.amount===110&&da.action.skillId==='heal-17'&&da.action.amount===48&&oa.action.skillId==='heal-17'&&oa.action.amount===48,{main:ma.action.text,disabled:da.action.text,old:oa.action.text});
check('seed65-main-wins-counterfactuals-fail',main.win&&main.rounds===11&&!disabled.win&&disabled.remainingHP===116&&!old.win&&old.remainingHP===78);
const sleepingPayments=main.captureSteps.filter((s:any)=>s.kind==='round').flatMap((s:any)=>s.after.events.filter((e:any)=>e.text.includes('薬布')&&e.text.includes('届けた')&&e.unitsAfter?.some((u:any)=>u.characterId==='fio'&&u.ailments?.sleep)).map((e:any)=>({round:s.before.round,amount:e.amount})));
check('sleeping-delivery-separate-from-main-r1-cause',sleepingPayments.length===1&&sleepingPayments[0].round===7&&sleepingPayments[0].amount===3,{sleepingPayments});
const {configureFio}=await import('./research-runner.mts');
const {trial:rukaTrial}=await import('./research-inherited-ruka.mts');
const {trial:neriTrial}=await import('./research-inherited-neri.mts');
const {trial:ioneTrial}=await import('./research-inherited-ione.mts');
const cross=JSON.parse(readFileSync(`${O}/research-cross-audit.json`,'utf8'));
for(const c of cross.cases){
 const run=c.id.includes('ruka')?rukaTrial:c.id.includes('neri')?neriTrial:ioneTrial;
 configureFio(!c.id.endsWith('-old-fio'));
 const saved=JSON.parse(readFileSync(`${O}/${c.id}-seed1.json`,'utf8'));
 const actual=JSON.parse(JSON.stringify(run({...c.opt,record:true},1)));
 check(`${c.id}-independent-native-compatibility`,isDeepStrictEqual(saved.captureFixture,actual.captureFixture)&&isDeepStrictEqual(saved.captureSteps,actual.captureSteps)&&isDeepStrictEqual(saved.finalBattle,actual.finalBattle),{win:actual.win,rounds:actual.rounds,sourceSha256:sha(`${O}/${c.id}-seed1.json`)});
}
const evidence=JSON.parse(readFileSync(`${O}/episode-evidence.json`,'utf8'));
check('producer-code-input-hashes-current',evidence.codeInputs.every((x:any)=>sha(x.path)===x.sha256));
check('unfilled-fio-no-exclusive-certification',evidence.newCertification.necessityCertificate.passed===false&&evidence.newCertification.status==='pending-counterexample-found'&&evidence.certification.pending.includes('fio')&&!evidence.certification.prototypeCertified.includes('fio'));
check('old-variant-roster-correction-real-overflow',evidence.samples.filter((c:any)=>c.opt.newSkill===false).every((c:any)=>c.roster.filter((r:any)=>r.id==='fio').every((r:any)=>r.skillIds.includes('scout-fio-overflow')&&!r.skillIds.includes(SUPPLY))));
const inputNames=['episode-evidence.json','research-summary.json','research-edge-checks.json','research-cross-audit.json','research-content-consistency.json','research-counterexamples.json','research-necessity-certificate.json','research-sufficiency-certificate.json','research-story-cues.json','research-lab-content.json','research-causal-witness.json','legacy-ione-role-review.json'];
const report={passed:checks.every(x=>x.passed),reviewer:'/root/build_diary_critic',scope:'Independent supply contract execution plus seven current-stage and nine legacy actual native frozen fixture/capture/finalBattle replays and seed65 causal trace. No producer evidence or recordings modified.',checks,codeHashes:{self:sha('scripts/build-diary-04/independent-recheck.mts'),rules:sha('scripts/build-diary-04/research-native/src/domain/research-fio.ts'),runner:sha('scripts/build-diary-04/research-runner.mts'),nativeEngine:sha('scripts/build-diary-04/research-native/src/domain/engine.ts')},inputHashes:Object.fromEntries(inputNames.map(name=>[name,sha(`${O}/${name}`)])),interpretation:'Supply payment demonstrably changes a native R2 healing-versus-attack decision in seed65. This does not establish an exclusive-clear build; legal no-new-skill and other-healer counterexamples remain.'};
writeFileSync(`${O}/independent-recheck.json`,JSON.stringify(report,null,2));
console.log(report.passed,checks.length,checks.filter(x=>!x.passed));if(!report.passed)process.exitCode=1;
