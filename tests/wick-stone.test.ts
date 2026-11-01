import { describe, expect, it } from 'vitest';
import { applyCommand, createInitialSave } from '../src/application/game';
import { content } from '../src/content';
import { gemAttackReference, gemCooldown, gemSkill, validMemoryGem } from '../src/domain/memory-gems';
import { decodeBackup, encodeBackup } from '../src/platform/save-backup';

describe('crafted wick stone lifecycle', () => {
  it('crafts fixed support without RNG, survives backup and transfers to an awakened form', () => {
    const initial = createInitialSave(content, 391);
    initial.memoryGems!.dust.clock = 6;
    initial.ownedIds.push('noelle-awakened');
    const crafted = applyCommand(initial, { type: 'craftMemoryGem', defId: 'wick-stone' }, content);
    const gem = crafted.memoryGems!.items.find(item => item.defId === 'wick-stone')!;
    expect(gem.roll).toEqual({ power: 80, trait: 'none', value: 0 });
    expect(gemCooldown(gemSkill(gem).id)).toBe(3);
    expect(crafted.memoryGems!.dust.clock).toBe(0);
    expect(crafted.seed).toBe(initial.seed);
    expect(crafted.gold).toBe(initial.gold);
    let equipped = applyCommand(crafted, { type: 'equipMemoryGem', characterId: 'noelle', gemId: gem.id }, content);
    equipped = applyCommand(equipped, { type: 'equipMemoryGem', characterId: 'noelle-awakened', gemId: gem.id, transfer: true }, content);
    const restored = decodeBackup(encodeBackup(equipped, content), content).save;
    expect(restored.memoryGems!.equipped['noelle-awakened']).toBe(gem.id);
    expect(restored.memoryGems!.equipped.noelle).toBeUndefined();
    expect(gemAttackReference(gem, { attack: 30 })).toBe(54);
    expect(gemAttackReference(gem, { attack: 60 })).toBe(65);
    expect(gemAttackReference(gem, { attack: 100 })).toBe(100);
    const before = structuredClone(restored);
    expect(() => applyCommand(restored, { type: 'startGemRefinement', gemId: gem.id, mode: 'power' }, content)).toThrow();
    expect(restored).toEqual(before);
    expect(validMemoryGem({ ...gem, roll: { power: 220, trait: 'none', value: 0 } })).toBe(false);
  });
});
