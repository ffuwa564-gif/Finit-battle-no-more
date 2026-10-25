import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { skillCooldown, skillDescription } from '../src/domain/skill-info';
import { tr } from '../src/locales/i18n';
import type { Battle } from '../src/domain/types';

function ready(id = 'athena'): Battle {
  let battle = createBattle(content, ['seris', id, 'elaine', 'noelle'], 'seris', 'silent-cathedral', 0, 42, 'rally-test');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  for (const unit of battle.units) {
    unit.hp = unit.maxHp = 10000;
    if (unit.side === 'enemy') { unit.attack = 0; unit.speed = 0; }
  }
  const actor = battle.units.find(unit => unit.characterId === id)!;
  actor.speed = 100;
  // Test the support action separately from her existing protection priority.
  actor.cooldowns[content.characters.find(character => character.id === id)!.skillIds[0]!] = 99;
  return battle;
}
const cast = (battle: Battle) => resolveRound(battle, content).battle.events.find(event => event.actorId === battle.units.find(unit => unit.characterId.startsWith('athena'))!.uid)!;

describe('War Goddess Rally', () => {
  it.each(['athena', 'athena-standard'])('is an active skill for %s even as a nonleader, targeting living allies only', id => {
    const battle = ready(id);
    battle.units.find(unit => unit.characterId === 'elaine')!.hp = 0;
    const event = cast(battle);
    const skill = content.skills.find(skill => skill.id === event.skillId)!;
    expect(skill.template).toBe('rally');
    expect(skillCooldown(skill.template)).toBe(4);
    expect(event.kind).toBe('buff'); expect(event.amount).toBe(0);
    expect(event.targetIds).toEqual(battle.units.filter(unit => unit.side === 'party' && unit.hp > 0).map(unit => unit.uid));
    for (const unit of event.unitsAfter!) {
      if (event.targetIds!.includes(unit.uid)) {
        expect(unit.buffStrength).toBe(skill.strength); expect(unit.buffUntil).toBe(2);
      } else expect(unit.buffUntil).toBeUndefined();
    }
    expect(event.unitsAfter!.find(unit => unit.uid === event.actorId)!.cooldowns[skill.id]).toBe(5);
    expect(battle.units.every(unit => unit.buffUntil === undefined)).toBe(true);
    expect(tr(skillDescription(skill), 'en')).toContain('Reuse interval: 4 rounds');
  });

  it('increases subsequent ally damage without increasing enemy damage', () => {
    const battle = ready();
    const baseline = structuredClone(battle);
    baseline.units.find(unit => unit.characterId === 'athena')!.cooldowns['rally-23'] = 99;
    const rally = resolveRound(battle, content).battle;
    const plain = resolveRound(baseline, content).battle;
    const hit = (result: Battle, id: string) => result.events.find(event => event.actorId === id && event.kind === 'attack')!.amount!;
    expect(hit(rally, 'party:seris')).toBeGreaterThan(hit(plain, 'party:seris'));
    const enemy = battle.units.find(unit => unit.side === 'enemy')!;
    expect(hit(rally, enemy.uid)).toBe(hit(plain, enemy.uid));
  });

  it('preserves a stronger, longer boost and upgrades weaker boosts without stacking', () => {
    const battle = ready();
    const strong = battle.units.find(unit => unit.characterId === 'seris')!;
    strong.buffStrength = 30; strong.buffUntil = 4;
    const weak = battle.units.find(unit => unit.characterId === 'noelle')!;
    weak.buffStrength = 10; weak.buffUntil = 2;
    const event = cast(battle);
    expect(event.unitsAfter!.find(unit => unit.uid === strong.uid)).toMatchObject({ buffStrength: 30, buffUntil: 4 });
    expect(event.unitsAfter!.find(unit => unit.uid === weak.uid)).toMatchObject({ buffStrength: 23, buffUntil: 2 });
  });

  it('avoids a redundant cast and does not issue orders when alone or asleep', () => {
    const battle = ready();
    for (const unit of battle.units.filter(unit => unit.side === 'party')) { unit.buffStrength = 30; unit.buffUntil = 3; }
    expect(cast(battle).skillId).not.toBe('rally-23');
    const solo = ready();
    for (const unit of solo.units.filter(unit => unit.side === 'party' && unit.characterId !== 'athena')) unit.hp = 0;
    expect(cast(solo).skillId).not.toBe('rally-23');
    const asleep = ready();
    asleep.units.find(unit => unit.characterId === 'athena')!.ailments = { sleep: { turns: 2, sourceId: 'test' } };
    expect(cast(asleep).statusAction).toBe('skip');
  });

  it('retains guard priority and expires after next round, with cooldown surviving replay and cloning', () => {
    const guarding = ready();
    guarding.units.find(unit => unit.characterId === 'athena')!.cooldowns = {};
    expect(cast(guarding).skillId).toBe('guard-23');
    let battle = resolveRound(ready(), content).battle;
    for (let round = 2; round <= 5; round++) {
      while (battle.phase === 'playing') battle = advanceReplay(battle, content);
      battle = structuredClone(battle);
      expect(battle.round).toBe(round);
      if (round === 2) expect(battle.units.find(unit => unit.characterId === 'seris')!.buffUntil).toBe(2);
      const event = cast(battle);
      if (round < 5) expect(event.skillId).not.toBe('rally-23');
      else expect(event.skillId).toBe('rally-23');
      if (round === 3) expect(event.unitsAfter!.find(unit => unit.characterId === 'seris')!.buffUntil).toBeUndefined();
      battle = resolveRound(battle, content).battle;
    }
  });
});
