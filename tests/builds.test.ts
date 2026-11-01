import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createInitialSave } from '../src/application/game';
import { BUILD_DEFINITIONS, findGemSources, gemMeetsBuildTarget, getBuildDefinition, getBuildPlan, isBuildStage, planBuildDefinition, targetNeedsNewTier, validBuildGoal, type BuildDefinition, type BuildStage } from '../src/domain/builds';
import { GEM_DEFINITIONS, dungeonGemFamily, dungeonGemLootProfile, emptyGemInventory, supportedGemTraits, validMemoryGem, type MemoryGem } from '../src/domain/memory-gems';
import { duplicateFamily, dungeonLock } from '../src/domain/events';

function fixture(buildId = 'echo-chain', stage: BuildStage = 'starter') {
  const build = getBuildDefinition(buildId)!;
  const save = createInitialSave(content);
  const recipe = build.stages[stage];
  save.ownedIds = [...new Set([...save.ownedIds,...recipe.slots.map(slot => slot.characterIds[0])])];
  save.memoryGems = emptyGemInventory();
  save.memoryGems.items = recipe.slots.map((slot,index) => ({id:`fixture:${index}`,defId:slot.gem.defId,variant:slot.gem.variant,
    roll:{power:slot.gem.power,trait:slot.gem.trait ?? 'none',value:slot.gem.value ?? 0}}));
  return { build,save };
}

function withCustomSlots(change: (build: BuildDefinition) => void) {
  const {build,save} = fixture();
  const custom = structuredClone(build);
  change(custom);
  return {build:custom,save};
}

