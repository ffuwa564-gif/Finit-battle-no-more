import type { BattleEvent } from '../domain/types';

/** Readable event pacing, bounded by 480ms scene changes and the material flight. */
export function battleEventDuration(event: BattleEvent, speed: 1 | 2): number {
  if (event.ultimate) return speed === 2 ? 2400 : 3000;
  if (event.kind === 'dialogue') return speed === 2 ? 1800 : 3200;
  if (event.kind === 'drop') return speed === 2 || event.rarity === 'common' ? 1200 : 1800;
  if (event.kind === 'wave') return speed === 2 ? 950 : 1400;
  return speed === 2 ? 950 : 1400;
}
