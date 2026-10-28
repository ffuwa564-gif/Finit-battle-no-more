import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { offerBattleBloom } from '../src/domain/battle-blooms';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { Battle, GameSave } from '../src/domain/types';

function finish(save: GameSave) {
  for (let i = 0; save.battle?.phase === 'playing' && i < 80; i++) save = applyCommand(save, { type: 'replay' }, content);
  return save;
}
function fixture(kind: 'heal' | 'strike' = 'heal', dungeonId = 'silent-cathedral', final = false) {
  const save = createInitialSave(content, 42);
  save.battle = createBattle(content, save.partyIds, save.leaderId, dungeonId, 5, 42, 'flower-test');
  if (final) {
    save.battle.wave = content.dungeons.find(d => d.id === dungeonId)!.waves.length - 2;
    save.battle.cursor = save.battle.events.length; save.battle.nextPhase = 'wave';
    save.battle = advanceReplay(save.battle, content);
  }
  const result = finish(save), battle = result.battle!;
  battle.round = 2;
  battle.blooms = { seed: 42, checked: `${battle.wave}:2`, flower: { id: `${battle.id}:flower:${battle.wave}:2`, kind, wave: battle.wave, round: 2 } };
  return result;
}
const tap = (save: GameSave) => applyCommand(save, { type: 'battleBloom', bloomId: save.battle!.blooms!.flower!.id }, content);

