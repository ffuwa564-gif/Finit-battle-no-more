import { describe, expect, it } from 'vitest';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { commandCapacity, commandCost, commandLoad, validateCommandOrder } from '../src/domain/command-doctrine';
import { gemSkill } from '../src/domain/memory-gems';
import type { Battle, CharacterDef, Content, SkillTemplate } from '../src/domain/types';
const character = (id: string, skillIds: string[] = ['attack'], rarity: CharacterDef['rarity'] = 'R'): CharacterDef => ({ id, skillIds, rarity, name: id, role: 'attacker', epithet: '', flavor: '', speciesId: 'test', strength: 10, leaderStat: 'hp', origin: ['initial'], portraitId: '', artId: '', published: true, soundProfile: 'attack' });
function fixture(): Content {
  const templates: SkillTemplate[] = ['attack', 'area', 'heal', 'debuff'];
  return { appVersion: 'test', contentVersion: 'test', rulesVersion: 'test', schemaVersion: 1, assets: [], species: [], skills: templates.map(template => ({ id: template, name: template, template, strength: 10, soundProfile: template })), characters: [character('noelle', ['area', 'attack']), character('noelle-awakened', ['area', 'attack'], 'SSR'), character('a'), character('b'), character('healer', ['heal', 'attack']), character('area', ['area', 'attack']), character('rare', ['attack'], 'SSR'), character('foe'), character('foe2')], dungeons: [{ id: 'test', name: '', subtitle: '', description: '', artId: '', published: true, waves: [[{ characterId: 'foe' }, { characterId: 'foe2' }]] }] };
}
function replay(b: Battle, c: Content): Battle { while (b.phase === 'playing') b = advanceReplay(b, c); return b; }
function ready(c = fixture(), ids = ['a', 'noelle', 'b']): Battle {
  const b = replay(createBattle(c, ids, 'noelle', 'test', 0, 7, 'command-test'), c);
  for (const u of b.units) { u.maxHp = u.hp = 5000; u.attack = 50; u.defense = 0; u.speed = u.side === 'enemy' ? 1 : 50; u.ultimateCharge = 0; }
  unit(b, 'noelle').speed = 0;
  unit(b, 'foe').hp = 1000; unit(b, 'foe2').hp = 4000;
  return b;
}
function unit(b: Battle, id: string) { return b.units.find(u => u.characterId === id)!; }
function reserve(b: Battle, followers = ['a', 'b']) { b.commandOrder = { targetId: unit(b, 'foe2').uid, followerIds: followers.map(id => unit(b, id).uid) }; return b; }
function selections(b: Battle, id: string) { return b.events.filter(e => e.actorId === unit(b, id).uid && e.actionSelection); }

describe('visible Noelle command capacity and validation', () => {
  it('provides3/4 slots only for the two Noelle forms', () => { expect(['noelle', 'noelle-awakened', 'a'].map(commandCapacity)).toEqual([3, 4, 0]); });
  it('keeps actual awakening load but counts separate costumes independently', () => {
    const c = fixture(); c.characters.push({ ...character('a-aw', ['attack'], 'SSR'), familyId: 'a' }, { ...character('a-costume', ['attack'], 'SSR'), familyId: 'a' });
    c.awakenings = [{ id: 'test-growth', baseId: 'a', awakenedId: 'a-aw', cost: { materialId: 'x', count: 1 }, requiredOwnedIds: [], requiredDungeonIds: [] }];
    expect(commandCost('a-aw', c)).toBe(1); expect(commandCost('a-costume', c)).toBe(3);
  });
  it('uses UIDs, rejects duplicates, commander and overload; does not consume RNG', () => {
    const c = fixture(), b = reserve(ready(c)); const before = structuredClone(b);
    expect(commandLoad(b.commandOrder!, b, c)).toBe(2); expect(validateCommandOrder(b.commandOrder, b, c)).toEqual(b.commandOrder);
    expect(() => validateCommandOrder({ ...b.commandOrder, followerIds: ['party:a', 'party:a'] }, b, c)).toThrow();
    expect(() => validateCommandOrder({ ...b.commandOrder, followerIds: ['party:noelle'] }, b, c)).toThrow();
    const large = ready(c, ['a', 'noelle', 'rare']); reserve(large, ['a', 'rare']); expect(() => validateCommandOrder(large.commandOrder, large, c)).toThrow('負荷'); expect(b).toEqual(before);
  });
  it('retains a dead saved target through an off-turn replay but rejects a fresh dead reservation', () => {
    const c = fixture(), b = reserve(ready(c)); unit(b, 'foe2').hp = 0;
    expect(() => validateCommandOrder(b.commandOrder, b, c)).toThrow(); expect(validateCommandOrder(b.commandOrder, b, c, { stored: true })).toEqual(b.commandOrder);
    expect(resolveRound(b, c).battle.events.some(e => e.text.includes('星図の号令'))).toBe(false);
  });
});

