import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createBattle } from '../src/domain/engine';
import { scoutMaidenCharacters, scoutMaidenSkills, scoutRecruitments } from '../src/content/scout-maidens';
import { afterScoutAction, clearScoutEffects, consumeScoutLantern, expireScoutEffects, scoutDamageMultiplier, scoutSkillAction, scoutSkillCooldown, scoutSuggestedAction, SCOUT_SKILLS } from '../src/domain/scout-skills';
import type { Battle, Content, Unit } from '../src/domain/types';

const ids = scoutMaidenCharacters.map(c => c.id);
const lab: Content = { ...content, characters: [...content.characters.filter(c => !ids.includes(c.id)), ...scoutMaidenCharacters], skills: [...content.skills.filter(s => !scoutMaidenSkills.some(x => x.id === s.id)), ...scoutMaidenSkills] };
function fixture(leader = 'ione'): Battle { return createBattle(lab, ids, leader, 'silent-cathedral', 3, 72, 'scout-test'); }
const ally = (b: Battle, id: string) => b.units.find(u => u.side === 'party' && u.characterId === id)!;
const enemy = (b: Battle) => b.units.find(u => u.side === 'enemy')!;
const snapshot = (b: Battle) => structuredClone(b.units);
function markHit(b: Battle, hitter: Unit, amount = 1) {
  const before = snapshot(b); enemy(b).hp -= amount;
  return afterScoutAction(b, hitter, before, { ordinary: true });
}

