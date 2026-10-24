import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import type { Battle, Unit } from '../src/domain/types';
import { hpChanges } from '../src/platform/combat-feedback';

function ready(party: string[]): Battle {
  let battle = createBattle(content, party, party[0]!, 'silent-cathedral', 0, 42, 'goddess-test');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  for (const unit of battle.units.filter(unit => unit.side === 'enemy')) {
    unit.hp = unit.maxHp = 10000; unit.attack = 0; unit.speed = 0;
  }
  return battle;
}
const ally = (battle: Battle, id: string): Unit => battle.units.find(unit => unit.side === 'party' && unit.characterId === id)!;

describe('lower rarity goddess utility', () => {
  it('heals two living allies with individual caps and reports their actual HP changes', () => {
    const battle = ready(['toyotama', 'iwanagahime', 'kukurihime', 'wakahirume']);
    const caster = ally(battle, 'toyotama'); caster.speed = 100;
    const stone = ally(battle, 'iwanagahime'); stone.hp = Math.floor(stone.maxHp * .7);
    const thread = ally(battle, 'kukurihime'); thread.hp = Math.floor(thread.maxHp * .72);
    ally(battle, 'wakahirume').hp = 0;
    const result = resolveRound(battle, content).battle;
    const cast = result.events.find(event => event.actorId === caster.uid)!;
    expect(cast.skillId).toBe('mend-pair-17');
    expect(cast.targetIds).toEqual([stone.uid, thread.uid]);
    const changes = hpChanges(battle.units, cast.unitsAfter!);
    const heals = changes.filter(change => change.amount > 0);
    expect(heals).toHaveLength(2);
    expect(cast.amount).toBe(heals.reduce((sum, change) => sum + change.amount, 0));
    expect(cast.unitsAfter!.find(unit => unit.uid === thread.uid)!.hp).toBe(thread.maxHp);
    expect(cast.unitsAfter!.find(unit => unit.characterId === 'wakahirume')!.hp).toBe(0);
    expect(cast.unitsAfter!.find(unit => unit.uid === caster.uid)!.cooldowns['mend-pair-17']).toBe(4);
    expect(stone.hp).toBe(Math.floor(stone.maxHp * .7));
  });
  it('prioritizes emergency healing and does not spend the paired heal on one moderately injured ally', () => {
    const battle = ready(['toyotama', 'iwanagahime', 'kukurihime']);
    const caster = ally(battle, 'toyotama'); caster.speed = 100;
    ally(battle, 'iwanagahime').hp = 10; ally(battle, 'kukurihime').hp = 50;
    expect(resolveRound(battle, content).battle.events.find(event => event.actorId === caster.uid)!.skillId).toBe('heal-17');
    ally(battle, 'iwanagahime').hp = Math.floor(ally(battle, 'iwanagahime').maxHp * .75);
    ally(battle, 'kukurihime').hp = ally(battle, 'kukurihime').maxHp;
    expect(resolveRound(battle, content).battle.events.find(event => event.actorId === caster.uid)!.skillId).not.toBe('mend-pair-17');
  });
  it('breaks an active barrier before damage but keeps its cooldown when the barrier returns', () => {
    const battle = ready(['iwanagahime', 'toyotama']);
    const caster = ally(battle, 'iwanagahime'); caster.speed = 100; caster.cooldowns['guard-13'] = 99;
    const target = battle.units.find(unit => unit.side === 'enemy')!; target.barrier = 500; target.barrierUntil = 5;
    let result = resolveRound(battle, content).battle;
    const cast = result.events.find(event => event.actorId === caster.uid)!;
    expect(cast.skillId).toBe('shatter-13'); expect(cast.amount).toBeGreaterThan(0);
    expect(cast.text).toContain('障壁500を破壊');
    expect(cast.unitsAfter!.find(unit => unit.uid === target.uid)!.barrier).toBeUndefined();
    expect(target.barrier).toBe(500);
    while (result.phase === 'playing') result = advanceReplay(result, content);
    const nextTarget = result.units.find(unit => unit.uid === target.uid)!; nextTarget.barrier = 500; nextTarget.barrierUntil = 6;
    const second = resolveRound(result, content).battle.events.find(event => event.actorId === caster.uid)!;
    expect(second.skillId).not.toBe('shatter-13');
    expect(second.unitsAfter!.find(unit => unit.uid === target.uid)!.barrier).toBeGreaterThan(0);
  });
  it('respects interception by breaking the guarding recipient barrier instead of the protected target', () => {
    const battle = ready(['iwanagahime']); const caster = ally(battle, 'iwanagahime'); caster.speed = 100; caster.cooldowns['guard-13'] = 99;
    const target = battle.units.find(unit => unit.side === 'enemy')!; target.barrier = 500; target.barrierUntil = 3;
    const guard: Unit = { ...structuredClone(target), uid: 'enemy:guard', barrier: 100, guardTarget: target.uid, guardUntil: 3 };
    battle.units.push(guard);
    const cast = resolveRound(battle, content).battle.events.find(event => event.actorId === caster.uid)!;
    expect(cast.targetIds).toEqual([guard.uid]);
    expect(cast.unitsAfter!.find(unit => unit.uid === guard.uid)!.barrier).toBeUndefined();
    expect(cast.unitsAfter!.find(unit => unit.uid === target.uid)!.barrier).toBe(500);
  });
  it('dispels enemy attack and regeneration while preserving shields, guards and friendly effects', () => {
    const battle = ready(['kukurihime', 'iwanagahime']); const caster = ally(battle, 'kukurihime'); caster.speed = 100; caster.buffStrength = 14; caster.buffUntil = 3;
    const target = battle.units.find(unit => unit.side === 'enemy')!;
    const other = { ...structuredClone(target), uid: 'enemy:other' }; battle.units.push(other);
    Object.assign(target, { buffStrength: 14, buffUntil: 3, regenStrength: 17, regenUntil: 3, barrier: 60, barrierUntil: 3, guardTarget: other.uid, guardUntil: 3 });
    const cast = resolveRound(battle, content).battle.events.find(event => event.actorId === caster.uid)!;
    expect(cast.skillId).toBe('dispel-14'); expect(cast.amount).toBe(0);
    const after = cast.unitsAfter!.find(unit => unit.uid === target.uid)!;
    expect(after.buffUntil).toBeUndefined(); expect(after.regenUntil).toBeUndefined();
    expect(after.barrier).toBe(60); expect(after.guardTarget).toBe(other.uid); expect(after.hp).toBe(target.hp);
    expect(cast.unitsAfter!.find(unit => unit.uid === caster.uid)!.buffUntil).toBe(3);
    expect(cast.unitsAfter!.find(unit => unit.uid === caster.uid)!.cooldowns['dispel-14']).toBe(4);
    delete target.buffUntil; delete target.regenUntil;
    expect(resolveRound(battle, content).battle.events.find(event => event.actorId === caster.uid)!.skillId).not.toBe('dispel-14');
  });
  it('draws all four added goddesses through the existing gacha without putting event characters in the pool', () => {
    const acquired = new Set<string>();
    for (let i = 1; i <= 400; i++) {
      const save = createInitialSave(content, Math.imul(i, 2654435761) >>> 0); save.stones = 5;
      const next = applyCommand(save, { type: 'draw' }, content);
      const id = next.lastGachaResult!.characterId; acquired.add(id);
      expect(content.characters.find(character => character.id === id)!.origin).toEqual(['gacha']);
    }
    expect([...acquired]).toEqual(expect.arrayContaining(['toyotama', 'wakahirume', 'iwanagahime', 'kukurihime']));
  });
});

