import { rabbitShotTimes, RABBIT_FLIGHT } from './ultimate-choreography';
import { RABBIT_SEQUENCE } from './ultimate-timing';
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

export interface ImpactSnapshot { eventId: string; units?: Unit[]; hitIndex?: number }
export interface RabbitDamageStep { at: number; index: number; final: boolean; changes: HpChange[]; units: Unit[] }
/** Split actual capped losses, never event.amount: all pieces sum exactly to the saved result. */
export function rabbitDamageSteps(event: BattleEvent, before: Unit[]): RabbitDamageStep[] {
  if(!event.unitsAfter)return [];
  const after=event.unitsAfter;
  const shots=[0,1,2,3].flatMap(rabbitShotTimes).sort((a,b)=>a-b);
  const deadlines=[...shots.map(at=>RABBIT_SEQUENCE.fire+(at+RABBIT_FLIGHT.shot)*1000),RABBIT_SEQUENCE.finish];
  const loss=eventHpChanges(event,before).filter(change=>change.amount<0);
  let previous=before;
  return deadlines.map((at,index)=>{
    const final=index===shots.length;
    // Sixteen small impacts carry 60%; the finisher carries the remaining 40%.
    const progress=final?1:(index+1)/shots.length*.6;
    const units=final?after:before.map(unit=>{
      const target=after.find(next=>next.uid===unit.uid);
      const change=loss.find(item=>item.unitId===unit.uid);
      return {...unit,
        hp:change?unit.hp-Math.floor(-change.amount*progress):unit.hp,
        ...(target&&unit.barrier!==undefined?{barrier:unit.barrier-Math.floor(Math.max(0,unit.barrier-(target.barrier??0))*progress)}:{}),
      };
    });
    const changes=hpChanges(previous,units);previous=units;
    return {at,index,final,changes,units};
  });
}
