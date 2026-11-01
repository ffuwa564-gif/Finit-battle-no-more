import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { craftGem, dungeonGemFamily, emptyGemInventory, equipGem, GEM_CRAFT_COST, GEM_DEFINITIONS, gemCooldown, gemDefinition, gemDefinitionForSkill, gemDescription, gemName, gemSkill, gemVariantForSkill, lockGem, rollGemDrop, salvageGem, validGemInventory, validMemoryGem } from '../src/domain/memory-gems';
import type { GemInventory, MemoryGem } from '../src/domain/memory-gems';

const cathedral = content.dungeons.find(def => def.id === 'silent-cathedral')!;
const item = (id = 'one', defId = 'night-dew', variant: MemoryGem['variant'] = 'pure'): MemoryGem => ({ id, defId, variant });
function stash(...items: MemoryGem[]): GemInventory { return { ...emptyGemInventory(), items }; }

describe('memory gem collection and deterministic loot', () => {
  it('preserves eight dropped basic skills, three boss uniques and two fixed crafted support stones', () => {
    expect(GEM_DEFINITIONS.filter(def => !def.bossOnly && !def.fixedRoll)).toHaveLength(8);
    expect(GEM_DEFINITIONS.filter(def => def.fixedRoll)).toHaveLength(2);
    const bosses = GEM_DEFINITIONS.filter(def => def.bossOnly);
    expect(bosses).toHaveLength(3);
    expect(new Set(bosses.map(def => def.family)).size).toBe(3);
    expect(new Set(GEM_DEFINITIONS.map(def => def.id)).size).toBe(GEM_DEFINITIONS.length);
    for (const def of GEM_DEFINITIONS) {
      expect(def.variants).toContain('pure');
      expect(def.description.length).toBeGreaterThan(15);
      expect(Object.keys(def)).not.toContain('stats');
    }
  });

  it('gives a usable first stone at a reproducible destination, regardless of initial RNG', () => {
    for (const seed of [0, 1, 42, 0xffffffff]) {
      const result = rollGemDrop(cathedral, seed, 'first', { first: true });
      expect(result.gem).toEqual({ id: 'first', defId: 'pale-ward', variant: 'pure' });
      expect(rollGemDrop(cathedral, seed, 'first', { first: true })).toEqual(result);
    }
    expect(rollGemDrop({ ...cathedral, id: 'clock-tower' }, 42, 'first', { first: true }).gem?.defId).toBe('echo-shard');
    expect(rollGemDrop({ ...cathedral, id: 'grave-garden', name: '墓所' }, 42, 'first', { first: true }).gem?.defId).toBe('night-dew');
  });

  it('never produces loot in trials, including first-chest guarantees and boss rolls', () => {
    expect(rollGemDrop({ ...cathedral, kind: 'trial' }, 42, 'trial', { first: true, boss: true })).toEqual({ seed: 42 });
  });

  it('keeps every normal drop in its stated family and reserves uniques for boss chests', () => {
    let ordinary = 0, unique = 0, misses = 0;
    for (let i = 0; i < 500; i++) {
      const seed = Math.imul(i, 98765431) >>> 0;
      const normal = rollGemDrop(cathedral, seed, `normal-${i}`);
      const boss = rollGemDrop(cathedral, seed, `boss-${i}`, { boss: true });
      if (!normal.gem) misses++;
      else {
        ordinary++;
        expect(gemDefinition(normal.gem).family).toBe('sanctuary');
        expect(gemDefinition(normal.gem).bossOnly).toBeUndefined();
        expect(validMemoryGem(normal.gem)).toBe(true);
      }
      if (boss.gem && gemDefinition(boss.gem).bossOnly) unique++;
    }
    expect(ordinary).toBeGreaterThan(100);
    expect(misses).toBeGreaterThan(200);
    expect(unique).toBeGreaterThan(10);
  });

  it('produces stable readable destinations for every currently published dungeon', () => {
    for (const dungeon of content.dungeons.filter(def => def.published)) {
      expect(['sanctuary', 'clock', 'grave']).toContain(dungeonGemFamily(dungeon));
      expect(dungeonGemFamily(dungeon)).toBe(dungeonGemFamily(structuredClone(dungeon)));
    }
  });

  it('encodes instance, definition and variant in skill IDs so cooldowns cannot leak between copies', () => {
    const pure = gemSkill(item('a'));
    const swift = gemSkill(item('b', 'night-dew', 'swift'));
    const echo = gemSkill(item('c', 'night-dew', 'echo'));
    expect(pure.id).not.toBe(swift.id);
    expect(gemCooldown(pure.id)).toBe(3);
    expect(gemCooldown(swift.id)).toBe(2);
    expect(gemCooldown(echo.id)).toBe(4);
    expect(swift.strength).toBeLessThan(pure.strength);
    expect(gemDefinitionForSkill(echo.id)?.id).toBe('night-dew');
    expect(gemVariantForSkill(echo.id)).toBe('echo');
    expect(gemDescription(item('a', 'night-dew', 'echo'))).toContain('35%');
    expect(gemName(item())).toContain('夜露石');
  });

  it('rejects unknown definitions, malformed skill IDs and unsupported variants', () => {
    for (const id of ['attack-14', 'memory:missing:pure:a', 'memory:night-dew:nope:a', 'memory:night-dew:pure:', 'memory:clear-tear:swift:a']) {
      expect(gemDefinitionForSkill(id)).toBeUndefined();
      expect(gemCooldown(id)).toBeUndefined();
    }
    expect(() => gemSkill(item('bad', 'clear-tear', 'swift'))).toThrow();
  });

  it('equips one unique stone per character and rejects simultaneous ownership', () => {
    const inventory = stash(item('a'), item('b'));
    equipGem(inventory, 'liora', 'a');
    expect(() => equipGem(inventory, 'seris', 'a')).toThrow();
    equipGem(inventory, 'liora', 'b');
    equipGem(inventory, 'seris', 'a');
    expect(inventory.equipped).toEqual({ liora: 'b', seris: 'a' });
    equipGem(inventory, 'liora', null);
    expect(inventory.equipped).toEqual({ seris: 'a' });
    expect(() => equipGem(inventory, 'liora', 'missing')).toThrow();
    expect(() => equipGem(inventory, '__proto__', 'b')).toThrow();
  });

  it('protects equipped and favorite stones from salvage without consuming them', () => {
    const inventory = stash(item('a'), item('b'));
    equipGem(inventory, 'liora', 'a');
    lockGem(inventory, 'b');
    expect(() => salvageGem(inventory, 'a')).toThrow();
    expect(() => salvageGem(inventory, 'b')).toThrow();
    expect(inventory.items).toHaveLength(2);
    expect(inventory.dust.grave).toBe(0);
    lockGem(inventory, 'b'); salvageGem(inventory, 'b');
    expect(inventory.items).toHaveLength(1);
    expect(inventory.dust.grave).toBe(1);
  });

  it('returns family-specific dust from duplicate stones and preserves discovery', () => {
    const inventory = stash(item('a', 'night-dew', 'echo'), item('b', 'dawn-crown'));
    inventory.seen = ['night-dew', 'dawn-crown'];
    salvageGem(inventory, 'a'); salvageGem(inventory, 'b');
    expect(inventory.dust).toEqual({ sanctuary: 3, clock: 0, grave: 2 });
    expect(inventory.seen).toEqual(['night-dew', 'dawn-crown']);
  });

  it('lets six clear-progress fragments produce the exact requested basic gem', () => {
    const inventory = emptyGemInventory();
    inventory.dust.clock = GEM_CRAFT_COST;
    const gem = craftGem(inventory, 'rewind-thread');
    expect(gem.defId).toBe('rewind-thread');
    expect(inventory.items).toEqual([gem]);
    expect(inventory.dust.clock).toBe(0);
    expect(inventory.seen).toContain('rewind-thread');
    expect(validGemInventory(inventory)).toBe(true);
  });

  it('crafts curated variants at a higher price and rejects inaccessible recipes atomically', () => {
    const inventory = emptyGemInventory(); inventory.dust.grave = 9;
    const gem = craftGem(inventory, 'night-dew', 'swift');
    expect(gem.variant).toBe('swift');
    const before = structuredClone(inventory);
    expect(() => craftGem(inventory, 'night-dew')).toThrow();
    expect(() => craftGem(inventory, 'dawn-crown')).toThrow();
    expect(() => craftGem(inventory, 'dream-lace', 'echo')).toThrow();
    expect(inventory).toEqual(before);
  });

  it('does not reuse a crafted identifier after deleting another stone', () => {
    const inventory = emptyGemInventory(); inventory.dust.grave = 100;
    const a = craftGem(inventory, 'night-dew');
    const b = craftGem(inventory, 'night-dew');
    salvageGem(inventory, a.id);
    const c = craftGem(inventory, 'night-dew');
    expect(c.id).not.toBe(b.id);
    expect(validGemInventory(inventory)).toBe(true);
  });

  it('validates serialized inventories and detects duplicate IDs, references, invalid dust and fake variants', () => {
    expect(validGemInventory(emptyGemInventory())).toBe(true);
    const base = stash(item()); equipGem(base, 'liora', 'one');
    expect(validGemInventory(JSON.parse(JSON.stringify(base)))).toBe(true);
    expect(validGemInventory({ ...base, items: [item(), item()] })).toBe(false);
    expect(validGemInventory({ ...base, equipped: { liora: 'missing' } })).toBe(false);
    expect(validGemInventory({ ...base, equipped: { liora: 'one', seris: 'one' } })).toBe(false);
    expect(validGemInventory({ ...base, dust: { grave: -1 } })).toBe(false);
    expect(validGemInventory({ ...base, dust: { grave: 0.5 } })).toBe(false);
    expect(validGemInventory({ ...base, dust: { counterfeit: 2 } })).toBe(false);
    expect(validGemInventory({ ...base, seen: ['invented-stone'] })).toBe(false);
    expect(validGemInventory({ ...base, craftSerial: -1 })).toBe(false);
    expect(validGemInventory({ ...base, items: [item('one', 'clear-tear', 'swift')] })).toBe(false);
    expect(validMemoryGem({ ...item(), locked: 'yes' })).toBe(false);
  });
});
