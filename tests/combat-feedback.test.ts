import { describe, it, expect } from 'vitest';
import { eventHpChanges, hpChanges, rabbitDamageSteps } from '../src/platform/combat-feedback';
import { createBattle } from '../src/domain/engine';
import { content } from '../src/content';
import type { BattleEvent } from '../src/domain/types';

const party = content.characters.filter(character => character.origin.includes('initial')).map(character => character.id);
function units() { return createBattle(content, party, party[0], content.dungeons[0].id, 2, 42, 'feedback').units; }
describe('combat feedback from actual HP snapshots', () => {
  it('shows each area recipient actual loss instead of repeating the aggregate or overkill', () => {
    const before = units(); before[0].hp = 7; before[1].hp = 60;
    const after = structuredClone(before); after[0].hp = 0; after[1].hp = 41;
    const event: BattleEvent = { id: 'area', kind: 'area', text: '', amount: 999, unitsAfter: after };
    const original = structuredClone(before);
    expect(eventHpChanges(event, before).map(change => change.amount)).toEqual([-7, -19]);
    expect(before).toEqual(original);
  });
  it('places intercepted damage on the guard who actually lost HP', () => {
    const before = units(), after = structuredClone(before);
    after[1].hp -= 8;
    const event: BattleEvent = { id: 'guarded', kind: 'attack', text: '', targetIds: [before[0].uid], amount: 8, unitsAfter: after };
    expect(eventHpChanges(event, before)).toEqual([{ unitId: before[1].uid, characterId: before[1].characterId, side: 'party', amount: -8 }]);
  });
  it('reports capped item/skill healing and omits unchanged recipients', () => {
    const before = units(); before[0].hp = before[0].maxHp - 3;
    const after = structuredClone(before); after[0].hp = after[0].maxHp;
    expect(hpChanges(before, after).map(change => change.amount)).toEqual([3]);
    expect(eventHpChanges({ id: 'heal', kind: 'heal', text: '', amount: 50, unitsAfter: after }, before).map(change => change.amount)).toEqual([3]);
    expect(eventHpChanges({ id: 'wave', kind: 'wave', text: '', unitsAfter: after }, before)).toEqual([]);
  });
});

describe('Lunette per-shot actual HP snapshots',()=>{
  it('conserves each recipient capped loss, including lethal low HP and a guard',()=>{
    const before=units();before[0].hp=7;before[1].hp=999;before[1].maxHp=1000;
    const after=structuredClone(before);after[0].hp=0;after[1].hp=562;
    const event:BattleEvent={id:'rabbit',kind:'area',text:'',amount:99999,unitsAfter:after};
    const original=structuredClone(before),steps=rabbitDamageSteps(event,before);
    expect(steps).toHaveLength(9);expect(steps[0].at).toBe(4275);expect(steps.at(-1)!.at).toBe(6120);expect(steps.at(-1)!.units).toEqual(after);
    for(const index of [0,1]){
      const id=before[index].uid;
      expect(steps.flatMap(step=>step.changes).filter(change=>change.unitId===id).reduce((sum,change)=>sum+change.amount,0)).toBe(after[index].hp-before[index].hp);
      let hp=before[index].hp;
      for(const step of steps){const next=step.units.find(unit=>unit.uid===id)!.hp;expect(next).toBeLessThanOrEqual(hp);expect(next).toBeGreaterThanOrEqual(0);hp=next;}
    }
    expect(steps.slice(0,8).every(step=>step.units[0].hp>0)).toBe(true);
    expect(steps.slice(0,8).every(step=>step.changes.some(change=>change.unitId===before[1].uid&&change.amount<0))).toBe(true);
    expect(steps.at(-1)!.changes.find(change=>change.unitId===before[1].uid)!.amount).toBeLessThan(-170);
    expect(before).toEqual(original);
  });
  it('does not apply final statuses or remove shields early',()=>{
    const before=units();before[0].barrier=20;
    const after=structuredClone(before);after[0].barrier=0;after[0].hp-=40;after[0].debuffStrength=25;
    const steps=rabbitDamageSteps({id:'shield',kind:'area',text:'',unitsAfter:after},before);
    expect(steps[1].units[0].barrier).toBeLessThan(20);
    expect(steps.slice(0,8).every(step=>step.units[0].debuffStrength===before[0].debuffStrength)).toBe(true);
    expect(steps.at(-1)!.units).toEqual(after);
  });
});
