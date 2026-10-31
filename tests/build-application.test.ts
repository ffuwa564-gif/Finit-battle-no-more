import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { BUILD_DEFINITIONS, getBuildPlan } from '../src/domain/builds';
import { emptyGemInventory } from '../src/domain/memory-gems';
import type { GameCommand, GameSave } from '../src/domain/types';
import { assertSaveCompatibility } from '../src/platform/save';
import { decodeBackup, encodeBackup } from '../src/platform/save-backup';

const act = (save: GameSave, command: GameCommand) => applyCommand(save, command, content);
function cannonFixture() {
  const save = createInitialSave(content, 42);
  const recipe = BUILD_DEFINITIONS.find(build => build.id === 'shield-cannon')!.stages.perfect;
  save.ownedIds = [...new Set([...save.ownedIds, 'nox', ...recipe.slots.map(slot => slot.characterIds[0])])];
  save.memoryGems = emptyGemInventory();
  save.memoryGems.dust = {sanctuary:20,clock:20,grave:20};
  save.memoryGems.items = recipe.slots.map((slot,index) => ({ id:`build-item-${index}`,defId:slot.gem.defId,variant:slot.gem.variant,roll:{power:0,trait:'none',value:0},...(index === 0 ? {locked:true} : {}) }));
  save.memoryGems.seen = [...new Set(recipe.slots.map(slot => slot.gem.defId))];
  save.memoryGems.equipped.nox = 'build-item-0';
  return save;
}

describe('persistent build goals and atomic owned-equipment setup', () => {
  it('tracks a valid stage through backup/reload and clears without creating gear, spending or consuming RNG', () => {
    const original = createInitialSave(content, 72);
    const tracked = act(original, {type:'trackBuild',buildId:'echo-chain',stage:'complete'});
    expect(original.buildGoal).toBeUndefined();
    expect(tracked.buildGoal).toEqual({buildId:'echo-chain',stage:'complete'});
    expect(tracked.memoryGems).toEqual(original.memoryGems);
    expect(tracked.seed).toBe(original.seed);
    const restored = decodeBackup(encodeBackup(tracked, content), content).save;
    expect(restored.buildGoal).toEqual(tracked.buildGoal);
    expect(act(restored, {type:'trackBuild',buildId:null}).buildGoal).toBeUndefined();
    assertSaveCompatibility(original, content);
  });

  it('rejects fabricated goals in both commands and imported saves', () => {
    const save = createInitialSave(content);
    expect(() => act(save, {type:'trackBuild',buildId:'not-a-build'})).toThrow();
    expect(() => act(save, {type:'trackBuild',buildId:'echo-chain',stage:'other'} as unknown as GameCommand)).toThrow();
    const bad = {...save,buildGoal:{buildId:'echo-chain',stage:'other'}};
    expect(() => assertSaveCompatibility(bad as GameSave,content)).toThrow();
  });

  it('applies the confirmed owned lower-quality recipe atomically and preserves protected stones, inventory and currencies', () => {
    const original = cannonFixture();
    const before = structuredClone(original);
    const plan = getBuildPlan(content,original,'shield-cannon','perfect');
    expect(plan.canApply).toBe(true);
    expect(plan.complete).toBe(false);
    expect(plan.transferGemIds).toContain('build-item-0');
    const result = act(original,{type:'applyBuild',buildId:'shield-cannon',stage:'perfect'});
    expect(original).toEqual(before);
    expect(result.partyIds).toEqual(plan.partyIds);
    expect(result.leaderId).toBe(plan.leaderId);
    for (const slot of plan.slots) expect(result.memoryGems!.equipped[slot.characterId!]).toBe(slot.gem!.id);
    expect(result.memoryGems!.equipped.nox).toBeUndefined();
    expect(result.memoryGems!.items).toEqual(before.memoryGems!.items);
    expect(result.memoryGems!.items[0].locked).toBe(true);
    for (const key of ['seed','gold','stones','potions','materials'] as const) expect(result[key]).toEqual(before[key]);
    expect(result.buildGoal).toBeUndefined();
    assertSaveCompatibility(result,content);
  });

  it('rechecks current inventory instead of granting a missing stone or partially changing the party', () => {
    const save = cannonFixture();
    expect(getBuildPlan(content,save,'shield-cannon','perfect').canApply).toBe(true);
    save.memoryGems!.items.pop();
    const before = structuredClone(save);
    expect(() => act(save,{type:'applyBuild',buildId:'shield-cannon',stage:'perfect'})).toThrow();
    expect(save).toEqual(before);
  });

  it('refuses a chain build without its core trait, and refuses setup during battle or pending refinement', () => {
    const save = cannonFixture();
    const recipe = BUILD_DEFINITIONS.find(build => build.id === 'echo-chain')!.stages.starter;
    save.memoryGems!.items = recipe.slots.map((slot,index) => ({id:`core-${index}`,defId:slot.gem.defId,variant:slot.gem.variant}));
    save.memoryGems!.equipped = {};
    expect(() => act(save,{type:'applyBuild',buildId:'echo-chain',stage:'starter'})).toThrow();
    const pending = act(cannonFixture(),{type:'startGemRefinement',gemId:'build-item-0',mode:'power'});
    expect(pending).toBeDefined();
    expect(() => act(pending,{type:'applyBuild',buildId:'shield-cannon',stage:'perfect'})).toThrow();
    const exploring = act(cannonFixture(),{type:'depart',dungeonId:'silent-cathedral',potions:0});
    expect(() => act(exploring,{type:'applyBuild',buildId:'shield-cannon',stage:'perfect'})).toThrow();
  });
});