it('Eos strengthens an attacker or protects an ally, while Nike removes a barrier before damage',()=>{
  const battle=ready(['eos','nike']);
  ally(battle,'eos').speed=100;ally(battle,'nike').speed=90;
  const enemy=battle.units.find(unit=>unit.side==='enemy')!;enemy.barrier=500;enemy.barrierUntil=5;
  const result=resolveRound(battle,content).battle;
  const support=result.events.find(event=>event.actorId==='party:eos')!;
  expect(support.targetIds).toEqual(['party:nike']);
  expect(support.unitsAfter!.find(unit=>unit.uid==='party:nike')!.buffStrength).toBe(15);
  const strike=result.events.find(event=>event.actorId==='party:nike')!;
  const struck=strike.unitsAfter!.find(unit=>unit.uid===enemy.uid)!;
  expect(struck.barrier).toBeUndefined();expect(struck.hp).toBeLessThan(enemy.hp);
  const protecting=structuredClone(battle);protecting.strategy='survival';
  const ward=resolveRound(protecting,content).battle.events.find(event=>event.actorId==='party:eos')!;
  expect(ward.unitsAfter!.some(unit=>unit.side==='party'&&(unit.barrier??0)>0)).toBe(true);
  expect(enemy.barrier).toBe(500);
});
