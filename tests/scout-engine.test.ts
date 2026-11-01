import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { gemSkill } from '../src/domain/memory-gems';
import { scoutMaidenCharacters, scoutMaidenSkills } from '../src/content/scout-maidens';
import { SCOUT_SKILLS } from '../src/domain/scout-skills';
import type { Battle, Content, Unit } from '../src/domain/types';

const ids = scoutMaidenCharacters.map(c => c.id);
const stage = { id: 'scout-engine-stage', kind: 'normal' as const, name: 'scout-engine-stage', subtitle: '', description: '', artId: 'cathedral', published: true, waves: [[{ characterId: 'pale-wolf', boss: true }]], bossStrike: { every: 2, power: 100, name: 'scout-test-strike', target: 'pilot' as const, windup: { breakPercent: 99, weakenedPower: 100, recoveryPercent: 0 } } };
const lab: Content = { ...content, characters: [...content.characters.filter(c => !ids.includes(c.id)), ...scoutMaidenCharacters], skills: [...content.skills.filter(s => !scoutMaidenSkills.some(x => x.id === s.id)), ...scoutMaidenSkills], dungeons: [...content.dungeons, stage] };
function ready(b: Battle): Battle { while (b.phase === 'playing') { b.cursor = b.events.length - 1; b = advanceReplay(b, lab); } return b; }
function fixture(party: string[], leader = party[0]) { const b = ready(createBattle(lab, party, leader, stage.id, 0, 632, 'scout-engine-test')); const e = b.units.find(u => u.side === 'enemy')!; e.hp = e.maxHp = 5000; e.speed = 1; e.attack = 1; return b; }
const ally = (b: Battle, id: string) => b.units.find(u => u.side === 'party' && u.characterId === id)!;
const foe = (b: Battle) => b.units.find(u => u.side === 'enemy')!;
const finish = (b: Battle) => ready(resolveRound(b, lab).battle);