describe('native command action ownership and timing', () => {
  it('issues before fast actors, spends the slow commander normal action and charges exactly25', () => {
    const c = fixture(), b = reserve(ready(c)), before = structuredClone(b); const result = resolveRound(b, c).battle;
    const commands = selections(result, 'noelle'); expect(commands).toHaveLength(1); expect(commands[0]!.text).toContain('星図の号令');
    expect(result.events.filter(e => e.actionSelection)[0]!.actorId).toBe('party:noelle');
    expect(unit(result, 'noelle').ultimateCharge).toBe(25); expect(result.commandOrder).toBeUndefined(); expect(result.commandIssuedRound).toBeUndefined(); expect(b).toEqual(before);
    for (const id of ['a', 'b']) expect(selections(result, id)[0]!.targetIds).toEqual([unit(b, 'foe2').uid]);
  });
  it('keeps the command when a faster enemy kills the commander after issue', () => {
    const c = fixture(), b = reserve(ready(c)); unit(b, 'noelle').hp = 1; unit(b, 'foe').speed = 100; unit(b, 'foe').attack = 99999;
    const result = resolveRound(b, c).battle; expect(unit(result, 'noelle').hp).toBe(0);
    expect(selections(result, 'a')[0]!.text).toContain('号令の宛先');
  });
  it('a blocked or dead commander does not issue or steal the native status action', () => {
    for (const dead of [false, true]) { const c = fixture(), b = reserve(ready(c)); if (dead) unit(b, 'noelle').hp = 0; else unit(b, 'noelle').ailments = { sleep: { turns: 1, sourceId: unit(b, 'foe').uid } };
      const result = resolveRound(b, c).battle; expect(result.events.some(e => e.text.includes('星図の号令'))).toBe(false); if (!dead) expect(result.events.some(e => e.actorId === 'party:noelle' && e.statusAction === 'skip')).toBe(true);
    }
  });
  it('preserves an explicit pilot attack and other follower queued ultimate', () => {
    const c = fixture(), b = reserve(ready(c)); b.partyOrder = { kind: 'attack' }; b.focusTargetId = unit(b, 'foe').uid; unit(b, 'b').ultimateCharge = 100; unit(b, 'b').ultimateQueued = true;
    const result = resolveRound(b, c).battle; expect(selections(result, 'a')[0]!.targetIds).toEqual([unit(b, 'foe').uid]); expect(selections(result, 'a')[0]!.text).not.toContain('号令の宛先');
    expect(selections(result, 'b')[0]!.ultimate).toBe(true); expect(selections(result, 'b')[0]!.text).not.toContain('号令の宛先');
  });
  it('does not redirect an area skill or ally healing', () => {
    const c = fixture(); c.characters.find(ch => ch.id === 'area')!.role = 'area_attacker'; const b = reserve(ready(c, ['area', 'noelle', 'healer']), ['area', 'healer']); c.characters.find(ch => ch.id === 'healer')!.role = 'healer'; unit(b, 'healer').hp = 100;
    const result = resolveRound(b, c).battle; expect(selections(result, 'area')[0]!.targetIds).toHaveLength(2); expect(selections(result, 'area')[0]!.text).not.toContain('号令の宛先'); expect(selections(result, 'healer')[0]!.targetIds).toEqual(['party:healer']);
  });
  it('does not redirect a memory stone attack', () => {
    const c = fixture(), b = reserve(ready(c)); const stone = { id: 'test-echo', defId: 'echo-shard', variant: 'pure' as const }; b.memoryGems = { a: stone }; b.partyOrder = { kind: 'skill', skillId: gemSkill(stone).id }; b.focusTargetId = unit(b, 'foe').uid;
    const result = resolveRound(b, c).battle; expect(selections(result, 'a')[0]!.skillId).toBe(gemSkill(stone).id); expect(selections(result, 'a')[0]!.text).not.toContain('号令の宛先');
  });
  it('uses normal guard redirection after the nominated destination', () => {
    const c = fixture(), b = reserve(ready(c)); const guard = unit(b, 'foe'); guard.guardTarget = unit(b, 'foe2').uid; guard.guardUntil = 4; guard.guardStrength = 20;
    const result = resolveRound(b, c).battle; expect(selections(result, 'a')[0]!.targetIds).toEqual([guard.uid]);
  });
  it('reverts to current native judgement after the designated target dies, without refund', () => {
    const c = fixture(), b = reserve(ready(c)); unit(b, 'foe2').hp = 1; unit(b, 'a').speed = 100;
    const result = resolveRound(b, c).battle; expect(selections(result, 'a')[0]!.targetIds).toEqual([unit(b, 'foe2').uid]); expect(selections(result, 'b')[0]!.targetIds).toEqual([unit(b, 'foe').uid]); expect(selections(result, 'b')[0]!.text).not.toContain('号令の宛先'); expect(selections(result, 'noelle')).toHaveLength(1);
  });
  it('does not redirect status-forced attacks or consume the blocked follower’s slot elsewhere', () => {
    const c = fixture(), b = reserve(ready(c)); unit(b, 'a').ailments = { charm: { turns: 2, sourceId: unit(b, 'foe').uid } }; unit(b, 'b').ailments = { sleep: { turns: 1, sourceId: unit(b, 'foe').uid } };
    const result = resolveRound(b, c).battle; const forced = selections(result, 'a')[0]!;
    expect(forced.statusAction).toBe('friendly_fire'); expect(forced.text).not.toContain('号令の宛先'); expect(forced.targetIds!.every(id => id.startsWith('party:'))).toBe(true);
    expect(result.events.some(e => e.actorId === 'party:b' && e.statusAction === 'skip')).toBe(true); expect(selections(result, 'noelle')).toHaveLength(1);
  });
  it('removes a pending reservation on a wave transition', () => {
    const c = fixture(); c.dungeons[0]!.waves.push([{ characterId: 'foe' }]); let b = reserve(ready(c));
    b.phase = 'playing'; b.nextPhase = 'wave'; b.events = []; b.cursor = 0; b = advanceReplay(b, c);
    expect(b.wave).toBe(1); expect(b.commandOrder).toBeUndefined(); expect(b.commandIssuedRound).toBeUndefined();
  });
  it('rests that round extra resonance without changing leader stats; ordinary path remains exact', () => {
    const c = fixture(); c.characters.find(ch => ch.id === 'noelle')!.leaderEffect = 'resonance'; c.characters.find(ch => ch.id === 'a')!.role = 'area_attacker'; c.characters.find(ch => ch.id === 'a')!.skillIds = ['area', 'attack'];
    const b = ready(c); const absent = resolveRound(b, c); const missing = structuredClone(b); delete missing.commandOrder; expect(resolveRound(missing, c)).toEqual(absent);
    const same = structuredClone(b); same.commandOrder = { targetId: unit(b, 'foe').uid, followerIds: ['party:a'] }; const commanded = resolveRound(same, c);
    expect(selections(commanded.battle, 'a')[0]!.amount).toBeLessThan(selections(absent.battle, 'a')[0]!.amount!); expect(unit(commanded.battle, 'a').maxHp).toBe(unit(absent.battle, 'a').maxHp);
  });
});
