import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { kuzuhaEvent as event } from '../src/content/boss-events';
import { applyCommand, createInitialSave } from '../src/application/game';
import { createBattle } from '../src/domain/engine';
import { bossWindupStatus } from '../src/domain/boss-pressure';
import { partyOrderOptions } from '../src/domain/party-orders';
import { dungeonLock } from '../src/domain/events';
import { assertSaveCompatibility } from '../src/platform/save';
import type { GameSave, Strategy } from '../src/domain/types';

function play(save: GameSave, stage: string, strategy: Strategy = 'balanced', readPressure = false): GameSave {
  let next = applyCommand(save, { type: 'depart', dungeonId: stage, potions: 5 }, content);
  for (let i = 0; i < 1500 && next.battle && !['reward', 'failed'].includes(next.battle.phase); i++) {
    if (next.battle.phase === 'playing') { next = applyCommand(next, { type: 'replay' }, content); continue; }
    next = applyCommand(next, { type: 'strategy', strategy }, content);
    const weakest = next.battle!.units.filter(unit => unit.side === 'party' && unit.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (weakest && weakest.hp / weakest.maxHp < .65 && next.battle!.potionsRemaining > 0) next = applyCommand(next, { type: 'potion', unitId: weakest.uid }, content);
    if (readPressure) {
      const battle = next.battle!, pilot = battle.units.find(u => u.side === 'party' && u.characterId === battle.partyIds[0]);
      const enemies = battle.units.filter(u => u.side === 'enemy' && u.hp > 0);
      const boss = enemies.find(u => u.boss), strike = content.dungeons.find(d => d.id === stage)!.bossStrike;
      const pressure = boss && strike ? bossWindupStatus(boss, strike, battle.round) : undefined;
      const healer = enemies.find(u => content.characters.find(c => c.id === u.characterId)?.role === 'healer');
      const target = pressure?.phase === 'charging' ? boss : healer ?? enemies.sort((a,b) => a.hp-b.hp)[0];
      if (pilot && pilot.hp > 0) {
        const options = partyOrderOptions(pilot, battle, content).filter(o => !o.disabled);
        const ultimate = options.find(o => o.id === 'ultimate');
        const damage = options.filter(o => o.order?.kind === 'skill' && ['attack','area','pierce','drain','shatter','dawn'].includes(o.template)).at(-1);
        const order = pressure?.phase === 'striking' ? { kind: 'guard' as const } : ultimate?.order ?? damage?.order ?? { kind: 'attack' as const };
        next = applyCommand(next, { type: 'partyOrder', battleId: battle.id, order, targetId: target?.uid }, content);
      }
    }
    next = applyCommand(next, { type: 'round' }, content);
  }
  return next;
}
function town(): GameSave {
  const save = createInitialSave(content, 42);
  save.completedDungeonIds = ['silent-cathedral'];
  return save;
}
function normalOwned(): GameSave {
  let save = town();
  save.completedDungeonIds.push(...event.dungeonIds.slice(0, 4));
  save.materials[event.fragment.id] = 30;
  save = applyCommand(save, { type: 'eventRecruit', eventId: event.id, form: 'normal' }, content);
  return save;
}

describe('event progression and durable rewards', () => {
  it('locks departure and only unlocks the next difficulty when rewards are claimed', () => {
    const fresh = createInitialSave(content);
    expect(() => applyCommand(fresh, { type: 'depart', dungeonId: event.dungeonIds[0]!, potions: 0 }, content)).toThrow('解放');
    const reward = play(town(), event.dungeonIds[0]!);
    expect(reward.battle?.phase).toBe('reward');
    expect(reward.battle?.pendingMaterials[event.fragment.id]).toBe(1);
    expect(reward.materials[event.fragment.id]).toBeUndefined();
    expect(reward.battle?.events.filter(item => item.materialId === event.fragment.id)).toMatchObject([{ kind: 'drop', rarity: 'rare', amount: 1 }]);
    const nextStage = content.dungeons.find(stage => stage.id === event.dungeonIds[1])!;
    expect(dungeonLock(nextStage, reward, content)).toBeTruthy();
    expect(() => assertSaveCompatibility(reward, content)).not.toThrow();
    const claimed = applyCommand(structuredClone(reward), { type: 'claim' }, content);
    expect(claimed.materials[event.fragment.id]).toBe(1);
    expect(claimed.stones).toBe(1);
    expect(dungeonLock(nextStage, claimed, content)).toBeNull();
    expect(() => applyCommand(claimed, { type: 'claim' }, content)).toThrow();
    const second = applyCommand(play(claimed, event.dungeonIds[0]!), { type: 'claim' }, content);
    expect(second.materials[event.fragment.id]).toBe(2);
    expect(second.stones).toBe(2);
  });
  it('uses dedicated normal exchange and never synthesizes awakening cores', () => {
    const save = town(); save.completedDungeonIds.push(event.dungeonIds[0]!); save.materials[event.fragment.id] = 29;
    expect(() => applyCommand(save, { type: 'eventRecruit', eventId: event.id, form: 'normal' }, content)).toThrow('素材');
    save.materials[event.fragment.id] = 30;
    expect(() => applyCommand(save, { type: 'exchange', speciesId: event.materialSpeciesId, rarity: 'rare', direction: 'up' }, content)).toThrow('合成');
    expect(() => applyCommand(save, { type: 'recruit', characterId: event.normalId }, content)).toThrow();
    const recruited = applyCommand(save, { type: 'eventRecruit', eventId: event.id, form: 'normal' }, content);
    expect(recruited.materials[event.fragment.id]).toBe(0);
    expect(recruited.ownedIds).toContain(event.normalId);
    expect(save.materials[event.fragment.id]).toBe(30);
    expect(() => applyCommand(recruited, { type: 'eventRecruit', eventId: event.id, form: 'normal' }, content)).toThrow('済み');
    const hidden = structuredClone(content); hidden.characters.find(char => char.id === event.normalId)!.published = false;
    expect(() => applyCommand(save, { type: 'eventRecruit', eventId: event.id, form: 'normal' }, hidden)).toThrow('取得');
  });
  it('awards a core only after the highest boss, then exchanges for a separate animated form', () => {
    const save = normalOwned();
    save.ownedIds.push('mireille', 'evelyn', 'asteria');
    save.partyIds = ['mireille', 'evelyn', 'asteria', event.normalId]; save.leaderId = 'evelyn';
    save.materials[event.core.id] = 4;
    expect(() => applyCommand(save, { type: 'eventRecruit', eventId: event.id, form: 'awakened' }, content)).toThrow('踏破');
    const reward = play(save, event.dungeonIds.at(-1)!);
    expect(reward.battle?.phase).toBe('reward');
    expect(reward.battle?.pendingMaterials[event.core.id]).toBe(1);
    expect(reward.battle?.pendingMaterials[event.fragment.id]).toBeUndefined();
    expect(reward.materials[event.core.id]).toBe(4);
    const claimed = applyCommand(reward, { type: 'claim' }, content);
    const awakened = applyCommand(claimed, { type: 'eventRecruit', eventId: event.id, form: 'awakened' }, content);
    expect(awakened.materials[event.core.id]).toBe(0);
    expect(awakened.ownedIds).toEqual(expect.arrayContaining([event.normalId, event.awakenedId]));
    expect(content.characters.find(char => char.id === event.awakenedId)?.motionId).toBeTruthy();
    expect(() => assertSaveCompatibility(awakened, content)).not.toThrow();
    expect(() => applyCommand(awakened, { type: 'party', partyIds: [event.normalId, event.awakenedId], leaderId: event.normalId }, content)).toThrow('同時');
    expect(() => createBattle(content, [event.normalId, event.awakenedId], event.normalId, event.dungeonIds[0]!, 0, 1, 'invalid')).toThrow();
  });
  it('forfeits provisional event materials on failure or retreat without losing confirmed progress', () => {
    const save = normalOwned(); save.materials[event.core.id] = 2;
    save.partyIds = ['elaine']; save.leaderId = 'elaine';
    const failed = play(save, event.dungeonIds.at(-1)!);
    expect(failed.battle?.phase).toBe('failed');
    expect(failed.battle?.pendingMaterials).toEqual({});
    expect(failed.materials[event.core.id]).toBe(2);
    const ready = applyCommand(town(), { type: 'depart', dungeonId: event.dungeonIds[0]!, potions: 0 }, content);
    while (ready.battle?.phase === 'playing') ready.battle = applyCommand(ready, { type: 'replay' }, content).battle;
    ready.battle!.pendingMaterials[event.fragment.id] = 3;
    const retreat = applyCommand(ready, { type: 'retreat' }, content);
    expect(retreat.battle?.pendingMaterials).toEqual({});
    expect(retreat.materials[event.fragment.id]).toBeUndefined();
  });
  it('rejects content that gives lower difficulties the exclusive reward or bypasses acquisition', () => {
    const invalid = structuredClone(content);
    invalid.dungeons.find(stage => stage.id === event.dungeonIds[0])!.eventReward!.materialId = event.core.id;
    invalid.characters.find(char => char.id === event.awakenedId)!.origin.push('gacha');
    expect(validateContent(invalid)).toEqual(expect.arrayContaining([expect.stringContaining('exclusive'), expect.stringContaining('event-exclusive')]));
  });
  it('has a highest-difficulty route using recruit awakenings, normal Kuzuha and public boss tells', () => {
    const save = normalOwned(); save.seed = 1;
    save.ownedIds.push('liora-awakened', 'elaine-awakened', 'seris-awakened');
    save.partyIds = [event.normalId, 'liora-awakened', 'elaine-awakened', 'seris-awakened']; save.leaderId = 'liora-awakened';
    for (const id of save.partyIds) expect(content.characters.find(c => c.id === id)!.origin).not.toContain('gacha');
    const reward = play(save, event.dungeonIds.at(-1)!, 'survival', true);
    expect(reward.battle?.phase).toBe('reward');
    expect(reward.battle?.pendingMaterials[event.core.id]).toBe(1);
  });
});
