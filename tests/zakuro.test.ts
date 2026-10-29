import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { createBattle, advanceReplay, resolveRound, recruitCost, characterStats } from '../src/domain/engine';
import { dungeonLock } from '../src/domain/events';
import { assertSaveCompatibility } from '../src/platform/save';
import { zakuroCharacter, zakuroDungeons } from '../src/content/zakuro';

function prepared() {
  const save = createInitialSave(content, 42);
  save.completedDungeonIds = content.chapters!.slice(0, 3).flatMap(chapter => chapter.dungeonIds);
  save.partyIds = ['selene', 'athena', 'seris-awakened', 'fortuna'];
  save.ownedIds = [...new Set([...save.ownedIds, ...save.partyIds])];
  save.leaderId = 'selene';
  save.novels = { seen: ['opening-desire-gate'] };
  return save;
}
describe('Zakuro and the ritual forest', () => {
  it('requires the prior chapter and confirmed stone expedition before the procession', () => {
    const save = prepared();
    expect(dungeonLock(zakuroDungeons[0], createInitialSave(content), content)).toBeTruthy();
    expect(dungeonLock(zakuroDungeons[0], save, content)).toBeNull();
    expect(dungeonLock(zakuroDungeons[1], save, content)).toBeTruthy();
    save.completedDungeonIds.push('ritual-stone-grove');
    expect(dungeonLock(zakuroDungeons[1], save, content)).toBeNull();
    expect(() => applyCommand(save, { type: 'novelStart', sceneId: 'zakuro-forest-encounter' }, content)).not.toThrow();
  });
  it('keeps ritual stones provisional until claim and loses them on retreat', () => {
    let save = applyCommand(prepared(), { type: 'depart', dungeonId: 'ritual-stone-grove', potions: 0 }, content);
    for (let step = 0; step < 1200 && save.battle?.phase !== 'reward' && save.battle?.phase !== 'failed'; step++) {
      save = applyCommand(save, { type: save.battle!.phase === 'playing' ? 'replay' : 'round' }, content);
    }
    expect(save.battle?.phase).toBe('reward');
    expect(save.battle?.pendingMaterials['ritual-stone:rare']).toBe(1);
    expect(save.materials['ritual-stone:rare']).toBeUndefined();
    const claimed = applyCommand(save, { type: 'claim' }, content);
    expect(claimed.materials['ritual-stone:rare']).toBe(1);
    expect(claimed.novels?.active?.sceneId).toBe('zakuro-forest-encounter');
    assertSaveCompatibility(claimed, content);
    const failure = applyCommand(prepared(), { type: 'depart', dungeonId: 'ritual-stone-grove', potions: 0 }, content);
    while (failure.battle!.phase === 'playing') failure.battle = advanceReplay(failure.battle!, content);
    failure.battle!.pendingMaterials['ritual-stone:rare'] = 1;
    const left = applyCommand(applyCommand(failure, { type: 'retreat' }, content), { type: 'leaveFailure' }, content);
    expect(left.materials['ritual-stone:rare']).toBeUndefined();
    expect(left.completedDungeonIds).not.toContain('ritual-stone-grove');
  });
  it('uses the same recruit definition and grants a material-based invitation without gacha', () => {
    const save = prepared();
    save.discoveredIds.push('zakuro');
    for (const cost of recruitCost(zakuroCharacter)) save.materials[cost.materialId] = cost.count;
    const recruited = applyCommand(save, { type: 'recruit', characterId: 'zakuro' }, content);
    expect(recruited.ownedIds).toContain('zakuro');
    const base = characterStats(zakuroCharacter);
    const boss = createBattle(content, save.partyIds, save.leaderId, 'zakuro-procession', 0, 42, 'same-character').units.find(unit => unit.characterId === 'zakuro')!;
    expect(boss.attack).toBe(Math.round(base.attack * 1.4));
    expect(boss.maxHp).toBe(Math.round(base.hp * 6.5));
    expect(boss.defense).toBe(base.defense);
    expect(boss.speed).toBe(base.speed);
    expect(recruitCost(zakuroCharacter)).toEqual([
      { materialId: 'pomegranate:common', count: 12 }, { materialId: 'pomegranate:rare', count: 3 }, { materialId: 'pomegranate:epic', count: 2 },
    ]);
    assertSaveCompatibility(recruited, content);
  });
  it('attacks without negotiation, can be cleared by an endgame party and yields a replayable epilogue', () => {
    let battle = createBattle(content, prepared().partyIds, 'selene', 'zakuro-procession', 0, 42, 'zakuro-clear');
    const lines: string[] = [], strikes: number[] = [];
    for (let step = 0; step < 1600 && !['reward', 'failed'].includes(battle.phase); step++) {
      for (const event of battle.events) {
        if (event.kind === 'dialogue') lines.push(event.text);
        if (event.bossStrike) strikes.push(battle.round);
      }
      battle = battle.phase === 'playing' ? advanceReplay(battle, content) : resolveRound(battle, content).battle;
    }
    expect(lines.some(line => line.includes('容赦'))).toBe(true);
    expect(strikes.length).toBeGreaterThan(0);
    expect(battle.phase).toBe('reward');
    expect(battle.pendingMaterials['pomegranate:rare']).toBeGreaterThanOrEqual(1);
    const save = prepared(); save.completedDungeonIds.push('ritual-stone-grove'); save.battle = battle;
    const claimed = applyCommand(save, { type: 'claim' }, content);
    expect(claimed.novels?.active?.sceneId).toBe('chapter-4-epilogue');
    expect(claimed.completedDungeonIds).toContain('zakuro-procession');
    assertSaveCompatibility(claimed, content);
  });
});
