import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { awakeningLock, memoryChapters } from '../src/domain/awakening';
import { dungeonLock } from '../src/domain/events';
import { assertSaveCompatibility } from '../src/platform/save';
import { validateContent } from '../src/content/validation';
import type { GameSave } from '../src/domain/types';

const recipe = (id: string) => content.awakenings!.find(def => def.baseId === id)!;
function prepared() {
  const save = createInitialSave(content, 42);
  save.ownedIds.push('lisette'); save.completedDungeonIds = ['veiled-cloister', 'hollow-gate', 'last-observatory', 'pale-throne'];
  for (const def of content.awakenings!) save.materials[def.cost.materialId] = def.cost.count;
  return save;
}
function replay(save: GameSave) {
  let next = save;
  for (let i = 0; next.battle?.phase === 'playing' && i < 100; i++) next = applyCommand(next, { type: 'replay' }, content);
  return next;
}

describe('normal dungeon awakening and memory contracts', () => {
  it('requires every fixed companion and the final clear without consuming on rejection', () => {
    const save = prepared(), before = structuredClone(save);
    expect(() => applyCommand(save, { type: 'awaken', awakeningId: 'awaken-seris' }, content)).toThrow();
    expect(save).toEqual(before);
    for (const id of ['elaine', 'liora', 'noelle']) save.ownedIds.push(recipe(id).awakenedId);
    expect(awakeningLock(recipe('seris'), save, content)).toContain('リゼット');
    save.ownedIds.push('lisette-awakened'); save.completedDungeonIds = [];
    expect(awakeningLock(recipe('seris'), save, content)).toContain('白夜の玉座');
  });
  it('awakens atomically, retains all companions and replaces active forms and leader in place', () => {
    let save = prepared(); save.leaderId = 'seris';
    for (const id of ['elaine', 'liora', 'noelle', 'lisette', 'seris']) save = applyCommand(save, { type: 'awaken', awakeningId: recipe(id).id }, content);
    expect(save.partyIds).toEqual(['elaine-awakened', 'liora-awakened', 'seris-awakened', 'noelle-awakened']);
    expect(save.leaderId).toBe('seris-awakened');
    expect(save.ownedIds).toEqual(expect.arrayContaining(['elaine', 'liora', 'noelle', 'lisette', 'seris', 'lisette-awakened']));
    expect(save.materials['seris-memory:rare']).toBe(0);
    expect(() => applyCommand(save, { type: 'awaken', awakeningId: 'awaken-seris' }, content)).toThrow('覚醒済み');
    expect(() => assertSaveCompatibility(save, content)).not.toThrow();
    expect(() => applyCommand(save, { type: 'party', partyIds: ['seris', 'seris-awakened'], leaderId: 'seris' }, content)).toThrow('同時に編成');
  });
  it('locks remembrance routes and prevents awakening during exploration and material conversion bypasses', () => {
    const save = prepared();
    expect(dungeonLock(content.dungeons.find(d => d.id === 'memory-seris')!, save, content)).toContain('4人');
    for (const id of ['elaine', 'liora', 'noelle', 'lisette']) save.ownedIds.push(recipe(id).awakenedId);
    expect(dungeonLock(content.dungeons.find(d => d.id === 'memory-seris')!, save, content)).toBeNull();
    expect(() => applyCommand(save, { type: 'exchange', speciesId: 'seris-memory', rarity: 'rare', direction: 'down' }, content)).toThrow('専用素材');
    const exploring = applyCommand(save, { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }, content);
    expect(() => applyCommand(exploring, { type: 'awaken', awakeningId: 'awaken-seris' }, content)).toThrow('探索を終了');
    expect(() => applyCommand(save, { type: 'recruit', characterId: 'seris-awakened' }, content)).toThrow();
  });
  it('keeps story loot provisional through replay, deterministic from the seed, and claims it only once', () => {
    let save = prepared();
    save = replay(applyCommand(save, { type: 'depart', dungeonId: 'veiled-cloister', potions: 0 }, content));
    for (let i = 0; i < 100 && save.battle?.phase !== 'reward'; i++) {
      for (const u of save.battle!.units) if (u.side === 'party') { u.attack = 10000; u.speed = 100; }
      const round = save.battle!;
      expect(resolveRound(round, content)).toEqual(resolveRound(round, content));
      save = applyCommand(save, { type: 'round' }, content);
      save = replay(save);
    }
    expect(save.battle?.phase).toBe('reward');
    expect(save.battle!.pendingMaterials['elaine-memory:rare']).toBe(6);
    const amount = save.battle!.pendingMaterials['seris-memory:rare'];
    expect([3,15]).toContain(amount);
    expect(save.materials['elaine-memory:rare']).toBe(40);
    const claimed = applyCommand(save, { type: 'claim' }, content);
    expect(claimed.materials['elaine-memory:rare']).toBe(46);
    expect(claimed.materials['seris-memory:rare']).toBe(300 + amount);
    expect(() => applyCommand(claimed, { type: 'claim' }, content)).toThrow();
    let retreat = replay(applyCommand(claimed, { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }, content));
    retreat.battle!.pendingMaterials['seris-memory:rare'] = 50;
    retreat = applyCommand(retreat, { type: 'retreat' }, content);
    expect(retreat.battle!.pendingMaterials).toEqual({});
    expect(retreat.materials).toEqual(claimed.materials);
  });
  it('unlocks flavor chapters by encounter, ownership and awakening, including old saves', () => {
    const save = createInitialSave(content), memory = content.memories!.find(m => m.characterId === 'lisette')!;
    expect(memoryChapters(memory, save, content).map(c => c.unlocked)).toEqual([false,false,false]);
    save.discoveredIds.push('lisette');
    expect(memoryChapters(memory, save, content).map(c => c.unlocked)).toEqual([true,false,false]);
    save.ownedIds.push('lisette');
    expect(memoryChapters(memory, save, content).map(c => c.unlocked)).toEqual([true,true,false]);
    save.ownedIds.push('lisette-awakened');
    expect(memoryChapters(memory, save, content).every(c => c.unlocked)).toBe(true);
  });
  it('rejects circular prerequisites, unmatched cast and invalid boss currency', () => {
    const invalid = structuredClone(content);
    invalid.awakenings![0].requiredOwnedIds = ['seris-awakened'];
    invalid.dungeons.find(d => d.id === 'memory-seris')!.bossLoot!.guaranteed[0].count = -1;
    invalid.storylines![0].relatedIds.push('pale-wolf');
    const errors = validateContent(invalid).join('\n');
    expect(errors).toContain('circular prerequisites'); expect(errors).toContain('awakening cast'); expect(errors).toContain('invalid guaranteed boss loot');
  });
  it('boosts dawn against the actual weakened recipient and respects its common cooldown', () => {
    const start = () => {
      let b = createBattle(content, ['seris-awakened'], 'seris-awakened', 'silent-cathedral', 0, 42, 'dawn-skill');
      while (b.phase === 'playing') b = advanceReplay(b, content);
      b.units = b.units.filter(u => u.side === 'party' || u === b.units.find(item => item.side === 'enemy'));
      const actor = b.units.find(u => u.side === 'party')!, enemy = b.units.find(u => u.side === 'enemy')!;
      actor.speed = 100; enemy.boss = true; enemy.hp = enemy.maxHp = 10000; enemy.defense = 0; enemy.attack = 0; enemy.speed = 0;
      return b;
    };
    const normal = start(), weakened = structuredClone(normal);
    weakened.units.find(u => u.side === 'enemy')!.debuffUntil = 2;
    weakened.units.find(u => u.side === 'enemy')!.debuffStrength = 18;
    const a = resolveRound(normal, content).battle, b = resolveRound(weakened, content).battle;
    const damage = (battle: typeof a) => battle.events.find(e => e.skillId === 'dawn-27')!.amount!;
    expect(damage(b)).toBeGreaterThan(damage(a)*1.24);
    expect(b.units.find(u => u.side === 'party')!.cooldowns['dawn-27']).toBe(4);
    const guarded = start(), enemy = guarded.units.find(u => u.side === 'enemy')!;
    enemy.debuffUntil = 2;
    guarded.units.push({...structuredClone(enemy), uid:'guard', boss:false, debuffUntil:undefined, guardTarget:enemy.uid, guardUntil:3, guardStrength:0});
    const hit = resolveRound(guarded, content).battle.events.find(e => e.skillId === 'dawn-27')!;
    expect(hit.targetIds).toEqual(['guard']); expect(hit.amount).toBe(Math.floor(damage(a) * 370 / 400));
  });
});
