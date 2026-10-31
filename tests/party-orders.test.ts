import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { assertSaveCompatibility } from '../src/platform/save';
import type { GameSave, PartyOrder } from '../src/domain/types';

function ready(ids = ['seris', 'liora', 'elaine', 'noelle']): GameSave {
  const save = createInitialSave(content, 42);
  save.partyIds = ids; save.leaderId = ids.at(-1)!; save.ownedIds = [...new Set([...save.ownedIds, ...ids])];
  let battle = createBattle(content, ids, save.leaderId, 'silent-cathedral', 2, 42, 'dial-test');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  for (const u of battle.units) if (u.side === 'enemy') { u.maxHp = u.hp = 100000; u.speed = 0; } else { u.speed = u.characterId === ids[0] ? 100 : 20; }
  save.battle = battle;
  return save;
}
const order = (s: GameSave, value: PartyOrder | null) => applyCommand(s, { type: 'partyOrder', battleId: s.battle!.id, order: value }, content);
const fire = (s: GameSave) => applyCommand(s, { type: 'round' }, content);
const actorEvent = (s: GameSave) => s.battle!.events.find(e => e.actionSelection && e.actorId === `party:${s.partyIds[0]}`)!;

describe('optional leftmost party commands', () => {
  it('controls the leftmost slot independently of the leader and preserves/cancels the saved reservation', () => {
    const save = ready();
    const queued = order(save, { kind: 'attack' });
    assertSaveCompatibility(JSON.parse(JSON.stringify(queued)), content);
    expect(queued.battle!.leaderId).toBe('noelle');
    expect(order(queued, null).battle!.partyOrder).toBeUndefined();
    const done = fire(queued); expect(actorEvent(done).skillId).toBeUndefined();
    expect(actorEvent(done).kind).toBe('attack'); expect(done.battle!.partyOrder).toBeUndefined();
    expect(save.battle!.partyOrder).toBeUndefined();
  });
  it('targets the pinned enemy but retargets if a faster ally has defeated it', () => {
    let s = ready(); const enemy = s.battle!.units.find(u => u.side === 'enemy')!;
    const second = { ...structuredClone(enemy), uid: enemy.uid + ':second', hp: 10000, maxHp: 10000 };
    s.battle!.units.push(second);
    s = applyCommand(s, { type: 'focusEnemy', battleId: s.battle!.id, unitId: second.uid }, content);
    expect(actorEvent(fire(order(s, { kind: 'attack' }))).targetIds).toEqual([second.uid]);
    const pinned = s.battle!.units.find(u => u.uid === second.uid)!; pinned.hp = 1;
    const faster = s.battle!.units.find(u => u.characterId === 'liora')!;
    faster.speed = 200; faster.attack = 100000; faster.cooldowns = { 'guard-14': 99, 'barrier-14': 99 };
    const done = fire(order(s, { kind: 'attack' }));
    expect(actorEvent(done).targetIds).toEqual([enemy.uid]);
  });
  it('uses real owned skills, automatically heals the most injured ally and rejects unavailable skills', () => {
    let s = ready(['elaine', 'seris']); const patient = s.battle!.units.find(u => u.characterId === 'seris')!; patient.hp = 1;
    const done = fire(order(s, { kind: 'skill', skillId: 'heal-14' }));
    expect(actorEvent(done)).toMatchObject({ skillId: 'heal-14', kind: 'heal', targetIds: [patient.uid] });
    expect(() => order(s, { kind: 'skill', skillId: 'area-14' })).toThrow();
    s.battle!.units.find(u => u.characterId === 'elaine')!.cooldowns['heal-14'] = 99;
    expect(() => order(s, { kind: 'skill', skillId: 'heal-14' })).toThrow();
    expect(() => order(s, { kind: 'ultimate' })).toThrow();
  });
  it('keeps area and ultimate targeting contracts and consumes the gauge only on execution', () => {
    let s = ready(['noelle', 'seris']); const enemy = s.battle!.units.find(u => u.side === 'enemy')!;
    s.battle!.units.push({ ...structuredClone(enemy), uid: enemy.uid + ':second' });
    expect(new Set(actorEvent(fire(order(s, { kind: 'skill', skillId: 'area-14' }))).targetIds)).toEqual(new Set(s.battle!.units.filter(u => u.side === 'enemy').map(u => u.uid)));
    const pilot = s.battle!.units.find(u => u.side === 'party')!; pilot.ultimateCharge = 100;
    const queued = order(s, { kind: 'ultimate' }); expect(queued.battle!.units[0].ultimateCharge).toBe(100);
    expect(actorEvent(fire(queued))).toMatchObject({ ultimate: true });
  });
  it('defends through incoming attacks until the next action without granting a free extra action', () => {
    const s = ready(['seris']); const pilot = s.battle!.units[0]; pilot.hp = pilot.maxHp = 100000;
    const normal = fire(order(s, { kind: 'attack' })); const guarded = fire(order(s, { kind: 'guard' }));
    const hit = (v: GameSave) => v.battle!.events.find(e => e.actionSelection && e.actorId?.startsWith('enemy:'))!.amount!;
    expect(hit(guarded)).toBe(Math.max(1, Math.floor(hit(normal) / 2)));
    expect(guarded.battle!.events.filter(e => e.actionSelection && e.actorId === pilot.uid)).toHaveLength(1);
    expect(actorEvent(guarded)).toMatchObject({ kind: 'guard', targetIds: [pilot.uid] });
    let b = guarded.battle!; while (b.phase === 'playing') b = advanceReplay(b, content);
    const next = resolveRound(b, content).battle;
    expect(next.units[0].defendingUntil).toBeUndefined();
  });
  it('reserves the next round during replay without rewriting committed events, rewards or RNG', () => {
    const s = fire(ready()); const before = structuredClone(s);
    const queued = order(s, { kind: 'guard' });
    expect(queued.battle!.events).toEqual(before.battle!.events); expect(queued.battle!.cursor).toBe(before.battle!.cursor);
    expect(queued.seed).toBe(before.seed); expect(queued.gold).toBe(before.gold);
    assertSaveCompatibility(JSON.parse(JSON.stringify(queued)), content);
    while (queued.battle!.phase === 'playing') queued.battle = advanceReplay(queued.battle!, content);
    expect(actorEvent(fire(queued)).kind).toBe('guard');
    expect(() => applyCommand(queued, { type: 'partyOrder', battleId: 'stale-run', order: { kind: 'attack' } }, content)).toThrow();
  });
  it('accepts legacy saves and rejects corrupt order/target references', () => {
    const s = ready(); assertSaveCompatibility(s, content);
    const invalid = structuredClone(s); invalid.battle!.partyOrder = { kind: 'skill', skillId: 'missing' };
    expect(() => assertSaveCompatibility(invalid, content)).toThrow();
    invalid.battle!.partyOrder = { kind: 'attack' }; invalid.battle!.focusTargetId = invalid.battle!.units[0].uid;
    expect(() => assertSaveCompatibility(invalid, content)).toThrow();
  });
  it('rechecks skills at the actual turn and never bypasses sleep with a manual order', () => {
    const queued = order(ready(), { kind: 'skill', skillId: 'pierce-14' });
    const pilot = queued.battle!.units.find(u => u.characterId === 'seris')!;
    pilot.cooldowns['pierce-14'] = 99;
    expect(actorEvent(fire(queued)).skillId).toBe('attack-14');
    pilot.ailments = { sleep: { turns: 2, sourceId: queued.battle!.units.find(u => u.side === 'enemy')!.uid } };
    const asleep = fire(queued);
    expect(actorEvent(asleep)).toBeUndefined();
    expect(asleep.battle!.events.some(e => e.actorId === pilot.uid && e.statusAction === 'skip')).toBe(true);
    expect(asleep.battle!.partyOrder).toBeUndefined();
  });
});
