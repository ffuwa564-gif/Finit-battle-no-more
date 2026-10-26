import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { lunetteEvent } from '../src/content/boss-events';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { applyCommand, createInitialSave } from '../src/application/game';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { Battle } from '../src/domain/types';

function ready(battle: Battle): Battle {
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  return battle;
}
function fixture(round = 1): Battle {
  const battle = ready(createBattle(content, ['elaine', 'liora'], 'liora', 'lunette-beginner', 0, 42, 'bits'));
  while (battle.wave < content.dungeons.find(stage => stage.id === battle.dungeonId)!.waves.length - 1) {
    battle.phase = 'playing'; battle.events = []; battle.cursor = 0; battle.nextPhase = 'wave';
    Object.assign(battle, ready(battle));
  }
  for (const unit of battle.units) {
    unit.hp = unit.maxHp = 10000; unit.attack = unit.side === 'enemy' ? 100 : 1;
    unit.defense = 10;
    unit.cooldowns = Object.fromEntries(content.characters.find(char => char.id === unit.characterId)!.skillIds.map(id => [id, 1000]));
  }
  battle.round = round; battle.initialUnits = structuredClone(battle.units); battle.events = []; battle.cursor = 0;
  return battle;
}
const devices = (battle: Battle) => battle.events.filter(event => event.bitAction);

