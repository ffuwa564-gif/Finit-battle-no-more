/** Series-only catalogue and evidence ledger. Does not renumber game IDs or mutate game content. */
import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {content} from '../../src/content/index';
import {BUILD_DEFINITIONS} from '../../src/domain/builds';
import {GEM_DEFINITIONS,TIER_RANGES,gemTraitInfo} from '../../src/domain/memory-gems';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const DOC=resolve(ROOT,'docs/media/build-research-diary'),OUT=resolve(ROOT,'artifacts/build-diary-01');
const SOURCE='489d5a4b15f02385c7229a2b2ff29f76da0abf44';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const stable=(x:unknown):string=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const digest=(x:unknown)=>hash(stable(x));
function evidence(name:string){
 const paths=[resolve(ROOT,'docs/research/ruka-exclusive-build/data',name),resolve(ROOT,'artifacts/ruka-build-research',name)];
 for(const p of paths){if(existsSync(p))return{path:p.slice(ROOT.length+1),value:read(p),sha256:hash(readFileSync(p))};if(existsSync(p+'.gz'))return{path:p.slice(ROOT.length+1)+'.gz',value:JSON.parse(gunzipSync(readFileSync(p+'.gz')).toString()),sha256:hash(readFileSync(p+'.gz'))};}
 throw Error('Missing published research evidence '+name);
}

export type BadgeState='unresearched'|'idea'|'live-certified'|'prototype-certified'|'suspended'|'revoked';
export interface WitnessCheck {id:string;result:'exclusive-revalidated'|'valid-counterexample'|'pending';sameConditions:boolean;competitorCanonicalGirlId?:string;source?:string}
/** A winning counterexample kills one witness. Only loss of every witness revokes the girl's filled badge. */
export function updateCertification(c:{canonicalGirlId:string;conditionsHash:string;witnessIds:string[]},next:{conditionsHash:string;checks:WitnessCheck[]}){
 const by=new Map(next.checks.map(x=>[x.id,x]));
 const judged=c.witnessIds.map(id=>{
  const x=by.get(id);
  if(!x||!x.sameConditions||x.result==='pending'||(x.result==='valid-counterexample'&&!x.competitorCanonicalGirlId))return{id,state:'pending'};
  // A new outfit of the same explicitly linked girl is not another girl's counterexample.
  if(x.result==='valid-counterexample'&&x.competitorCanonicalGirlId===c.canonicalGirlId)return{id,state:'same-girl-alternative'};
  return{id,state:x.result==='valid-counterexample'?'counterexample':'exclusive'};
 });
 const anyExclusive=judged.some(x=>x.state==='exclusive');
 if(anyExclusive)return{state:'retained',filledGem:true,witnesses:judged,reason:'少なくとも1つの攻略先で、更新後の条件に対する必須性を再確認した。'};
 if(judged.length&&judged.every(x=>x.state==='counterexample'))return{state:'revoked',filledGem:false,witnesses:judged,reason:'登録した全攻略先に、同じ条件で別の少女による有効な突破例が現れた。'};
 return{state:'suspended',filledGem:false,witnesses:judged,reason:c.conditionsHash!==next.conditionsHash?'技・候補・条件が更新されたため再審査。旧版の証明を自動継続しない。':'未検証の攻略先または同じ少女の別形態が残る。現在のデータだけで他の少女に代替されたとは言わない。'};
}