describe('new residents: bounded ordinary-skill contracts', () => {
  it('keeps recruitment deterministic and character-specific', () => {
    expect(new Set(scoutRecruitments.map(r => r.characterId)).size).toBe(4);
    for (const offer of scoutRecruitments) expect(scoutMaidenCharacters.find(c => c.id === offer.characterId)!.recruitCost).toEqual([{ materialId: offer.materialId, count: 1 }]);
  });
  it('marks one enemy and replaces a prior mark without accumulating charges', () => {
    const b = fixture(); const ione = ally(b, 'ione');
    scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1);
    expect(enemy(b).scoutMark).toEqual({ sourceId: ione.uid, until: b.round + 1 });
    const second: Unit = { ...enemy(b), uid: 'enemy:second', scoutMark: undefined }; b.units.push(second); b.focusTargetId = second.uid;
    scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1);
    expect(enemy(b).scoutMark).toBeUndefined(); expect(second.scoutMark?.sourceId).toBe(ione.uid);
  });
  it('honors a validated command target before focus, with safe fallback for a dead target', () => {
    const b = fixture(); const ione = ally(b, 'ione'); const first = enemy(b);
    const second: Unit = { ...first, uid: 'enemy:commanded', scoutMark: undefined }; b.units.push(second); b.focusTargetId = first.uid;
    scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1, [second.uid]);
    expect(second.scoutMark?.sourceId).toBe(ione.uid); expect(first.scoutMark).toBeUndefined();
    second.hp = 0; scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1, [second.uid]);
    expect(first.scoutMark?.sourceId).toBe(ione.uid);
  });
  it('cannot recover her own mark or recover with a nonordinary action', () => {
    const b = fixture(); const ione = ally(b, 'ione'), ruka = ally(b, 'ruka');
    scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1); ione.ultimateCharge = ruka.ultimateCharge = 0;
    markHit(b, ione); expect(ione.ultimateCharge).toBe(0); expect(enemy(b).scoutMark).toBeDefined();
    const before = snapshot(b); enemy(b).hp -= 1;
    expect(afterScoutAction(b, ruka, before, { ordinary: false })).toEqual([]);
    expect(ruka.ultimateCharge).toBe(0); expect(enemy(b).scoutMark).toBeDefined();
  });
  it('gives another ally10 and a living Ione leader bonus only once per battle', () => {
    const b = fixture(); const ione = ally(b, 'ione'), ruka = ally(b, 'ruka');
    for (const u of b.units.filter(u => u.side === 'party')) u.ultimateCharge = 0;
    scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1); markHit(b, ruka);
    expect(ruka.ultimateCharge).toBe(15); expect(ione.ultimateCharge).toBe(5); expect(enemy(b).scoutMark).toBeUndefined();
    b.round++; scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1); markHit(b, ruka);
    expect(ruka.ultimateCharge).toBe(25); expect(ione.ultimateCharge).toBe(5);
  });
  it('does not grant a dead Ione leader bonus and caps charges at100', () => {
    const b = fixture(); const ione = ally(b, 'ione'), ruka = ally(b, 'ruka');
    scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1); ione.hp = 0; ruka.ultimateCharge = 98;
    markHit(b, ruka); expect(ruka.ultimateCharge).toBe(100); expect(b.scoutState?.ioneLeaderTriggered).toBeUndefined();
  });
  it('allows recovery from a killing HP hit, but not barrier-only damage', () => {
    const b = fixture(); const ione = ally(b, 'ione'), ruka = ally(b, 'ruka'); ruka.ultimateCharge = 0;
    scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1); const before = snapshot(b); enemy(b).barrier = 1;
    afterScoutAction(b, ruka, before, { ordinary: true }); expect(ruka.ultimateCharge).toBe(0);
    const killBefore = snapshot(b); enemy(b).hp = 0;
    afterScoutAction(b, ruka, killBefore, { ordinary: true }); expect(ruka.ultimateCharge).toBe(15);
  });
  it('rejects enemy-side custom actions and expires unrecovered marks', () => {
    const b = fixture(); const ione = ally(b, 'ione');
    scoutSkillAction(b, ione, SCOUT_SKILLS.mark, 1); b.round += 2; expireScoutEffects(b); expect(enemy(b).scoutMark).toBeUndefined();
    const fake = { ...ione, side: 'enemy' as const }; expect(scoutSkillAction(b, fake, SCOUT_SKILLS.mark, 1)).toBeUndefined();
  });
  it('prepares the pilot lamp, not the lowest-HP ally, and consumes it only on a boss strike', () => {
    const b = fixture('neri'); const neri = ally(b, 'neri'), pilot = ally(b, 'ione'); neri.hp = 1;
    scoutSkillAction(b, neri, SCOUT_SKILLS.lantern, 1);
    expect(pilot.scoutLanternUntil).toBe(b.round + 1); expect(neri.scoutLanternUntil).toBeUndefined();
    expect(consumeScoutLantern(pilot, b.round, false)).toBe(1); expect(pilot.scoutLanternUntil).toBeDefined();
    expect(consumeScoutLantern(pilot, b.round, true)).toBe(.75); expect(consumeScoutLantern(pilot, b.round, true)).toBe(1);
  });
  it('does not use an expired lamp or apply it to enemies', () => {
    const b = fixture(); const pilot = ally(b, 'ione'); pilot.scoutLanternUntil = b.round - 1;
    expect(consumeScoutLantern(pilot, b.round, true)).toBe(1);
    enemy(b).scoutLanternUntil = b.round + 1; expect(consumeScoutLantern(enemy(b), b.round, true)).toBe(1);
  });
  it('Neri crown reacts to deliberate defense during a warning once, preserving stronger shields', () => {
    const b = fixture('neri'); const neri = ally(b, 'neri');
    afterScoutAction(b, ally(b, 'ione'), snapshot(b), { ordinary: true }); expect(neri.barrier).toBeUndefined();
    afterScoutAction(b, ally(b, 'ione'), snapshot(b), { ordinary: true, guardedDuringWindup: true });
    expect(neri.barrier).toBe(Math.floor(neri.maxHp * .1)); expect(b.scoutState?.neriLeaderTriggered).toBe(true);
    neri.barrier = 0; b.round++;
    afterScoutAction(b, ally(b, 'ione'), snapshot(b), { ordinary: true, guardedDuringWindup: true }); expect(neri.barrier).toBe(0);
  });
  it('Fio gives half a normal heal and only real excess becomes a capped short barrier', () => {
    const b = fixture('fio'); const fio = ally(b, 'fio'), target = ally(b, 'ruka'); target.hp = target.maxHp - 3; fio.ultimateCharge = 0;
    const result = scoutSkillAction(b, fio, SCOUT_SKILLS.overflow, 1)!;
    const raw = Math.max(1, Math.floor(fio.attack * 47 / 40));
    expect(result.amount).toBe(3); expect(target.hp).toBe(target.maxHp);
    expect(target.barrier).toBe(Math.min(Math.floor(target.maxHp * .15), Math.floor((raw - 3) * .3)));
    expect(target.barrierUntil).toBe(b.round + 1); expect(fio.ultimateCharge).toBe(10);
  });
  it('Fio does not make a barrier from a heal with no excess', () => {
    const b = fixture('fio'); const fio = ally(b, 'fio'), target = ally(b, 'ruka'); target.hp = 1; fio.ultimateCharge = 0;
    scoutSkillAction(b, fio, SCOUT_SKILLS.overflow, 1);
    expect(target.barrier).toBeUndefined(); expect(fio.ultimateCharge).toBe(0); expect(b.scoutState?.fioLeaderTriggered).toBeUndefined();
  });
  it('Fio cannot lower or extend a stronger shield and receives crown charge only once', () => {
    const b = fixture('fio'); const fio = ally(b, 'fio'); fio.ultimateCharge = 0;
    for (const u of b.units.filter(u => u.side === 'party')) { u.barrier = 999; u.barrierUntil = b.round + 5; }
    scoutSkillAction(b, fio, SCOUT_SKILLS.overflow, 1);
    expect(fio.ultimateCharge).toBe(0); expect(ally(b, 'ione').barrierUntil).toBe(b.round + 5);
    for (const u of b.units.filter(u => u.side === 'party')) { delete u.barrier; delete u.barrierUntil; }
    scoutSkillAction(b, fio, SCOUT_SKILLS.overflow, 1); expect(fio.ultimateCharge).toBe(10);
    for (const u of b.units.filter(u => u.side === 'party')) { delete u.barrier; delete u.barrierUntil; }
    scoutSkillAction(b, fio, SCOUT_SKILLS.overflow, 1); expect(fio.ultimateCharge).toBe(10);
  });
  it('Ruka gets a single thread only from a living ally positive barrier natural expiration', () => {
    const b = fixture(); const ruka = ally(b, 'ruka'), donor = ally(b, 'neri'); donor.barrier = 20; donor.barrierUntil = b.round - 1;
    expect(expireScoutEffects(b)).toHaveLength(1); expect(ruka.scoutThreadUntil).toBe(b.round + 1);
    expect(expireScoutEffects(b)).toEqual([]);
    clearScoutEffects(ruka); donor.barrier = 0; expect(expireScoutEffects(b)).toEqual([]);
    donor.barrier = 20; donor.hp = 0; expect(expireScoutEffects(b)).toEqual([]);
  });
  it('overwriting, consuming, and destroying a barrier cannot produce thread', () => {
    const b = fixture(); const ruka = ally(b, 'ruka'), donor = ally(b, 'neri');
    donor.barrier = 60; donor.barrierUntil = b.round + 1; expect(expireScoutEffects(b)).toEqual([]);
    delete donor.barrier; delete donor.barrierUntil; expect(expireScoutEffects(b)).toEqual([]); expect(ruka.scoutThreadUntil).toBeUndefined();
  });
  it('Ruka spends at most one thread on her own ordinary shear and cannot reuse it', () => {
    const b = fixture(); const ruka = ally(b, 'ruka'); ruka.scoutThreadUntil = b.round + 1;
    expect(scoutDamageMultiplier(b, ruka, 'memory:attack')).toBe(1); expect(ruka.scoutThreadUntil).toBeDefined();
    expect(scoutDamageMultiplier(b, ruka, SCOUT_SKILLS.shear)).toBeCloseTo(1.69); expect(ruka.scoutThreadUntil).toBeUndefined();
    expect(scoutDamageMultiplier(b, ruka, SCOUT_SKILLS.shear)).toBe(1.3);
  });
  it('Ruka crown healing requires real HP damage and spent thread, capped once per round and3 per battle', () => {
    const b = fixture('ruka'); const ruka = ally(b, 'ruka'), target = ally(b, 'neri'); target.hp = 1;
    for (let i = 0; i < 4; i++) {
      b.round = i + 1; ruka.scoutThreadUntil = b.round + 1; const before = snapshot(b);
      scoutDamageMultiplier(b, ruka, SCOUT_SKILLS.shear); enemy(b).hp--;
      afterScoutAction(b, ruka, before, { ordinary: true, skillId: SCOUT_SKILLS.shear });
    }
    expect(b.scoutState?.rukaHeals).toBe(3); expect(target.hp).toBe(1 + Math.floor(target.maxHp * .05) * 3);
    const before = snapshot(b); afterScoutAction(b, ruka, before, { ordinary: true, skillId: SCOUT_SKILLS.shear }); expect(b.scoutState?.rukaHeals).toBe(3);
  });
  it('clears wave-local effects without refunding one-battle leader uses', () => {
    const b = fixture(); const u = ally(b, 'ruka'); u.scoutMark = { sourceId: 'x', until: 8 }; u.scoutLanternUntil = 8; u.scoutThreadUntil = 8; b.scoutState = { rukaHeals: 3, ioneLeaderTriggered: true };
    clearScoutEffects(u); expect(u.scoutMark).toBeUndefined(); expect(u.scoutLanternUntil).toBeUndefined(); expect(u.scoutThreadUntil).toBeUndefined(); expect(b.scoutState.rukaHeals).toBe(3);
  });
  it('provides specific cooldowns and conservative autonomous choices', () => {
    const b = fixture(); const neri = ally(b, 'neri'), fio = ally(b, 'fio'), ruka = ally(b, 'ruka');
    for (const id of [SCOUT_SKILLS.mark, SCOUT_SKILLS.lantern, SCOUT_SKILLS.overflow]) expect(scoutSkillCooldown(id)).toBe(4);
    expect(scoutSkillCooldown(SCOUT_SKILLS.shear)).toBe(3); expect(scoutSkillCooldown('attack-10')).toBeUndefined();
    expect(scoutSuggestedAction(neri, b, scoutMaidenSkills, false)).toBeUndefined(); expect(scoutSuggestedAction(neri, b, scoutMaidenSkills, true)?.skill.id).toBe(SCOUT_SKILLS.lantern);
    ally(b, 'ione').hp = 1; expect(scoutSuggestedAction(fio, b, scoutMaidenSkills, false)).toBeUndefined();
    ruka.scoutThreadUntil = b.round + 1; expect(scoutSuggestedAction(ruka, b, scoutMaidenSkills, false)?.skill.id).toBe(SCOUT_SKILLS.shear);
  });
});

describe('personal descriptions are shared across character and exchange details', () => {
  it('reports the real custom cooldown instead of a proxy-template cooldown', async () => {
    const { skillDescription, leaderEffectDescription } = await import('../src/domain/skill-info');
    for (const id of [SCOUT_SKILLS.mark, SCOUT_SKILLS.lantern, SCOUT_SKILLS.overflow]) {
      const skill = scoutMaidenSkills.find(s => s.id === id)!;
      expect(skillDescription(skill)).toContain('再使用4ラウンド');
      expect(skillDescription(skill)).not.toContain('再使用まで3ラウンド');
    }
    for (const c of scoutMaidenCharacters) expect(leaderEffectDescription(c)).toContain('リーダー生存中のみ有効');
  });
});
