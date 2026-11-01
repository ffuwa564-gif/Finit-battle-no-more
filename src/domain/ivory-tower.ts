import type { DungeonDef, GameSave } from './types';

export const IVORY_TOWER_VERSION = '1.10' as const;
export interface TowerRecord { version: typeof IVORY_TOWER_VERSION; completedFloors: number[]; legacyHighest: number }
export type TowerProgressSave = Pick<GameSave, 'completedDungeonIds'> & { towerRecord?: TowerRecord };

export const IVORY_TOWER_FLOORS = 100;
export const TOWER_ROUND_LIMIT = 40;
export const ivoryTowerId = (floor: number): string => `ivory-tower-${String(floor).padStart(3, '0')}`;
export function towerFloorFromId(id: string): number | null {
  const match = /^ivory-tower-(\d{3})$/.exec(id);
  const floor = match ? Number(match[1]) : 0;
  return floor >= 1 && floor <= IVORY_TOWER_FLOORS ? floor : null;
}
export function isTowerDungeon(dungeon: Pick<DungeonDef, 'id' | 'towerFloor'>): boolean {
  return dungeon.towerFloor !== undefined && towerFloorFromId(dungeon.id) === dungeon.towerFloor;
}
/** Only a committed claim advances the ascent; a pending victory is not a clear. */
export function highestTowerFloor(save: TowerProgressSave): number {
  let highest = 0;
  while (highest < IVORY_TOWER_FLOORS && (save.towerRecord?.version === IVORY_TOWER_VERSION ? save.towerRecord.completedFloors.includes(highest + 1) : save.completedDungeonIds.includes(ivoryTowerId(highest + 1)))) highest++;
  return highest;
}
export function towerLock(dungeon: Pick<DungeonDef, 'id' | 'towerFloor'>, save: TowerProgressSave): string | null {
  if (!isTowerDungeon(dungeon)) return null;
  if (!save.completedDungeonIds.includes('silent-cathedral')) return '静謐の聖堂を踏破して解放';
  return dungeon.towerFloor! <= highestTowerFloor(save) + 1 ? null : '白亜の塔の前の層を踏破して解放';
}
export function towerDustReward(dungeon: Pick<DungeonDef, 'towerFloor'>): number {
  return dungeon.towerFloor ? 1 + Math.floor((dungeon.towerFloor - 1) / 20) : 0;
}
