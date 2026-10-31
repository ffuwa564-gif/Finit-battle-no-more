import { describe, expect, it } from 'vitest';
import { memoryGemStacks, memoryGemStackKey, preferredStackItem } from '../src/ui/memory-gem-stacks';
import type { MemoryGem } from '../src/domain/memory-gems';

describe('memory gem inventory stacks', () => {
  it('groups identical effects while preserving different variants and each copy ownership and protection', () => {
    const items: MemoryGem[] = [
      { id:'spare', defId:'night-dew', variant:'pure' },
      { id:'worn', defId:'night-dew', variant:'pure', locked:true },
      { id:'swift', defId:'night-dew', variant:'swift' },
      { id:'other', defId:'pale-ward', variant:'pure' },
    ];
    const before = structuredClone(items);
    const stacks = memoryGemStacks(items, { liora:'worn' });
    expect(stacks).toHaveLength(3);
    expect(stacks[0]).toMatchObject({ key:memoryGemStackKey(items[0]), equippedCount:1, freeCount:1, lockedCount:1 });
    expect(stacks[0].items.map(item => item.id)).toEqual(['spare','worn']);
    expect(preferredStackItem(stacks[0], { liora:'worn' }, 'elaine').id).toBe('spare');
    expect(items).toEqual(before);
  });
  it('stacks only equal active performance and keeps legacy zero rolls equivalent without merging stronger affixes', () => {
    const items: MemoryGem[] = [
      { id:'legacy', defId:'night-dew', variant:'pure' },
      { id:'zero', defId:'night-dew', variant:'pure', roll:{power:0,trait:'none',value:0} },
      { id:'strong', defId:'night-dew', variant:'pure', roll:{power:90,trait:'chain',value:50} },
      { id:'strong-copy', defId:'night-dew', variant:'pure', roll:{power:90,trait:'chain',value:50},locked:true },
      { id:'other-value', defId:'night-dew', variant:'pure', roll:{power:90,trait:'chain',value:51} },
      { id:'other-power', defId:'night-dew', variant:'pure', roll:{power:91,trait:'chain',value:50} },
    ];
    const stacks=memoryGemStacks(items,{liora:'strong-copy'});
    expect(stacks).toHaveLength(4);
    expect(stacks[0].items.map(item=>item.id)).toEqual(['legacy','zero']);
    expect(stacks[1]).toMatchObject({equippedCount:1,lockedCount:1,freeCount:1});
    expect(stacks[1].items.map(item=>item.id)).toEqual(['strong','strong-copy']);
    expect(preferredStackItem(stacks[1],{liora:'strong-copy'},'elaine').id).toBe('strong');
  });
  it('uses a spare unprotected copy before a protected or worn copy and retains the current wearer when all are worn', () => {
    const items: MemoryGem[] = [
      { id:'protected', defId:'night-dew', variant:'pure', locked:true },
      { id:'spare', defId:'night-dew', variant:'pure' },
      { id:'worn', defId:'night-dew', variant:'pure' },
    ];
    const [stack] = memoryGemStacks(items, { liora:'worn' });
    expect(preferredStackItem(stack, { liora:'worn' }, 'elaine').id).toBe('spare');
    expect(preferredStackItem(stack, { liora:'worn', elaine:'spare' }, 'noelle').id).toBe('protected');
    expect(preferredStackItem(stack, { liora:'worn', elaine:'spare', seris:'protected' }, 'elaine').id).toBe('spare');
  });
});
