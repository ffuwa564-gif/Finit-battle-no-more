import { describe, expect, it } from 'vitest';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { gemSkill } from '../src/domain/memory-gems';
import type { MemoryGem } from '../src/domain/memory-gems';
import type { Battle, CharacterDef, Content, DungeonDef, Role, SkillTemplate } from '../src/domain/types';

function character(id: string, role: Role, skills: string[]): CharacterDef {
  return { id, role, skillIds: skills, name: id, epithet: '', flavor: '', speciesId: 'test', strength: 10, leaderStat: 'hp', origin: ['initial'], portraitId: '', artId: '', rarity: 'R', published: true, soundProfile: 'attack' };
}
function fixture(stage: Partial<DungeonDef> = {}): Content {
  const templates: SkillTemplate[] = ['attack', 'area', 'heal', 'regen', 'barrier', 'buff', 'overclock', 'jam'];
  return {
    appVersion: 'test', contentVersion: 'test', rulesVersion: 'test', schemaVersion: 1, assets: [], species: [],
    skills: templates.map(template => ({ id: template, name: template, template, strength: template === 'area' ? 14 : 10, soundProfile: template })),
    characters: [character('warrior', 'attacker', ['attack']), character('warder', 'tank', ['barrier', 'attack']), character('noelle', 'area_attacker', ['area', 'attack']), character('hebe-standard', 'healer', ['heal', 'attack']), character('lucielle', 'supporter', ['buff', 'attack']), character('foe', 'attacker', ['attack']), character('foe-healer', 'healer', ['heal', 'regen', 'attack']), character('foe-support', 'supporter', ['overclock', 'buff', 'attack'])],
    dungeons: [{ id: 'test', name: '', subtitle: '', description: '', artId: '', published: true, waves: [[{ characterId: 'foe' }]], ...stage }],
  };
}
function finish(battle: Battle, content: Content): Battle {
  let b = battle;
  while (b.phase === 'playing') b = advanceReplay(b, content);
  return b;
}
function ready(content: Content, party: string[]): Battle {
  const b = finish(createBattle(content, party, party[0]!, 'test', 0, 77, 'combat-v110'), content);
  for (const u of b.units) { u.hp = u.maxHp = 10000; u.attack = 0; u.defense = 0; u.speed = 0; }
  b.units.find(u => u.characterId === party[0] && u.side === 'party')!.speed = 100;
  return b;
}
const party = (b: Battle, id: string) => b.units.find(u => u.characterId === id && u.side === 'party')!;