describe('resident mechanics wired into real battle rounds', () => {
  it('creates and recovers Ione marks via actual ordinary actions, retaining the4R cooldown', () => {
    let b = fixture(['ione', 'ruka']);
    b.partyOrder = { kind: 'skill', skillId: SCOUT_SKILLS.mark }; b = finish(b);
    expect(foe(b).scoutMark?.sourceId).toBe(ally(b, 'ione').uid);
    expect(ally(b, 'ione').cooldowns[SCOUT_SKILLS.mark]).toBe(5);
    b.partyOrder = { kind: 'guard' }; const r = resolveRound(b, lab).battle;
    expect(r.events.some(e => e.text.includes('宛先の余白を受け取った'))).toBe(true);
    expect(r.scoutState?.ioneLeaderTriggered).toBe(true);
  });
  it('does not recover a mark from an equipped memory attack or its delayed echo', () => {
    let b = fixture(['ruka', 'ione'], 'ione');
    const stone = { id: 'scout-echo', defId: 'echo-shard', variant: 'pure' as const, roll: { power: 80, trait: 'none' as const, value: 0 } };
    b.memoryGems = { ruka: stone }; foe(b).scoutMark = { sourceId: ally(b, 'ione').uid, until: b.round + 1 };
    b.partyOrder = { kind: 'skill', skillId: gemSkill(stone).id }; b = finish(b);
    expect(b.events.some(e => e.text.includes('宛先の余白を受け取った'))).toBe(false);
    expect(foe(b).scoutMark).toBeDefined();
    b.partyOrder = { kind: 'guard' }; b = finish(b);
    expect(b.events.some(e => e.text.includes('宛先の余白を受け取った'))).toBe(false);
  });
  it('Fio ordinary custom heal produces bounded excess and her one-time leader charge', () => {
    let b = fixture(['fio']); b.partyOrder = { kind: 'skill', skillId: SCOUT_SKILLS.overflow }; b = finish(b);
    expect(b.events.some(e => e.skillId === SCOUT_SKILLS.overflow && e.actionSelection)).toBe(true);
    expect(ally(b, 'fio').barrier).toBeGreaterThan(0);
    expect(ally(b, 'fio').barrier).toBeLessThanOrEqual(Math.floor(ally(b, 'fio').maxHp * .15));
    expect(ally(b, 'fio').ultimateCharge).toBe(35); expect(b.scoutState?.fioLeaderTriggered).toBe(true);
    expect(ally(b, 'fio').cooldowns[SCOUT_SKILLS.overflow]).toBe(5);
  });
  it('Neri lamp leaves ordinary hits untouched and reduces precisely one telegraphed strike', () => {
    let b = fixture(['neri']); foe(b).attack = 70;
    b.partyOrder = { kind: 'skill', skillId: SCOUT_SKILLS.lantern }; b = finish(b);
    expect(ally(b, 'neri').scoutLanternUntil).toBe(2);
    b.partyOrder = { kind: 'attack' }; const without = structuredClone(b); delete ally(without, 'neri').scoutLanternUntil;
    const protectedBattle = resolveRound(b, lab).battle; const unprotectedBattle = resolveRound(without, lab).battle;
    const damage = (x: Battle) => x.events.find(e => e.bossStrike)!.amount!;
    expect(damage(protectedBattle)).toBe(Math.max(1, Math.floor(damage(unprotectedBattle) * .75)));
    expect(ally(protectedBattle, 'neri').scoutLanternUntil).toBeUndefined();
  });
  it('a naturally expiring ally shield is detected before native effect clearing and powers Ruka', () => {
    let b = fixture(['neri', 'ruka'], 'ruka'); const donor = ally(b, 'neri'); donor.barrier = 20; donor.barrierUntil = 0; donor.hp = Math.floor(donor.maxHp * .7);
    b.partyOrder = { kind: 'guard' }; const r = resolveRound(b, lab).battle;
    expect(r.events.some(e => e.skillId === SCOUT_SKILLS.shear)).toBe(true);
    expect(r.events.some(e => e.text.includes('継がれる灯'))).toBe(true);
    expect(r.scoutState?.rukaHeals).toBe(1); expect(ally(r, 'ruka').scoutThreadUntil).toBeUndefined();
  });
  it('wave transitions erase transient marks, lamps and threads without refunding leader limits', () => {
    const twoWave = { ...stage, id: 'scout-two-wave', waves: [...stage.waves, ...stage.waves] };
    const c = { ...lab, dungeons: [...lab.dungeons, twoWave] };
    let b = createBattle(c, ['ione', 'ruka'], 'ione', twoWave.id, 0, 123, 'scout-wave');
    b.phase = 'playing'; b.nextPhase = 'wave'; b.events = []; b.cursor = -1;
    for (const u of b.units) { u.scoutMark = { sourceId: 'party:ione', until: 99 }; u.scoutLanternUntil = 99; u.scoutThreadUntil = 99; }
    b.scoutState = { ioneLeaderTriggered: true, rukaHeals: 3 }; b = advanceReplay(b, c);
    for (const u of b.units) { expect(u.scoutMark).toBeUndefined(); expect(u.scoutLanternUntil).toBeUndefined(); expect(u.scoutThreadUntil).toBeUndefined(); }
    expect(b.scoutState).toEqual({ ioneLeaderTriggered: true, rukaHeals: 3 });
  });
});

describe('ordinary automatic skill reachability', () => {
  it('Ione uses both her shared buff and unique mark without a manual skill order', () => {
    let b = fixture(['ruka', 'ione'], 'ruka'); const skills = new Set<string>();
    for (let i = 0; i < 6; i++) {
      b.partyOrder = { kind: 'guard' }; b = finish(b);
      for (const e of b.events) if (e.actorId === 'party:ione' && e.actionSelection && e.skillId) skills.add(e.skillId);
    }
    expect(skills.has(SCOUT_SKILLS.mark)).toBe(true); expect(skills.has('buff-16')).toBe(true);
  });
  it('Fio prepares excess protection at low pressure, then uses full healing for an emergency', () => {
    let b = fixture(['ruka', 'fio'], 'ruka'); b.partyOrder = { kind: 'guard' }; b = finish(b);
    expect(b.events.some(e => e.actorId === 'party:fio' && e.actionSelection && e.skillId === SCOUT_SKILLS.overflow)).toBe(true);
    ally(b, 'ruka').hp = 1; b.partyOrder = { kind: 'guard' }; b = finish(b);
    expect(b.events.some(e => e.actorId === 'party:fio' && e.actionSelection && e.skillId === 'heal-17')).toBe(true);
  });
});