describe('build recipes and read-only planning', () => {
  it('only authors legal currently obtainable characters, compatible traits and a real core at every stage', () => {
    expect(BUILD_DEFINITIONS).toHaveLength(6);
    for (const build of BUILD_DEFINITIONS) for (const stage of ['starter','complete','perfect'] as const) {
      const recipe = build.stages[stage];
      expect(recipe.slots).toHaveLength(4);
      expect(recipe.leaderSlot).toBeGreaterThanOrEqual(0); expect(recipe.leaderSlot).toBeLessThan(4);
      const preferred = recipe.slots.map(slot => slot.characterIds[0]);
      expect(duplicateFamily(preferred,content)).toBe(false);
      for (const slot of recipe.slots) {
        for (const id of slot.characterIds) {
          const char = content.characters.find(char => char.id === id)!;
          expect(char?.published,id).toBe(true); expect(char.origin.includes('xr_gacha')).toBe(false);
        }
        const def = GEM_DEFINITIONS.find(def => def.id === slot.gem.defId)!;
        expect(def.variants).toContain(slot.gem.variant);
        if (slot.gem.trait) expect(supportedGemTraits(def)).toContain(slot.gem.trait);
      }
      const {save} = fixture(build.id,stage);
      expect(save.memoryGems!.items.every(validMemoryGem)).toBe(true);
      const plan = getBuildPlan(content,save,build.id,stage);
      expect(plan.complete).toBe(true); expect(plan.canApply).toBe(true);
    }
    expect(BUILD_DEFINITIONS[0].stages.starter.slots[0].gem.coreTrait).toBe('chain');
    for (const stage of ['starter','complete','perfect'] as const) expect(getBuildDefinition('rabbit-battery')!.stages[stage].slots.some(slot => slot.gem.defId === 'star-furnace')).toBe(true);
  });

  it('does not turn a base stone without the core chain trait into a functioning chain build', () => {
    const {save} = fixture();
    save.memoryGems!.items[0].roll = {power:100,trait:'none',value:0};
    let plan = getBuildPlan(content,save,'echo-chain','starter');
    expect(plan.slots[0].gemStatus).toBe('upgrade');
    expect(plan.functional).toBe(false); expect(plan.canApply).toBe(false); expect(plan.complete).toBe(false);
    save.memoryGems!.items[0].roll = {power:0,trait:'chain',value:0};
    plan = getBuildPlan(content,save,'echo-chain','starter');
    expect(plan.functional).toBe(true); expect(plan.canApply).toBe(true);
  });

  it('allows a functional lower-quality build while tracking precise power, trait and value upgrades', () => {
    const {save} = fixture('echo-chain','complete');
    save.memoryGems!.items[0].roll = {power:20,trait:'chain',value:2};
    const plan = getBuildPlan(content,save,'echo-chain','complete');
    expect(plan.canApply).toBe(true); expect(plan.complete).toBe(false); expect(plan.upgradeGems).toBe(1);
    expect(plan.slots[0].gemStatus).toBe('upgrade');
    expect(gemMeetsBuildTarget({...save.memoryGems!.items[0],roll:{power:50,trait:'chain',value:39}},plan.slots[0].slot.gem)).toBe(false);
    expect(gemMeetsBuildTarget({...save.memoryGems!.items[0],roll:{power:50,trait:'chain',value:40}},plan.slots[0].slot.gem)).toBe(true);
  });

  it('retains legitimate old stones, protection and existing owners, and reports transfers without mutating the save', () => {
    const {save} = fixture('shield-cannon');
    delete save.memoryGems!.items[0].roll;
    save.memoryGems!.items[0].locked = true;
    save.memoryGems!.equipped.elaine = 'fixture:0';
    const before = structuredClone(save);
    const plan = getBuildPlan(content,save,'shield-cannon','starter');
    expect(plan.canApply).toBe(true); expect(plan.slots[0].gemStatus).toBe('ready');
    expect(plan.slots[0].ownerId).toBe('elaine'); expect(plan.slots[0].needsTransfer).toBe(true);
    expect(plan.transferGemIds).toEqual(['fixture:0']);
    expect(save).toEqual(before);
  });

  it('matches shared character candidates globally and never counts two forms of one character as two members', () => {
    const {build,save} = withCustomSlots(build => {
      build.stages.starter.slots[0].characterIds = ['seris','noelle'];
      build.stages.starter.slots[1].characterIds = ['seris'];
    });
    const plan = planBuildDefinition(content,save,build,'starter');
    expect(plan.partyIds).toEqual(['noelle','seris','liora','elaine']); expect(plan.canApply).toBe(true);
    build.stages.starter.slots[0].characterIds = ['seris-awakened'];
    build.stages.starter.slots[1].characterIds = ['seris'];
    save.ownedIds.push('seris-awakened');
    const conflicting = planBuildDefinition(content,save,build,'starter');
    expect(conflicting.missingCharacters).toBe(1); expect(conflicting.canApply).toBe(false);
  });

  it('does not count one physical gem twice and reserves a rare exact trait for its constrained slot', () => {
    const {build,save} = withCustomSlots(build => {
      build.stages.starter.slots[1].gem = {defId:'echo-shard',variant:'pure',power:0};
    });
    save.memoryGems!.items = save.memoryGems!.items.filter(item => item.defId !== 'clear-tear');
    let plan = planBuildDefinition(content,save,build,'starter');
    expect(plan.missingGems).toBe(1); expect(plan.canApply).toBe(false);
    expect(new Set(plan.slots.flatMap(slot => slot.gem ? [slot.gem.id] : [])).size).toBe(3);
    const plain:MemoryGem = {id:'plain',defId:'echo-shard',variant:'pure'};
    save.memoryGems!.items.push(plain);
    // The flexible slot is visited first to exercise global matching, not incidental slot order.
    [build.stages.starter.slots[0],build.stages.starter.slots[1]] = [build.stages.starter.slots[1],build.stages.starter.slots[0]];
    plan = planBuildDefinition(content,save,build,'starter');
    expect(plan.canApply).toBe(true);
    expect(plan.slots[0].gem!.id).toBe('plain'); expect(plan.slots[1].gem!.id).toBe('fixture:0');
  });

  it('preserves a functional core before maximizing a flexible slot quality when both slots want T6 power', () => {
    const {build,save} = withCustomSlots(build => {
      build.stages.starter.slots[0].gem = {defId:'echo-shard',variant:'pure',power:220};
      build.stages.starter.slots[1].gem = {defId:'echo-shard',variant:'pure',power:220,trait:'chain',value:220,coreTrait:'chain'};
    });
    save.memoryGems!.items = save.memoryGems!.items.filter(item => item.defId !== 'clear-tear');
    save.memoryGems!.items[0].roll = {power:220,trait:'chain',value:0};
    save.memoryGems!.items.push({id:'low-flexible',defId:'echo-shard',variant:'pure'});
    const plan = planBuildDefinition(content,save,build,'starter');
    expect(plan.functional).toBe(true); expect(plan.canApply).toBe(true); expect(plan.complete).toBe(false);
    expect(plan.slots[0].gem!.id).toBe('low-flexible'); expect(plan.slots[1].gem!.id).toBe('fixture:0');
  });

  it('never substitutes an unrelated heroine for a missing Lunette and blocks applying during expeditions or refinement', () => {
    const {save} = fixture('rabbit-battery');
    save.ownedIds = save.ownedIds.filter(id => !id.startsWith('lunette'));
    const plan = getBuildPlan(content,save,'rabbit-battery','starter');
    expect(plan.slots[0].characterId).toBeNull(); expect(plan.missingCharacters).toBe(1); expect(plan.canApply).toBe(false);
    const other = fixture('shield-cannon').save;
    other.memoryGems!.pending = {gemId:'fixture:0',candidate:structuredClone(other.memoryGems!.items[0])};
    expect(getBuildPlan(content,other,'shield-cannon','starter').canApply).toBe(false);
  });

  it('rejects unknown persisted goals and unsupported stage strings', () => {
    expect(validBuildGoal({buildId:'echo-chain',stage:'starter'})).toBe(true);
    for (const value of [null,[],{buildId:'free-loot',stage:'starter'},{buildId:'echo-chain',stage:'godlike'}]) expect(validBuildGoal(value)).toBe(false);
    expect(isBuildStage('perfect')).toBe(true); expect(isBuildStage('godlike')).toBe(false);
  });

  it('keeps T6 efficacy as an optional long-term chase without requiring dual T6 affixes', () => {
    for (const build of BUILD_DEFINITIONS) for (const slot of build.stages.perfect.slots) {
      expect(slot.gem.power).toBe(220);
      if (slot.gem.trait) expect(slot.gem.value).toBe(80);
    }
  });

  it('checks acquired power and trait tiers independently before recommending refinement', () => {
    const target = {defId:'shield-break',variant:'pure' as const,power:220,trait:'execution' as const,value:220};
    const gem:MemoryGem = {id:'mixed',defId:'shield-break',variant:'pure',roll:{power:100,trait:'execution',value:220}};
    expect(targetNeedsNewTier(gem,target)).toBe(true);
    expect(targetNeedsNewTier({...gem,roll:{power:220,trait:'execution',value:100}},target)).toBe(true);
    expect(targetNeedsNewTier({...gem,roll:{power:220,trait:'chain',value:220}},target)).toBe(false);
    // A T6 power stone can still refine an ordinary trait up to the catalog's T3 value goal.
    expect(targetNeedsNewTier({...gem,roll:{power:220,trait:'none',value:0}},{...target,value:80})).toBe(false);
    expect(targetNeedsNewTier({...gem,roll:{power:100,trait:'execution',value:220}},{...target,value:80})).toBe(true);
    expect(targetNeedsNewTier({...gem,roll:{power:120,trait:'execution',value:120}},{...target,power:139,value:139})).toBe(false);
    expect(targetNeedsNewTier({...gem,roll:{power:120,trait:'execution',value:120}},{...target,power:160,value:139})).toBe(true);
  });
});

