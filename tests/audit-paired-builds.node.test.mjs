import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pairedAudit,exactMcNemar,holmAdjust,auditHypotheses} from '../scripts/audit-paired-builds.mjs';
const row=(seed,win,rounds=12,potionsUsed=1,survivors=4)=>({seed,win,rounds,potionsUsed,survivors});
test('exact paired test uses discordants, not independent win-rate test',()=>{
  assert.equal(exactMcNemar(0,0),1);
  assert.ok(Math.abs(exactMcNemar(10,0)-2/1024)<1e-12);
  assert.equal(exactMcNemar(5,5),1);
  assert.equal(exactMcNemar(2000,0),0); // vanishingly small value underflows safely
});
test('paired audit excludes one-sided wins from efficiency summaries',()=>{
  const a=[row(1,true,8,0),row(2,true,10,1),row(3,false,6,0)];
  const b=[row(1,true,12,2),row(2,false,9,0),row(3,true,7,1)];
  const result=pairedAudit(a,b);
  assert.equal(result.pairedWinDelta,0);
  assert.deepEqual(result.discordant,{candidateOnly:1,controlOnly:1});
  assert.equal(result.commonWins,1);
  assert.deepEqual(result.meanCandidateMinusControlOnCommonWins,{rounds:-4,potionsUsed:-2,survivors:0});
});
test('validation rejects duplicated and unpaired seeds',()=>{
  assert.throws(()=>pairedAudit([row(1,true),row(1,false)],[row(1,true),row(2,false)]),/duplicate seed/);
  assert.throws(()=>pairedAudit([row(1,true)],[row(2,true)]),/same unique seeds/);
});
test('Holm correction controls comparisons, preserving source order',()=>{
  assert.deepEqual(holmAdjust([.04,.002,.03]),[.06,.006,.06]);
});
test('accepts only declared hypotheses and reports thresholds without claims about global optima',()=>{
  const a=Array.from({length:30},(_,i)=>row(i,i<25));
  const b=Array.from({length:30},(_,i)=>row(i,i<10));
  const report=auditHypotheses({hypotheses:[{id:'noelle-R-with-vs-without-command',candidate:a,control:b}]});
  assert.equal(report.hypotheses[0].pairedWinDelta,.5);
  assert.equal(report.hypotheses[0].winAdvantageGate,true);
  assert.throws(()=>auditHypotheses({hypotheses:[{id:'x',candidate:a,control:b},{id:'x',candidate:a,control:b}]}),/duplicate/);
});
