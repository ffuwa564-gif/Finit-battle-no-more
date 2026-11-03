// Pure, non-gameplay audit for paired native-engine battle summaries.
// Input: { hypotheses: [{ id, candidate: [{seed,win,rounds,potionsUsed,survivors}], control: [...] }] }
// Run: node scripts/audit-paired-builds.mjs path/to/locked-confirmation-results.json
import { readFile } from 'node:fs/promises';

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
}
function asTrials(value, label) {
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} must be a nonempty array`);
  const seen = new Set();
  return value.map((row, index) => {
    requireRecord(row, `${label}[${index}]`);
    const { seed, win, rounds, potionsUsed, survivors } = row;
    if (!Number.isSafeInteger(seed) || !Number.isInteger(rounds) || rounds < 0 ||
      !Number.isInteger(potionsUsed) || potionsUsed < 0 || !Number.isInteger(survivors) || survivors < 0 ||
      typeof win !== 'boolean') throw new Error(`${label}[${index}] has an invalid trial`);
    if (seen.has(seed)) throw new Error(`${label}: duplicate seed ${seed}`);
    seen.add(seed);
    return {seed,win,rounds,potionsUsed,survivors};
  }).sort((a,b)=>a.seed-b.seed);
}
function logAdd(a,b) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  return Math.max(a,b) + Math.log1p(Math.exp(-Math.abs(a-b)));
}
// Exact two-sided McNemar/binomial p-value, stable even for >1,000 discordant trials.
export function exactMcNemar(candidateOnly, controlOnly) {
  const m = candidateOnly + controlOnly;
  if (!Number.isSafeInteger(candidateOnly) || !Number.isSafeInteger(controlOnly) || candidateOnly < 0 || controlOnly < 0) throw new Error('invalid discordance count');
  if (m===0) return 1;
  const k = Math.min(candidateOnly,controlOnly);
  let logTerm = -m*Math.LN2, logCdf = -Infinity;
  for(let i=0;i<=k;i++) {
    logCdf = logAdd(logCdf, logTerm);
    if(i<k) logTerm += Math.log(m-i)-Math.log(i+1);
  }
  return Math.min(1,2*Math.exp(logCdf));
}
export function pairedAudit(candidate, control) {
  const a = asTrials(candidate,'candidate'), b=asTrials(control,'control');
  if(a.length!==b.length || a.some((r,i)=>r.seed!==b[i].seed)) throw new Error('candidate/control must contain exactly the same unique seeds');
  let winsA=0,winsB=0,onlyA=0,onlyB=0;
  const both=[];
  for(let i=0;i<a.length;i++) {
    const aa=a[i],bb=b[i];
    winsA+=Number(aa.win);winsB+=Number(bb.win);
    if(aa.win && !bb.win) onlyA++;
    if(!aa.win && bb.win) onlyB++;
    if(aa.win && bb.win) both.push({rounds:aa.rounds-bb.rounds,potionsUsed:aa.potionsUsed-bb.potionsUsed,survivors:aa.survivors-bb.survivors});
  }
  const mean=(key)=>both.length ? both.reduce((sum,item)=>sum+item[key],0)/both.length : null;
  return {
    n:a.length, winRateCandidate:winsA/a.length, winRateControl:winsB/a.length,
    pairedWinDelta:(onlyA-onlyB)/a.length,
    discordant:{candidateOnly:onlyA,controlOnly:onlyB},
    exactMcNemarP:exactMcNemar(onlyA,onlyB),
    commonWins:both.length,
    // Efficiency comparisons only use the exact same seeds won by both arms.
    meanCandidateMinusControlOnCommonWins:{rounds:mean('rounds'),potionsUsed:mean('potionsUsed'),survivors:mean('survivors')},
  };
}
export function holmAdjust(pValues) {
  if (!Array.isArray(pValues) || pValues.some(p=>typeof p!=='number'||!Number.isFinite(p)||p<0||p>1)) throw new Error('invalid p-values');
  const order=pValues.map((p,i)=>({p,i})).sort((a,b)=>a.p-b.p);
  const result=new Array(order.length); let max=0;
  order.forEach(({p,i},rank)=>{max=Math.max(max,Math.min(1,p*(order.length-rank)));result[i]=max;});
  return result;
}
export function auditHypotheses(input) {
  requireRecord(input,'input');
  if(!Array.isArray(input.hypotheses) || !input.hypotheses.length) throw new Error('hypotheses must be a nonempty array');
  const ids=new Set();
  const rows=input.hypotheses.map((h,i)=>{
    requireRecord(h,`hypotheses[${i}]`);
    if(typeof h.id!=='string' || !h.id || ids.has(h.id)) throw new Error('missing/duplicate hypothesis id');
    ids.add(h.id);
    return {id:h.id,...pairedAudit(h.candidate,h.control)};
  });
  const adjusted=holmAdjust(rows.map(r=>r.exactMcNemarP));
  return {method:'same-seed paired native-engine summaries; exact McNemar + Holm family-wise correction',
    warning:'Results certify only PRE-REGISTERED comparisons on UNUSED confirmation seeds. Not exhaustive optimal-build or uniqueness proofs.',
    hypotheses:rows.map((r,i)=>({...r,holmAdjustedP:adjusted[i],
      winAdvantageGate:r.pairedWinDelta>=0.10 && adjusted[i]<0.05}))};
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  if (!process.argv[2]) { console.error('Usage: node scripts/audit-paired-builds.mjs <locked-confirmation-results.json>');process.exitCode=2; }
  else {
    try { console.log(JSON.stringify(auditHypotheses(JSON.parse(await readFile(process.argv[2],'utf8'))),null,2)); }
    catch(error){console.error(error.message);process.exitCode=1;}
  }
}
