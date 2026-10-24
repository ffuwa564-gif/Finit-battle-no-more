import { describe, expect, it } from 'vitest';
import { advanceReplay, baseStats, characterStats, createBattle, dungeonDifficulty, leaderBonus, recruitCost, resolveRound, usePotion } from '../src/domain/engine';
import type { Battle, CharacterDef, Content, Role, SkillTemplate } from '../src/domain/types';

function definition(id: string, role: Role, skillIds: string[]): CharacterDef {
  return { id, name: id, epithet: '', flavor: '', speciesId: 'ashen', role, strength: 10, leaderStat: 'hp', skillIds, portraitId: 'test', artId: 'test', origin: ['initial', 'recruit'], rarity: 'R', published: true, soundProfile: 'test' };
}
const templates: SkillTemplate[] = ['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'pierce', 'drain', 'regen', 'barrier', 'cleanse'];
function fixture(): Content {
  return { appVersion: 'test', contentVersion: 'test', rulesVersion: 'test', schemaVersion: 1, assets: [], species: [{ id: 'ashen', name: 'ashen' }], skills: templates.map((template) => ({ id: template, name: template, template, strength: 10, soundProfile: template })), characters: [definition('tank', 'tank', ['guard', 'attack']), definition('hero', 'attacker', ['attack', 'area']), definition('healer', 'healer', ['heal', 'attack']), definition('enemy', 'attacker', ['attack', 'area'])], dungeons: [{ id: 'dungeon', name: '', subtitle: '', description: '', artId: '', published: true, waves: [[{ characterId: 'enemy' }], [{ characterId: 'enemy', boss: true }]] }] };
}
function finish(input: Battle, content: Content): Battle {
  let battle = input;
  for (let i = 0; i < 100 && battle.phase === 'playing'; i++) battle = advanceReplay(battle, content);
  return battle;
}
function start(content = fixture(), party = ['tank', 'hero', 'healer']): Battle {
  return finish(createBattle(content, party, party[0]!, 'dungeon', 5, 42, 'run'), content);
}

describe('shared character rules', () => {
  it('shares base stats across sides, then applies boss and leader separately', () => {
    const tank = { ...fixture().characters[0]!, strength: 15 };
    expect(baseStats(tank)).toEqual({ hp: 240, attack: 27, defense: 39, speed: 18 });
    expect(characterStats(tank, undefined, true)).toEqual({ hp: 720, attack: 32, defense: 39, speed: 18 });
    expect(leaderBonus(tank)).toEqual({ stat: 'hp', percent: 12 });
    expect(characterStats(tank, tank).hp).toBe(269);
    expect(recruitCost({ ...tank, strength: 20 })).toEqual([{ materialId: 'ashen:common', count: 8 }, { materialId: 'ashen:rare', count: 2 }, { materialId: 'ashen:epic', count: 1 }]);
  });
  it('rejects duplicate parties and includes boss load in dungeon difficulty', () => {
    const content = fixture();
    expect(() => createBattle(content, ['hero', 'hero'], 'hero', 'dungeon', 0, 1, 'run')).toThrow();
    expect(dungeonDifficulty(content.dungeons[0]!, content)).toBe(2.1);
  });
});

describe('rounds and replay', () => {
  it('acts once per surviving unit, deterministically and without input mutation', () => {
    const content = fixture(); const battle = start(content); const original = structuredClone(battle);
    const result = resolveRound(battle, content);
    const actionIds = result.battle.events.filter((event) => event.actorId && ['attack', 'area', 'heal', 'guard', 'buff', 'debuff'].includes(event.kind)).map((event) => event.actorId);
    expect(new Set(actionIds).size).toBe(actionIds.length);
    expect(actionIds).toHaveLength(4);
    expect(result).toEqual(resolveRound(JSON.parse(JSON.stringify(battle)) as Battle, content));
    expect(battle).toEqual(original);
    expect(result.battle.phase).toBe('playing');
    expect(result.battle.initialUnits).toEqual(battle.units);
    expect(() => resolveRound(result.battle, content)).toThrow();
  });
  it('uses guard before damage and enforces its full next-round cooldown', () => {
    const content = fixture(); const battle = start(content, ['tank', 'hero']);
    battle.units.find((unit) => unit.characterId === 'hero')!.hp = 40;
    battle.units.find((unit) => unit.side === 'enemy')!.hp = 10000;
    const one = resolveRound(battle, content).battle;
    expect(one.events[0]?.kind).toBe('guard');
    const enemyAttack = one.events.find((event) => event.actorId?.startsWith('enemy:') && event.kind === 'attack');
    expect(enemyAttack?.targetIds).toEqual(['party:tank']);
    expect(one.units.find((unit) => unit.characterId === 'hero')?.hp).toBe(40);
    const next = finish(one, content);
    expect(next.round).toBe(2);
    const two = resolveRound(next, content).battle;
    expect(two.events.some((event) => event.actorId === 'party:tank' && event.kind === 'guard')).toBe(false);
    expect(finish(two, content).round).toBe(3);
  });
  it('charges potion use only once in a command window and heals live allies only', () => {
    const battle = start(); const hero = battle.units.find((unit) => unit.characterId === 'hero')!; hero.hp = 5;
    const used = usePotion(battle, hero.uid);
    expect(used.units.find((unit) => unit.uid === hero.uid)?.hp).toBe(37);
    expect(used.potionsRemaining).toBe(4);
    expect(() => usePotion(used, hero.uid)).toThrow();
    expect(battle.potionsRemaining).toBe(5);
    battle.units.find((unit) => unit.characterId === 'healer')!.hp = 0;
    expect(() => usePotion(battle, 'party:healer')).toThrow();
  });
  it('keeps drops provisional and waits for replay before the next Wave', () => {
    const content = fixture(); const battle = start(content);
    battle.units.find((unit) => unit.side === 'enemy')!.hp = 1;
    Object.assign(battle.units.find(unit => unit.side === 'party')!, { barrier: 100, barrierUntil: 9, regenUntil: 9, regenStrength: 16 });
    const result = resolveRound(battle, content);
    expect(result.discoveredIds).toEqual(['enemy']);
    expect(result.goldEarned).toBe(5);
    expect(Object.values(result.battle.pendingMaterials).reduce((a, b) => a + b, 0)).toBe(1);
    expect(result.battle.phase).toBe('playing');
    expect(result.battle.nextPhase).toBe('wave');
    expect(result.battle.wave).toBe(0);
    const after = finish(result.battle, content);
    expect(after.wave).toBe(1);
    expect(after.units.find((unit) => unit.boss)?.maxHp).toBe(300);
    expect(after.pendingMaterials).toEqual(result.battle.pendingMaterials);
    expect(after.units.filter((unit) => unit.side === 'party').every((unit) => Object.keys(unit.cooldowns).length === 0 && unit.barrier === undefined && unit.regenUntil === undefined)).toBe(true);
  });
  it('suppresses threshold dialogue for a killing blow, and only then allows rewards', () => {
    const content = fixture(); content.dungeons[0]!.waves = [[{ characterId: 'enemy', boss: true }]];
    const battle = start(content);
    const enemy = battle.units.find((unit) => unit.side === 'enemy')!; enemy.hp = 1;
    const result = resolveRound(battle, content);
    expect(result.battle.events.filter((event) => event.kind === 'dialogue')).toHaveLength(1);
    expect(result.battle.events.find((event) => event.kind === 'dialogue')?.text).toContain('記憶');
    expect(result.battle.phase).toBe('playing');
    const final = finish(result.battle, content);
    expect(final.phase).toBe('reward');
    expect(Object.keys(final.pendingMaterials)).toHaveLength(1);
  });
  it('reads boss dialogue from character data and persists one-shot phase flags', () => {
    const content = fixture();
    content.characters.find((def) => def.id === 'enemy')!.dialogue = { intro: '門を守る。', threshold: '盾が軋む。', defeat: '約束を託す。' };
    content.dungeons[0]!.waves = [[{ characterId: 'enemy', boss: true }]];
    let battle = createBattle(content, ['tank', 'hero', 'healer'], 'tank', 'dungeon', 0, 7, 'dialogue');
    expect(battle.events.find((event) => event.kind === 'dialogue')?.text).toContain('門を守る。');
    battle = finish(battle, content);
    battle.units.find((unit) => unit.boss)!.hp = 180;
    const lines: string[] = [];
    for (let i = 0; i < 20 && battle.phase === 'ready'; i++) {
      const result = resolveRound(JSON.parse(JSON.stringify(battle)) as Battle, content);
      lines.push(...result.battle.events.filter((event) => event.kind === 'dialogue').map((event) => event.text));
      battle = finish(result.battle, content);
    }
    expect(battle.phase).toBe('reward');
    expect(lines.filter((line) => line.includes('盾が軋む。'))).toHaveLength(1);
    expect(lines.filter((line) => line.includes('約束を託す。'))).toHaveLength(1);
  });
  it('discards all provisional drops on failure and prioritizes victory on round 100', () => {
    const content = fixture(); const battle = start(content, ['hero']);
    battle.pendingMaterials = { 'ashen:epic': 3 }; battle.units.find((unit) => unit.side === 'party')!.hp = 1;
    const enemy = battle.units.find((unit) => unit.side === 'enemy')!; enemy.speed = 99;
    const result = resolveRound(battle, content);
    expect(result.battle.nextPhase).toBe('failed');
    expect(finish(result.battle, content).pendingMaterials).toEqual({});
    const survivor = start(content, ['hero']); survivor.round = 100;
    survivor.units.find((unit) => unit.side === 'enemy')!.hp = 1;
    survivor.units.find((unit) => unit.side === 'party')!.speed = 99;
    expect(resolveRound(survivor, content).battle.nextPhase).toBe('wave');
  });
  it('a killed actor never takes its scheduled action and a dead leader leaves its bonus intact', () => {
    const content = fixture(); const battle = start(content, ['tank', 'hero']);
    battle.units.find((unit) => unit.side === 'enemy')!.speed = 99;
    battle.units.find((unit) => unit.side === 'enemy')!.attack = 9999;
    battle.units.find((unit) => unit.characterId === 'tank')!.hp = 1;
    const result = resolveRound(battle, content).battle;
    expect(result.events.some((event) => event.actorId === 'party:tank')).toBe(false);
    expect(result.units.find((unit) => unit.characterId === 'hero')!.maxHp).toBe(108);
  });
});

describe('initial content acceptance', () => {
  it('clears the first dungeon with the initial four and no consumables', async () => {
    const { content } = await import('../src/content');
    const partyIds = content.characters.filter((def) => def.origin.includes('initial')).map((def) => def.id);
    for (const seed of [1, 7, 42, 2718]) {
      let battle = createBattle(content, partyIds, partyIds.find((id) => content.characters.find((def) => def.id === id)?.role === 'tank')!, content.dungeons[0]!.id, 0, seed, `acceptance-${seed}`);
      let rounds = 0; let kills = 0;
      while (battle.phase !== 'reward' && battle.phase !== 'failed' && rounds < 100) {
        if (battle.phase === 'playing') battle = advanceReplay(battle, content);
        else { const result = resolveRound(battle, content); battle = result.battle; kills += result.discoveredIds.length; rounds += 1; }
      }
      expect(battle.phase).toBe('reward');
      expect(battle.potionsRemaining).toBe(0);
      expect(kills).toBeGreaterThan(0);
      expect(Object.values(battle.pendingMaterials).reduce((a, b) => a + b, 0)).toBe(content.dungeons[0]!.waves.flat().length);
    }
  });
});


describe('tactical skills and leader synergies', () => {
  it('uses piercing attacks against armor and reports actual HP lost', () => {
    const defs = fixture(); defs.characters.find(c => c.id === 'hero')!.skillIds = ['attack', 'pierce'];
    const battle = start(defs, ['hero']); battle.strategy = 'aggressive';
    const enemy = battle.units.find(u => u.side === 'enemy')!; enemy.hp = enemy.maxHp = 10000; enemy.defense = 100;
    const hero = battle.units.find(u => u.side === 'party')!; hero.speed = 100;
    const pierce = resolveRound(battle, defs).battle.events.find(e => e.actorId === hero.uid)!;
    expect(pierce.skillId).toBe('pierce');
    const ordinary = structuredClone(battle); ordinary.units.find(u => u.uid === hero.uid)!.cooldowns.pierce = 99;
    const attack = resolveRound(ordinary, defs).battle.events.find(e => e.actorId === hero.uid)!;
    expect(pierce.amount).toBeGreaterThan(attack.amount!);
    expect(enemy.hp - pierce.unitsAfter!.find(u => u.uid === enemy.uid)!.hp).toBe(pierce.amount);
  });

  it('drains only actual damage and never heals past maximum HP', () => {
    const defs = fixture(); defs.characters.find(c => c.id === 'hero')!.skillIds = ['attack', 'drain'];
    const battle = start(defs, ['hero']);
    const hero = battle.units.find(u => u.side === 'party')!; hero.hp = 30; hero.speed = 100;
    battle.units.find(u => u.side === 'enemy')!.hp = 10;
    const result = resolveRound(battle, defs).battle;
    expect(result.events.find(e => e.actorId === hero.uid)?.skillId).toBe('drain');
    expect(result.units.find(u => u.uid === hero.uid)!.hp).toBe(33);
    expect(battle.units.find(u => u.uid === hero.uid)!.hp).toBe(30);
  });

  it('a survival barrier absorbs damage before HP and persists in replay snapshots', () => {
    const defs = fixture(); defs.characters.find(c => c.id === 'tank')!.skillIds = ['guard', 'barrier'];
    const battle = start(defs, ['tank', 'hero']); battle.strategy = 'survival';
    battle.units.find(u => u.characterId === 'tank')!.cooldowns.guard = 99;
    const enemy = battle.units.find(u => u.side === 'enemy')!; enemy.hp = enemy.maxHp = 10000; enemy.attack = 30;
    const hero = battle.units.find(u => u.characterId === 'hero')!; hero.hp = 80;
    const result = resolveRound(battle, defs).battle;
    const cast = result.events.find(e => e.skillId === 'barrier')!;
    expect(cast.unitsAfter!.find(u => u.uid === hero.uid)!.barrier).toBeGreaterThan(0);
    const ordinary = structuredClone(battle); const tank = ordinary.units.find(u => u.characterId === 'tank')!;
    tank.cooldowns.barrier = tank.cooldowns.guard = 99;
    expect(result.events.find(e => e.actorId === enemy.uid)!.amount).toBeLessThan(resolveRound(ordinary, defs).battle.events.find(e => e.actorId === enemy.uid)!.amount!);
  });

  it('cleanses defense reduction, but prioritizes an urgent heal', () => {
    const defs = fixture(); defs.characters.find(c => c.id === 'healer')!.skillIds = ['heal', 'cleanse'];
    const battle = start(defs, ['hero', 'healer']);
    const healer = battle.units.find(u => u.characterId === 'healer')!; healer.speed = 100;
    const hero = battle.units.find(u => u.characterId === 'hero')!; hero.hp = 90; hero.debuffUntil = 4; hero.debuffStrength = 10;
    const enemy = battle.units.find(u => u.side === 'enemy')!; enemy.hp = enemy.maxHp = 10000; enemy.attack = 0;
    const cast = resolveRound(battle, defs).battle.events.find(e => e.actorId === healer.uid)!;
    expect(cast.skillId).toBe('cleanse');
    expect(cast.unitsAfter!.find(u => u.uid === hero.uid)!.debuffUntil).toBeUndefined();
    expect(cast.unitsAfter!.find(u => u.uid === hero.uid)!.hp).toBeGreaterThan(90);
    hero.hp = 10;
    expect(resolveRound(battle, defs).battle.events.find(e => e.actorId === healer.uid)!.skillId).toBe('heal');
  });

  it('regeneration ticks exactly three times and expires before the fourth round', () => {
    const defs = fixture(); defs.characters.find(c => c.id === 'healer')!.skillIds = ['heal', 'regen'];
    let battle = start(defs, ['hero', 'healer']);
    battle.units.find(u => u.characterId === 'healer')!.speed = 100;
    battle.units.find(u => u.characterId === 'hero')!.hp = 70;
    const enemy = battle.units.find(u => u.side === 'enemy')!; enemy.hp = enemy.maxHp = 10000; enemy.attack = 0;
    for (let round = 1; round <= 4; round++) {
      const result = resolveRound(battle, defs).battle;
      const ticks = result.events.filter(e => e.text.includes('月の雫の再生'));
      expect(ticks).toHaveLength(round <= 3 ? 1 : 0);
      if (ticks.length) expect(ticks[0].amount).toBe(5);
      battle = finish(result, defs);
      battle.units.find(u => u.characterId === 'healer')!.cooldowns.regen = 99;
    }
  });

  it('leader regeneration heals living allies and stops when the leader falls', () => {
    const defs = fixture(); defs.characters.find(c => c.id === 'tank')!.leaderEffect = 'regeneration';
    const battle = start(defs); const hero = battle.units.find(u => u.characterId === 'hero')!; hero.hp = 60;
    battle.units.find(u => u.characterId === 'healer')!.hp = 0;
    const enemy = battle.units.find(u => u.side === 'enemy')!; enemy.hp = enemy.maxHp = 10000; enemy.attack = 0;
    const result = resolveRound(battle, defs).battle;
    expect(result.events.find(e => e.text.includes('月の慈愛'))!.targetIds).toContain(hero.uid);
    expect(result.units.find(u => u.characterId === 'healer')!.hp).toBe(0);
    battle.units.find(u => u.characterId === 'tank')!.hp = 0;
    expect(resolveRound(battle, defs).battle.events.some(e => e.text.includes('月の慈愛'))).toBe(false);
  });

  it.each(['finisher', 'resonance', 'bulwark', 'lifesteal'] as const)('leader %s changes the corresponding combat outcome', effect => {
    const defs = fixture();
    defs.characters.find(c => c.id === 'hero')!.role = effect === 'resonance' ? 'area_attacker' : 'attacker';
    defs.dungeons[0].waves = [[{ characterId: 'enemy' }, { characterId: 'enemy' }]];
    const battle = start(defs, ['hero']);
    const hero = battle.units.find(u => u.side === 'party')!; hero.speed = 100; hero.hp = 60;
    battle.units.filter(u => u.side === 'enemy').forEach(u => { u.hp = 300; u.maxHp = 1000; u.attack = 10; });
    const normal = resolveRound(battle, defs).battle;
    defs.characters.find(c => c.id === 'hero')!.leaderEffect = effect;
    const powered = resolveRound(battle, defs).battle;
    if (effect === 'finisher' || effect === 'resonance') expect(powered.events.find(e => e.actorId === hero.uid)!.amount).toBeGreaterThan(normal.events.find(e => e.actorId === hero.uid)!.amount!);
    if (effect === 'bulwark') expect(powered.events.filter(e => e.actorId?.startsWith('enemy:')).reduce((sum,e) => sum + (e.amount ?? 0), 0)).toBeLessThan(normal.events.filter(e => e.actorId?.startsWith('enemy:')).reduce((sum,e) => sum + (e.amount ?? 0), 0));
    if (effect === 'lifesteal') expect(powered.units.find(u => u.uid === hero.uid)!.hp).toBeGreaterThan(normal.units.find(u => u.uid === hero.uid)!.hp);
  });
});
