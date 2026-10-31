import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { emptyGemInventory, dungeonGemFamily, gemDefinition, rollGemDrop, startGemRefinement, resolveGemRefinement, equipGem, lockGem, validGemInventory } from '../src/domain/memory-gems';
import { runFrameAssistedTower } from './helpers/tower-frame-policy';

describe('tower loot safety', () => {
  it('requires quality equipment at the sampled80th floor even when the same SSR party uses legal frame assistance', () => {
    // This protects one late-floor challenge and gear difference, not an all-floor frontier claim.
    for (const seed of [1, 2, 3]) {
      expect(runFrameAssistedTower(80, { power:-1, value:0 }, seed).win).toBe(false);
      expect(runFrameAssistedTower(80, { power:75, value:75 }, seed).win).toBe(true);
    }
  }, 15000);

  it('keeps all three families farmable throughout all100 floors despite their shared white tower name', () => {
    const families = ['sanctuary', 'clock', 'grave'];
    const floors = content.dungeons.filter(dungeon => dungeon.towerFloor).sort((a,b) => a.towerFloor! - b.towerFloor!);
    expect(floors).toHaveLength(100);
    for (const floor of floors) {
      const expected = families[(floor.towerFloor! - 1) % 3];
      expect(dungeonGemFamily(floor)).toBe(expected);
      for (let seed = 1; seed <= 5; seed++) {
        const result = rollGemDrop(floor, seed, `safety:${floor.id}:${seed}`, { boss:true });
        expect(result.gem).toBeDefined();
        expect(gemDefinition(result.gem!).family).toBe(expected);
      }
    }
  });

  it('accepts a pending refinement without reverting a legitimate transfer or protection change', () => {
    const inventory = emptyGemInventory();
    inventory.items.push({ id:'shared:stone', defId:'night-dew', variant:'pure' });
    inventory.seen.push('night-dew');
    inventory.dust.grave = 20;
    equipGem(inventory, 'elaine', 'shared:stone');
    startGemRefinement(inventory, 'shared:stone', 'power', 482);
    const proposed = structuredClone(inventory.pending!.candidate.roll);
    const paid = inventory.dust.grave;
    equipGem(inventory, 'liora', 'shared:stone', { transfer:true });
    lockGem(inventory, 'shared:stone');
    resolveGemRefinement(inventory, true);
    expect(inventory.equipped).toEqual({ liora:'shared:stone' });
    expect(inventory.items[0]).toMatchObject({ id:'shared:stone', locked:true, roll:proposed });
    expect(inventory.dust.grave).toBe(paid);
    expect(inventory.items).toHaveLength(1);
    expect(validGemInventory(inventory)).toBe(true);
  });
});
