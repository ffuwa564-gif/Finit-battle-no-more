import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { goddessTrial, ultimateGoddessTrial, impossibleGoddessTrial } from '../src/content/trials';
import { applyCommand, createInitialSave } from '../src/application/game';
import { characterStats, dungeonDifficulty } from '../src/domain/engine';
import { dungeonStoneReward } from '../src/domain/rewards';
import { assertSaveCompatibility } from '../src/platform/save';
import type { GameSave } from '../src/domain/types';

function start(): GameSave {
  const save = createInitialSave(content, 42); save.completedDungeonIds = ['silent-cathedral'];
  save.leaderId = 'liora'; save.potions = 5;
  return drain(applyCommand(save, { type: 'depart', dungeonId: goddessTrial.id, potions: 5 }, content));
}
function drain(save: GameSave): GameSave {
  let next = save;
  while (next.battle?.phase === 'playing') next = applyCommand(next, { type: 'replay' }, content);
  return next;
}

describe('SSR goddess gauntlet', () => {
  it('offers a separate extreme gauntlet with a calculated 30.0 index and real amplified stats', () => {
    expect(dungeonDifficulty(ultimateGoddessTrial, content)).toBe(30);
    expect(dungeonDifficulty(goddessTrial, content)).toBeLessThan(30);
    expect(content.dungeons).toContainEqual(ultimateGoddessTrial);
    const save = createInitialSave(content, 42); save.completedDungeonIds = ['silent-cathedral'];
    expect(() => applyCommand(save, { type: 'depart', dungeonId: ultimateGoddessTrial.id, potions: 0 }, content)).toThrow('女神の試練');
    save.completedDungeonIds.push(goddessTrial.id);
    const entered = drain(applyCommand(save, { type: 'depart', dungeonId: ultimateGoddessTrial.id, potions: 0 }, content));
    const enemy = entered.battle!.units.find(unit => unit.side === 'enemy')!;
    const char = content.characters.find(char => char.id === enemy.characterId)!;
    const ordinary = characterStats(char, undefined, true, goddessTrial.bossScale);
    expect(enemy.hp).toBe(characterStats(char, undefined, true, ultimateGoddessTrial.bossScale).hp);
    expect(enemy.maxHp).toBeGreaterThan(ordinary.hp * 6);
    expect(enemy.attack).toBeGreaterThan(ordinary.attack * 2);
    expect(dungeonStoneReward(ultimateGoddessTrial, [])).toBe(0);
    expect(entered.battle!.pendingMaterials).toEqual({});
    expect(() => assertSaveCompatibility(JSON.parse(JSON.stringify(entered)), content)).not.toThrow();
  });

  it('unlocks after the first dungeon and uses the real SSR bosses with their own art, skills and lines', () => {
    expect(() => applyCommand(createInitialSave(content, 42), { type: 'depart', dungeonId: goddessTrial.id, potions: 0 }, content)).toThrow('踏破');
    expect(validateContent(content)).toEqual([]);
    const battle = start().battle!; const enemy = battle.units.find(unit => unit.side === 'enemy')!;
    const char = content.characters.find(char => char.id === enemy.characterId)!;
    expect(char.rarity).toBe('SSR'); expect(char.origin).toContain('gacha'); expect(enemy.boss).toBe(true);
    expect(enemy.maxHp).toBe(characterStats(char, undefined, true, goddessTrial.bossScale).hp);
    expect(char.dialogue?.intro).toBeTruthy(); expect(content.assets.some(asset => asset.id === char.artId)).toBe(true);
    expect(dungeonDifficulty(goddessTrial, content)).toBeGreaterThan(0);
  });
  it('carries party HP through four battles and never awards loot, gold, discovery, or stones, even on repeat clears', () => {
    let save = start(); const before = structuredClone(save); const order: string[] = [];
    const alreadyKnown = [...save.discoveredIds];
    for (const unit of save.battle!.units.filter(unit => unit.side === 'party')) {
      unit.hp = unit.maxHp = 10000; unit.attack = 10000; unit.speed = 100;
    }
    const injured = save.battle!.units.find(unit => unit.characterId === 'seris')!;
    injured.hp = 7777;
    for (let wave = 0; wave < 4; wave++) {
      expect(save.battle!.wave).toBe(wave);
      order.push(save.battle!.units.find(unit => unit.side === 'enemy')!.characterId);
      for (const unit of save.battle!.units.filter(unit => unit.side === 'party')) unit.cooldowns = Object.fromEntries(content.characters.find(char => char.id === unit.characterId)!.skillIds.map(id => [id, 999]));
      const result = applyCommand(save, { type: 'round' }, content);
      expect(result.battle!.events.some(event => event.kind === 'drop')).toBe(false);
      expect(result.battle!.pendingMaterials).toEqual({}); expect(result.battle!.goldEarned).toBe(0);
      save = drain(result);
      if (wave === 0) expect(save.battle!.units.find(unit => unit.characterId === 'seris')!.hp).toBe(7777);
      expect(save.gold).toBe(before.gold); expect(save.discoveredIds).toEqual(alreadyKnown);
      expect(() => assertSaveCompatibility(JSON.parse(JSON.stringify(save)), content)).not.toThrow();
    }
    expect(order).toEqual(['selene', 'athena', 'evelyn', 'asteria']); expect(save.battle!.phase).toBe('reward');
    for (const completed of [false, true]) {
      const final = structuredClone(save);
      if (completed) final.completedDungeonIds.push(goddessTrial.id);
      const claimed = applyCommand(final, { type: 'claim' }, content);
      expect(claimed.materials).toEqual(before.materials); expect(claimed.gold).toBe(before.gold); expect(claimed.stones).toBe(before.stones);
      expect(claimed.completedDungeonIds.filter(id => id === goddessTrial.id)).toHaveLength(1);
      expect(dungeonStoneReward(goddessTrial, claimed.completedDungeonIds)).toBe(0);
      expect(() => applyCommand(claimed, { type: 'claim' }, content)).toThrow();
    }
  });
  it('consumes used potions, permits retreat, and returns the next run fully healed', () => {
    let save = start(); const before = save.potions; const unit = save.battle!.units.find(unit => unit.side === 'party')!; unit.hp = 1;
    save = applyCommand(save, { type: 'potion', unitId: unit.uid }, content); expect(save.potions).toBe(before - 1);
    save = applyCommand(save, { type: 'retreat' }, content); expect(save.battle!.pendingMaterials).toEqual({});
    save = applyCommand(save, { type: 'leaveFailure' }, content);
    save = applyCommand(save, { type: 'depart', dungeonId: goddessTrial.id, potions: 0 }, content);
    expect(save.battle!.units.filter(unit => unit.side === 'party').every(unit => unit.hp === unit.maxHp)).toBe(true);
    expect(save.battle!.goldEarned).toBe(0);
  });
  it('rejects reward-bearing trials, non-SSR bosses and leaked loot at claim', () => {
    for (const patch of [{ rareEncounter: { chance: 8, characterIds: ['lucielle'] } }, { bossLoot: { guaranteed: [{ materialId: 'pilgrim:rare', count: 1 }] } }, { waves: [[{ characterId: 'pale-wolf', boss: true }], [{ characterId: 'asteria', boss: true }]] }]) {
      const data = structuredClone(content); Object.assign(data.dungeons.find(stage => stage.id === goddessTrial.id)!, patch);
      expect(validateContent(data).some(error => error.includes('trials'))).toBe(true);
    }
    const save = start(); Object.assign(save.battle!, { phase: 'reward', nextPhase: 'reward', events: [], cursor: 0, pendingMaterials: { 'pilgrim:rare': 1 } });
    expect(() => applyCommand(save, { type: 'claim' }, content)).toThrow('戦利品');
    const ordinary = structuredClone(content); ordinary.dungeons[0]!.waves[0]![0]!.boss = true;
    expect(validateContent(ordinary).some(error => error.includes('boss before final wave'))).toBe(true);
  });
});


