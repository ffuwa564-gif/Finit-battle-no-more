import { describe, expect, it } from 'vitest';
import { createExpeditionTracking, finishTracking, trackEventBatch, trackPotion } from '../src/domain/expedition-review';
import type { Battle, BattleEvent, Unit } from '../src/domain/types';
const u = (uid: string, side: Unit['side'], hp = 100): Unit => ({ uid, characterId: uid, side, hp, maxHp: 100, attack: 10, defense: 0, speed: 1, boss: false, tie: 1, cooldowns: {} });
const initial = () => [u('hero', 'party'), u('guard', 'party'), u('boss', 'enemy')];
const evt = (patch: Partial<BattleEvent>, units: Unit[]): BattleEvent => ({ id: 'e', kind: 'attack', text: '', unitsAfter: structuredClone(units), ...patch });
function batch(units: Unit[], events: BattleEvent[]): Battle { return { initialUnits: units, units: events.at(-1)?.unitsAfter ?? units, events, round: 4, wave: 1 } as Battle; }

describe('expedition review observed snapshot accounting', () => {
  it('counts actual net HP per snapshot including drain, excluding overkill and new units', () => {
    const before = initial(), units = structuredClone(before); const events: BattleEvent[] = [];
    units[0]!.hp = 80; events.push(evt({ actorId: 'boss', targetIds: ['hero'], amount: 999 }, units));
    units[0]!.hp = 90; units[2]!.hp = 0; events.push(evt({ actorId: 'hero', targetIds: ['boss'], amount: 999 }, units));
    units.push(u('new-unit', 'party', 50)); events.push(evt({ kind: 'wave' }, units));
    const tracking = createExpeditionTracking(); const b = batch(before, events); const original = structuredClone(b);
    trackEventBatch(tracking, b, { round: 3, wave: 1 });
    expect(tracking.review).toMatchObject({ partyDamageTaken: 20, enemyDamageTaken: 100, partyHealing: 10, rounds: 0, largestHit: { actorCharacterId: 'boss', targetCharacterId: 'hero', amount: 20, round: 3, wave: 1 } }); expect(b).toEqual(original);
  });
  it('subtracts explicit HP spending without classifying it as an incoming hit', () => {
    const before = initial(), units = structuredClone(before); units[0]!.hp = 90;
    const events = [evt({ actorId: 'hero', targetIds: ['guard'], selfCost: 10, kind: 'buff' }, units)]; units[2]!.hp = 90; events.push(evt({ actorId: 'boss', selfCost: 10, kind: 'buff' }, units));
    const tracking = createExpeditionTracking(); trackEventBatch(tracking, batch(before, events));
    expect(tracking.review).toMatchObject({ partyDamageTaken: 0, enemyDamageTaken: 0, partyHpSpent: 10 }); expect(tracking.review.largestHit).toBeUndefined();
  });
  it('counts explicit absorption only for party recipients, never barrier expiry, donation or shatter', () => {
    const before = initial(); before[0]!.barrier = 50; const units = structuredClone(before); units[0]!.barrier = 25;
    const events = [evt({ actorId: 'boss', targetIds: ['hero'], absorbed: 25 }, units)];
    delete units[0]!.barrier; events.push(evt({ kind: 'buff', targetIds: ['hero'] }, units));
    events.push(evt({ actorId: 'hero', targetIds: ['boss'], absorbed: 75 }, units));
    const tracking = createExpeditionTracking(); trackEventBatch(tracking, batch(before, events)); expect(tracking.review.partyBarrierAbsorbed).toBe(25); expect(tracking.review.partyDamageTaken).toBe(0);
  });
  it('does not mistake ally friendly fire or HP payment for the largest enemy-source hit', () => {
    const before = initial(), units = structuredClone(before); units[0]!.hp = 10;
    const events = [evt({ actorId: 'guard', targetIds: ['hero'], statusAction: 'friendly_fire' }, units)]; units[1]!.hp = 80; events.push(evt({ actorId: 'boss', targetIds: ['guard'], skillId: 'burst' }, units));
    const tracking = createExpeditionTracking(); trackEventBatch(tracking, batch(before, events)); expect(tracking.review.partyDamageTaken).toBe(110); expect(tracking.review.largestHit).toMatchObject({ amount: 20, targetCharacterId: 'guard', skillId: 'burst' });
  });
  it('only records party skip events, and snapshots are optional for skip counters', () => {
    const before = initial(); const events: BattleEvent[] = [{ id: 'p', kind: 'debuff', text: '', actorId: 'hero', statusAction: 'skip' }, { id: 'e', kind: 'debuff', text: '', actorId: 'boss', statusAction: 'skip' }];
    const tracking = createExpeditionTracking(); trackEventBatch(tracking, batch(before, events)); expect(tracking.review.actionsLost).toBe(1);
  });
  it('records potion use once in its separate path with only actual party healing', () => {
    const before = initial(); before[0]!.hp = 50; const after = structuredClone(before); after[0]!.hp = 80;
    const tracking = createExpeditionTracking(); trackPotion(tracking, before, after); expect(tracking.review).toMatchObject({ potionsUsed: 1, partyHealing: 30 });
  });
  it('keeps equal maximum hits deterministic and leaves rounds to the caller', () => {
    const before = initial(), units = structuredClone(before); units[0]!.hp = 90; const events = [evt({ actorId: 'boss', targetIds: ['hero'] }, units)]; units[1]!.hp = 90; events.push(evt({ actorId: 'boss', targetIds: ['guard'] }, units)); const tracking = createExpeditionTracking(); trackEventBatch(tracking, batch(before, events)); expect(tracking.review.rounds).toBe(0); expect(tracking.review.largestHit?.targetCharacterId).toBe('hero');
  });
});
describe('expedition wall time', () => {
  it('allows a zero timestamp and elapsed zero but finalizes only once', () => { const t = createExpeditionTracking(0); finishTracking(t, 0); expect(t.elapsedMs).toBe(0); finishTracking(t, 1000); expect(t.elapsedMs).toBe(0); });
  it.each([undefined, NaN, Infinity, -1])('unknown/invalid start remains unknown (%s)', start => { const t = createExpeditionTracking(start); finishTracking(t, 100); expect(t.elapsedMs).toBeNull(); finishTracking(t, 200); expect(t.elapsedMs).toBeNull(); });
  it('rejects backwards or missing finish time and accepts a finite delta', () => { const a = createExpeditionTracking(100); finishTracking(a, 99); expect(a.elapsedMs).toBeNull(); const b = createExpeditionTracking(100); finishTracking(b); expect(b.elapsedMs).toBeNull(); const c = createExpeditionTracking(100); finishTracking(c, 1000); expect(c.elapsedMs).toBe(900); });
});

