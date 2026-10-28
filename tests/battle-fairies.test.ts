import { describe, it, expect } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { createBattle, advanceReplay } from '../src/domain/engine';
import { offerBattleFairy } from '../src/domain/battle-fairies';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { GameSave, BattleFairies } from '../src/domain/types';
function finish(save: GameSave) {
  while (save.battle?.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
  return save;
}
function fixture() {
  let save = createInitialSave(content, 42);
  save.battle = createBattle(content, save.partyIds, save.leaderId, 'silent-cathedral', 5, 42, 'fairy-test');
  save = finish(save); const battle = save.battle!; battle.round = 2;
  battle.fairies = { seed: 123, checked: '0:2', visitor: { id: `${battle.id}:fairy:0:2`, side: 'left', wave: 0, round: 2 } };
  for (const enemy of battle.units.filter(u => u.side === 'enemy')) { enemy.hp = enemy.maxHp = 100000; enemy.attack = 1; }
  return save;
}
const tap = (save: GameSave) => applyCommand(save, { type: 'battleFairy', fairyId: save.battle!.fairies!.visitor!.id }, content);
describe('frame fairy visitors', () => {
  it('rolls once per completed round, separately from combat and flowers, with both sides', () => {
    let count = 0; const sides = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const b = fixture().battle!; b.id = `fairy-run-${i}`; delete b.fairies;
      const seed = b.seed, blooms = structuredClone(b.blooms);
      offerBattleFairy(b); const first = structuredClone(b.fairies); offerBattleFairy(b);
      expect(b.fairies).toEqual(first); expect(b.seed).toBe(seed); expect(b.blooms).toEqual(blooms);
      const state = b.fairies as BattleFairies | undefined;
      if (state?.visitor) { count++; sides.add(state.visitor.side); }
    }
    expect(count).toBeGreaterThan(45); expect(count).toBeLessThan(140); expect(sides.size).toBe(2);
  });
  it('charges only living allies, caps at 100, preserves queued specials and all turn resources', () => {
    const save = fixture(), b = save.battle!, party = b.units.filter(u => u.side === 'party');
    party[0].hp = 0; party[0].ultimateCharge = 50;
    party[1].ultimateCharge = 94; party[2].ultimateCharge = 100; party[2].ultimateQueued = true;
    b.potionUsed = true;
    const before = structuredClone(save), after = tap(save);
    expect(save).toEqual(before); expect(after.battle!.units.map(u=>u.ultimateCharge).slice(0,3)).toEqual([50,100,100]);
    expect(after.battle!.units[2].ultimateQueued).toBe(true);
    for (let i=0;i<b.units.length;i++) expect(after.battle!.units[i]).toEqual({...b.units[i],...(b.units[i].side==='party'&&b.units[i].hp>0?{ultimateCharge:Math.min(100,(b.units[i].ultimateCharge??0)+15)}:{})});
    const done = finish(after); expect(done.battle!.round).toBe(b.round); expect(done.battle!.potionUsed).toBe(true);
    expect(done.battle!.fairies!.visitor).toBeUndefined(); expect(done.battle!.fairies!.seed).toBe(b.fairies!.seed);
    expect(done.battle!.blooms).toEqual(b.blooms); expect(done.seed).toBe(save.seed); expect(done.gold).toBe(save.gold); expect(done.potions).toBe(save.potions);
    assertSaveCompatibility(after,content); assertSaveCompatibility(done,content);
    expect(()=>applyCommand(done,{type:'battleFairy',fairyId:b.fairies!.visitor!.id},content)).toThrow('妖精');
    expect(()=>tap(after)).toThrow();
  });
  it('keeps a visitor for three decisions, expires without a penalty and survives reload', () => {
    let save = fixture(); const visitor = structuredClone(save.battle!.fairies!.visitor);
    for (let i=0;i<2;i++) {
      save = finish(applyCommand(save,{type:'round'},content));
      expect(save.battle!.fairies!.visitor).toEqual(visitor);
      save=JSON.parse(JSON.stringify(save)); assertSaveCompatibility(save,content);
    }
    const before=structuredClone(save); save=finish(applyCommand(save,{type:'round'},content));
    expect(save.battle!.round).toBe(5); expect(save.battle!.fairies!.visitor).toBeUndefined();
    expect(save.gold).toBe(before.gold);
  });
  it('does not age or reroll a visitor when harvesting a flower', () => {
    const save=fixture(), b=save.battle!;
    b.blooms={seed:3,checked:'0:2',growth:3,flower:{id:`${b.id}:flower:0:2`,kind:'heal',wave:0,round:2}};
    const after=finish(applyCommand(save,{type:'battleBloom',bloomId:b.blooms.flower!.id},content));
    expect(after.battle!.fairies).toEqual(b.fairies); expect(after.battle!.round).toBe(2);
  });
  it('clears at wave boundaries and retreat, accepts older saves, rejects corrupt visitors', () => {
    const save=fixture();assertSaveCompatibility(save,content);
    const old=structuredClone(save);delete old.battle!.fairies;assertSaveCompatibility(old,content);
    for(const patch of [{id:'bad'},{side:'top'},{round:99},{wave:-1}]) {
      const bad=structuredClone(save);Object.assign(bad.battle!.fairies!.visitor!,patch);expect(()=>assertValidSave(bad)).toThrow('妖精');
    }
    expect(applyCommand(save,{type:'retreat'},content).battle!.fairies!.visitor).toBeUndefined();
    const b=save.battle!;b.phase='playing';b.nextPhase='wave';b.cursor=b.events.length;
    expect(advanceReplay(b,content).fairies!.visitor).toBeUndefined();
  });
});
