import{readFileSync,writeFileSync,mkdirSync,copyFileSync}from'node:fs';
import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';import{execFileSync}from'node:child_process';import{isDeepStrictEqual}from'node:util';
import{prepare}from'../capture/prepare-proof.mts';
const O='artifacts/this-girl-01',R=O+'/rerecord';const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const original=JSON.parse(readFileSync(O+'/research/confirmation-lock.json','utf8'));const selected=JSON.parse(readFileSync(O+'/research/recording-selection.json','utf8'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync('git',['diff','--exit-code','2e200b402ac57e3f93900cb2cd594b7df333bbfd',head,'--','src/domain','src/application','src/content/characters.ts'],{stdio:'inherit'});
const changed=Object.keys(original.sources).filter(p=>sha(p)!==original.sources[p]);
const lock={...original,sourceGameCommit:head,sources:Object.fromEntries(Object.keys(original.sources).map(p=>[p,sha(p)])),scope:'Recapture source lock only. NOT a new statistical confirmation or approval. Original study remains pinned separately.',originalStudyLockSha256:sha(O+'/research/confirmation-lock.json'),renderOnlyDifferences:changed};
const lockPath=R+'/capture-source-lock.json';writeFileSync(lockPath,JSON.stringify(lock,null,2));process.env.RERECORD_CAPTURE_LOCK='rerecord/capture-source-lock.json';const lockSha=sha(lockPath);const comparisons=[];
mkdirSync(R+'/reference/proofs',{recursive:true});
for(const [id,arm]of[['reference','A'],['sakuya','C']]as const){
 const file=O+'/proofs/'+id+'.json.gz';const archived=R+'/reference/proofs/'+id+'.json.gz';copyFileSync(file,archived);const old=JSON.parse(gunzipSync(readFileSync(file)).toString());
 const spec={...old.spec,sourceGameCommit:head,researchLockCommit:head,researchLockSha256:lockSha,preflight:false};writeFileSync(O+'/proofs/spec-'+id+'.json',JSON.stringify(spec,null,2));const fresh=await prepare(spec);
 const checks={units:isDeepStrictEqual(old.final.battle.units,fresh.final.battle.units),events:isDeepStrictEqual(old.events,fresh.events),history:isDeepStrictEqual(old.allCommands,fresh.allCommands),summary:isDeepStrictEqual(old.nativeSummary,fresh.nativeSummary),rng:old.final.battle.seed===fresh.final.battle.seed};if(!Object.values(checks).every(Boolean))throw Error('Old/new engine replay diverged '+JSON.stringify(checks));comparisons.push({id,arm,checks,summary:fresh.nativeSummary});
}
writeFileSync(R+'/engine-invariance.json',JSON.stringify({passed:true,gameCommit:head,optimizationBase:'1dff730',selectedCase:selected.caseId,logicalSeed:selected.logicalSeed,applicationSeed:selected.applicationSeed,comparisons,scope:'Same selected A/C real application replays. Old 256-seed study numbers remain historical; no new statistical certification.'},null,2));
