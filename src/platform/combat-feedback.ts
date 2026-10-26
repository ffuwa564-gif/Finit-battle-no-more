import type { BattleEvent, Unit } from '../domain/types';

export interface HpChange { unitId: string; characterId: string; side: Unit['side']; amount: number }
/** Per-recipient HP differences, including guards and each individual area target. */
export function hpChanges(before: Unit[], after: Unit[]): HpChange[] {
  return after.flatMap(unit => {
    const previous = before.find(item => item.uid === unit.uid);
    const amount = previous ? unit.hp - previous.hp : 0;
    return amount === 0 ? [] : [{ unitId: unit.uid, characterId: unit.characterId, side: unit.side, amount }];
  });
}
export function eventHpChanges(event: BattleEvent, before: Unit[]): HpChange[] {
  return event.unitsAfter && ['attack', 'area', 'heal', 'buff'].includes(event.kind) ? hpChanges(before, event.unitsAfter) : [];
}
