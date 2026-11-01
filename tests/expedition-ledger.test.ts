import { describe, expect, it } from 'vitest';
import { createInitialSave } from '../src/application/game';
import { content } from '../src/content';
import { createBattle } from '../src/domain/engine';
import { createExpeditionTracking } from '../src/domain/expedition-review';
import { EXPEDITION_HISTORY_LIMIT, finalizeExpedition, summarizeExpeditions, type ExpeditionRecord } from '../src/domain/expedition-ledger';

function finished(outcome:'victory'|'defeat'|'timeout'|'retreat'='victory') {
  const previous=createInitialSave(content,221);
  const battle=createBattle(content,previous.partyIds,previous.leaderId,'silent-cathedral',2,previous.seed,'ledger-test');
  battle.phase=outcome==='victory'?'reward':'failed';battle.nextPhase=battle.phase;
  if(outcome!=='victory')battle.failureKind=outcome;
  battle.goldEarned=17;previous.gold+=17;previous.battle=battle;
  battle.gemFinds=[{id:'secured-echo',defId:'echo-shard',variant:'pure',roll:{power:80,trait:'none',value:0}}];
  battle.tracking=createExpeditionTracking(1000);battle.tracking.elapsedMs=60_000;battle.tracking.review.potionsUsed=2;
  const next=structuredClone(previous);next.battle=null;
  return {previous,next,battle};
}
function record(runId:string,overrides:Partial<ExpeditionRecord>={}):ExpeditionRecord {
  return {runId,dungeonId:'silent-cathedral',appVersion:content.appVersion,contentVersion:content.contentVersion,rulesVersion:content.rulesVersion,
    outcome:'victory',durationMs:60_000,potionsUsed:1,earned:{gold:10,stones:0,gemCount:1,materials:{'pilgrim:common':2},dust:{sanctuary:1}},...overrides};
}

describe('expedition ledger commits',()=>{
  it('combines already committed kills/gems with only the final positive claim deltas',()=>{
    const{previous,next,battle}=finished();
    previous.materials={'pilgrim:common':8,'veil:rare':3};next.materials={'pilgrim:common':10,'veil:rare':1};
    next.gold+=20;next.stones+=3;next.memoryGems!.dust.sanctuary+=1;
    const before=structuredClone(previous),battleBefore=structuredClone(battle);
    finalizeExpedition(previous,next,battle,content);
    expect(next.expeditionHistory![0]).toMatchObject({runId:battle.id,outcome:'victory',durationMs:60_000,potionsUsed:2,
      earned:{gold:37,stones:3,gemCount:1,materials:{'pilgrim:common':2},dust:{sanctuary:1}}});
    expect(previous).toEqual(before);expect(battle).toEqual(battleBefore);
    next.expeditionHistory![0].review!.rounds=99;
    expect(battle.tracking!.review.rounds).toBe(0);
  });
  it.each(['defeat','timeout','retreat'] as const)('keeps secured loot on %s but never adds unclaimed materials',outcome=>{
    const{previous,next,battle}=finished(outcome);battle.pendingMaterials={'pilgrim:common':99};
    finalizeExpedition(previous,next,battle,content);
    expect(next.expeditionHistory![0]).toMatchObject({outcome,earned:{gold:17,stones:0,gemCount:1,materials:{},dust:{}}});
  });
  it('never retroactively records a run that started before tracking existed',()=>{
    const{previous,next,battle}=finished();delete battle.tracking;
    finalizeExpedition(previous,next,battle,content);
    expect(next.expeditionHistory).toBeUndefined();
  });
  it('keeps observed earnings and medicine even when the real clock is unknown',()=>{
    const{previous,next,battle}=finished();battle.tracking!.elapsedMs=null;
    finalizeExpedition(previous,next,battle,content);
    expect(next.expeditionHistory![0]).toMatchObject({durationMs:null,potionsUsed:2,earned:{gold:17,gemCount:1}});
  });
  it('keeps the first record for a run and bounds the newest-first history at thirty',()=>{
    const{previous,next,battle}=finished();
    next.expeditionHistory=Array.from({length:EXPEDITION_HISTORY_LIMIT},(_,i)=>record(`old-${i}`));
    finalizeExpedition(previous,next,battle,content);
    expect(next.expeditionHistory).toHaveLength(30);expect(next.expeditionHistory!.at(-1)!.runId).toBe('old-28');
    const once=structuredClone(next.expeditionHistory);battle.goldEarned=999;
    finalizeExpedition(previous,next,battle,content);expect(next.expeditionHistory).toEqual(once);
  });
  it('accepts no-loot trials but rejects fake trial earnings',()=>{
    const{previous,next,battle}=finished();
    const trial=content.dungeons.find(d=>d.kind==='trial')!;expect(trial).toBeDefined();
    battle.dungeonId=trial.id;battle.goldEarned=0;delete battle.gemFinds;
    finalizeExpedition(previous,next,battle,content);expect(next.expeditionHistory![0].earned.gold).toBe(0);
    delete next.expeditionHistory;battle.goldEarned=1;
    expect(()=>finalizeExpedition(previous,next,battle,content)).toThrow();expect(next.expeditionHistory).toBeUndefined();
  });
  it('rejects unfinished or still-active runs',()=>{
    const{previous,next,battle}=finished();next.battle=battle;
    expect(()=>finalizeExpedition(previous,next,battle,content)).toThrow();
    next.battle=null;battle.phase='ready';
    expect(()=>finalizeExpedition(previous,next,battle,content)).toThrow();
  });
});

