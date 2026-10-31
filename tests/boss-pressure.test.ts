import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { createInitialSave } from '../src/application/game';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { bossWindupStatus } from '../src/domain/boss-pressure';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { Battle, Content, GameSave } from '../src/domain/types';

/** Isolated encounter: two ordinary attacks total exactly the 80-HP charge threshold. */
function fixture() {
  const c = structuredClone(content);
  const stage = c.dungeons.find(d => d.id === 'silent-cathedral')!;
  stage.waves = [[{ characterId: 'pale-wolf', boss: true }]];
  stage.bossStrike = { every: 3, power: 220, name: '予告された一撃', target: 'pilot', windup: { breakPercent: 8, weakenedPower: 100, recoveryPercent: 25 } };
  delete stage.rareEncounter;
  let b = createBattle(c, ['seris', 'pale-wolf'], 'seris', stage.id, 0, 42, 'pressure-test');
  while (b.phase === 'playing') b = advanceReplay(b, c);
  b.round = 2;
  for (const u of b.units) {
    u.hp = u.maxHp = 1000; u.defense = 0;
    u.attack = u.side === 'enemy' ? 100 : u.characterId === 'seris' ? 50 : 30;
    u.speed = u.side === 'enemy' ? 1 : u.characterId === 'seris' ? 100 : 80;
    u.cooldowns = Object.fromEntries(c.characters.find(char => char.id === u.characterId)!.skillIds.map(id => [id, 999]));
  }
  b.initialUnits = structuredClone(b.units);
  return { c, b, strike: stage.bossStrike };
}
const boss = (b: Battle) => b.units.find(u => u.side === 'enemy' && u.boss)!;
const pilot = (b: Battle) => b.units.find(u => u.uid === 'party:seris')!;
function replay(b: Battle, c: Content) { while (b.phase === 'playing') b = advanceReplay(b, c); return b; }
const bossHit = (b: Battle) => b.events.find(e => e.bossStrike)!;
function saveOf(b: Battle, c: Content): GameSave {
  const save = createInitialSave(c, 42); save.partyIds = [...b.partyIds]; save.leaderId = b.leaderId;
  save.ownedIds = [...new Set([...save.ownedIds, ...b.partyIds])]; save.battle = b; return save;
}