import { validBattleReview, validExpeditionTracking } from '../src/domain/expedition-review';
describe('tracking save structure checks', () => {
  it('accepts valid optional maximum hit and unknown elapsed time', () => { const t = createExpeditionTracking(0); t.elapsedMs = null; t.review.largestHit = { targetCharacterId: 'hero', amount: 10, wave: 0, round: 1 }; expect(validExpeditionTracking(t)).toBe(true); });
  it.each([-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe counters/time (%s)', value => { const t = createExpeditionTracking(); t.review.rounds = value; expect(validBattleReview(t.review)).toBe(false); const clock = { ...createExpeditionTracking(), startedAt: value }; expect(validExpeditionTracking(clock)).toBe(false); const unknown = createExpeditionTracking(value); finishTracking(unknown, 1000); expect(unknown.elapsedMs).toBeNull(); });
  it('rejects incomplete/unknown fields and invalid hit identifiers or positions', () => { const t = createExpeditionTracking(); expect(validBattleReview({})).toBe(false); expect(validExpeditionTracking({ ...t, injected: true })).toBe(false); for (const hit of [{ targetCharacterId: '', amount: 1, wave: 0, round: 1 }, { targetCharacterId: 'hero', amount: 0, wave: 0, round: 1 }, { targetCharacterId: 'hero', amount: 1, wave: 0, round: 0 }, { targetCharacterId: 'hero', amount: 1, wave: -1, round: 1 }]) expect(validBattleReview({ ...t.review, largestHit: hit })).toBe(false); });
});

import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import type { Content, CharacterDef } from '../src/domain/types';
function nativeFixture() {
  const ch = (id: string, skillIds = ['attack']): CharacterDef => ({ id, skillIds, name: id, role: 'attacker', strength: 10, leaderStat: 'hp', rarity: 'R', published: true, soundProfile: 'attack', epithet: '', flavor: '', speciesId: 'test', origin: ['initial'], portraitId: '', artId: '' });
  const c: Content = { appVersion: 'test', contentVersion: 'test', rulesVersion: 'test', schemaVersion: 1, assets: [], species: [], characters: [ch('hero', ['attack', 'overclock']), ch('friend'), ch('enemy')], skills: ['attack', 'overclock'].map(template => ({ id: template, name: template, template: template as 'attack' | 'overclock', strength: 10, soundProfile: template })), dungeons: [{ id: 'test', name: '', subtitle: '', description: '', artId: '', published: true, waves: [[{ characterId: 'enemy' }]] }] };
  let b = createBattle(c, ['hero', 'friend'], 'hero', 'test', 0, 17, 'review-native'); while (b.phase === 'playing') b = advanceReplay(b, c);
  for (const unit of b.units) { unit.maxHp = unit.hp = 1000; unit.attack = 10; unit.defense = 0; unit.speed = unit.side === 'enemy' ? 100 : 1; }
  return { c, b };
}
describe('native damage metadata and outcome facts', () => {
  it('records only actually absorbed damage and leaves reward/RNG untouched by the observer', () => {
    const { c, b } = nativeFixture(); const hero = b.units.find(u => u.uid === 'party:hero')!; hero.barrier = 100; hero.barrierUntil = 2; for (const unit of b.units.filter(u => u.side === 'party')) { unit.barrier = 100; unit.barrierUntil = 2; }
    const result = resolveRound(b, c).battle; const enemyAttack = result.events.find(e => e.actorId?.startsWith('enemy:') && e.actionSelection)!;
    expect(enemyAttack.absorbed).toBeGreaterThan(0); const original = structuredClone(result); const t = createExpeditionTracking(); trackEventBatch(t, result, b); expect(t.review.partyBarrierAbsorbed).toBe(enemyAttack.absorbed); expect(result).toEqual(original);
  });
  it('tags overclock actual HP payment instead of counting it as incoming damage', () => {
    const { c, b } = nativeFixture(); b.partyOrder = { kind: 'skill', skillId: 'overclock' };
    const result = resolveRound(b, c).battle; const event = result.events.find(e => e.actorId === 'party:hero' && e.actionSelection)!; expect(event.selfCost).toBe(100);
    const t = createExpeditionTracking(); trackEventBatch(t, result, b); expect(t.review.partyHpSpent).toBe(100); expect(t.review.partyDamageTaken).toBeLessThan(100); expect(t.review.largestHit?.actorCharacterId).toBe('enemy');
  });
  it('distinguishes round timeout from defeat without inferring cause from text', () => {
    const timeout = nativeFixture(); timeout.b.round = 100; expect(resolveRound(timeout.b, timeout.c).battle.failureKind).toBe('timeout');
    const defeat = nativeFixture(); for (const unit of defeat.b.units) if (unit.side === 'party') unit.hp = 1; else unit.attack = 99999;
    // One ordinary enemy can kill only one character each round.
    defeat.b.units.find(u => u.uid === 'party:friend')!.hp = 0;
    expect(resolveRound(defeat.b, defeat.c).battle.failureKind).toBe('defeat');
  });
});
