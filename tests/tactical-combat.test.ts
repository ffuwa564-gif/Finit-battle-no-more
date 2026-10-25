import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { tacticalTrial, goddessTrial } from '../src/content/trials';
import { advanceReplay, createBattle, resolveRound, usePotion } from '../src/domain/engine';
import { applyCommand, createInitialSave } from '../src/application/game';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { Battle, Strategy } from '../src/domain/types';

const party = ['iwanagahime', 'seris-awakened', 'selene', 'rainbow-iris'];
function setup(strategy: Strategy, stage = tacticalTrial.id): Battle {
  let battle = createBattle(content, party, 'seris-awakened', stage, 1, 42, 'tactics');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  battle.strategy = strategy;
  for (const unit of battle.units) unit.cooldowns = Object.fromEntries(content.characters.find(char => char.id === unit.characterId)!.skillIds.map(id => [id, 999]));
  const actor = battle.units.find(unit => unit.characterId === 'iwanagahime')!; actor.cooldowns = {};
  const vulnerable = battle.units.find(unit => unit.characterId === 'seris-awakened')!; vulnerable.hp = Math.floor(vulnerable.maxHp * .7);
  const boss = battle.units.find(unit => unit.boss)!; boss.barrier = 500; boss.barrierUntil = 4;
  battle.initialUnits = structuredClone(battle.units);
  return battle;
}
const actionOf = (battle: Battle, id: string) => battle.events.find(event => event.actorId === `party:${id}` && event.skillId);