describe('saved battle blossoms', () => {
  it('rolls once per real round with a separate reproducible stream and offers both kinds', () => {
    let count = 0; const kinds = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const battle = structuredClone(fixture().battle!); battle.id = `run-${i}`; delete battle.blooms;
      battle.units.find(u => u.side === 'party')!.hp = 1;
      const seed = battle.seed; offerBattleBloom(battle);
      const after = JSON.stringify(battle); offerBattleBloom(battle);
      expect(JSON.stringify(battle)).toBe(after); expect(battle.seed).toBe(seed);
      const offered = (battle as Battle).blooms?.flower;
      if (offered) { count++; kinds.add(offered.kind); }
    }
    expect(count).toBeGreaterThan(80); expect(count).toBeLessThan(170);
    expect([...kinds].sort()).toEqual(['heal', 'strike']);
  });
  it('grows three lights and guarantees a bloom by the third completed round', () => {
    for (let i = 0; i < 80; i++) {
      const battle = structuredClone(fixture().battle!); battle.id = `growth-${i}`; delete battle.blooms;
      for (let round = 2; round <= 4; round++) {
        battle.round = round; offerBattleBloom(battle);
        if ((battle as Battle).blooms?.flower) break;
        expect((battle as Battle).blooms!.growth).toBe(round - 1);
      }
      expect((battle as Battle).blooms!.flower).toBeDefined();
      expect((battle as Battle).blooms!.growth).toBe(3);
    }
  });
  it('heals the lowest HP ratio living ally, preserves turns, potions, cooldowns and queued ultimates', () => {
    const save = fixture(); const party = save.battle!.units.filter(u => u.side === 'party');
    party[0].hp = 0; party[1].hp = 1; party[2].hp = Math.floor(party[2].maxHp / 2);
    party[1].ultimateCharge = 100; party[1].ultimateQueued = true;
    party[1].cooldowns['test'] = 4; save.battle!.potionUsed = true;
    const before = structuredClone(save), healed = tap(save), battle = healed.battle!;
    expect(save).toEqual(before); expect(battle.units[0].hp).toBe(0);
    const target = battle.units.find(u => u.uid === party[1].uid)!;
    expect(target.hp).toBe(1 + Math.floor(target.maxHp * .18));
    expect(target.cooldowns).toEqual(party[1].cooldowns); expect(target.ultimateQueued).toBe(true);
    expect(battle.round).toBe(2); expect(healed.gold).toBe(save.gold);
    expect(battle.blooms!.flower).toBeUndefined(); expect(battle.events[0].bloomAction).toBe('heal');
    const done = finish(healed);
    expect(done.battle!.round).toBe(2); expect(done.battle!.potionUsed).toBe(true);
    expect(done.battle!.blooms!.flower).toBeUndefined();
    expect(done.battle!.blooms!.growth).toBe(0);
    expect(done.potions).toBe(save.potions); expect(done.battle!.potionsRemaining).toBe(5);
  });
  it('rejects stale/double taps and refuses to consume a heal with nobody wounded', () => {
    const save = fixture(); expect(() => tap(save)).toThrow('回復');
    expect(save.battle!.blooms!.flower).toBeDefined();
    save.battle!.units.find(u => u.side === 'party')!.hp = 1;
    const id = save.battle!.blooms!.flower!.id, after = finish(tap(save));
    expect(() => applyCommand(after, { type: 'battleBloom', bloomId: id }, content)).toThrow('花');
    expect(() => applyCommand(save, { type: 'battleBloom', bloomId: 'stale' }, content)).toThrow('花');
  });
  it('uses barriers and awards lethal strike loot exactly once without advancing the round', () => {
    const save = fixture('strike'); const enemy = save.battle!.units.find(u => u.side === 'enemy')!;
    enemy.barrier = 10000; enemy.barrierUntil = 2;
    const guarded = tap(save).battle!;
    expect(guarded.units.find(u => u.uid === enemy.uid)!.hp).toBe(enemy.hp);
    expect(guarded.units.find(u => u.uid === enemy.uid)!.barrier).toBeLessThan(10000);
    delete enemy.barrier; delete enemy.barrierUntil;
    for (const unit of save.battle!.units.filter(u => u.side === 'enemy')) unit.hp = 1;
    const won = tap(save);
    expect(won.gold).toBeGreaterThan(save.gold);
    expect(won.battle!.events.some(e => e.kind === 'drop')).toBe(true);
    expect(won.battle!.round).toBe(2);
    const gold = won.gold, done = finish(won);
    expect(done.gold).toBe(gold); expect(done.battle!.blooms!.flower).toBeUndefined();
  });
  it('settles event boss cores through the ordinary reward pipeline, then permits one claim', () => {
    const save = fixture('strike', 'kuzuha-awakening', true);
    const enemies = save.battle!.units.filter(u => u.side === 'enemy');
    for (const unit of enemies) { unit.hp = 1; delete unit.barrier; delete unit.barrierUntil; }
    // Last wave is a single event boss, so the blossom can finish it.
    expect(enemies).toHaveLength(1);
    const killed = tap(save);
    expect(killed.battle!.pendingMaterials['kuzuha-contract:epic']).toBe(1);
    const reward = finish(killed); expect(reward.battle!.phase).toBe('reward');
    const claimed = applyCommand(reward, { type: 'claim' }, content);
    expect(claimed.materials['kuzuha-contract:epic']).toBe(1);
    expect(() => applyCommand(claimed, { type: 'claim' }, content)).toThrow();
  });
  it('keeps trials reward-free, and an unused flower expires on ATTACK', () => {
    const trial = content.dungeons.find(d => d.kind === 'trial')!;
    const save = fixture('strike', trial.id, true);
    for (const unit of save.battle!.units.filter(u => u.side === 'enemy')) { unit.hp = 1; delete unit.barrier; }
    const after = tap(save);
    expect(after.gold).toBe(save.gold); expect(after.battle!.pendingMaterials).toEqual({});
    expect(after.battle!.events.some(e => e.kind === 'drop')).toBe(false);
    const normal = fixture();
    expect(resolveRound(normal.battle!, content).battle.blooms!.flower).toBeUndefined();
  });
  it('round-trips valid flowers and legacy saves, rejects malformed state, and clears on retreat', () => {
    const save = fixture(); assertSaveCompatibility(JSON.parse(JSON.stringify(save)), content);
    const old = structuredClone(save); delete old.battle!.blooms; assertSaveCompatibility(old, content);
    for (const patch of [{ id: 'stale' }, { kind: 'unknown' }, { round: 99 }, { wave: -1 }]) {
      const bad = structuredClone(save); Object.assign(bad.battle!.blooms!.flower!, patch);
      expect(() => assertValidSave(bad)).toThrow('花');
    }
    const after = applyCommand(save, { type: 'retreat' }, content);
    expect(after.battle!.blooms!.flower).toBeUndefined(); assertSaveCompatibility(after, content);
  });
});
