import {test,expect} from 'vitest';
import {pairedAudit,exactMcNemar,holmAdjust,auditHypotheses} from '../scripts/audit-paired-builds.mjs';
const row=(seed,win,rounds=12,potionsUsed=1,survivors=4)=>({seed,win,rounds,potionsUsed,survivors});

test('exact paired test uses discordants, not independent win-rate test',()=>{
  expect(exactMcNemar(0,0)).toBe(1);
  expect(Math.abs(exactMcNemar(10,0)-2/1024)).toBeLessThan(1e-12);
  expect(exactMcNemar(5,5)).toBe(1);
  expect(exactMcNemar(2000,0)).toBe(0);
});
test('paired audit excludes one-sided wins from efficiency summaries',()=>{
  const a=[row(1,true,8,0),row(2,true,10,1),row(3,false,6,0)];
  const b=[row(1,true,12,2),row(2,false,9,0),row(3,true,7,1)];
  const result=pairedAudit(a,b);
  expect(result.pairedWinDelta).toBe(0);
  expect(result.discordant).toEqual({candidateOnly:1,controlOnly:1});
  expect(result.commonWins).toBe(1);
  expect(result.meanCandidateMinusControlOnCommonWins).toEqual({rounds:-4,potionsUsed:-2,survivors:0});
});
test('validation rejects duplicated and unpaired seeds',()=>{
  expect(()=>pairedAudit([row(1,true),row(1,false)],[row(1,true),row(2,false)])).toThrow(/duplicate seed/);
  expect(()=>pairedAudit([row(1,true)],[row(2,true)])).toThrow(/same unique seeds/);
});
test('Holm correction controls comparisons, preserving source order',()=>{
  expect(holmAdjust([.04,.002,.03])).toEqual([.06,.006,.06]);
});
test('accepts only declared hypotheses and reports thresholds without claims about global optima',()=>{
  const a=Array.from({length:30},(_,i)=>row(i,i<25));
  const b=Array.from({length:30},(_,i)=>row(i,i<10));
  const report=auditHypotheses({hypotheses:[{id:'noelle-R-with-vs-without-command',candidate:a,control:b}]});
  expect(report.hypotheses[0].pairedWinDelta).toBe(.5);
  expect(report.hypotheses[0].winAdvantageGate).toBe(true);
  expect(()=>auditHypotheses({hypotheses:[{id:'x',candidate:a,control:b},{id:'x',candidate:a,control:b}]})).toThrow(/duplicate/);
});