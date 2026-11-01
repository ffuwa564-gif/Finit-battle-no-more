import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createInitialSave } from '../src/application/game';
import { craftGem, dungeonGemFamily, emptyGemInventory } from '../src/domain/memory-gems';
import { expeditionExperiments, preparationPlan } from '../src/domain/preparation';
import { createBattle } from '../src/domain/engine';
import { createExpeditionTracking } from '../src/domain/expedition-review';
import { dungeonLock } from '../src/domain/events';

describe('preparation steps use real inventory and accessible routes', () => {
  it('offers the first sanctuary route without granting loot or changing the save', () => {
    const save = createInitialSave(content), before = structuredClone(save);
    const plan = preparationPlan(content, save, 'white-flower-seed');
    expect(plan.step).toBe('farm'); expect(plan.remaining).toBe(6);
    expect(plan.farm?.id).toBe('silent-cathedral');
    expect(dungeonGemFamily(plan.farm!)).toBe('sanctuary');
    expect(dungeonLock(plan.farm!, save, content)).toBeFalsy();
    expect(save).toEqual(before);
  });
  it('switches from dust to crafting, ownership to equipment, and party equipment to trial', () => {
    const save = createInitialSave(content); save.memoryGems = emptyGemInventory();
    save.memoryGems.dust.sanctuary = 6;
    expect(preparationPlan(content, save, 'white-flower-seed').step).toBe('craft');
    const gem = craftGem(save.memoryGems, 'white-flower-seed');
    expect(preparationPlan(content, save, 'white-flower-seed').step).toBe('equip');
    save.memoryGems.equipped[save.partyIds[0]!] = gem.id;
    const plan = preparationPlan(content, save, 'white-flower-seed');
    expect(plan.step).toBe('try'); expect(plan.equippedPartyCount).toBe(1);
    expect(plan.remaining).toBe(6); // Ownership takes precedence over making another.
  });
  it('does not treat a reserve companion’s stone as equipped by the active party', () => {
    const save = createInitialSave(content); save.memoryGems = emptyGemInventory();
    save.memoryGems.items = [{ id:'reserve-stone',defId:'wick-stone',variant:'pure' }];
    save.memoryGems.equipped.selene = 'reserve-stone';
    const plan = preparationPlan(content, save, 'wick-stone');
    expect(plan.step).toBe('equip'); expect(plan.equippedPartyCount).toBe(0);
    expect(plan.owned?.id).toBe('reserve-stone');
  });
  it('falls back to campaign progression when a family route is not open', () => {
    const save = createInitialSave(content);
    const plan = preparationPlan(content, save, 'wick-stone');
    if (!plan.farm) expect(plan.unlockRoute?.id).toBe('silent-cathedral');
    if (plan.farm) expect(dungeonLock(plan.farm, save, content)).toBeFalsy();
    delete save.memoryGems;
    expect(preparationPlan(content, save, 'white-flower-seed').equippedPartyCount).toBe(0);
  });
});

describe('result experiments remain grounded in observations', () => {
  function battle() {
    const save = createInitialSave(content);
    const b = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 2, 7, 'test');
    b.tracking = createExpeditionTracking(); b.phase = 'failed'; b.failureKind = 'defeat';
    return b;
  }
  it('only mentions unused carried potions when some were actually carried', () => {
    const b = battle(), before = structuredClone(b);
    expect(expeditionExperiments(b).join(' ')).toContain('回復薬');
    expect(b).toEqual(before);
    b.potionsRemaining = 0;
    expect(expeditionExperiments(b).join(' ')).not.toContain('回復薬');
    b.potionsRemaining = 1; b.tracking!.review.potionsUsed = 1;
    expect(expeditionExperiments(b).join(' ')).not.toContain('回復薬');
  });
  it('prioritizes actual timeout and lost actions; old records get no invented observations', () => {
    const b = battle(); b.failureKind = 'timeout'; b.tracking!.review.actionsLost = 2;
    expect(expeditionExperiments(b)[0]).toContain('期限');
    expect(expeditionExperiments(b).join(' ')).toContain('行動不能');
    delete b.tracking;
    expect(expeditionExperiments(b)).toEqual(['敵の編成を確認し、石と倒す順を一つずつ試しましょう。']);
  });
});
