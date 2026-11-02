/** Independent read-only re-execution of frozen Ione evidence. Writes only its own report. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
process.env.LIB_ONLY='1';
const {trial,content}=await import('./research-runner.mts');
const {receiptSkill,RECEIPT}=await import('/tmp/build-diary-03-lab/src/domain/research-ione');
const {createBattle,resolveRound,advanceReplay}=await import('/tmp/build-diary-03-lab/src/domain/engine');
const O='artifacts/build-diary-03/research',checks:any[]=[];
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const json=(x:any)=>JSON.parse(JSON.stringify(x));
const check=(id:string,passed:boolean,detail:any={})=>checks.push({id,passed,...detail});
for(const[id,opt]of [['ione-main',{}],['safety-without-finishing-hit',{defensiveUltimate:true}],['cleanse-tikka',{party:['tikka','nox','liora-awakened','fio'],cleanse:true}]]as any){
 const saved=JSON.parse(readFileSync(`${O}/${id}-seed1.json`,'utf8')),actual=json(trial({...opt,record:true},1));
 check(id+'-native-replay-exact',isDeepStrictEqual(saved.captureFixture,actual.captureFixture)&&isDeepStrictEqual(saved.captureSteps,actual.captureSteps)&&isDeepStrictEqual(saved.finalBattle,actual.finalBattle),{win:actual.win,rounds:actual.rounds,friendlyDamage:actual.friendlyDamage,corrections:actual.corrections,sourceSha256:sha(`${O}/${id}-seed1.json`)});
}
let b:any=createBattle(content,['ione','nox'],'ione','research-return-to-sender',5,1,'independent-receipt-edge');b.cursor=b.events.length-1;b=advanceReplay(b,content);
const i=b.units.find((u:any)=>u.characterId==='ione'),n=b.units.find((u:any)=>u.characterId==='nox'),e=b.units.find((u:any)=>u.side==='enemy');e.cooldowns['research-postmaster-charm']=99;e.attack=0;
b.focusTargetId=e.uid;b.researchReceiptAlly=n.uid;receiptSkill(b,i,RECEIPT);b.partyOrder={kind:'guard'};e.scoutMark={sourceId:i.uid,until:99};n.ailments={charm:{turns:2,sourceId:e.uid}};
for(const u of b.units.filter((u:any)=>u.side==='party')){u.barrier=1e6;u.barrierUntil=99;u.ultimateCharge=0;}
const out=resolveRound(b,content).battle,nn=out.units.find((u:any)=>u.uid===n.uid),ee=out.units.find((u:any)=>u.uid===e.uid),attack=out.events.find((x:any)=>x.actorId===n.uid&&x.actionSelection);
check('independent-target-only-correction',attack?.targetIds.includes(e.uid)&&attack.ailment==='charm'&&!attack.skillId&&!attack.ultimate,{text:attack?.text,targetIds:attack?.targetIds,ailment:attack?.ailment});
check('independent-no-ordinary-charge',nn.ultimateCharge===0,{charge:nn.ultimateCharge});
check('independent-mark-not-collected',ee.scoutMark?.sourceId===i.uid&&!out.events.some((x:any)=>x.text.includes('宛先の余白を受け取った')));
check('independent-charm-not-cured-no-ward',nn.ailments?.charm?.turns===1&&nn.statusWardUntil===undefined);
check('independent-one-use-consumed',nn.researchReceipt===undefined);
const evidence=JSON.parse(readFileSync(`${O}/episode-evidence.json`,'utf8'));
check('all-declared-code-hashes-current',evidence.codeInputs.every((x:any)=>sha(x.path)===x.sha256));
check('necessity-failed-and-ione-unfilled',evidence.newCertification.necessityCertificate.passed===false&&evidence.newCertification.status==='pending-counterexample-found'&&!evidence.certification.prototypeCertified.includes('ione')&&evidence.certification.pending.includes('ione'));
const inputs=['episode-evidence.json','research-summary.json','research-edge-checks.json','research-cross-audit.json','research-content-consistency.json','research-counterexamples.json','research-necessity-certificate.json','research-sufficiency-certificate.json','research-story-cues.json','research-lab-content.json'];
const report={passed:checks.every(x=>x.passed),reviewer:'/root/build_diary_critic',scope:'Three actual native seed1 reruns plus separate target-only/forced charge/mark/ailment/consumption execution. No heavy 100-seed rerun. Files of frozen research and captures were not modified.',checks,inputHashes:Object.fromEntries(inputs.map(x=>[x,sha(`${O}/${x}`)])),codeHashes:{self:sha('scripts/build-diary-03/independent-recheck.mts'),nativeLabEngine:sha('/tmp/build-diary-03-lab/src/domain/engine.ts'),nativeLabReceipt:sha('/tmp/build-diary-03-lab/src/domain/research-ione.ts')},interpretation:'Research reporting is approved; Ione-exclusive certification is explicitly NOT approved. Same-T3 Tikka is a direct counterexample.'};
writeFileSync(`${O}/independent-recheck.json`,JSON.stringify(report,null,2));console.log('INDEPENDENT IONE RECHECK',report.passed,checks.length,checks.filter(x=>!x.passed));if(!report.passed)process.exitCode=1;