it('adds a deliberately impossible 100.0 trial without changing lower trial stats or requiring the extreme clear', () => {
  expect(validateContent(content)).toEqual([]);
  expect(dungeonDifficulty(impossibleGoddessTrial, content)).toBe(100);
  expect(dungeonDifficulty(ultimateGoddessTrial, content)).toBe(30);
  const save=createInitialSave(content,42);
  expect(()=>applyCommand(save,{type:'depart',dungeonId:impossibleGoddessTrial.id,potions:0},content)).toThrow('忘却の聖堂');
  save.completedDungeonIds=['silent-cathedral'];
  const entered=drain(applyCommand(save,{type:'depart',dungeonId:impossibleGoddessTrial.id,potions:0},content));
  const enemy=entered.battle!.units.find(unit=>unit.side==='enemy')!;
  const char=content.characters.find(char=>char.id===enemy.characterId)!;
  const base=characterStats(char);
  expect(enemy.maxHp).toBe(base.hp*61);expect(enemy.attack).toBe(base.attack*10);
  expect(entered.battle!.pendingMaterials).toEqual({});expect(entered.battle!.goldEarned).toBe(0);
  assertSaveCompatibility(JSON.parse(JSON.stringify(entered)),content);
  const retreated=applyCommand(entered,{type:'retreat'},content);
  expect(retreated.completedDungeonIds).not.toContain(impossibleGoddessTrial.id);
  const reward=structuredClone(entered);Object.assign(reward.battle!,{phase:'reward',nextPhase:'reward',events:[],cursor:0});
  const claimed=applyCommand(reward,{type:'claim'},content);
  expect(claimed.completedDungeonIds).toContain(impossibleGoddessTrial.id);
  expect(claimed.stones).toBe(save.stones);expect(claimed.gold).toBe(save.gold);expect(claimed.materials).toEqual(save.materials);
});
it('permits extreme scales only for trials and still rejects unsafe trial multipliers',()=>{
  const ordinary=structuredClone(content);ordinary.dungeons.find(stage=>stage.id==='stone-fountain')!.bossScale={hp:6100,attack:1000};
  expect(validateContent(ordinary)).toContain('dungeons/stone-fountain: invalid event boss scale');
  const invalid=structuredClone(content);invalid.dungeons.find(stage=>stage.id===impossibleGoddessTrial.id)!.bossScale={hp:10001,attack:1001};
  expect(validateContent(invalid)).toContain('dungeons/goddess-procession-impossible: invalid event boss scale');
});
