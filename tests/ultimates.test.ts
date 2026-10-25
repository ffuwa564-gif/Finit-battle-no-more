import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { ultimateCharge, ultimateFor, ultimateReady } from '../src/domain/ultimates';
import { assertValidSave } from '../src/platform/save';
import { battleEventDuration } from '../src/platform/battle-timing';
import { tr } from '../src/locales/i18n';
import type { GameSave } from '../src/domain/types';

function ready(ids = ['seris', 'liora', 'elaine', 'noelle']): GameSave {
  const save = createInitialSave(content, 42);
  save.ownedIds = [...new Set([...save.ownedIds, ...ids])];
  save.discoveredIds = [...save.ownedIds]; save.partyIds = ids; save.leaderId = ids[0]!;
  let battle = createBattle(content, ids, ids[0]!, 'silent-cathedral', 2, 42, 'ultimate-test');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  for (const unit of battle.units) {
    if (unit.side === 'party') { unit.barrier = 100000; unit.barrierUntil = 99; }
    else { unit.hp = unit.maxHp = 100000; unit.attack = 0; unit.speed = 0; }
  }
  save.battle = battle;
  return save;
}
const ally = (save: GameSave, id: string) => save.battle!.units.find(unit => unit.characterId === id)!;
function fire(id: string, ids = ['seris', 'liora', 'elaine', 'noelle']) {
  const save = ready(ids), actor = ally(save, id); actor.speed = 100; actor.ultimateCharge = 100;
  const queued = applyCommand(save, { type: 'ultimate', unitId: actor.uid }, content);
  const next = applyCommand(queued, { type: 'round' }, content);
  assertValidSave(JSON.parse(JSON.stringify(next)));
  const battle = next.battle!;
  return { save, battle, event: battle.events.find(event => event.ultimate)! };
}