function main(){
 if(content.appVersion!=='1.11.0')throw Error(`Record only after v1.11 portrait update. Current content: ${content.appVersion}`);
 mkdirSync(OUT,{recursive:true});mkdirSync(DOC,{recursive:true});
 const eligibility=read(resolve(DOC,'girl-eligibility.json'));
 const serials=read(resolve(DOC,'serial-map.json'));
 const published=content.characters.filter(c=>c.published);
 const byId=new Map(published.map(c=>[c.id,c]));const assetBy=new Map(content.assets.map(a=>[a.id,a]));
 const eligibilityBy=new Map<string,any>(eligibility.entries.map((e:any)=>[e.characterId,e]));
 const serialBy=new Map<string,any>(serials.entries.map((e:any)=>[e.characterId,e]));
 const ids=new Set<string>();for(const s of serials.entries){if(!/^BD\d{3,}$/.test(s.seriesId)||Number(s.seriesId.slice(2))<1)throw Error('Invalid series ID '+s.seriesId);if(ids.has(s.seriesId))throw Error('Reused series ID '+s.seriesId);ids.add(s.seriesId);}
 for(const c of published)if(!eligibilityBy.has(c.id))throw Error('Review new character original before assigning girl eligibility: '+c.id);

 // Canonical identity comes only from explicit family/awakening/event links, never from similar names or art.
 const parent=new Map(published.map(c=>[c.id,c.id]));
 function find(id:string):string{const p=parent.get(id);if(!p)return id;if(p===id)return id;const r=find(p);parent.set(id,r);return r;}
 function union(a:string,b:string){if(!parent.has(a)||!parent.has(b))return;const aa=find(a),bb=find(b);if(aa!==bb)parent.set(bb,aa);}
 const familyFirst=new Map<string,string>();for(const c of published){if(c.familyId){const prev=familyFirst.get(c.familyId);if(prev)union(prev,c.id);else familyFirst.set(c.familyId,c.id);if(byId.has(c.familyId))union(c.familyId,c.id);}}
 for(const a of content.awakenings??[])union(a.baseId,a.awakenedId);
 for(const e of content.events??[])union(e.normalId,e.awakenedId);
 const canonicalBy=new Map<string,string>();for(const c of published){const root=find(c.id);if(!canonicalBy.has(root))canonicalBy.set(root,c.id);}
 const canonical=(id:string)=>canonicalBy.get(find(id))??id;

 const gameplay={contentVersion:content.contentVersion,rulesVersion:content.rulesVersion,schemaVersion:content.schemaVersion,
  characters:published.map(c=>({id:c.id,familyId:c.familyId??null,role:c.role,strength:c.strength,leaderStat:c.leaderStat,leaderEffect:c.leaderEffect??null,skillIds:c.skillIds,origin:c.origin,rarity:c.rarity})),
  skills:content.skills,memoryGems:GEM_DEFINITIONS,tierRanges:TIER_RANGES,gemTraits:gemTraitInfo,xrGacha:content.xrGacha,runtimeRules:Object.fromEntries([...readdirSync(resolve(ROOT,'src/domain')).filter(p=>p.endsWith('.ts')&&p!=='types.ts').map(p=>'src/domain/'+p),'src/application/game.ts'].sort().map(p=>[p,hash(readFileSync(resolve(ROOT,p)))])),awakenings:content.awakenings,events:content.events,dungeons:content.dungeons.map(({artId,bossMusic,...d})=>d)};
 const gameplayHash=digest(gameplay);
 const baseCertificate=evidence('necessity-certificate.json'),v4=evidence('prototype-v4-results.json'),counters=evidence('current-candidate-counters.json');
 const freshPath=resolve(OUT,'research/episode-evidence.json'),fresh=existsSync(freshPath)?read(freshPath):null;
 const certPath=resolve(OUT,'research/revalidation-necessity-certificate.json'),edgePath=resolve(OUT,'research/revalidation-edge-checks.json');
 const freshCert=existsSync(certPath)?read(certPath):null,freshEdges=existsSync(edgePath)?read(edgePath):null;
 const latestSource=fresh?.sourceMain??fresh?.sourceMainCommit??fresh?.sourceGameCommit;
 const pcheck=fresh?.presentationChangeOnlyVerified;
 const presentationOnly=Boolean(pcheck===true||(pcheck?.domainBehaviorFilesEqual===true&&pcheck?.gameplayDefinitionsEqual===true&&pcheck?.portraitHeadBoundsFitAllSupportedFrames===true));
 const evidenceCodePaths:any={bootstrap:'scripts/ruka-build-research/bootstrap.py',rules:'scripts/ruka-build-research/prototype-rules.mts',experiment:'scripts/ruka-build-research/experiment.mts',revalidate:'scripts/build-diary-01/revalidate.mts'};
 const evidenceCodeMatches=Boolean(fresh&&Object.entries(evidenceCodePaths).every(([key,p])=>fresh.codeHashes?.[key]===hash(readFileSync(resolve(ROOT,p as string)))));
 let sourceTreeMatches=false;try{execFileSync('git',['diff','--quiet',SOURCE,'--','src/domain','src/application','src/content'],{cwd:ROOT,stdio:'ignore'});sourceTreeMatches=true;}catch{}
 const prototypeReady=Boolean(sourceTreeMatches&&evidenceCodeMatches&&fresh?.passed===true&&presentationOnly&&fresh?.contentVersion===content.contentVersion&&fresh?.rulesVersion===content.rulesVersion&&latestSource===SOURCE&&fresh?.appVersion==='1.11.0'&&(fresh?.prototypeCertified??fresh?.certification?.prototypeCertified)?.includes('ruka')&&freshCert?.passed===true&&freshEdges?.passed===true);
 if((fresh?.productionCertified??fresh?.certification?.productionCertified)?.length)throw Error('New live certification requires explicit witness registration; do not silently attach it.');

 const proposals=new Map<string,any[]>();
 const add=(id:string,x:any)=>proposals.set(id,[...(proposals.get(id)??[]),x]);
 for(const build of BUILD_DEFINITIONS){const seen=new Set<string>();for(const stage of Object.values(build.stages))for(const slot of stage.slots)for(const id of slot.characterIds){const key=id+':'+slot.id;if(seen.has(key))continue;seen.add(key);add(id,{id:build.id,name:build.name,scope:'live-recipe',role:slot.label,evidence:'src/domain/builds.ts',exclusiveClaim:false});}}
 for(const [id,key,name,source]of[
  ['iris','low-rarity-rewind','低レア巻戻しの使い手','scripts/diary-111/chapters.py'],
  ['fio','white-flower-overflow','白花と余り布','scripts/diary-111/chapters.py'],
  ['noelle','command-doctrine','星図の号令','src/domain/command-doctrine.ts'],
  ['noelle-awakened','command-doctrine','星図の号令・覚醒','src/domain/command-doctrine.ts'],
  ['liora-awakened','athena-free-third-floor','アテナ抜き第3層の受け役','scripts/diary-part3/script.py'],
  ['lunette-awakened','second-floor-awakened','第2層の全体攻撃役','scripts/diary-part2/chapters.py'],
  ['ruka','backstitch-lab','残り糸・留め縫い','docs/research/ruka-exclusive-build/README.md'],
 ])add(id,{id:key,name,scope:id==='ruka'?'prototype':'recorded-or-designed-build',evidence:source,exclusiveClaim:false});

 const priorPath=resolve(DOC,'registry.json');
 if(existsSync(priorPath)){for(const e of read(priorPath).entries??[])if(serialBy.get(e.characterId)?.seriesId!==e.seriesId)throw Error('Existing series ID was reassigned or removed: '+e.characterId);}
 const entries:any[]=[],excluded:any[]=[];
 for(const c of published){
  const eligible=eligibilityBy.get(c.id),a=assetBy.get(c.artId);if(!a)throw Error('Missing full original '+c.id);
  const p=resolve(ROOT,'public',a.path),artSha256=hash(readFileSync(p));
  if(a.path!==eligible.reviewedArtPath||artSha256!==eligible.reviewedArtSha256)throw Error('Original changed; visually review before retaining catalogue classification: '+c.id);
  if(!eligible.eligibleGirl){excluded.push({characterId:c.id,name:c.name,reason:eligible.reason,artPath:a.path,artSha256,stillIncludedInLegalBuildComparisons:true});continue;}
  const registration=serialBy.get(c.id);if(!registration)throw Error('Assign immutable appended serial after visual review: '+c.id);
  const form=c.id.endsWith('-awakened')?'awakened':c.id.endsWith('-standard')?'standard-costume':'base-or-original-costume';
  const displayName=c.id.endsWith('-awakened')&&!c.name.startsWith('九尾')&&!c.name.startsWith('星時計')?'覚醒'+c.name:c.id.endsWith('-standard')?c.name+'〈通常衣装〉':c.name;
  const ideas=proposals.get(c.id)??[];const girl=canonical(c.id);const familyIdeas=published.filter(x=>canonical(x.id)===girl).flatMap(x=>(proposals.get(x.id)??[]).map(b=>({...b,sourceFormId:x.id})));const hasIdeas=ideas.length>0||familyIdeas.length>0;const isRuka=girl===canonical('ruka');
  const status:BadgeState=isRuka?(prototypeReady?'prototype-certified':'suspended'):hasIdeas?'idea':'unresearched';
  const gems=isRuka?{status,scope:'prototype',badge:prototypeReady?'solid-amber':'outline-amber',symbol:prototypeReady?'◆':'◇',label:prototypeReady?'試作認定':'試作・再検証中',glow:{enabled:true,color:'#efb34c',strength:prototypeReady?.9:.35},certificationId:'LAB-RUKA-001',verifiedFormIds:prototypeReady?['ruka']:[],notALiveGameCertificate:true,reason:prototypeReady?'ルカの糸→留め縫いが必要な研究用試練。最新版の再検証済み。現行の配信ステージとは別。':'留め縫いの研究案あり。最新版での試作証拠の照合が終わるまで塗り宝石は保留。'}:
   hasIdeas?{status,scope:'idea',badge:'outline-weak',symbol:'◇',label:ideas.length?'案あり':'案あり・別の姿',ideaSourceFormIds:[...new Set(familyIdeas.map(b=>b.sourceFormId))],glow:{enabled:true,color:'#bce6e1',strength:.28},verifiedFormIds:[],reason:ideas.length?'実装されたレシピまたは既存研究に役割案がある。代替不能な攻略先の認定ではない。':'同じ少女の別形態に案がある。この形態での適性・勝利・必須性を実証したという意味ではない。'}:
   {status,scope:'none',badge:'none',symbol:'',label:'これから研究',glow:{enabled:false,color:'#bce6e1',strength:0},verifiedFormIds:[],reason:'この台帳に固有のビルド案や専用攻略先の証拠はまだ登録していない。キャラクターの強弱・価値の判定ではない。'};
  entries.push({seriesId:registration.seriesId,characterId:c.id,name:c.name,displayName,epithet:c.epithet,role:c.role,rarity:c.rarity,published:c.published,artId:c.artId,artPath:a.path,artSha256,artWidth:a.width,artHeight:a.height,presentation:'full-original-contain',originalComposition:eligible.originalComposition,form,shortFormLabel:form==='awakened'?'覚醒':form==='standard-costume'?'通常衣装':'登録形態',family:{canonicalGirlId:girl,explicitFamilyId:c.familyId??null,linkedFormIds:published.filter(x=>canonical(x.id)===girl).map(x=>x.id),noClaimThatUntestedFormsWon:true},gems,status:gems.status,reason:gems.reason,buildIdeas:ideas,familyBuildIdeas:familyIdeas});
 }
 entries.sort((a,b)=>Number(a.seriesId.slice(2))-Number(b.seriesId.slice(2)));
 const registry={schemaVersion:1,seriesTitle:'ビルド研究日誌',subtitle:'みんなが輝くRPGを！',episode:'BRD-001',sourceGameCommit:SOURCE,sourceAppVersion:content.appVersion,sourceContentVersion:content.contentVersion,sourceRulesVersion:content.rulesVersion,finalized:prototypeReady,evidenceCodeMatches,sourceTreeMatches,gameplayConditionsHash:gameplayHash,serialMapSha256:hash(readFileSync(resolve(DOC,'serial-map.json'))),eligibilitySha256:hash(readFileSync(resolve(DOC,'girl-eligibility.json'))),identityPolicy:'Series IDs refer to implementation forms. Recognition refers to explicitly linked girls, with verified form IDs retained. No automatic win claim for another form.',badgeLegend:{none:'未研究。価値が低いという意味ではない。','outline-weak':'◇ ビルド案あり。固有の唯一解は未確認。','outline-amber':'◇ 試作の再検証待ち。','solid-cyan':'💎 現行版で必要性を認定。','solid-amber':'◆ 試作認定。研究用ステージに限る。'},entries,excluded,comparisonRoster:published.map(c=>({characterId:c.id,canonicalGirlId:canonical(c.id),displayedInGirlParade:eligibilityBy.get(c.id).eligibleGirl})),summary:{publishedCharacters:published.length,girlRegistrations:entries.length,canonicalGirls:new Set(entries.map(c=>c.family.canonicalGirlId)).size,excludedCreatures:excluded.length,ideaRegistrations:entries.filter(c=>c.status==='idea').length,ideaGirls:new Set(entries.filter(c=>c.status==='idea').map(c=>c.family.canonicalGirlId)).size,researchStartedGirls:new Set(entries.filter(c=>c.buildIdeas.length||c.familyBuildIdeas.length).map(c=>c.family.canonicalGirlId)).size,liveCertifiedGirls:0,prototypeCertifiedGirls:prototypeReady?1:0,prototypePendingGirls:prototypeReady?0:1}};

 const checks:WitnessCheck[]=[{id:'tower20',result:'valid-counterexample',sameConditions:true,competitorCanonicalGirlId:canonical('elaine-awakened'),source:counters.path},{id:'tower30',result:'valid-counterexample',sameConditions:true,competitorCanonicalGirlId:canonical('elaine-awakened'),source:counters.path}];
 const rukaCases=[20,30].map(floor=>({floor,results:counters.value.cases.filter((r:any)=>r.floor===floor&&['ruka','elaine-awakened','seris-awakened'].includes(r.id)).map((r:any)=>({characterId:r.id,name:r.name,wins:r.wins,trials:r.n}))}));
 const audit={schemaVersion:1,episode:'BRD-001',sourceGameCommit:SOURCE,sourceAppVersion:content.appVersion,evidenceCodeMatches,sourceTreeMatches,gameplayConditionsHash:gameplayHash,liveCertifications:[],prototypeCertifications:prototypeReady?[{id:'LAB-RUKA-001',canonicalGirlId:canonical('ruka'),verifiedFormIds:['ruka'],archetype:'自然失効した障壁→残り糸→留め縫い',scope:'prototype',stageId:'research-loom-final',stageLabel:'ほどける回廊・研究用V4',conditions:{hp:4800,attack:160,closedRoundDamageCap:300,restoreEvery:4,roundLimit:40,woundDurationRounds:2,experimentalNewLeaderSkill:false,emergencyHealingFirst:true},necessity:{certificate:certPath.slice(ROOT.length+1),sha256:hash(readFileSync(certPath)),formula:'4 × 300 = 1200 < 4800',claim:'Without the unique Ruka wound mechanism in this closed proposed ruleset, no legal build can kill before restoration. Not a claim about currently deployed stages.'},sufficiency:{reference:v4.path,sha256:v4.sha256,mainCase:v4.value.cases.find((c:any)=>c.id==='v4-tier4'),samplingCaveat:'100 fixed seeds demonstrate samples, not universal win probability.'},latestEvidence:freshPath.slice(ROOT.length+1),latestEvidenceSha256:hash(readFileSync(freshPath)),latestEdgeChecksSha256:hash(readFileSync(edgePath)),latestSourcePresentationOnlyVerified:true}]:[],historicalHypotheses:[{id:'RUKA-TOWER20-30-HYPOTHESIS',canonicalGirlId:canonical('ruka'),initialStatus:'hypothesis-only',initialBadge:'outline-weak',finalStatus:'rejected',revokedActualCertification:false,reason:'初期のエオス1編成との小標本比較で候補に見えたが、覚醒エレイン等の反例で棄却。正式な💎を新研究が奪った実例ではない。',results:rukaCases,adjudication:updateCertification({canonicalGirlId:canonical('ruka'),conditionsHash:'original-synthetic-T6-comparison',witnessIds:['tower20','tower30']},{conditionsHash:'original-synthetic-T6-comparison',checks})}],legacyEvidenceNotes:[{characterIds:['noelle','noelle-awakened'],status:'idea',reason:'号令は固有の通常行動宛先操作だが、独占攻略先の証明は登録されていない。'},{characterIds:['iris'],status:'idea',reason:'Part1.1.1で低レア巻戻し役として比較・採用。同条件のヴェスペラ案も勝っており、唯一解認定はしない。'},{characterIds:['fio'],status:'idea',reason:'白花と余り布のビルドを実戦で紹介。フィオ本人だけが必要な攻略先の証明ではない。'}],rulesForNextEpisode:['新しい少女・技・石・敵・予算を追加したら、全旧認定witnessの条件を更新し、対抗攻略と必須性を再審査する。','有効な別の少女の勝利例が1つ出れば、その攻略先の独占認定は解除する。0勝の有限試行だけでは独占を証明しない。','同じ少女の別形態の勝利は、他の少女による代替とは分ける。実証フォームを更新し、古い特定ビルドの主張は別途見直す。','最後の有効な攻略先がなくなったら塗り宝石を剥奪。未検証・条件違いは保留。','顔グラやBGMなどの見た目だけを、戦闘条件の変更として扱わない。画像の版と撮影版は別に追跡する。','liveとprototypeは別台帳。研究用試練が残っても、それを理由に現行ゲームの認定を維持しない。','剥奪するのは研究側の認定。少女の価値を下げる演出にしない。'],regressionChecks:[{name:'counterexampleOnLastWitnessRevokes',passed:updateCertification({canonicalGirlId:'ruka',conditionsHash:'x',witnessIds:['a']},{conditionsHash:'x',checks:[{id:'a',result:'valid-counterexample',sameConditions:true,competitorCanonicalGirlId:'elaine'}]}).state==='revoked'},{name:'oneSurvivingWitnessRetains',passed:updateCertification({canonicalGirlId:'ruka',conditionsHash:'x',witnessIds:['a','b']},{conditionsHash:'x',checks:[{id:'a',result:'valid-counterexample',sameConditions:true,competitorCanonicalGirlId:'elaine'},{id:'b',result:'exclusive-revalidated',sameConditions:true}]}).state==='retained'},{name:'newEpochNeedsFreshEvidence',passed:updateCertification({canonicalGirlId:'ruka',conditionsHash:'x',witnessIds:['a']},{conditionsHash:'new-skill-added',checks:[]}).state==='suspended'},{name:'sameGirlFormNotOtherGirl',passed:updateCertification({canonicalGirlId:'ruka',conditionsHash:'x',witnessIds:['a']},{conditionsHash:'x',checks:[{id:'a',result:'valid-counterexample',sameConditions:true,competitorCanonicalGirlId:'ruka'}]}).state==='suspended'}]};
 if(audit.regressionChecks.some(x=>!x.passed))throw Error('Gem audit contract failed');
 for(const p of[resolve(OUT,'registry.json'),resolve(DOC,'registry.json')])writeFileSync(p,JSON.stringify(registry,null,2));
 for(const p of[resolve(OUT,'gem-audit.json'),resolve(DOC,'gem-audit.json')])writeFileSync(p,JSON.stringify(audit,null,2));
 console.log(JSON.stringify({registry:'artifacts/build-diary-01/registry.json',...registry.summary,finalized:registry.finalized,rukaSeriesId:entries.find(c=>c.characterId==='ruka').seriesId,gemAuditRegressionChecks:audit.regressionChecks.length}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