describe('observed farm summaries',()=>{
  it('never mixes unmeasured rewards into the hourly numerator or drops failures from success rate',()=>{
    const records=[record('timed-win'),record('unknown-win',{durationMs:null,potionsUsed:null,earned:{gold:1000,stones:3,gemCount:8,materials:{},dust:{}}}),record('timed-loss',{outcome:'defeat',earned:{gold:0,stones:0,gemCount:0,materials:{},dust:{}}})];
    const before=structuredClone(records),summary=summarizeExpeditions(records);
    expect(summary.total).toBe(3);expect(summary.successRate).toBeCloseTo(2/3);expect(summary.outcomes.defeat).toBe(1);
    expect(summary.timedCount).toBe(2);expect(summary.timedDurationMs).toBe(120_000);
    expect(summary.earned.gold).toBe(1010);expect(summary.timedEarned.gold).toBe(10);expect(summary.perHour!.gold).toBe(300);
    expect(summary.perHour!.materials).toEqual({'pilgrim:common':60});expect(summary.unknownPotionCount).toBe(1);
    expect(records).toEqual(before);
  });
  it('filters dungeon and both versions before computing outcomes and rates',()=>{
    const records=[record('current'),record('old',{contentVersion:'old'}),record('other-rules',{rulesVersion:'old'}),record('other-route',{dungeonId:'another'})];
    expect(summarizeExpeditions(records,{dungeonId:'silent-cathedral',contentVersion:content.contentVersion,rulesVersion:content.rulesVersion}).total).toBe(1);
    expect(summarizeExpeditions(records,{contentVersion:content.contentVersion,rulesVersion:content.rulesVersion}).total).toBe(2);
  });
  it('counts a measured zero-duration run but never divides by zero',()=>{
    const summary=summarizeExpeditions([record('instant',{durationMs:0})]);
    expect(summary.timedCount).toBe(1);expect(summary.perHour).toBeNull();
    expect(summarizeExpeditions([])).toMatchObject({total:0,successRate:null,timedCount:0,perHour:null});
  });
  it('does not mix zero-duration rewards into the rate of positive-duration observations',()=>{
    const instant=record('instant-rich',{durationMs:0,potionsUsed:null,earned:{gold:100,stones:3,gemCount:9,materials:{'pilgrim:rare':100},dust:{sanctuary:99}}});
    const real=record('ten-seconds',{durationMs:10_000,potionsUsed:1,earned:{gold:1,stones:0,gemCount:0,materials:{'pilgrim:common':1},dust:{}}});
    const summary=summarizeExpeditions([instant,real]);
    expect(summary.timedCount).toBe(2);expect(summary.timedEarned.gold).toBe(101);
    expect(summary.rateEligibleCount).toBe(1);expect(summary.rateDurationMs).toBe(10_000);expect(summary.rateEarned.gold).toBe(1);
    expect(summary.perHour).toMatchObject({gold:360,stones:0,gemCount:0,potionsUsed:360,materials:{'pilgrim:common':360},dust:{}});
  });
  it('does not display unknown medicine consumption as zero per hour',()=>{
    const summary=summarizeExpeditions([record('unknown-medicine',{potionsUsed:null})]);
    expect(summary.unknownPotionCount).toBe(1);expect(summary.timedUnknownPotionCount).toBe(1);
    expect(summary.perHour!.potionsUsed).toBeNull();
  });
});
