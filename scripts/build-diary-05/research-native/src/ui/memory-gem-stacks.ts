import { gemRollKey, type MemoryGem } from '../domain/memory-gems';

/** Presentation stacks retain every original ID, wearer and protection flag. */
export interface MemoryGemStack {
  key: string;
  items: MemoryGem[];
  representative: MemoryGem;
  equippedCount: number;
  lockedCount: number;
  freeCount: number;
}

export const memoryGemStackKey = (item: MemoryGem): string => gemRollKey(item);

export function memoryGemStacks(items: readonly MemoryGem[], equipment: Readonly<Record<string, string>>): MemoryGemStack[] {
  const owners = new Set(Object.values(equipment));
  const groups = new Map<string, MemoryGemStack>();
  for (const item of items) {
    const key = memoryGemStackKey(item);
    const group = groups.get(key) ?? { key, items: [], representative: item, equippedCount: 0, lockedCount: 0, freeCount: 0 };
    group.items.push(item);
    if (owners.has(item.id)) group.equippedCount++;
    else group.freeCount++;
    if (item.locked) group.lockedCount++;
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Use a spare copy before asking to take a stone away from another wearer. */
export function preferredStackItem(stack: MemoryGemStack, equipment: Readonly<Record<string, string>>, characterId: string): MemoryGem {
  const worn = new Set(Object.values(equipment));
  return stack.items.find(item => !worn.has(item.id) && !item.locked)
    ?? stack.items.find(item => !worn.has(item.id))
    ?? stack.items.find(item => item.id === equipment[characterId])
    ?? stack.representative;
}
