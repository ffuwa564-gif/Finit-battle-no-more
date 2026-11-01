import { describe, expect, it } from 'vitest';
import { applyCharacterRescue, characterRescueDefinition } from '../src/domain/character-rescue';
import { enemySupportAvailable, spendEnemySupport } from '../src/domain/enemy-support';
import type { Battle, DungeonDef, Unit } from '../src/domain/types';

function unit(id: string, side: Unit['side'] = 'party'): Unit {
  return { uid: `${side}:${id}`, characterId: id, side, boss: false, hp: 100, maxHp: 1000, attack: 30, defense: 10, speed: 10, tie: 1, cooldowns: {} };
}
function setup(id: string) {
  const actor = unit(id), target = unit('friend'), enemy = unit('foe', 'enemy'), second = unit('second', 'enemy');
  const battle: Battle = { id: 'talents', dungeonId: 'tower', contentVersion: 'test', rulesVersion: 'test', wave: 0, round: 1, units: [actor, target, enemy, second], initialUnits: [], partyIds: [id, 'friend'], leaderId: id, strategy: 'balanced', potionsRemaining: 0, potionUsed: false, pendingMaterials: {}, seed: 1, talkFlags: [], phase: 'ready', nextPhase: 'ready', events: [], cursor: 0, goldEarned: 0 };
  return { actor, target, enemy, second, battle };
}

describe('v1.10 named personal talents', () => {
  it.each(['veil-priestess', 'hebe-standard', 'flora-standard'])('gives %s ordinary recovery a capped real heal without a barrier', id => {
    const { actor, target, battle } = setup(id), before = structuredClone(battle.units);
    const result = applyCharacterRescue(battle, actor, before, { ordinary: true, template: 'heal', targetIds: [target.uid] });
    expect(result.amount).toBe(35); expect(target.hp).toBe(135); expect(target.barrier).toBeUndefined();
    target.hp = 999;
    expect(applyCharacterRescue(battle, actor, before, { ordinary: true, template: 'heal', targetIds: [target.uid] }).amount).toBe(1);
    expect(target.hp).toBe(1000);
  });
  it('does not spread the talent to enemies, stones, ultimates, or the held-back Hebe form', () => {
    for (const id of ['hebe', 'elaine']) {
      const { actor, target, battle } = setup(id);
      expect(applyCharacterRescue(battle, actor, [], { ordinary: true, template: 'heal', targetIds: [target.uid] }).amount).toBe(0);
    }
    const { actor, target, battle } = setup('hebe-standard');
    expect(applyCharacterRescue(battle, actor, [], { ordinary: false, template: 'heal', targetIds: [target.uid] }).amount).toBe(0);
    actor.side = 'enemy';
    expect(applyCharacterRescue(battle, actor, [], { ordinary: true, template: 'heal', targetIds: [target.uid] }).amount).toBe(0);
    expect(target.hp).toBe(100);
  });
  it('leaves Noelle a multiple-target job and preserves stronger defense breaks', () => {
    const { actor, enemy, second, battle } = setup('noelle');
    enemy.debuffStrength = 80; enemy.debuffUntil = 7;
    const action = { ordinary: true, template: 'area' as const, targetIds: [enemy.uid, second.uid] };
    expect(applyCharacterRescue(battle, actor, [], action).note).toBe('星図の露出');
    expect([enemy.debuffStrength, enemy.debuffUntil]).toEqual([80, 7]);
    expect([second.debuffStrength, second.debuffUntil]).toEqual([30, 2]);
    delete second.debuffStrength; delete second.debuffUntil;
    expect(applyCharacterRescue(battle, actor, [], { ...action, targetIds: [second.uid] }).note).toBeUndefined();
    expect(second.debuffStrength).toBeUndefined();
    expect(characterRescueDefinition('noelle-awakened')).toBeUndefined();
  });
  it('rewards a real Tikka seal once, capped at100, rather than any debuff or empty seal', () => {
    const { actor, enemy, battle } = setup('tikka'); actor.ultimateCharge = 97;
    const before = structuredClone(battle.units); enemy.cooldowns['enemy-skill'] = 3;
    const action = { ordinary: true, template: 'jam' as const, targetIds: [enemy.uid] };
    expect(applyCharacterRescue(battle, actor, before, action).note).toBe('故障診断');
    expect(actor.ultimateCharge).toBe(100);
    actor.ultimateCharge = 10;
    expect(applyCharacterRescue(battle, actor, structuredClone(battle.units), action).note).toBeUndefined();
    expect(actor.ultimateCharge).toBe(10);
    applyCharacterRescue(battle, actor, before, { ...action, template: 'debuff' });
    expect(actor.ultimateCharge).toBe(10);
  });
  it('keeps Lucielle’s old stronger or equal buff without inventing an extra extension', () => {
    const { actor, target, battle } = setup('lucielle');
    for (const oldStrength of [14, 70]) {
      target.buffStrength = oldStrength; target.buffUntil = 7;
      const before = structuredClone(battle.units);
      target.buffStrength = 14; target.buffUntil = 2;
      applyCharacterRescue(battle, actor, before, { ordinary: true, template: 'buff', targetIds: [target.uid] });
      expect([target.buffStrength, target.buffUntil]).toEqual([oldStrength, 7]);
    }
  });
});

describe('finite tower phantom support', () => {
  const tower = { towerBattle: { healLimit: 3, barrierLimit: 2 } } as DungeonDef;
  it('shares the healing budget with regen, keeps barrier separate, and leaves attacks available', () => {
    const actor = unit('healer', 'enemy');
    for (const template of ['heal', 'mend_pair', 'regen'] as const) {
      expect(enemySupportAvailable(actor, template, tower)).toBe(true); spendEnemySupport(actor, template, tower);
    }
    expect(enemySupportAvailable(actor, 'heal', tower)).toBe(false);
    expect(enemySupportAvailable(actor, 'barrier_mend', tower)).toBe(false);
    expect(enemySupportAvailable(actor, 'attack', tower)).toBe(true);
    for (let i = 0; i < 2; i++) spendEnemySupport(actor, 'barrier', tower);
    expect(enemySupportAvailable(actor, 'barrier', tower)).toBe(false);
    expect(actor.towerSupportUsed).toEqual({ healing: 3, barrier: 2 });
  });
  it('does not limit party skills or non-tower encounters', () => {
    const party = unit('friend');
    for (let i = 0; i < 10; i++) spendEnemySupport(party, 'heal', tower);
    expect(party.towerSupportUsed).toBeUndefined();
    const enemy = unit('foe', 'enemy');
    for (let i = 0; i < 10; i++) spendEnemySupport(enemy, 'heal', {} as DungeonDef);
    expect(enemy.towerSupportUsed).toBeUndefined();
  });
});