describe('telegraphed pressure rewards an actual response', () => {
  it('adds actual HP damage across allies, weakens the next strike, and announces the break once', () => {
    const { c, b, strike } = fixture();
    const round2 = resolveRound(b, c).battle;
    expect(boss(round2).bossWindup).toEqual({ round: 2, damage: 80 });
    expect(round2.events.filter(e => e.text.includes('溜めを崩した'))).toHaveLength(1);
    const ready3 = replay(round2, c);
    expect(bossWindupStatus(boss(ready3), strike, 3).phase).toBe('broken');
    const broken = resolveRound(ready3, c).battle;
    const unbroken = structuredClone(ready3); delete boss(unbroken).bossWindup;
    const full = resolveRound(unbroken, c).battle;
    expect(bossHit(broken).amount).toBe(100); expect(bossHit(full).amount).toBe(220);
    expect(pilot(broken).hp - pilot(full).hp).toBe(120);
  });

  it('does not count shield absorption or a hit redirected into a guard as boss pressure', () => {
    const shield = fixture(); boss(shield.b).barrier = 100; boss(shield.b).barrierUntil = 5;
    const absorbed = resolveRound(shield.b, shield.c).battle;
    expect(boss(absorbed).bossWindup).toBeUndefined(); expect(boss(absorbed).hp).toBe(1000);
    const cover = fixture(); const protectedBoss = boss(cover.b);
    const guard = { ...structuredClone(protectedBoss), uid: 'enemy:guard', characterId: 'stone-drake', boss: false, attack: 0, guardTarget: protectedBoss.uid, guardUntil: 9, guardStrength: 14 };
    cover.b.units.push(guard); cover.b.focusTargetId = protectedBoss.uid; cover.b.partyOrder = { kind: 'attack' };
    const redirected = resolveRound(cover.b, cover.c).battle;
    expect(boss(redirected).hp).toBe(1000); expect(boss(redirected).bossWindup).toBeUndefined();
    expect(redirected.events.find(e => e.actorId === pilot(cover.b).uid && e.actionSelection)?.targetIds).toEqual([guard.uid]);
  });

  it('requires preparation during the warning round, rather than late damage on the strike round', () => {
    const { c, b, strike } = fixture(); b.round = 3;
    // A full threshold of faster attacks on round 3 cannot rewrite the missed round-2 preparation.
    const result = resolveRound(b, c).battle;
    expect(bossHit(result).amount).toBe(220); expect(boss(result).bossWindup).toBeUndefined();
    expect(bossWindupStatus(boss(result), strike, 4).phase).toBe('open');
    const nextWarning = structuredClone(boss(result)); nextWarning.bossWindup = { round: 2, damage: 999 };
    expect(bossWindupStatus(nextWarning, strike, 5).phase).toBe('charging');
    expect(bossWindupStatus(nextWarning, strike, 5).damage).toBe(0);
  });

  it('opens a real vulnerability immediately after the strike and through the following round only', () => {
    const { c, b, strike } = fixture(); b.round = 3; boss(b).speed = 200;
    const afterStrike = resolveRound(b, c).battle;
    const hit = afterStrike.events.find(e => e.actorId === pilot(b).uid && e.actionSelection)!;
    expect(hit.amount).toBe(62); // floor(50 * 1.25), after the faster boss actually attacks.
    expect(boss(afterStrike).bossRecoveryUntil).toBe(4);
    const next = replay(afterStrike, c);
    expect(bossWindupStatus(boss(next), strike, 4).phase).toBe('open');
    expect(resolveRound(next, c).battle.events.find(e => e.actorId === pilot(b).uid && e.actionSelection)?.amount).toBe(62);
    next.round = 5;
    expect(bossWindupStatus(boss(next), strike, 5).phase).toBe('charging');
    expect(resolveRound(next, c).battle.events.find(e => e.actorId === pilot(b).uid && e.actionSelection)?.amount).toBe(50);
  });

  it('does not award a recovery opening when sleep prevents the boss from attacking', () => {
    const { c, b, strike } = fixture(); b.round = 3; boss(b).speed = 200;
    boss(b).ailments = { sleep: { turns: 1, sourceId: pilot(b).uid } };
    const asleep = resolveRound(b, c).battle;
    expect(asleep.events.some(e => e.bossStrike)).toBe(false); expect(boss(asleep).bossRecoveryUntil).toBeUndefined();
    expect(bossWindupStatus(boss(asleep), strike, 4).phase).toBe('waiting');
  });

  it('lets a committed guard save the pilot from a faster strike without granting a second action', () => {
    const { c, b } = fixture(); b.round = 3; boss(b).speed = 200; pilot(b).hp = 150;
    const reckless = resolveRound(b, c).battle;
    const guardedInput = structuredClone(b); guardedInput.partyOrder = { kind: 'guard' };
    const guarded = resolveRound(guardedInput, c).battle;
    expect(pilot(reckless).hp).toBe(0); expect(pilot(guarded).hp).toBe(40);
    const actions = guarded.events.filter(e => e.actorId === pilot(b).uid && e.actionSelection);
    expect(actions).toHaveLength(1); expect(actions[0].kind).toBe('guard');
  });

  it('restores the same pressure and replay after a save round trip, retaining legacy snapshots', () => {
    const { c, b } = fixture(); const resolved = resolveRound(b, c).battle;
    const save = saveOf(resolved, c); expect(() => assertSaveCompatibility(save, c)).not.toThrow();
    const restored = JSON.parse(JSON.stringify(save)) as GameSave; assertSaveCompatibility(restored, c);
    const left = replay(resolved, c), right = replay(restored.battle!, c);
    expect(right).toEqual(left); expect(resolveRound(right, c)).toEqual(resolveRound(left, c));
    const legacy = saveOf(b, c);
    expect(() => assertSaveCompatibility(legacy, c)).not.toThrow();
    for (const state of [{ round: -1, damage: 10 }, { round: 2, damage: NaN }, { round: 2, damage: -10 }]) {
      const invalid = structuredClone(save); boss(invalid.battle!).bossWindup = state;
      expect(() => assertValidSave(invalid)).toThrow();
    }
    const invalidParty = structuredClone(save); pilot(invalidParty.battle!).bossRecoveryUntil = 4;
    expect(() => assertValidSave(invalidParty)).toThrow();
    const futureCharge = structuredClone(save);
    boss(futureCharge.battle!).bossWindup = { round: futureCharge.battle!.round + 1, damage: 80 };
    expect(() => assertSaveCompatibility(futureCharge, c)).toThrow();
    const futureOpening = structuredClone(save);
    boss(futureOpening.battle!).bossRecoveryUntil = futureOpening.battle!.round + 1;
    expect(() => assertSaveCompatibility(futureOpening, c)).toThrow();
    // An invalid replay snapshot must not become trusted merely because the live units are sound.
    const futureSnapshot = structuredClone(save);
    const snapshot = futureSnapshot.battle!.events.find(e => e.unitsAfter?.some(u => u.boss))!.unitsAfter!;
    snapshot.find(u => u.boss)!.bossWindup = { round: futureSnapshot.battle!.round + 1, damage: 80 };
    expect(() => assertSaveCompatibility(futureSnapshot, c)).toThrow();
  });

  it('requires valid windup rules for guarded boss encounters and keeps final bosses unique', () => {
    const c = structuredClone(content); const d = c.dungeons.find(stage => stage.id === 'silent-cathedral')!;
    d.waves = [[{ characterId: 'pale-wolf', boss: true }, { characterId: 'stone-drake' }]];
    delete d.rareEncounter; delete d.bossStrike;
    expect(validateContent(c).some(e => e.includes('silent-cathedral') && e.includes('final wave'))).toBe(true);
    d.bossStrike = fixture().strike;
    expect(validateContent(c).filter(e => e.includes('silent-cathedral'))).toEqual([]);
    d.waves[0][1].boss = true;
    expect(validateContent(c).some(e => e.includes('silent-cathedral') && e.includes('final wave'))).toBe(true);
    d.waves[0][1].boss = false; d.bossStrike.windup!.weakenedPower = d.bossStrike.power;
    expect(validateContent(c).some(e => e.includes('silent-cathedral') && e.includes('invalid boss windup'))).toBe(true);
  });
});
