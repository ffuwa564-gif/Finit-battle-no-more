import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { craftGem, dungeonGemLootProfile, emptyGemInventory, gemFromSkill, gemPowerMultiplier, gemPowerRefinementIsFixed, gemPowerTier, gemRollKey, gemSkill, gemTier, gemTraitTier, resolveGemRefinement, rollGemDrop, startGemRefinement, validGemInventory, validMemoryGem, type MemoryGem } from '../src/domain/memory-gems';
import type { DungeonDef } from '../src/domain/types';

const item = (power: number, value = 0): MemoryGem => ({ id:'tier:owned:stone', defId:'night-dew', variant:'pure', roll:{ power, trait:value ? 'mercy' : 'none', value } });
const stage = (): DungeonDef => ({ ...structuredClone(content.dungeons.find(dungeon => dungeon.id === 'silent-cathedral')!), gemLoot:{tier4Chance:0,tier5Chance:0} });
const seed = (index: number) => Math.imul(index + 1, 0x9e3779b1) >>> 0;

describe('memory gem quality tiers', () => {
  it('identifies upper support tiers with no meaningful within-tier power reroll', () => {
    for (const defId of ['rewind-thread', 'star-furnace', 'dream-lace']) {
      for (const power of [120,139,160,179]) expect(gemPowerRefinementIsFixed({...item(power),defId})).toBe(true);
      expect(gemPowerRefinementIsFixed({...item(20),defId})).toBe(false);
    }
    expect(gemPowerRefinementIsFixed(item(160))).toBe(false);
  });

  it('keeps legacy strength and derives separate quality grades without a second source of truth', () => {
    for (const [raw, tier] of [[0,1],[33,1],[34,2],[66,2],[67,3],[87,3],[100,3],[120,4],[139,4],[160,5],[179,5]] as const) {
      const stone = item(raw, raw);
      expect(gemPowerTier(stone)).toBe(tier);
      expect(gemTraitTier(stone)).toBe(raw ? tier : 0);
      expect(gemTier(stone)).toBe(tier);
      expect(validMemoryGem(stone)).toBe(true);
      expect(gemFromSkill(gemSkill(stone).id)).toEqual(stone);
    }
    const mixed = item(87, 170);
    expect(gemPowerTier(mixed)).toBe(3);
    expect(gemTraitTier(mixed)).toBe(5);
    expect(gemTier(mixed)).toBe(5);
    expect(gemPowerMultiplier(item(87))).toBeCloseTo(2.305);
    expect(gemPowerMultiplier(item(100))).toBe(2.5);
    expect(gemPowerMultiplier({ id:'legacy:chest',defId:'night-dew',variant:'pure' })).toBe(1);
    expect(gemRollKey(item(120))).not.toBe(gemRollKey(item(100)));
    expect(gemRollKey(item(120))).not.toBe(gemRollKey(item(160)));
  });

  it('rejects gap values, overflows, nonintegral stats and impossible trait grades', () => {
    for (const raw of [-1, 100.5, 101, 119, 140, 159, 180, NaN, Infinity]) {
      expect(validMemoryGem(item(raw)), `power ${raw}`).toBe(false);
      expect(validMemoryGem(item(100, raw)), `trait ${raw}`).toBe(false);
      if (Number.isFinite(raw) && Number.isInteger(raw) && raw >= 0) expect(gemFromSkill(`memory:night-dew:pure:@roll=${raw}~none~0:chest:1`)).toBeUndefined();
    }
    expect(validMemoryGem({ ...item(120), roll:{power:120,trait:'none',value:120} })).toBe(false);
    expect(validMemoryGem({ ...item(120,160),defId:'pale-ward' })).toBe(false);
  });

  it('allows ordinary crafting and tuning to make practical items but cannot manufacture a drop-only tier', () => {
    const inventory = emptyGemInventory();
    inventory.dust.grave = 100000;
    const crafted = craftGem(inventory, 'night-dew', 'swift');
    for (let index = 0; index < 128; index++) {
      startGemRefinement(inventory, crafted.id, index % 2 ? 'power' : 'trait', seed(index));
      const candidate = inventory.pending!.candidate;
      expect(candidate.roll!.power).toBeLessThanOrEqual(100);
      expect(candidate.roll!.value).toBeLessThanOrEqual(100);
      expect(gemTier(candidate)).toBeLessThanOrEqual(3);
      resolveGemRefinement(inventory, true);
    }
  });

  it('finishes an exalted item within each acquired tier while keeping the other rolled stat exactly', () => {
    for (const [power, value, powerRange, valueRange] of [[120,179,[120,139],[160,179]],[179,139,[160,179],[120,139]]] as const) {
      for (const mode of ['power','trait'] as const) {
        const inventory = emptyGemInventory();
        inventory.items = [item(power,value)]; inventory.seen = ['night-dew']; inventory.dust.grave = 100000;
        for (let index = 0; index < 32; index++) {
          const before = structuredClone(inventory.items[0]);
          startGemRefinement(inventory, before.id, mode, seed(index));
          const candidate = inventory.pending!.candidate;
          expect(validGemInventory(JSON.parse(JSON.stringify(inventory)))).toBe(true);
          if (mode === 'power') {
            expect(candidate.roll!.power).toBeGreaterThanOrEqual(powerRange[0]);
            expect(candidate.roll!.power).toBeLessThanOrEqual(powerRange[1]);
            expect(candidate.roll!.trait).toBe(before.roll!.trait);
            expect(candidate.roll!.value).toBe(before.roll!.value);
          } else {
            expect(candidate.roll!.power).toBe(before.roll!.power);
            expect(candidate.roll!.value).toBeGreaterThanOrEqual(valueRange[0]);
            expect(candidate.roll!.value).toBeLessThanOrEqual(valueRange[1]);
          }
          resolveGemRefinement(inventory,true);
        }
      }
    }
  });

  it('upgrades only eligible final chests, never first gifts, early waves, or trials', () => {
    const dungeon = stage(); dungeon.gemLoot = {tier4Chance:0,tier5Chance:1,featuredDefId:'pale-ward'};
    let finals = 0;
    for (let index = 0; index < 256; index++) {
      const final = rollGemDrop(dungeon,seed(index),`boss:${index}`,{boss:true}).gem;
      if (final) {
        finals++;
        expect(gemPowerTier(final)).toBe(5);
        expect(gemTraitTier(final)).toBe(final.roll!.trait === 'none' ? 0 : 5);
      }
      const early = rollGemDrop(dungeon,seed(index),`wave:${index}`).gem;
      if (early) expect(gemTier(early)).toBeLessThanOrEqual(3);
      const gift = rollGemDrop(dungeon,seed(index),`first:${index}`,{first:true,boss:true}).gem!;
      expect(gemTier(gift)).toBe(1);
      expect(gemPowerMultiplier(gift)).toBe(1);
    }
    expect(finals).toBeGreaterThan(100);
    dungeon.kind = 'trial';
    expect(rollGemDrop(dungeon,seed(1),'trial',{boss:true}).gem).toBeUndefined();
    expect(dungeonGemLootProfile(stage())).toMatchObject({tier4Chance:0,tier5Chance:0});
  });

  it('makes a featured boss target meaningfully available without replacing every other find', () => {
    const dungeon = stage(); dungeon.gemLoot = {tier4Chance:.3,tier5Chance:.05,featuredDefId:'pale-ward'};
    const definitions = new Set<string>(); let found = 0, featured = 0, tier4 = 0, tier5 = 0;
    for (let index = 0; index < 1024; index++) {
      const stone = rollGemDrop(dungeon,seed(index),`target:${index}`,{boss:true}).gem;
      if (!stone) continue;
      found++; definitions.add(stone.defId);
      if (stone.defId === 'pale-ward') featured++;
      if (gemTier(stone) === 4) tier4++;
      if (gemTier(stone) === 5) tier5++;
    }
    expect(found).toBeGreaterThan(500);
    expect(featured / found).toBeGreaterThan(.35);
    expect(featured / found).toBeLessThan(.85);
    expect(definitions.size).toBeGreaterThan(2);
    expect(tier4).toBeGreaterThan(50);
    expect(tier5).toBeGreaterThan(10);
  });
});
