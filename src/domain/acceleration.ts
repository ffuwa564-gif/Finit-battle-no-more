import type { Battle, Content } from './types';

export const accelerationPerRound = 5;
export function accelerationPercent(round: number): number {
  return Math.max(0, round - 1) * accelerationPerRound;
}
export interface AccelerationEffect { percent: number; source: string }
/** Only the selected, living party leader can enable this effect on both sides. */
export function activeAcceleration(battle: Pick<Battle, 'round' | 'units' | 'leaderId'>, content: Content): AccelerationEffect | undefined {
  const leader = battle.units.find(unit => unit.side === 'party' && unit.characterId === battle.leaderId && unit.hp > 0);
  if (!leader) return;
  const definition = content.characters.find(char => char.id === leader.characterId);
  if (definition?.leaderEffect !== 'acceleration') return;
  return { percent: accelerationPercent(battle.round), source: definition.name };
}
