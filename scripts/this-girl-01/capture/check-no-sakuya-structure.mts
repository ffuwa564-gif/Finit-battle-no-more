// Structural supplement to the executed48-pair trace check; performs no simulations.
import{readFileSync,writeFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{isDeepStrictEqual}from'node:util';
import*as before from'../before-policy.mts';
import*as after from'../after-policy.mts';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url))),out=resolve(root,'artifacts/this-girl-01/research');
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const priorPath=resolve(out,'non-s-invariance.json'),prior=JSON.parse(readFileSync(priorPath,'utf8'));
for(const[name,path]of[['beforePolicy','scripts/this-girl-01/before-policy.mts'],['afterPolicy','scripts/this-girl-01/after-policy.mts'],['beforeEngine','artifacts/this-girl-01/baseline/src/domain/engine.ts'],['afterEngine','src/domain/engine.ts'],['beforeGems','artifacts/this-girl-01/baseline/src/domain/memory-gems.ts'],['afterGems','src/domain/memory-gems.ts']])if(prior.sourceHashes[name]!==sha(resolve(root,path)))throw Error('Trace source changed '+name);
const removeVersionsAndMireille=(c:any)=>{const v=structuredClone(c);for(const k of['appVersion','contentVersion','rulesVersion'])delete v[k];v.characters=v.characters.filter((x:any)=>x.id!=='mireille');return v;};
const b=removeVersionsAndMireille(before.content),a=removeVersionsAndMireille(after.content);
const checks={priorTracePassed:prior.passed===true,allOtherContentIdentical:isDeepStrictEqual(b,a),allCommonSkillsIdentical:isDeepStrictEqual(before.content.skills,after.content.skills),allStageDefinitionsIdentical:isDeepStrictEqual(before.content.dungeons,after.content.dungeons),gemImplementationIdentical:prior.sourceHashes.beforeGems===prior.sourceHashes.afterGems};
const r={passed:Object.values(checks).every(Boolean),checks,traceReportSha256:sha(priorPath),beforeCanonicalContentSha256:digest(b),afterCanonicalContentSha256:digest(a),sourceHashes:prior.sourceHashes,codeSha256:sha(fileURLToPath(import.meta.url)),scope:'Structural source-content supplement only. Three version identifiers and the single mireille character record are omitted; all other fields including shared skills, every stage, all other character leader effects and assets are compared exactly. No simulations rerun. Engine-locality reviewed separately. Adoption/portfolio value is not certified.'};
writeFileSync(resolve(out,'non-s-structural-invariance.json'),JSON.stringify(r,null,2));console.log('NO S STRUCTURAL',r.passed,checks);if(!r.passed)process.exitCode=1;
