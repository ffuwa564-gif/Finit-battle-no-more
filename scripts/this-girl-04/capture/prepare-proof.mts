// Reconstruct policy decisions through the real application command boundary.
import { readFileSync,writeFileSync,mkdirSync,readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { resolve,relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialSave,applyCommand } from '../../../src/application/game';
import { assertSaveCompatibility } from '../../../src/platform/save';
import { GEM_DEFINITIONS,emptyGemInventory } from '../../../src/domain/memory-gems';
import type { GameCommand } from '../../../src/domain/types';
import type { Config } from '../policy.mts';
const ROOT=resolve(fileURLToPath(new URL('../../../',import.meta.url))),O=resolve(ROOT,'artifacts/this-girl-04');
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
function walk(p:string):string[]{return readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(p,e.name)):[resolve(p,e.name)]).sort();}
export function sourceFingerprint(){const files=Object.fromEntries(walk(resolve(ROOT,'src')).map(p=>[relative(ROOT,p),sha(p)]));return{sha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),files};}
export interface ProofSpec { id:string;stageId:string;applicationSeed:number;logicalSeed?:number;config:Config;model?:'before'|'after';preflight?:boolean;sourceGameCommit?:string;caseId?:string;arm?:'A'|'C';researchLockCommit?:string;researchLockSha256?:string; }
export async function prepare(spec:ProofSpec){
 if(!/^[a-z0-9-]+$/.test(spec.id))throw Error('Unsafe proof ID');
 const source=sourceFingerprint(),sourceGameCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
 if(!spec.preflight&&(!spec.caseId||!['A','C'].includes(spec.arm??'')||spec.model!=='after'||!Number.isInteger(spec.logicalSeed)))throw Error('Final proof requires locked caseId, A/C arm, after model and logical seed');
 if(!spec.preflight){execFileSync('git',['diff','--quiet','HEAD','--','src'],{cwd:ROOT});if(execFileSync('git',['ls-files','--others','--exclude-standard','src'],{cwd:ROOT,encoding:'utf8'}).trim())throw Error('Freeze source before final proof');}
 if(spec.sourceGameCommit&&spec.sourceGameCommit!==sourceGameCommit)throw Error('Different capture commit');
 let researchLock:any;
 if(!spec.preflight){
  const lockPath=resolve(O,process.env.RERECORD_CAPTURE_LOCK??'research/confirmation-lock.json');
  if(!spec.researchLockSha256||sha(lockPath)!==spec.researchLockSha256)throw Error('Missing or different frozen research lock');
  researchLock=JSON.parse(readFileSync(lockPath,'utf8'));
  if(spec.researchLockCommit!==researchLock.sourceGameCommit)throw Error('Research lock commit mismatch');
  for(const [path,expected]of Object.entries(researchLock.sources))if(sha(resolve(ROOT,path))!==expected)throw Error('Locked research source changed '+path);
 };
 const lib=await import(spec.model==='before'?'../policy.mts':'../policy.mts'),content=lib.content;
 const native=lib.run(spec.config,spec.applicationSeed,true,spec.stageId);
 if(!native.battle||!native.history)throw Error('Native trace missing');
 let s=createInitialSave(content,spec.applicationSeed);
 s.ownedIds=content.characters.filter(c=>c.published).map(c=>c.id);s.discoveredIds=[...s.ownedIds];
 s.completedDungeonIds=content.dungeons.filter(d=>d.published).map(d=>d.id);
 s.partyIds=[...spec.config.party];s.leaderId=spec.config.leader;s.potions=5;
 s.novels={seen:(content.novels??[]).map(n=>n.id)};
 s.towerRecord={version:'1.10',completedFloors:Array.from({length:100},(_,i)=>i+1),legacyHighest:0};
 const gems=spec.config.gems.flatMap((g,i)=>g?[{...structuredClone(g),id:'slot-'+i}]:[]);
 s.memoryGems={...emptyGemInventory(),items:gems,equipped:Object.fromEntries(spec.config.party.flatMap((id,i)=>spec.config.gems[i]?[[id,'slot-'+i]]:[])),seen:GEM_DEFINITIONS.map(d=>d.id),craftSerial:0};
 assertSaveCompatibility(s,content);
 const initial=structuredClone(s);
 s=applyCommand(s,{type:'depart',dungeonId:spec.stageId,potions:5},content,{now:0});
 // Match the deterministic fairy/flower stream identity without changing combat RNG.
 const appId=s.battle!.id;s.battle!.id=native.battle.id;
 for(const e of s.battle!.events)e.id=e.id.replace(appId,s.battle!.id);
 const fixture=structuredClone(s),allCommands:GameCommand[]=[],events:any[]=[],groups:any[]=[];
 const issue=(command:GameCommand)=>{s=applyCommand(s,command,content,{now:0});allCommands.push(command);};
 const boundary=()=>{while(s.battle?.phase==='playing'){events.push(structuredClone(s.battle.events[s.battle.cursor]));issue({type:'replay'});}};
 boundary();
 for(const step of native.history as any[]){
  boundary();const before=structuredClone(s),commands:GameCommand[]=[];
  const send=(c:GameCommand)=>{issue(c);commands.push(c);};
  if(s.battle?.wave!==step.wave||s.battle.round!==step.round)throw Error(`Boundary mismatch wave${step.wave} R${step.round}`);
  if(step.type==='potion')send({type:'potion',unitId:step.unitId});
  else if(step.type==='battleFairy')send({type:'battleFairy',fairyId:step.fairyId});
  else if(step.type==='battleBloom')send({type:'battleBloom',bloomId:step.bloomId});
  else if(step.type==='round'){
   const observed=s.battle!.units.filter(u=>u.side==='party'&&u.hp>0).map(u=>({id:u.characterId,hp:u.hp,gauge:u.ultimateCharge}));
   if(!isDeepStrictEqual(observed,step.before))throw Error(`Pre-round state mismatch wave${step.wave} R${step.round}`);
   if(s.battle!.strategy!==step.strategy)send({type:'strategy',strategy:step.strategy});
   if(s.battle!.crystalRole!==step.crystalRole)send({type:'crystalRole',role:step.crystalRole});
   if(!isDeepStrictEqual(s.battle!.partyOrder,step.order))send({type:'partyOrder',battleId:s.battle!.id,order:step.order??null,targetId:step.focus});
   for(const u of s.battle!.units.filter(u=>u.side==='party'&&u.hp>0))if(Boolean(u.ultimateQueued)!==step.queued.includes(u.uid))send({type:'ultimate',unitId:u.uid});
   if(step.commandOrder)send({type:'commandOrder',battleId:s.battle!.id,order:step.commandOrder});
   else if(s.battle!.commandOrder)send({type:'commandOrder',battleId:s.battle!.id,order:null});
   send({type:'round',battleId:s.battle!.id,targetId:step.focus});
  }else throw Error('Unknown policy step '+step.type);
  boundary();
  groups.push({index:groups.length,wave:step.wave,round:step.round,kind:step.type,commands,before,after:structuredClone(s)});
 }
 boundary();const actual=s.battle!,expected=native.battle;
 const checks={phase:actual.phase===expected.phase,rng:actual.seed===expected.seed,units:isDeepStrictEqual(actual.units,expected.units),potions:actual.potionsRemaining===expected.potionsRemaining,chests:isDeepStrictEqual(actual.gemChestChecks,expected.gemChestChecks),gemFinds:isDeepStrictEqual(actual.gemFinds,expected.gemFinds)};
 if(!Object.values(checks).every(Boolean))throw Error('Native/application mismatch '+JSON.stringify(checks));
 assertSaveCompatibility(s,content);
 if(sourceFingerprint().sha256!==source.sha256)throw Error('Source changed during proof preparation');
 if(!spec.preflight&&sha(resolve(O,process.env.RERECORD_CAPTURE_LOCK??'research/confirmation-lock.json'))!==spec.researchLockSha256)throw Error('Research lock changed during proof preparation');
 const out={schemaVersion:1,episode:'THIS-GIRL-004',id:spec.id,spec,initial,fixture,final:structuredClone(s),groups,events,allCommands,config:spec.config,nativeSummary:{win:native.win,rounds:native.rounds,pots:native.pots,survivors:native.survivors,telemetry:native.telemetry},nativeVerified:true,applicationVerified:true,checks,sourceGameCommit,researchLockSha256:spec.researchLockSha256,researchLockCommit:spec.researchLockCommit,sourceTreeSha256:source.sha256,sourceFiles:source.files,disclosure:'Hypothetical endgame comparison fixture: all75 published forms including currently unobtainable XR, all gem definitions seen, legal family/slot rules,5potions. Real application commands, no enemy/stage edits. Not naturally acquired player progress.'};
 mkdirSync(resolve(O,'proofs'),{recursive:true});mkdirSync(resolve(O,'research'),{recursive:true});
 const path=resolve(O,`proofs/${spec.id}.json.gz`);writeFileSync(path,gzipSync(JSON.stringify(out)));
 writeFileSync(resolve(O,`research/proof-${spec.id}.json`),JSON.stringify({id:spec.id,passed:true,checks,spec,nativeSummary:out.nativeSummary,sourceGameCommit,researchLockSha256:spec.researchLockSha256,researchLockCommit:spec.researchLockCommit,sourceTreeSha256:source.sha256,proofSha256:sha(path),bytes:readFileSync(path).length},null,2));
 console.log('APPLICATION PROOF',spec.id,checks,native.win,native.rounds);return out;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const p=process.argv[2];if(!p)throw Error('Usage: tsx scripts/this-girl-04/capture/prepare-proof.mts <spec.json>');
 await prepare(JSON.parse(readFileSync(p,'utf8')));
}
