// Freeze the prospective first candidate and produce native/application proofs.
import{readFileSync,writeFileSync,mkdirSync,existsSync}from'node:fs';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{isDeepStrictEqual}from'node:util';
import{resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{prepare}from'./prepare-proof.mts';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url))),O=resolve(root,'artifacts/this-girl-02');
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const lp=resolve(O,'research/confirmation-lock.json'),lock=JSON.parse(readFileSync(lp,'utf8')),lockSha=sha(lp);
if(process.env.RESEARCH_LOCK_SHA!==lockSha)throw Error('Supply exact independently reviewed RESEARCH_LOCK_SHA');
const candidates=JSON.parse(readFileSync(resolve(O,'research/recording-candidates.json'),'utf8'));
if(!Array.isArray(candidates)||!candidates.length)throw Error('No prospective mechanism candidate');
const c=candidates[0],selPath=resolve(O,'research/recording-selection.json');
const selected={...c,researchLockSha256:lockSha,researchLockCommit:lock.sourceGameCommit,recordingCandidateFileSha256:sha(resolve(O,'research/recording-candidates.json')),selectionPolicy:'First entry in the predeclared tier/stage/core priority, each entry already the first ascending common victory with positive native capture/spend/returnDamage. No footage-based reselection.'};
if(existsSync(selPath)){const prior=JSON.parse(readFileSync(selPath,'utf8'));for(const k of['caseId','logicalSeed','applicationSeed','stageId','arms'])if(!isDeepStrictEqual(prior[k],selected[k]))throw Error('Existing recording selection differs '+k);}
writeFileSync(selPath,JSON.stringify(selected,null,2));
mkdirSync(resolve(O,'proofs'),{recursive:true});
const captureHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
for(const raw of c.specs){
 const spec={...raw,model:'after' as const,preflight:false,sourceGameCommit:captureHead,researchLockCommit:lock.sourceGameCommit,researchLockSha256:lockSha};
 if(!['reference','sakuya'].includes(spec.id))throw Error('Unexpected source ID');
 writeFileSync(resolve(O,'proofs/spec-'+spec.id+'.json'),JSON.stringify(spec,null,2));await prepare(spec);
}
