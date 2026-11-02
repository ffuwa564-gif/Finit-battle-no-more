/** Episode 02 catalogue: append-only series identity; fresh recognition never inferred from past episodes. */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {content} from '../../src/content/index';
import {updateCertification,type WitnessCheck} from '../build-diary-01/registry.mts';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),DOC=resolve(ROOT,'docs/media/build-research-diary/episodes/02'),OUT=resolve(ROOT,'artifacts/build-diary-02');
const SOURCE='489d5a4b15f02385c7229a2b2ff29f76da0abf44';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const relative=(p:string)=>p.slice(ROOT.length+1);
function main(){
 mkdirSync(DOC,{recursive:true});mkdirSync(OUT,{recursive:true});
 if(content.appVersion!=='1.11.0')throw Error('Review version drift before producing Episode 02 registry');
 const basePath=resolve(ROOT,'docs/media/build-research-diary/registry.json'),oldAuditPath=resolve(ROOT,'docs/media/build-research-diary/gem-audit.json');
 const base=read(basePath),oldAudit=read(oldAuditPath),serialPath=resolve(ROOT,'docs/media/build-research-diary/serial-map.json'),eligiblePath=resolve(ROOT,'docs/media/build-research-diary/girl-eligibility.json');
 if(base.episode!=='BRD-001'||!base.finalized||base.sourceGameCommit!==SOURCE)throw Error('Requires immutable finalized Episode 01 source registry');
 let sourceTreeMatches=false;try{execFileSync('git',['diff','--quiet',SOURCE,'--','src/domain','src/application','src/content'],{cwd:ROOT,stdio:'ignore'});sourceTreeMatches=true;}catch{}
 const published=content.characters.filter(c=>c.published),serials=read(serialPath).entries,eligibility=read(eligiblePath).entries;
 const serialBy=new Map(serials.map((e:any)=>[e.characterId,e.seriesId])),eligibleBy=new Map(eligibility.map((e:any)=>[e.characterId,e]));
 if(published.length!==75||base.entries.length!==72||base.summary.canonicalGirls!==49)throw Error('New girls/forms require explicit appended IDs and art review');
 const assetBy=new Map(content.assets.map(a=>[a.id,a]));
 const entries=structuredClone(base.entries);
 for(const e of entries){
  if(serialBy.get(e.characterId)!==e.seriesId)throw Error('Immutable ID mismatch '+e.characterId);
  const c=published.find(c=>c.id===e.characterId),a=c&&assetBy.get(c.artId),eligible:any=eligibleBy.get(e.characterId);
  if(!c||!a||!eligible?.eligibleGirl||a.path!==e.artPath||sha(resolve(ROOT,'public',a.path))!==e.artSha256)throw Error('Original or public character drift '+e.characterId);
 }
 const evidencePath=resolve(OUT,'research/episode-evidence.json'),fresh=existsSync(evidencePath)?read(evidencePath):null;
 // Episode researchers supply codeInputs [{path,sha256}]. Empty hashes never certify.
 const codeInputs:any[]=fresh?.codeInputs??[];
 const evidenceCodeMatches=codeInputs.length>0&&codeInputs.every(x=>typeof x.path==='string'&&x.path.startsWith('scripts/')&&!x.path.includes('..')&&existsSync(resolve(ROOT,x.path))&&sha(resolve(ROOT,x.path))===x.sha256);
 const presentation=fresh?.presentationChangeOnlyVerified;
 const presentationMatches=Boolean(presentation?.productionSourceNotModifiedByResearch&&presentation?.nativeEngineCopiedFromCurrentMain&&presentation?.latestPortraitHeadMetadataAvailable);
 const contractRef=fresh?.captureContractRevalidation;
 const contractBound=Boolean(contractRef?.path&&contractRef?.sha256&&contractRef.path.startsWith('artifacts/build-diary-02/research/')&&!contractRef.path.includes('..')&&existsSync(resolve(ROOT,contractRef.path))&&sha(resolve(ROOT,contractRef.path))===contractRef.sha256);
 const contract=contractBound?read(resolve(ROOT,contractRef.path)):null;
 const independentPath=resolve(OUT,'research/independent-contract-v2-recheck.json'),reviewPath=resolve(OUT,'research/independent-research-review.json');
 const independent=existsSync(independentPath)?read(independentPath):null,review=existsSync(reviewPath)?read(reviewPath):null;
 const traceBound=Boolean(contract?.captureSourceLogs?.length===2&&contract.captureSourceLogs.every((x:any)=>x.captureStepsIdentical&&existsSync(resolve(ROOT,x.path))&&sha(resolve(ROOT,x.path))===x.sha256));
 const contractChecks=contract?.checks??[];
 const contractReady=Boolean(contractBound&&contractRef.passed&&contractRef.variant==='patched-v2'&&contractRef.targetedChecks===11&&contractRef.exhaustiveCommandCoverage===false&&contractRef.existingCaptureLogsUnchanged&&contract?.passed&&contract.variant==='patched-v2'&&contract.existingCaptureDataUnchanged&&contractChecks.length===11&&contractChecks.every((x:any)=>x.passed)&&traceBound&&contract.necessityCertificateNoOperation&&contract.oldRukaRulesNoOperation&&independent?.passed&&independent.variant==='patched-v2'&&independent.contractReportSha256===contractRef.sha256&&independent.engineSha256===contract.v2CodeHashes.find((x:any)=>x.path.endsWith('/src/domain/engine.ts'))?.sha256&&review?.passed&&review.restInterfaceNeedsRepair===false&&review.repairVerification?.sha256===sha(independentPath)&&review.captureCompatibility?.sha256===contractRef.sha256&&review.inputHashes?.['episode-evidence.json']===sha(evidencePath));
 const interfaceRevalidation=contractReady?{...contractRef,independentRecheck:{path:relative(independentPath),sha256:sha(independentPath),passed:true},independentReview:{path:relative(reviewPath),sha256:sha(reviewPath),passed:true},limits:'11 targeted interface checks and matching seed1 capture traces. Not exhaustive verification of all present/future commands.'}:null;
 const currentEvidence=Boolean(contractReady&&presentationMatches&&sourceTreeMatches&&evidenceCodeMatches&&fresh?.passed===true&&fresh?.sourceMain===SOURCE&&fresh?.appVersion===content.appVersion&&fresh?.contentVersion===content.contentVersion&&fresh?.rulesVersion===content.rulesVersion);
 if(fresh?.certification?.productionCertified?.length)throw Error('Production certification requires a new explicitly registered live witness; never infer from LAB');
 const oldRuka=oldAudit.prototypeCertifications.find((x:any)=>x.canonicalGirlId==='ruka');if(!oldRuka)throw Error('Missing historical Ruka certificate');
 const rukaChecks:WitnessCheck[]=currentEvidence?(fresh?.priorCertificationReview?.ruka?.checks??[]):[];
 const rukaReview=updateCertification({canonicalGirlId:'ruka',conditionsHash:base.gameplayConditionsHash,witnessIds:[oldRuka.id]},{conditionsHash:fresh?.priorCertificationReview?.ruka?.conditionsHash??'BRD-002-new-research-pending',checks:rukaChecks});
 // Until the new expanded candidate/rule set is checked, last episode's filled
 // LAB badge becomes outlined. This records uncertainty, not a false defeat.
 const ruka=entries.find((x:any)=>x.characterId==='ruka');
 ruka.previousRecognition={episode:'BRD-001',state:'prototype-certified',badge:'solid-amber',certificationId:oldRuka.id,evidencePath:relative(oldAuditPath),evidenceSha256:sha(oldAuditPath)};
 const reviewCheck=fresh?.priorCertificationReview?.ruka?.checks?.[0];
 const oldProofValid=Boolean(reviewCheck?.oldCertificate&&existsSync(resolve(ROOT,reviewCheck.oldCertificate))&&sha(resolve(ROOT,reviewCheck.oldCertificate))===reviewCheck.oldCertificateSha256);
 const crossValid=Boolean(reviewCheck?.source&&existsSync(resolve(ROOT,reviewCheck.source))&&read(resolve(ROOT,reviewCheck.source)).passed);
 const retained=currentEvidence&&oldProofValid&&crossValid&&rukaReview.state==='retained';
 ruka.status=retained?'prototype-certified':rukaReview.state==='revoked'?'revoked':'suspended';
 ruka.gems={...ruka.gems,status:ruka.status,badge:retained?'solid-amber':'outline-amber',symbol:retained?'◆':'◇',label:retained?'試作認定・再審済':rukaReview.state==='revoked'?'試作認定を解除':'前回試作認定・再審待ち',verifiedFormIds:retained?['ruka']:[],glow:{enabled:true,color:'#efb34c',strength:retained?.9:.35},reason:retained?'前回の研究用攻略先を、新しい研究条件で再確認した。現行ゲームの専用攻略先ではない。':rukaReview.state==='revoked'?'新しい研究条件で全登録攻略先に有効な代替例を確認。解除するのは研究側の認定。':'前回のLAB試作認定は履歴に保存。新しい技・石・候補を含めた再審が済むまで、現在の塗り宝石は保留。'};
 ruka.reason=ruka.gems.reason;
 const neri=entries.find((x:any)=>x.characterId==='neri');if(neri.seriesId!=='BD070')throw Error('Neri serial changed');
 const idea={id:'neri-lantern-research-02',name:'ネリの灯を返す仕組みを研究',scope:'prototype-research',evidence:'scripts/build-diary-02/registry.mts',exclusiveClaim:false};
 if(!neri.buildIdeas.some((x:any)=>x.id===idea.id))neri.buildIdeas.push(idea);
 neri.familyBuildIdeas.push({...idea,sourceFormId:'neri'});
 neri.status='idea';neri.gems={status:'idea',scope:'idea',badge:'outline-weak',symbol:'◇',label:'今回の研究候補',ideaSourceFormIds:['neri'],glow:{enabled:true,color:'#bce6e1',strength:.28},verifiedFormIds:[],reason:'ネリBD070を主役候補に、新技・リーダースキル・石の案を比較する。現時点では専用攻略先・勝利・必須性を認定していない。'};neri.reason=neri.gems.reason;
 const nc=fresh?.newCertification;
 const boundReport=(ref:any)=>Boolean(ref?.path&&ref?.sha256&&ref.path.startsWith('artifacts/build-diary-02/research/')&&!ref.path.includes('..')&&existsSync(resolve(ROOT,ref.path))&&sha(resolve(ROOT,ref.path))===ref.sha256);
 const necessityValid=Boolean(boundReport(nc?.necessityCertificate)&&read(resolve(ROOT,nc.necessityCertificate.path)).passed===true);
 const edgeValid=Boolean(boundReport(nc?.edgeChecks)&&read(resolve(ROOT,nc.edgeChecks.path)).passed===true);
 const suffPath=resolve(OUT,'research/research-sufficiency-certificate.json'),suff=existsSync(suffPath)?read(suffPath):null;
 const suffValid=Boolean(boundReport(nc?.sufficiencyEvidence)&&nc.sufficiencyEvidence.universalWinTheorem===false&&suff?.passed&&suff.conditionsHash===nc.conditionsHash&&suff.source===nc.sufficiencyEvidence.path&&suff.sourceSha256===nc.sufficiencyEvidence.sha256&&suff.samples?.some((x:any)=>x.id==='neri-main'&&x.n===100&&x.wins===100)&&suff.samples?.some((x:any)=>x.id==='neri-all-partners-replaced'&&x.n===100&&x.wins===100));
 const neriReady=Boolean(currentEvidence&&nc?.characterId==='neri'&&nc.witnessId==='LAB-NERI-001'&&nc.conditionsHash&&necessityValid&&edgeValid&&suffValid&&fresh.certification.prototypeCertified.includes('neri'));
 if(neriReady){neri.status='prototype-certified';neri.gems={status:'prototype-certified',scope:'prototype',badge:'solid-amber',symbol:'◆',label:'試作認定',glow:{enabled:true,color:'#efb34c',strength:.9},certificationId:nc.witnessId,verifiedFormIds:['neri'],notALiveGameCertificate:true,conditionsHash:nc.conditionsHash,reason:'12R護衛LABで、休番を配る能力の条件付き必須性を確認。100固定seedで主編成と相方2枠変更が成功（リオラは共通）。配信済みステージの唯一解・全乱数勝利の主張ではない。'};neri.reason=neri.gems.reason;}
 const finalized=Boolean(currentEvidence&&retained&&neriReady&&fresh.certification.prototypeCertified.length===2);
 const neriCertificate=neriReady?{id:nc.witnessId,canonicalGirlId:'neri',verifiedFormIds:['neri'],scope:'prototype',stageId:nc.stage,stageLabel:'12R護衛・研究用試練',conditionsHash:nc.conditionsHash,necessity:nc.necessityCertificate,sufficiency:{...nc.sufficiencyEvidence,certificate:relative(suffPath),certificateSha256:sha(suffPath),comparisonLabel:'相方2枠変更（リオラ共通）',historicalIdentifier:'neri-all-partners-replaced',identifierCaveat:'Historical data ID retained unchanged; does not mean all three partners were replaced. Main and comparison both contain liora-awakened. Simultaneous replacement of all three partners is unverified.',samplingCaveat:'100 fixed seeds are samples, not a universal win-rate theorem.'},edgeChecks:nc.edgeChecks,latestEvidence:relative(evidencePath),latestEvidenceSha256:sha(evidencePath),notALiveGameCertificate:true}:null;
 const rukaCertificate=retained?{...oldRuka,latestReview:{path:reviewCheck.source,sha256:sha(resolve(ROOT,reviewCheck.source)),conditionsHash:fresh.priorCertificationReview.ruka.conditionsHash,oldCertificateSha256:reviewCheck.oldCertificateSha256,evidenceSha256:sha(evidencePath)},notALiveGameCertificate:true}:null;
 const summary={...base.summary,ideaRegistrations:entries.filter((x:any)=>x.status==='idea').length,ideaGirls:new Set(entries.filter((x:any)=>x.status==='idea').map((x:any)=>x.family.canonicalGirlId)).size,researchStartedGirls:new Set(entries.filter((x:any)=>x.buildIdeas.length||x.familyBuildIdeas.length).map((x:any)=>x.family.canonicalGirlId)).size,liveCertifiedGirls:0,prototypeCertifiedGirls:Number(retained)+Number(neriReady),prototypePendingGirls:ruka.status==='suspended'?1:0};
 const registry={...base,episode:'BRD-002',finalized,evidenceCodeMatches,sourceTreeMatches,entries,summary,priorEpisode:{episode:'BRD-001',registryPath:relative(basePath),registrySha256:sha(basePath),gemAuditSha256:sha(oldAuditPath)},episodeResearch:{interfaceRevalidation,protagonistCharacterId:'neri',protagonistSeriesId:'BD070',stage:finalized?'research-certified-prototype-only':'proposals-and-revalidation-pending',currentEvidenceValidated:currentEvidence},serialMapSha256:sha(serialPath),eligibilitySha256:sha(eligiblePath)};
 const audit={schemaVersion:1,episode:'BRD-002',sourceGameCommit:SOURCE,sourceAppVersion:content.appVersion,finalized,evidenceCodeMatches,sourceTreeMatches,currentEvidenceValidated:currentEvidence,interfaceRevalidation,latestEvidencePath:relative(evidencePath),latestEvidenceSha256:fresh?sha(evidencePath):null,limitsFromResearch:fresh?.limits??[],liveCertifications:[],prototypeCertifications:[rukaCertificate,neriCertificate].filter(Boolean),historicalCertifications:[{...oldRuka,recognitionEpisode:'BRD-001',evidencePath:relative(oldAuditPath),evidenceSha256:sha(oldAuditPath),currentStatus:ruka.status,notALiveGameCertificate:true}],priorCertificationReview:{ruka:rukaReview},newCandidate:{characterId:'neri',seriesId:'BD070',state:neriReady?'prototype-certified':'idea',uniqueWitnessConfirmed:neriReady,productionWitnessConfirmed:false},legacyEvidenceNotes:oldAudit.legacyEvidenceNotes,rulesForNextEpisode:oldAudit.rulesForNextEpisode,limits:['前回の認定履歴と今回の現行認定を分ける。未再審は保留であり、敗北・剥奪の実証ではない。','ネリは研究案から開始。現行ゲームの勝利と研究用試練の勝利を混同しない。','neri-all-partners-replacedは履歴上のデータID。実編成は相方2枠変更でリオラ共通。他3枠の全同時交換は未確認。リオラなしの2回復案88/100があり、リオラ必須の主張もしない。'],regressionChecks:oldAudit.regressionChecks};
 for(const [name,value]of[['registry.json',registry],['gem-audit.json',audit]]as const)for(const directory of[OUT,DOC])writeFileSync(resolve(directory,name),JSON.stringify(value,null,2));
 for(const [name,path]of[['serial-map.snapshot.json',serialPath],['girl-eligibility.snapshot.json',eligiblePath]]as const)writeFileSync(resolve(DOC,name),readFileSync(path));
 console.log(JSON.stringify({episode:registry.episode,...summary,finalized:registry.finalized,neriSeriesId:neri.seriesId,rukaState:ruka.status}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