describe('v1.10 combat integration', () => {
  it('upgrades the injured ally’s thin shield instead of treating her as fully protected', () => {
    const c = fixture(), b = ready(c, ['warder', 'warrior']);
    const caster = party(b, 'warder'), target = party(b, 'warrior');
    caster.attack = 100; caster.hp = caster.maxHp = 1000; caster.barrier = 500; caster.barrierUntil = 9;
    target.maxHp = 1000; target.hp = 500; target.barrier = 55; target.barrierUntil = 2;
    const old = structuredClone(b);
    const action = resolveRound(b, c).battle.events.find(e => e.actorId === caster.uid && e.actionSelection)!;
    expect(action.skillId).toBe('barrier'); expect(action.targetIds).toEqual([target.uid]);
    expect(action.unitsAfter!.find(u => u.uid === target.uid)!.barrier).toBe(180);
    expect(b).toEqual(old);
  });
  it('does not replace a stronger shield or extend its duration with a weaker manual skill', () => {
    const c = fixture(), b = ready(c, ['warder', 'warrior']);
    const target = party(b, 'warrior'); target.attack = 100; target.barrier = 5000; target.barrierUntil = 9;
    b.partyOrder = { kind: 'skill', skillId: 'barrier' };
    const action = resolveRound(b, c).battle.events.find(e => e.actorId === 'party:warder' && e.actionSelection)!;
    const after = action.unitsAfter!.find(u => u.uid === target.uid)!;
    expect([after.barrier, after.barrierUntil]).toEqual([5000, 9]);
  });
  it('records the named healer’s extra actual healing in the same replay action amount', () => {
    const c = fixture(), b = ready(c, ['hebe-standard', 'warrior']);
    const healer = party(b, 'hebe-standard'), target = party(b, 'warrior');
    healer.attack = 5; target.maxHp = 1000; target.hp = 100;
    const action = resolveRound(b, c).battle.events.find(e => e.actorId === healer.uid && e.actionSelection)!;
    expect(action.skillId).toBe('heal'); expect(action.amount).toBe(45);
    expect(action.text).toContain('祈りの後押し');
    expect(action.unitsAfter!.find(u => u.uid === target.uid)!.hp).toBe(145);
    expect(action.unitsAfter!.find(u => u.uid === target.uid)!.barrier).toBeUndefined();
  });
  it('keeps Lucielle’s existing stronger buff in the replay snapshot of a manual buff', () => {
    const c = fixture(), b = ready(c, ['lucielle', 'warrior']);
    const target = party(b, 'warrior'); target.attack = 100; target.buffStrength = 70; target.buffUntil = 8;
    b.partyOrder = { kind: 'skill', skillId: 'buff' };
    const action = resolveRound(b, c).battle.events.find(e => e.actorId === 'party:lucielle' && e.actionSelection)!;
    expect(action.text).toContain('銀灯の保護');
    const after = action.unitsAfter!.find(u => u.uid === target.uid)!;
    expect([after.buffStrength, after.buffUntil]).toEqual([70, 8]);
  });
  it('spends the enemy’s finite healing budget and then attacks, with a fresh budget next wave', () => {
    const wave = [{ characterId: 'foe-healer' }, { characterId: 'foe' }];
    const c = fixture({ towerBattle: { healLimit: 3, barrierLimit: 2 }, waves: [wave, wave] });
    let b = ready(c, ['warrior']);
    for (let r = 0; r < 4; r++) {
      const enemy = b.units.find(u => u.characterId === 'foe-healer')!; enemy.speed = 100; enemy.cooldowns = {}; enemy.hp = 500;
      b.units.find(u => u.characterId === 'foe')!.hp = 100;
      const result = resolveRound(b, c).battle;
      const action = result.events.find(e => e.actorId === enemy.uid && e.actionSelection)!;
      expect(action.skillId).toBe(r < 3 ? 'heal' : 'attack');
      expect(result.units.find(u => u.uid === enemy.uid)!.towerSupportUsed?.healing).toBe(3 > r + 1 ? r + 1 : 3);
      b = finish(result, c);
    }
    b.scoutState = { rukaHeals: 2, rukaHealRound: 3, ioneLeaderTriggered: true };
    b.phase = 'playing'; b.nextPhase = 'wave'; b.events = []; b.cursor = 0;
    b = finish(b, c);
    expect(b.wave).toBe(1);
    expect(b.units.filter(u => u.side === 'enemy').every(u => u.towerSupportUsed === undefined)).toBe(true);
    expect(b.scoutState).toEqual({ rukaHeals: 2, ioneLeaderTriggered: true });
  });
  it('uses a visible phantom overclock adaptation only in tower encounters', () => {
    for (const tower of [true, false]) {
      const c = fixture({ ...(tower ? { towerBattle: { healLimit: 3, barrierLimit: 2 } } : {}), waves: [[{ characterId: 'foe-support' }, { characterId: 'foe' }]] });
      const b = ready(c, ['warrior']), caster = b.units.find(u => u.characterId === 'foe-support')!, target = b.units.find(u => u.characterId === 'foe')!;
      caster.hp = caster.maxHp = 1000; caster.speed = 100; target.attack = 80;
      const action = resolveRound(b, c).battle.events.find(e => e.actorId === caster.uid && e.actionSelection)!;
      expect(action.skillId).toBe(tower ? 'overclock' : 'buff');
      if (tower) { expect(action.text).toContain('幻影送電'); expect(action.unitsAfter!.find(u => u.uid === caster.uid)!.hp).toBe(900); }
      expect(action.unitsAfter!.find(u => u.uid === target.uid)!.buffStrength).toBe(10);
    }
  });
  it('applies the crafted wick reference only to its first hit and schedules one native35% echo', () => {
    const c = fixture(), b = ready(c, ['warrior']); party(b, 'warrior').attack = 10;
    const gem: MemoryGem = { id: 'wick', defId: 'wick-stone', variant: 'pure', roll: { power: 80, trait: 'none', value: 0 } };
    b.memoryGems = { warrior: gem }; b.partyOrder = { kind: 'skill', skillId: gemSkill(gem).id };
    const first = resolveRound(b, c).battle;
    const action = first.events.find(e => e.actorId === 'party:warrior' && e.actionSelection)!;
    expect(action.amount).toBe(123); expect(first.memoryEchoes).toHaveLength(1); expect(first.memoryEchoes![0]!.power).toBe(43);
    const second = finish(first, c); second.partyOrder = { kind: 'guard' };
    const next = resolveRound(second, c).battle;
    expect(next.events.filter(e => e.text.includes('・残響'))).toHaveLength(1);
    expect(next.events.find(e => e.text.includes('・残響'))!.amount).toBe(43);
    expect(next.memoryEchoes).toBeUndefined();
    expect(party(next, 'warrior').attack).toBe(10);
  });
});