describe('player-selected character ultimates', () => {
  it('provides a named, translated ultimate for every character', () => {
    for (const character of content.characters) {
      const special = ultimateFor(character);
      expect(special.name.length).toBeGreaterThan(3);
      expect(tr(special.name, 'en')).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
      expect(tr(special.description, 'en')).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
    }
  });
  it('charges from normal actions, caps at 100, and never automatically fires', () => {
    let battle = ready().battle!;
    for (let i = 0; i < 5; i++) {
      battle = resolveRound(battle, content).battle;
      expect(battle.events.some(event => event.ultimate)).toBe(false);
      expect(ultimateCharge(battle.units.find(unit => unit.characterId === 'seris')!)).toBe(Math.min(100, (i + 1) * 25));
      while (battle.phase === 'playing') battle = advanceReplay(battle, content);
    }
    expect(ultimateReady(battle.units.find(unit => unit.characterId === 'seris')!)).toBe(true);
  });
  it('gains 10 from real HP damage, but not damage fully absorbed by a barrier', () => {
    const save = ready(['seris']);
    const actor = ally(save, 'seris'); actor.attack = 0; actor.hp = actor.maxHp = 100000;
    const shielded = resolveRound(save.battle!, content).battle;
    expect(ultimateCharge(shielded.units.find(unit => unit.uid === actor.uid)!)).toBe(25);
    delete actor.barrier; delete actor.barrierUntil;
    const hurt = resolveRound(save.battle!, content).battle;
    const hits = hurt.events.filter(event => event.targetIds?.includes(actor.uid) && event.amount! > 0).length;
    expect(ultimateCharge(hurt.units.find(unit => unit.uid === actor.uid)!)).toBe(25 + hits * 10);
  });
  it('queues and cancels independently without spending charge, preserves choices through strategy and saves', () => {
    let save = ready();
    for (const unit of save.battle!.units.filter(unit => unit.side === 'party')) unit.ultimateCharge = 100;
    save = applyCommand(save, { type: 'ultimate', unitId: 'party:seris' }, content);
    save = applyCommand(save, { type: 'ultimate', unitId: 'party:elaine' }, content);
    save = applyCommand(save, { type: 'strategy', strategy: 'aggressive' }, content);
    assertValidSave(JSON.parse(JSON.stringify(save)));
    expect(ally(save, 'seris').ultimateQueued).toBe(true); expect(ally(save, 'elaine').ultimateQueued).toBe(true);
    save = applyCommand(save, { type: 'ultimate', unitId: 'party:seris' }, content);
    expect(ally(save, 'seris').ultimateQueued).toBe(false); expect(ally(save, 'seris').ultimateCharge).toBe(100);
    expect(ally(save, 'elaine').ultimateQueued).toBe(true);
  });
  it('rejects unavailable units, uncharged, dead and replay-time requests without mutating saves', () => {
    const save = ready(), before = structuredClone(save);
    for (const uid of ['missing', 'party:seris', save.battle!.units.find(unit => unit.side === 'enemy')!.uid]) expect(() => applyCommand(save, { type: 'ultimate', unitId: uid }, content)).toThrow();
    expect(save).toEqual(before);
    ally(save, 'seris').ultimateCharge = 100; ally(save, 'seris').hp = 0;
    expect(() => applyCommand(save, { type: 'ultimate', unitId: 'party:seris' }, content)).toThrow();
    ally(save, 'seris').hp = 1; save.battle!.phase = 'playing';
    expect(() => applyCommand(save, { type: 'ultimate', unitId: 'party:seris' }, content)).toThrow();
  });
  it('replaces one action in normal speed order, spends once, and leaves normal skill cooldowns untouched', () => {
    const { save, battle, event } = fire('seris');
    expect(event.actorId).toBe('party:seris'); expect(event.kind).toBe('attack'); expect(event.amount).toBeGreaterThan(0);
    expect(battle.events.filter(event => event.actorId === 'party:seris' && ['attack', 'area'].includes(event.kind))).toHaveLength(1);
    const after = event.unitsAfter!.find(unit => unit.uid === 'party:seris')!;
    expect(after.ultimateCharge).toBe(0); expect(after.ultimateQueued).toBeUndefined(); expect(after.cooldowns).toEqual({});
    expect(ally(save, 'seris').ultimateCharge).toBe(100);
    expect(battleEventDuration(event, 1)).toBe(3000); expect(battleEventDuration(event, 2)).toBe(2400);
  });
  it('does not spend a reserved ultimate when sleep or charm controls the action', () => {
    for (const ailment of ['sleep', 'charm'] as const) {
      let save = ready(); const actor = ally(save, 'seris'); actor.ultimateCharge = 100; actor.speed = 100;
      actor.ailments = { [ailment]: { turns: 2, sourceId: save.battle!.units.find(unit => unit.side === 'enemy')!.uid } };
      save = applyCommand(save, { type: 'ultimate', unitId: actor.uid }, content);
      const result = resolveRound(save.battle!, content).battle;
      expect(result.events.some(event => event.ultimate)).toBe(false);
      expect(result.units.find(unit => unit.uid === actor.uid)).toMatchObject({ ultimateCharge: 100, ultimateQueued: true });
    }
  });
  it('does not spend charge if a faster enemy defeats the reserved character before their turn', () => {
    let save = ready(['seris']); const actor = ally(save, 'seris');
    actor.ultimateCharge = 100; actor.hp = 1; actor.speed = 0; delete actor.barrier; delete actor.barrierUntil;
    for (const unit of save.battle!.units.filter(unit => unit.side === 'enemy')) { unit.speed = 100; unit.attack = 100000; }
    save = applyCommand(save, { type: 'ultimate', unitId: actor.uid }, content);
    const result = applyCommand(save, { type: 'round' }, content);
    expect(result.battle!.events.some(event => event.ultimate)).toBe(false);
    expect(ally(result, 'seris')).toMatchObject({ hp: 0, ultimateCharge: 100 });
    assertValidSave(result);
  });
  it('heals each living ally individually and cleanses ailments, without reviving the fallen', () => {
    let save = ready(); const healer = ally(save, 'elaine'); healer.speed = 100; healer.ultimateCharge = 100;
    const wounded = ally(save, 'seris'); wounded.hp = 10; wounded.debuffStrength = 15; wounded.debuffUntil = 3;
    wounded.ailments = { sleep: { turns: 2, sourceId: 'test' } };
    const dead = ally(save, 'noelle'); dead.hp = 0;
    save = applyCommand(save, { type: 'ultimate', unitId: healer.uid }, content);
    const event = resolveRound(save.battle!, content).battle.events.find(event => event.ultimate)!;
    expect(event.targetIds).not.toContain(dead.uid);
    const healed = event.unitsAfter!.find(unit => unit.uid === wounded.uid)!;
    expect(healed.hp).toBe(10 + Math.floor(wounded.maxHp * .4)); expect(healed.ailments).toBeUndefined(); expect(healed.debuffUntil).toBeUndefined();
  });
  it('protects all allies without reducing an existing stronger shield', () => {
    const { event } = fire('liora');
    expect(event.targetIds).toHaveLength(4);
    for (const unit of event.unitsAfter!.filter(unit => unit.side === 'party')) expect(unit.barrier).toBe(100000);
  });
  it('buffs all allies and adds barriers for supporters, and damages all enemies for area and debuff roles', () => {
    const support = fire('eos', ['eos', 'seris']).event;
    expect(support.kind).toBe('buff');
    for (const unit of support.unitsAfter!.filter(unit => unit.side === 'party')) expect(unit).toMatchObject({ buffStrength: 50, buffUntil: 2 });
    for (const id of ['noelle', 'kukurihime']) {
      const { event, save } = fire(id, [id, 'seris']);
      expect(event.kind).toBe('area'); expect(event.targetIds).toHaveLength(save.battle!.units.filter(unit => unit.side === 'enemy').length);
      if (id === 'kukurihime') for (const unit of event.unitsAfter!.filter(unit => unit.side === 'enemy')) expect(unit).toMatchObject({ debuffStrength: 40, debuffUntil: 2 });
    }
  });
  it('keeps charge between waves but drops reservations, and accepts legacy saves with no gauge fields', () => {
    const save = ready(); assertValidSave(save);
    const battle = save.battle!; ally(save, 'seris').ultimateCharge = 100; ally(save, 'seris').ultimateQueued = true;
    battle.phase = 'playing'; battle.nextPhase = 'wave'; battle.events = []; battle.cursor = 0;
    const next = advanceReplay(battle, content);
    expect(next.units.find(unit => unit.characterId === 'seris')).toMatchObject({ ultimateCharge: 100 });
    expect(next.units.find(unit => unit.characterId === 'seris')!.ultimateQueued).toBeUndefined();
    for (const value of [-1, 101, NaN, 1.5]) { const invalid = structuredClone(save); ally(invalid, 'seris').ultimateCharge = value; expect(() => assertValidSave(invalid)).toThrow(); }
  });
});