describe('honest build farming destinations', () => {
  it('lists only real matching family pools and preserves exact live lock reasons, including the tower', () => {
    const save = createInitialSave(content);
    for (const def of GEM_DEFINITIONS) for (const source of findGemSources(content,save,def.id).filter(source => source.kind === 'dungeon')) {
      const dungeon = content.dungeons.find(dungeon => dungeon.id === source.dungeonId)!;
      expect(dungeon.published).toBe(true); expect(dungeon.kind).not.toBe('trial');
      expect(dungeonGemFamily(dungeon)).toBe(def.family);
      expect(source.lockReason).toBe(dungeonLock(dungeon,save,content));
      expect(source.locked).toBe(Boolean(source.lockReason));
    }
    const tower = findGemSources(content,save,'pale-ward').find(source => source.towerFloor === 1)!;
    expect(tower.locked).toBe(true);
    expect(findGemSources(content,save,'unknown')).toEqual([]);
  });

  it('never offers boss-only stones as craftable or pretends crafting supplies a trait', () => {
    const save = createInitialSave(content);
    save.memoryGems!.dust.clock = 99;
    expect(findGemSources(content,save,'star-furnace').some(source => source.kind === 'craft')).toBe(false);
    const craft = findGemSources(content,save,'echo-shard').find(source => source.kind === 'craft')!;
    expect(craft.locked).toBe(false); expect(craft.craftCost).toBe(6);
    expect(craft.description).toContain('追加特性は付かない');
  });

  it('orders unlocked ordinary sources by actual displayed difficulty instead of assuming fewer waves are easier', () => {
    const save = createInitialSave(content);
    save.ownedIds = content.characters.filter(character => character.published).map(character => character.id);
    save.completedDungeonIds = content.dungeons.map(dungeon => dungeon.id);
    const sources = findGemSources(content,save,'echo-shard').filter(source => source.kind === 'dungeon' && !source.locked && !source.towerFloor);
    expect(sources.length).toBeGreaterThan(2);
    for (let index = 1; index < sources.length; index++) expect(sources[index].difficulty!).toBeGreaterThanOrEqual(sources[index-1].difficulty!);
  });

  it('guides a new player toward a real unlocked prerequisite without pretending it drops the locked clock gem', () => {
    const save = createInitialSave(content);
    const sources = findGemSources(content,save,'echo-shard').filter(source => source.kind === 'dungeon' && !source.towerFloor);
    expect(sources.every(source => source.locked)).toBe(true);
    const reachable = sources.filter(source => source.unlockDungeonId);
    expect(reachable.length).toBeGreaterThan(0);
    for (const source of reachable) {
      const prerequisite = content.dungeons.find(dungeon => dungeon.id === source.unlockDungeonId)!;
      expect(prerequisite.published).toBe(true); expect(prerequisite.kind).not.toBe('trial');
      expect(prerequisite.towerFloor).toBeUndefined(); expect(dungeonLock(prerequisite,save,content)).toBeNull();
      expect(source.dungeonId).not.toBe(prerequisite.id); expect(source.family).toBe('clock');
    }
    expect(reachable[0].unlockDungeonId).toBe('silent-cathedral');
    expect(dungeonGemFamily(content.dungeons.find(dungeon => dungeon.id === 'silent-cathedral')!)).toBe('sanctuary');
  });

  it('does not loop through cyclic prerequisites or suggest replaying a claimed route to fix an ownership gate', () => {
    const save = createInitialSave(content);
    const template = content.dungeons.find(dungeon => dungeon.id === 'silent-cathedral')!;
    const custom = { ...content,dungeons:[
      { ...template,id:'clock-cycle-a',chapterId:undefined,previousDungeonId:'clock-cycle-b' },
      { ...template,id:'clock-cycle-b',chapterId:undefined,previousDungeonId:'clock-cycle-a' },
      { ...template,id:'clock-owned',chapterId:undefined,previousDungeonId:'silent-cathedral',requiresOwnedIds:['lunette'] },
      template,
    ] };
    for (const source of findGemSources(custom,save,'echo-shard').filter(source => source.dungeonId?.startsWith('clock-cycle'))) expect(source.unlockDungeonId).toBeUndefined();
    save.completedDungeonIds.push('silent-cathedral');
    const owned = findGemSources(custom,save,'echo-shard').find(source => source.dungeonId === 'clock-owned')!;
    expect(owned.locked).toBe(true); expect(owned.unlockDungeonId).toBeUndefined();
  });

  it('only recommends real T6 drop pools for a T6 target, keeping non-featured same-family stones eligible', () => {
    const save = createInitialSave(content);
    const target = getBuildDefinition('echo-chain')!.stages.perfect.slots[0].gem;
    const sources = findGemSources(content,save,'echo-shard',target);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every(source => source.kind === 'dungeon')).toBe(true);
    expect(sources.some(source => !source.featured)).toBe(true);
    expect(sources.some(source => source.locked && source.unlockDungeonId)).toBe(true);
    for (const source of sources) {
      const dungeon = content.dungeons.find(dungeon => dungeon.id === source.dungeonId)!;
      expect(dungeonGemFamily(dungeon)).toBe('clock');
      expect(dungeonGemLootProfile(dungeon).tier6Chance!).toBeGreaterThan(0);
      expect(source.maxTier).toBe(6); expect(source.targetTier).toBe(6);
      expect(source.targetPowerTier).toBe(6); expect(source.targetTraitTier).toBe(3);
      expect(source.featured).toBe(dungeonGemLootProfile(dungeon).featuredDefId === 'echo-shard');
    }
    // The backwards-compatible guide still offers basic crafting and ordinary routes.
    expect(findGemSources(content,save,'echo-shard').some(source => source.kind === 'craft')).toBe(true);
  });

  it('filters impossible trait-tier targets and gives variant-aware basic crafting costs', () => {
    const save = createInitialSave(content);
    const target = {defId:'echo-shard',variant:'pure' as const,power:0,trait:'chain' as const,value:220};
    const sources = findGemSources(content,save,'echo-shard',target);
    expect(sources.length).toBeGreaterThan(0); expect(sources.every(source => source.maxTier === 6)).toBe(true);
    expect(findGemSources(content,save,'echo-shard',{...target,power:240})).toEqual([]);
    expect(findGemSources(content,save,'echo-shard',{...target,trait:'none'})).toEqual([]);
    expect(findGemSources(content,save,'pale-ward',{...target,defId:'pale-ward'})).toEqual([]);
    const swift = findGemSources(content,save,'echo-shard',{...target,variant:'swift',value:0}).find(source => source.kind === 'craft')!;
    expect(swift.craftCost).toBe(9); expect(swift.name).toContain('速唱');
  });
});
