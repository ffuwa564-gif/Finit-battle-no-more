import { describe, expect, it } from 'vitest';
import { craftGem, emptyGemInventory, gemFromSkill, gemPowerMultiplier, gemRoll, gemRollForSkill, gemRollKey, gemSkill, lockGem, refinementCost, resolveGemRefinement, rollGemCandidate, salvageGem, startGemRefinement, validGemInventory, validMemoryGem } from '../src/domain/memory-gems';
import type { MemoryGem } from '../src/domain/memory-gems';

const stone = (id = 'chest:wave:0'): MemoryGem => ({ id, defId:'night-dew', variant:'pure' });
function inventory(gem = stone()) {
  const result = emptyGemInventory();
  result.items.push(gem); result.seen.push(gem.defId); result.dust.grave = 100;
  return result;
}

describe('individual gem rolls and durable refinement offers', () => {
  it('preserves old gem effect and all colon-delimited IDs while encoding every new functional roll', () => {
    for (const id of ['chest:wave:0','r42:starts-with-r','crafted-17']) {
      const legacy = stone(id);
      expect(gemFromSkill(gemSkill(legacy).id)).toEqual(legacy);
      expect(gemPowerMultiplier(legacy)).toBe(1);
      expect(gemRollKey(legacy)).toBe('night-dew:pure');
      const rolled: MemoryGem = { ...legacy, roll:{ power:80,trait:'chain',value:61 } };
      expect(gemFromSkill(gemSkill(rolled).id)).toEqual(rolled);
      expect(gemRollForSkill(gemSkill(rolled).id)).toEqual(rolled.roll);
      expect(gemSkill(rolled).strength).toBe(gemSkill(legacy).strength);
      expect(gemPowerMultiplier(rolled)).toBeCloseTo(2.2);
      expect(gemRollKey(rolled)).not.toBe(gemRollKey(legacy));
    }
    expect(gemRollKey({ ...stone(), roll:{power:0,trait:'none',value:0} })).toBe(gemRollKey(stone()));
    expect(gemPowerMultiplier({ ...stone(), roll:{power:100,trait:'execution',value:100} })).toBe(2.5);
  });

  it('rolls reproducible individual items and makes deeper floors better without hard-locking perfect power', () => {
    let normal = 0, deep = 0, ordinaryBest = 0;
    const outcomes = new Set<string>();
    for (let index = 0; index < 2000; index++) {
      const seed = Math.imul(index, 98765431) >>> 0;
      const early = rollGemCandidate(stone(), seed);
      expect(rollGemCandidate(stone(), seed)).toEqual(early);
      const late = rollGemCandidate(stone(), seed, 100);
      normal += gemRoll(early.gem).power; deep += gemRoll(late.gem).power;
      ordinaryBest = Math.max(ordinaryBest, gemRoll(early.gem).power);
      outcomes.add(gemRollKey(early.gem));
      expect(validMemoryGem(early.gem)).toBe(true);
      expect(validMemoryGem(late.gem)).toBe(true);
    }
    expect(deep / 2000 - normal / 2000).toBeGreaterThan(30);
    expect(ordinaryBest).toBe(100);
    expect(outcomes.size).toBeGreaterThan(500);
  });

  it('rejects out-of-range rolls, unsupported traits, and malformed rolled skill identifiers', () => {
    for (const roll of [{power:101,trait:'none',value:0},{power:-1,trait:'none',value:0},{power:50,trait:'none',value:1},{power:50,trait:'chain',value:101},{power:50.5,trait:'chain',value:1}]) expect(validMemoryGem({ ...stone(), roll })).toBe(false);
    expect(validMemoryGem({ ...stone(), defId:'pale-ward', roll:{power:50,trait:'execution',value:50} })).toBe(false);
    expect(gemFromSkill('memory:night-dew:pure:@roll=101~chain~20:chest:1')).toBeUndefined();
    expect(gemFromSkill('memory:night-dew:pure:@roll=50~unknown~20:chest:1')).toBeUndefined();
    expect(gemFromSkill('memory:night-dew:pure:@roll=50~chain~20:')).toBeUndefined();
  });

  it('fixes the unselected affix, pays once, and keeps one durable offer through serialization', () => {
    const initial = inventory({ ...stone(), roll:{power:45,trait:'chain',value:70} });
    initial.equipped.liora = initial.items[0].id;
    const second = structuredClone(initial);
    const cost = refinementCost(initial.items[0], 'power');
    const next = startGemRefinement(initial, initial.items[0].id, 'power', 42);
    expect(startGemRefinement(second, second.items[0].id, 'power', 42)).toEqual(next);
    expect(initial).toEqual(second);
    expect(initial.pending!.candidate.roll).toMatchObject({ trait:'chain',value:70 });
    expect(initial.items[0].roll!.power).toBe(45);
    expect(initial.dust.grave).toBe(100 - cost);
    expect(validGemInventory(JSON.parse(JSON.stringify(initial)))).toBe(true);
    const before = structuredClone(initial);
    expect(() => startGemRefinement(initial, initial.items[0].id, 'trait', next.seed)).toThrow();
    expect(() => salvageGem(initial, initial.items[0].id)).toThrow();
    expect(initial).toEqual(before);
  });

  it('can keep the old stone without refunding consumed dust or accept while preserving identity and current lock', () => {
    const initial = inventory({ ...stone(), roll:{power:65,trait:'chain',value:40} });
    const old = structuredClone(initial.items[0]);
    startGemRefinement(initial, old.id, 'trait', 123);
    expect(initial.pending!.candidate.roll!.power).toBe(65);
    const spent = initial.dust.grave;
    const accepted = JSON.parse(JSON.stringify(initial));
    resolveGemRefinement(initial, false);
    expect(initial.items[0]).toEqual(old);
    expect(initial.dust.grave).toBe(spent);
    expect(initial.pending).toBeUndefined();
    const candidate = structuredClone(accepted.pending!.candidate);
    lockGem(accepted, old.id);
    resolveGemRefinement(accepted, true);
    expect(accepted.items[0]).toEqual({ ...candidate, locked:true });
    expect(accepted.dust.grave).toBe(spent);
    expect(validGemInventory(accepted)).toBe(true);
    expect(() => resolveGemRefinement(accepted, true)).toThrow();
  });

  it('rejects forged offers, never consumes insufficient dust, and crafts a practical starter roll', () => {
    const initial = inventory(); initial.dust.grave = 0;
    const before = structuredClone(initial);
    expect(() => startGemRefinement(initial, initial.items[0].id, 'power', 42)).toThrow();
    expect(initial).toEqual(before);
    const bad = inventory();
    bad.pending = { gemId:bad.items[0].id, candidate:{ ...bad.items[0], id:'different', roll:{power:100,trait:'chain',value:100} } };
    expect(validGemInventory(bad)).toBe(false);
    bad.pending.candidate = { ...bad.items[0], defId:'dawn-crown', roll:{power:100,trait:'chain',value:100} };
    expect(validGemInventory(bad)).toBe(false);
    const crafted = inventory();
    expect(gemRoll(craftGem(crafted,'night-dew'))).toEqual({power:20,trait:'none',value:0});
  });
});
