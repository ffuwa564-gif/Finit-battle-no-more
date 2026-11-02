/** Matched V4 no-Ruka T6 counterexample for LAB footage: one recorded seed, no 200-seed rerun. */
import{readFileSync,writeFileSync}from'node:fs';import{fileURLToPath,pathToFileURL}from'node:url';import{join}from'node:path';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),OUT=join(ROOT,'artifacts/build-diary-01/research');process.env.LIB_ONLY='1';
const{trial}=await import(pathToFileURL('/tmp/build-diary-01-lab/revalidation-experiment.mts').href);
// These are the V4 t6-burst-no-ruka defaults: leader=first party member;
// all four receive echo-shard at T6 upper power239 / mercy239, pure variant.
const options={party:['astraea','seris-awakened','nox','eos'],tier:6,stock:false,emergencyFirst:true,releaseCapOnWound:true,stage:'research-loom-final',record:true};
const detail=trial(options,1);const original=JSON.parse(readFileSync(join(ROOT,'artifacts/ruka-build-research/prototype-v4-results.json'),'utf8')).cases.find((c:any)=>c.id==='v4-t6-burst-no-ruka');const expected=original.rows.find((r:any)=>r.seed===1);
for(const k of['win','rounds','pots','flowers','fairies','blocked','resets','bossHP','survivors'])if(detail[k]!==expected[k])throw Error('V4 seed1 drift: '+k+' '+detail[k]+' != '+expected[k]);
if(detail.captureFixture.partyIds.includes('ruka')||detail.captureFixture.leaderId!=='astraea')throw Error('Counterparty mismatch');
for(const id of options.party){const g=detail.captureFixture.memoryGems[id];if(g.defId!=='echo-shard'||g.variant!=='pure'||g.roll.power!==239||g.roll.trait!=='mercy'||g.roll.value!==239)throw Error('Counter equipment mismatch: '+id);}
const restores=detail.trace.flatMap((r:any)=>r.events.filter((e:any)=>e.text.includes('回廊の巻戻し')).map((e:any)=>({round:r.round,hpAfterRound:r.bossHp,text:e.text})));
if(!restores.some((r:any)=>r.round===4&&r.hpAfterRound===4800))throw Error('R4 restoration not visible');
writeFileSync(join(OUT,'revalidation-no-ruka-t6-seed1.json'),JSON.stringify({...detail,sourceMain:'489d5a4b15f02385c7229a2b2ff29f76da0abf44',caseId:'v4-t6-burst-no-ruka',matchedOriginalSeed:true,restorationCues:restores},null,2));
console.log(JSON.stringify({file:'revalidation-no-ruka-t6-seed1.json',win:detail.win,rounds:detail.rounds,survivors:detail.survivors,restores,steps:detail.captureSteps.length,leader:detail.captureFixture.leaderId,gems:Object.values(detail.captureFixture.memoryGems)},null,2));
