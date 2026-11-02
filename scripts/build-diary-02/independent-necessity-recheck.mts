/** Independent, read-only sidecar for the existing 60-event necessity envelope.
 * Does not regenerate the certificate, evidence, registry, content or recordings.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const O='artifacts/build-diary-02/research';
const paths={certificate:`${O}/research-necessity-certificate.json`,content:`${O}/research-lab-content.json`,fixture:`${O}/neri-main-seed1.json`,native:'src/domain/engine.ts',capturedEngine:'/tmp/build-diary-02-lab/src/domain/engine.ts',patchedEngine:'/tmp/build-diary-02-contract-v2/src/domain/engine.ts',blooms:'src/domain/battle-blooms.ts',rescue:'src/domain/character-rescue.ts',command:'src/domain/command-doctrine.ts',self:'scripts/build-diary-02/independent-necessity-recheck.mts'};
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const cert=JSON.parse(readFileSync(paths.certificate,'utf8'));
const content=JSON.parse(readFileSync(paths.content,'utf8'));
const fixture=JSON.parse(readFileSync(paths.fixture,'utf8')).captureFixture;
const stage=content.dungeons.find((x:any)=>x.id===fixture.dungeonId);
const engine=readFileSync(paths.native,'utf8');
const checks:any[]=[];
function check(id:string,ok:boolean,detail:any={}){checks.push({id,passed:Boolean(ok),...detail});}
const enemies=fixture.units.filter((x:any)=>x.side==='enemy');
check('single-wave-single-enemy',stage.waves.length===1&&stage.waves[0].length===1&&enemies.length===1,{waves:stage.waves.length,enemies:enemies.length});
check('no-boss-bits-pattern',stage.bossBits===undefined&&!enemies.some((u:any)=>u.bits),{bossBits:null});
check('no-boss-clock-pattern',stage.bossClock===undefined,{bossClock:null});
check('initial-echo-queue-empty',!(fixture.memoryEchoes?.length),{initialEchoes:fixture.memoryEchoes?.length??0});
check('at-most-four-legal-party-slots',fixture.partyIds.length<=4,{scope:'Existing certificate explicitly quantifies legal party sizes1..4; creation fixture has four.'});
check('no-coordination-damage-loop',stage.coordination===undefined);
const notes:any[]=[];
function anchor(id:string,path:string,needle:string,explanation:string){const s=readFileSync(path,'utf8'),i=s.indexOf(needle);check('source-anchor-'+id,i>=0);const lines=s.split('\n'),line=i<0?0:s.slice(0,i).split('\n').length;notes.push({id,path,sha256:sha(path),line,excerpt:lines.slice(Math.max(0,line-2),line+3).join('\n'),explanation});}
anchor('single-actor-loop',paths.native,'for (const actor of order)', 'At most one selected action per living unit in the single actor loop; queued ultimate and memory skill replace this action.');
anchor('noelle-retarget',paths.native,'action = { ...action, targets: [designated], commanded: true }','Command modifies the same follower action, never invokes another action. Issued commander spends her own action.');
anchor('commander-action-spent',paths.native,'if (actor.hp <= 0 || issued && actor.uid === commander!.uid) continue;','Commanding consumes the commander normal action; buff/charge issuance is not boss HP damage.');
anchor('chain-needs-other-enemy',paths.native,"filter(unit => !targetIds.includes(unit.uid) && !action.targets.some(primary => primary.uid === unit.uid))",'Chain selects an enemy outside the primary target set. Against the sole boss, an attack already targeting that boss leaves zero other enemy candidates. Forced confusion/charm attacks have no memory skill/trait.');
anchor('at-most-one-echo-per-action',paths.native,'battle.memoryEchoes.push({ actorId: actor.uid','One push, not a target loop, per qualifying selected action. Echo dueRound is current+1 and one target is stored. At most four party-origin echoes can become due per round.');
anchor('echo-does-not-recurse',paths.native,'for (const echo of (battle.memoryEchoes ?? []).filter(e => e.dueRound <= battle.round))','Echo loop directly subtracts fixed prior power and never enters the ordinary-action/echo-creation block.');
anchor('due-echo-queue-removed',paths.native,'battle.memoryEchoes.filter(e => e.dueRound > battle.round)','Due echoes are removed once; they cannot be collected repeatedly in the same round.');
anchor('bits-require-stage-pattern',paths.native,'if (!pattern) return;','The stage has no bossBits, so the bit-fire loop cannot run. Character ultimate artwork showing bits does not add this stage pattern.');
anchor('one-flower-roll-per-round',paths.blooms,'if (state.checked === checkpoint) return;','Bloom availability is checked once for each wave/round. An unharvested older flower prevents another flower from being offered.');
anchor('flower-harvest-stamps-current-round',paths.native,'battle.blooms!.checked = `${battle.wave}:${battle.round}`;','Harvesting stamps the current round, so an older flower cannot be followed by another newly offered flower in the same round.');
anchor('off-turn-no-flower-reroll',paths.native,'if (!battle.events.some(event => event.bloomAction || event.fairyAction))','Finishing off-turn flower/fairy replay does not offer another flower. Hence at most one bloom attack between successive normal rounds.');
anchor('flower-single-target-hit',paths.native,'const hit = damage(source, target, 150, 100','Strike bloom calls damage once on one boss.');
anchor('fairy-only-charge',paths.native,'party.forEach(unit => gainUltimate(unit, FAIRY_CHARGE));','Fairy charges the gauge; it does not execute another attack or extra ultimate action.');
anchor('forced-action-single-target',paths.native,"targets: [targets[Math.floor(roll.value * targets.length)]!], forcedBy",'The sole enemy can, at most, deal one confusion self-hit in its own single action. Charm excludes self and skips when there is no ally, so counting one is conservative.');
anchor('rescue-no-extra-hp-loss',paths.rescue,'export function applyCharacterRescue','Manual source review: rescue cases heal, weaken, fill charge or preserve buff. None adds enemy HP damage.');
const perRound={partySelectedActions:4,previousRoundEchoes:4,strikeBloom:1,confusedBossOwnAction:1,chainAgainstSoleEnemy:0,bitsWithoutPattern:0,fairyAttacks:0,extraCommandActions:0};
const totalPerRound=Object.values(perRound).reduce((a,b)=>a+b,0),rounds=6,maxEvents=rounds*totalPerRound,envelope=cert.bounds.perHitEnvelope,maxDamage=maxEvents*envelope,bossHp=enemies[0].maxHp;
check('retained-60-event-bound',maxEvents===60&&cert.bounds.eventsBeforeSix===60,{rounds,totalPerRound,maxEvents});
check('retained-envelope-and-hp',envelope===1e9&&bossHp===1e12&&stage.bossScale.hp===bossHp,{envelope,bossHp});
check('boss-not-killable-before-retirement',maxDamage<bossHp&&maxDamage===cert.bounds.maxDamageBeforeSix,{maxDamage,bossHp,remainingHpAtLeast:bossHp-maxDamage});
const report={passed:checks.every(x=>x.passed),reviewer:'/root/build_diary_critic',method:'Independent direct native-source audit plus assertions against frozen original content/fixture/certificate JSON. No simulation, regeneration, or mutation of existing evidence.',scope:'Exactly this one-wave one-enemy escort, empty initial echo queue, no bossBits/clock pattern, legal party size1..4, existing finite native command catalogue. This is a damage-operation envelope, not a limit on all displayed events.',inputHashes:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,{path:p,sha256:sha(p)}])),checks,perRoundDamageOperationEnvelope:perRound,rounds,maxEventsBeforeSix:maxEvents,perHitEnvelope:envelope,maxDamageBeforeSix:maxDamage,bossHp,sourceAnchors:notes,limits:['If a future stage adds enemies, bits/clock attacks, initial echoes, additional action hooks, recursive projectiles or new HP-loss routes, this60 bound must be reopened.','The per-hit1e9 envelope is inherited from the existing finite-content certificate; this sidecar strengthens the operation-count assumptions rather than replacing that stat-bound audit.','An upper bound on damaging operations does not bound cosmetic messages, heal events, actor actionSelection messages or support logs.']};
writeFileSync(`${O}/independent-necessity-recheck.json`,JSON.stringify(report,null,2));console.log('INDEPENDENT NECESSITY COUNT',report.passed,maxEvents,maxDamage,'<',bossHp);if(!report.passed)process.exitCode=1;
