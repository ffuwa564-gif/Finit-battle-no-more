import { describe, it, expect } from 'vitest';
import { eventHpChanges, hpChanges } from '../src/platform/combat-feedback';
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