describe('tactical commands with a visible cost', () => {
  it('lets the same party break a shield or protect an ally, with different real outcomes', () => {
    const attack = resolveRound(setup('aggressive'), content).battle;
    const protect = resolveRound(setup('survival'), content).battle;
    expect(actionOf(attack, 'iwanagahime')?.skillId).toMatch(/^shatter-/);
    expect(actionOf(protect, 'iwanagahime')?.skillId).toMatch(/^guard-/);
    expect(actionOf(attack, 'iwanagahime')?.directive).toBe('aggressive');
    expect(actionOf(protect, 'iwanagahime')?.directive).toBe('survival');
    expect(attack.units.find(unit => unit.boss)!.hp).toBeLessThan(protect.units.find(unit => unit.boss)!.hp);
    expect(attack.units.find(unit => unit.characterId === 'seris-awakened')!.hp).toBeLessThan(protect.units.find(unit => unit.characterId === 'seris-awakened')!.hp);
    expect(attack.seed).toBe(protect.seed);
  });
  it('keeps critical protection, avoids invalid counters, and does not change other trial priorities', () => {
    const critical = setup('aggressive'); const ally = critical.units.find(unit => unit.characterId === 'seris-awakened')!;
    ally.hp = Math.floor(ally.maxHp * .2);
    expect(actionOf(resolveRound(critical, content).battle, 'iwanagahime')?.skillId).toMatch(/^guard-/);
    const noShield = setup('aggressive'); delete noShield.units.find(unit => unit.boss)!.barrier;
    const action = actionOf(resolveRound(noShield, content).battle, 'iwanagahime');
    expect(action?.skillId).toMatch(/^guard-/); expect(action?.directive).toBeUndefined();
    expect(actionOf(resolveRound(setup('aggressive', goddessTrial.id), content).battle, 'iwanagahime')?.skillId).toMatch(/^guard-/);
  });
  it('dispels regeneration before buffing weaker allies when the strongest ally is already enhanced', () => {
    const battle = setup('balanced');
    const iris = battle.units.find(unit => unit.characterId === 'rainbow-iris')!; iris.cooldowns = {};
    const strongest = battle.units.find(unit => unit.characterId === 'seris-awakened')!; strongest.buffUntil = 5; strongest.buffStrength = 20;
    const enemy = battle.units.find(unit => unit.boss)!; enemy.regenUntil = 5; enemy.regenStrength = 20;
    expect(actionOf(resolveRound(battle, content).battle, 'rainbow-iris')?.skillId).toMatch(/^dispel-/);
    delete strongest.buffUntil;
    expect(actionOf(resolveRound(battle, content).battle, 'rainbow-iris')?.skillId).toMatch(/^buff-/);
  });
  it('supports one attack opening and a return to protection with real stats and fewer potions', () => {
    function play(policy: 'aggressive' | 'survival' | 'opening') {
      let battle = createBattle(content, party, 'selene', tacticalTrial.id, 5, 1, 'opening');
      battle.strategy = policy === 'aggressive' ? 'aggressive' : 'survival';
      let used = false, changes = 0, rounds = 0;
      while (!['reward', 'failed'].includes(battle.phase) && rounds < 210) {
        if (battle.phase === 'playing') { battle = advanceReplay(battle, content); continue; }
        let next: Strategy = policy === 'aggressive' ? 'aggressive' : 'survival';
        const actor = battle.units.find(unit => unit.characterId === 'iwanagahime')!;
        if (policy === 'opening' && !used && actor.hp > 0 && (actor.cooldowns['shatter-13'] ?? 0) <= battle.round && (actor.cooldowns['guard-13'] ?? 0) <= battle.round && (actor.guardUntil ?? -1) < battle.round && battle.units.some(unit => unit.boss && (unit.barrier ?? 0) > 0)) { next = 'aggressive'; used = true; }
        if (next !== battle.strategy) changes++; battle.strategy = next;
        const weak = battle.units.filter(unit => unit.side === 'party' && unit.hp > 0).sort((a,b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]!;
        if (weak.hp / weak.maxHp < .65 && battle.potionsRemaining > 0) battle = usePotion(battle, weak.uid);
        battle = resolveRound(battle, content).battle; rounds++;
      }
      return { battle, changes, rounds };
    }
    const opening = play('opening'), protect = play('survival'), attack = play('aggressive');
    expect([opening, protect, attack].every(run => run.battle.phase === 'reward')).toBe(true);
    expect(opening.changes).toBe(2); expect(opening.rounds).toBeLessThan(protect.rounds);
    expect(opening.battle.potionsRemaining).toBeGreaterThan(attack.battle.potionsRemaining);
    expect(opening.battle.pendingMaterials).toEqual({});
  });
  it('preserves deterministic replay, scheduled strikes and save compatibility without a new intent roll', () => {
    const battle = setup('aggressive'); battle.round = 3;
    const save = createInitialSave(content, 42); save.ownedIds = [...new Set([...save.ownedIds, ...party])]; save.partyIds = party; save.leaderId = 'seris-awakened'; save.battle = battle;
    const changed = applyCommand(save, { type: 'strategy', strategy: 'survival' }, content);
    expect(changed.battle!.seed).toBe(battle.seed); expect(changed.battle!.round).toBe(3);
    const medicated = applyCommand(changed, { type: 'potion', unitId: 'party:seris-awakened' }, content);
    expect(medicated.battle!.seed).toBe(battle.seed); expect(medicated.battle!.round).toBe(3);
    expect(resolveRound(medicated.battle!, content).battle.events.filter(event => event.bossStrike)).toHaveLength(1);
    const round = resolveRound(battle, content).battle;
    expect(resolveRound(JSON.parse(JSON.stringify(battle)), content).battle).toEqual(round);
    expect(round.events.filter(event => event.bossStrike)).toHaveLength(1);
    expect(round.events.find(event => event.bossStrike)?.text).toContain('月盾の一撃');
    const pending = structuredClone(round.pendingMaterials); const seed = round.seed;
    let replay = round;
    while (replay.phase === 'playing') replay = advanceReplay(replay, content);
    expect(replay.seed).toBe(seed); expect(replay.pendingMaterials).toEqual(pending);
    save.battle = round; expect(() => assertSaveCompatibility(JSON.parse(JSON.stringify(save)), content)).not.toThrow();
    const corrupted = structuredClone(save); Object.assign(corrupted.battle!.events.find(event => event.directive)!, { directive: 'invalid' });
    expect(() => assertValidSave(corrupted)).toThrow();
    const invalid = structuredClone(content); invalid.dungeons[0]!.tacticalCommands = true;
    expect(validateContent(invalid).some(error => error.includes('tactical commands'))).toBe(true);
  });
});
