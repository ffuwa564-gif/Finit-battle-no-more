import type { DungeonDef } from './types';

/** Events pay per completed expedition; normal routes pay only their first clear. */
export function dungeonStoneReward(dungeon: DungeonDef, completedDungeonIds: readonly string[]): number {
  if (dungeon.kind === 'trial' || dungeon.towerFloor !== undefined) return 0;
  return dungeon.kind === 'event' ? 1 : completedDungeonIds.includes(dungeon.id) ? 0 : 3;
}