describe('clockwork boss bits', () => {
  it('telegraphs every third round, then fires for exactly two rounds and returns', () => {
    let battle = fixture();
    for (let round = 1; round <= 7; round++) {
      const next = resolveRound(battle, content).battle;
      const actions = devices(next).map(event => event.bitAction);
      expect(actions).toEqual(round === 3 || round === 6 ? ['deploy'] : round === 4 || round === 7 ? ['fire', 'fire'] : round === 5 ? ['fire', 'fire', 'expire'] : []);
      const fires = devices(next).filter(event => event.bitAction === 'fire');
      expect(fires.every(event => event.targetIds?.length === 1 && event.amount! > 0)).toBe(true);
      battle = ready(next);
    }
  });
  it('replays persisted shots identically and does not resolve damage again after importing', () => {
    const source = fixture(3); const deployed = ready(resolveRound(source, content).battle);
    expect(resolveRound(deployed, content)).toEqual(resolveRound(JSON.parse(JSON.stringify(deployed)), content));
    const save = createInitialSave(content); save.battle = resolveRound(deployed, content).battle;
    assertSaveCompatibility(JSON.parse(JSON.stringify(save)), content);
    const before = structuredClone(save.battle.units);
    const after = ready(JSON.parse(JSON.stringify(save.battle)));
    expect(after.units).toEqual(before); expect(after.seed).toBe(save.battle.seed);
  });
  it('lets barriers absorb shots and guarding intercept shots without hitting the dead', () => {
    const battle = fixture(4); const boss = battle.units.find(unit => unit.boss)!;
    boss.bits = { count: 2, deployedRound: 3, expiresRound: 5 };
    const guard = battle.units.find(unit => unit.characterId === 'liora')!;
    const ward = battle.units.find(unit => unit.characterId === 'elaine')!;
    guard.guardTarget = ward.uid; guard.guardUntil = 5; guard.guardStrength = 14;
    guard.barrier = 1000; guard.barrierUntil = 5;
    const next = resolveRound(battle, content).battle;
    for (const event of devices(next).filter(event => event.bitAction === 'fire')) {
      expect(event.targetIds).toEqual([guard.uid]); expect(event.amount).toBe(0);
    }
    expect(next.units.find(unit => unit.uid === ward.uid)!.hp).toBe(ward.hp);
    const dead = fixture(4); dead.units.find(unit => unit.characterId === 'elaine')!.hp = 0;
    dead.units.find(unit => unit.boss)!.bits = { count: 2, deployedRound: 3, expiresRound: 5 };
    expect(devices(resolveRound(dead, content).battle).every(event => !event.targetIds?.includes('party:elaine'))).toBe(true);
  });
  it('stops devices on boss defeat and never grants a boss-only mechanic to a recruited ally', () => {
    const battle = fixture(4); const boss = battle.units.find(unit => unit.boss)!;
    boss.hp = 1; boss.bits = { count: 2, deployedRound: 3, expiresRound: 5 };
    battle.units.filter(unit => unit.side === 'party').forEach(unit => { unit.attack = 10000; });
    expect(devices(resolveRound(battle, content).battle)).toEqual([]);
    let ally = ready(createBattle(content, ['lunette', 'liora'], 'liora', 'silent-cathedral', 0, 42, 'ally'));
    ally.round = 3; expect(devices(resolveRound(ally, content).battle)).toEqual([]);
  });
  it('stops the salvo immediately when the last companion falls', () => {
    const battle = fixture(4);
    battle.units.filter(unit => unit.side === 'party').forEach(unit => { unit.hp = 1; });
    battle.units.find(unit => unit.boss)!.bits = { count: 2, deployedRound: 3, expiresRound: 5 };
    const result = resolveRound(battle, content).battle;
    expect(result.nextPhase).toBe('failed');
    expect(devices(result).filter(event => event.bitAction === 'fire')).toHaveLength(1);
  });
  it('awards the new currency only on confirmed clears and unlocks the next tier once', () => {
    let save = createInitialSave(content, 42); save.completedDungeonIds = ['silent-cathedral'];
    save = applyCommand(save, { type: 'depart', dungeonId: 'lunette-beginner', potions: 0 }, content);
    let shots = 0;
    for (let i = 0; i < 1000 && save.battle && !['reward', 'failed'].includes(save.battle.phase); i++) {
      const replay = save.battle.phase === 'playing';
      save = applyCommand(save, { type: replay ? 'replay' : 'round' }, content);
      if (!replay) shots += save.battle!.events.filter(event => event.bitAction === 'fire').length;
    }
    expect(save.battle?.phase).toBe('reward'); expect(shots).toBeGreaterThan(0);
    expect(save.battle?.pendingMaterials[lunetteEvent.fragment.id]).toBe(2);
    expect(save.materials[lunetteEvent.fragment.id]).toBeUndefined();
    const claimed = applyCommand(JSON.parse(JSON.stringify(save)), { type: 'claim' }, content);
    expect(claimed.materials[lunetteEvent.fragment.id]).toBe(2);
    expect(claimed.materials[lunetteEvent.core.id]).toBeUndefined(); expect(claimed.stones).toBe(1);
    expect(claimed.completedDungeonIds).toContain('lunette-beginner');
    expect(() => applyCommand(claimed, { type: 'claim' }, content)).toThrow();
  });
  it('keeps event rewards isolated, exchanges both forms, and preserves family restrictions', () => {
    const save = createInitialSave(content); save.completedDungeonIds = ['silent-cathedral', ...lunetteEvent.dungeonIds];
    save.materials[lunetteEvent.fragment.id] = 20; save.materials[lunetteEvent.core.id] = 3;
    const normal = applyCommand(save, { type: 'eventRecruit', eventId: lunetteEvent.id, form: 'normal' }, content);
    const awakened = applyCommand(normal, { type: 'eventRecruit', eventId: lunetteEvent.id, form: 'awakened' }, content);
    expect(awakened.ownedIds).toEqual(expect.arrayContaining(['lunette', 'lunette-awakened']));
    expect(awakened.materials[lunetteEvent.core.id]).toBe(0); assertSaveCompatibility(awakened, content);
    expect(() => applyCommand(awakened, { type: 'party', partyIds: ['lunette', 'lunette-awakened'], leaderId: 'lunette' }, content)).toThrow('異なる姿');
    expect(() => applyCommand(save, { type: 'exchange', speciesId: 'lunette-clockwork', rarity: 'rare', direction: 'up' }, content)).toThrow('合成');
  });
  it('rejects malformed device content and corrupted saved device states', () => {
    const invalid = structuredClone(content); invalid.dungeons.find(stage => stage.id === 'lunette-beginner')!.bossBits!.duration = 3;
    expect(validateContent(invalid)).toContain('dungeons/lunette-beginner: invalid boss bit pattern');
    const save = createInitialSave(content); save.battle = fixture(3);
    save.battle.units.find(unit => unit.boss)!.bits = { count: 99, deployedRound: 3, expiresRound: 5 };
    expect(() => assertValidSave(save)).toThrow('探索');
  });
});
