import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { advanceReplay, characterStats, createBattle, dungeonDifficulty, recruitCost } from '../src/domain/engine';
import { applyCommand, createInitialSave } from '../src/application/game';
import { assertSaveCompatibility } from '../src/platform/save';
import type { Battle, Content } from '../src/domain/types';

const initial = content.characters.filter(char => char.origin.includes('initial')).map(char => char.id);
function penultimate(seed: number, data = content, stageId = 'silent-cathedral'): Battle {
  const battle = createBattle(data, initial, initial[0]!, stageId, 0, seed, `rare-${seed}`);
  const stage = data.dungeons.find(item => item.id === stageId)!;
  battle.wave = stage.waves.length - 3;
  battle.events = []; battle.cursor = 0; battle.nextPhase = 'wave';
  return advanceReplay(battle, data);
}
function guaranteed(): Content {
  const data = structuredClone(content);
  for (const stage of data.dungeons) if (stage.rareEncounter) stage.rareEncounter.chance = 100;
  return data;
}
function ready(battle: Battle): Battle {
  let next = battle;
  while (next.phase === 'playing') next = advanceReplay(next, content);
  return next;
}

describe('rare ordinary encounters', () => {
  it('rolls rarely and deterministically, preserving counts and the final boss', () => {
    let encounters = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const battle = penultimate(seed);
      encounters += Number(battle.units.some(unit => unit.characterId === 'lucielle'));
      expect(penultimate(seed)).toEqual(battle);
    }
    expect(encounters).toBeGreaterThan(40); expect(encounters).toBeLessThan(120);
    const data = guaranteed(); const battle = penultimate(42, data);
    const enemies = battle.units.filter(unit => unit.side === 'enemy');
    expect(enemies).toHaveLength(data.dungeons[0]!.waves[1]!.length);
    expect(enemies[0]!.characterId).toBe('lucielle'); expect(enemies.some(unit => unit.boss)).toBe(false);
    const saved = JSON.parse(JSON.stringify(battle)) as Battle;
    expect(ready(saved)).toEqual(ready(battle));
    saved.events = []; saved.cursor = 0; saved.nextPhase = 'wave'; saved.phase = 'playing';
    const final = advanceReplay(saved, data);
    expect(final.units.filter(unit => unit.side === 'enemy').map(unit => ({ characterId: unit.characterId, boss: unit.boss }))).toEqual([{ ...data.dungeons[0]!.waves.at(-1)![0]!, boss: true }]);
    expect(content.dungeons.filter(stage => stage.kind === 'event').every(stage => !stage.rareEncounter)).toBe(true);
    expect(createBattle(data, initial, initial[0]!, 'silent-cathedral', 0, 42, 'first').units.some(unit => unit.characterId === 'lucielle')).toBe(false);
  });
  it('uses normal character stats and includes the strongest possible encounter in difficulty', () => {
    const data = guaranteed(); const battle = penultimate(42, data);
    const unit = battle.units.find(unit => unit.characterId === 'lucielle')!;
    const char = data.characters.find(char => char.id === unit.characterId)!;
    const stats = characterStats(char);
    expect({ hp: unit.hp, attack: unit.attack, defense: unit.defense, speed: unit.speed }).toEqual(stats);
    const stage = structuredClone(data.dungeons[0]!);
    expect(dungeonDifficulty(stage, data)).toBeGreaterThanOrEqual(dungeonDifficulty({ ...stage, rareEncounter: undefined }, data));
    const rareIndex = stage.waves.length - 2;
    stage.waves[rareIndex]![0] = { characterId: 'lucielle' };
    delete stage.rareEncounter;
    expect(dungeonDifficulty(data.dungeons[0]!, data)).toBeGreaterThanOrEqual(dungeonDifficulty(stage, data));
  });
  it('drops guaranteed provisional materials, discovers recruitment, and never awards again during replay', () => {
    const data = guaranteed(); const save = createInitialSave(data, 42);
    save.battle = ready(penultimate(42, data));
    for (const unit of save.battle.units) {
      unit.hp = unit.maxHp = unit.side === 'party' ? 10000 : 1;
      unit.attack = unit.side === 'party' ? 10000 : 1; unit.speed = unit.side === 'party' ? 100 : 1;
      unit.cooldowns = Object.fromEntries(data.characters.find(char => char.id === unit.characterId)!.skillIds.map(id => [id, 999]));
    }
    save.battle.initialUnits = structuredClone(save.battle.units);
    const result = applyCommand(save, { type: 'round' }, data);
    const loot = result.battle!.pendingMaterials;
    expect(loot['silverwing:common']).toBeGreaterThanOrEqual(3);
    expect(loot['silverwing:rare']).toBeGreaterThanOrEqual(1);
    expect(result.materials['silverwing:rare']).toBeUndefined();
    expect(result.discoveredIds).toContain('lucielle'); expect(result.gold - save.gold).toBeGreaterThanOrEqual(37);
    expect(() => assertSaveCompatibility(JSON.parse(JSON.stringify(result)), data)).not.toThrow();
    let replay = result;
    while (replay.battle!.phase === 'playing') replay = applyCommand(replay, { type: 'replay' }, data);
    expect(replay.battle!.pendingMaterials).toEqual(loot); expect(replay.gold).toBe(result.gold);
    const retreated = applyCommand(replay, { type: 'retreat' }, data);
    expect(retreated.materials['silverwing:rare']).toBeUndefined();
    expect(retreated.battle!.pendingMaterials).toEqual({}); expect(retreated.battle!.phase).toBe('failed');
    expect(applyCommand(retreated, { type: 'leaveFailure' }, data).battle).toBeNull();
    const completed = structuredClone(replay);
    completed.battle!.phase = 'reward'; completed.battle!.nextPhase = 'reward'; completed.battle!.events = []; completed.battle!.cursor = 0;
    const claimed = applyCommand(completed, { type: 'claim' }, data);
    expect(claimed.materials['silverwing:rare']).toBe(loot['silverwing:rare']);
    const char = data.characters.find(char => char.id === 'lucielle')!;
    for (const cost of recruitCost(char)) claimed.materials[cost.materialId] = cost.count;
    expect(applyCommand(claimed, { type: 'recruit', characterId: char.id }, data).ownedIds).toContain(char.id);
  });
  it('supports late-dungeon Nemuria and rejects invalid pools, rates and rewards', () => {
    const data = guaranteed();
    expect(penultimate(42, data, 'hollow-gate').units.some(unit => unit.characterId === 'nemuria')).toBe(true);
    for (const rate of [0, -1, 101, NaN]) {
      const invalid = structuredClone(content); invalid.dungeons[0]!.rareEncounter!.chance = rate;
      expect(validateContent(invalid).some(error => error.includes('invalid rare encounter'))).toBe(true);
    }
    const invalid = structuredClone(content); invalid.dungeons[0]!.rareEncounter!.characterIds = ['asteria'];
    expect(validateContent(invalid).some(error => error.includes('unavailable rare enemy'))).toBe(true);
    const badLoot = structuredClone(content); badLoot.characters.find(char => char.id === 'lucielle')!.encounterLoot!.guaranteed[0]!.materialId = 'seris-memory:rare';
    expect(validateContent(badLoot).some(error => error.includes('invalid encounter material'))).toBe(true);
  });
});
