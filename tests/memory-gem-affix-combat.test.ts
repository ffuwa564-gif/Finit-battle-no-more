import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { advanceReplay, characterStats, createBattle, resolveRound } from '../src/domain/engine';
import { gemSkill, type MemoryGem } from '../src/domain/memory-gems';
import { TOWER_ROUND_LIMIT } from '../src/domain/ivory-tower';
import type { Battle, Content } from '../src/domain/types';

function ready(gem: MemoryGem): Battle {
  let battle = createBattle(content, ['seris', 'liora', 'elaine', 'noelle'], 'liora', 'silent-cathedral', 0, 42, 'affix-combat');
  while (battle.phase === 'playing') battle = advanceReplay(battle, content);
  battle.memoryGems = { seris: gem };
  for (const unit of battle.units) {
    if (unit.side === 'enemy') { unit.hp = unit.maxHp = 100000; unit.attack = 1; unit.speed = 0; }
    else { unit.hp = unit.maxHp = 10000; unit.speed = unit.characterId === 'seris' ? 100 : 20; }
  }
  battle.units[0].attack = 100;
  battle.partyOrder = { kind: 'skill', skillId: gemSkill(gem).id };
  return battle;
}
const gem = (trait: NonNullable<MemoryGem['roll']>['trait'] = 'none', power = 0, value = 100): MemoryGem => ({ id: 'affix-owned', defId: 'night-dew', variant: 'pure', roll: { power, trait, value: trait === 'none' ? 0 : value } });
const action = (battle: Battle) => battle.events.find(event => event.actionSelection && event.actorId === 'party:seris')!;
const run = (input: Battle) => resolveRound(input, content).battle;

describe('rolled gem combat and tower scaling', () => {
  it('ends tower stalemates at round 40 while preserving the ordinary round 100 limit', () => {
    const ordinary = ready(gem()); ordinary.round = TOWER_ROUND_LIMIT;
    const local = structuredClone(content);
    const stage = local.dungeons.find(dungeon => dungeon.id === ordinary.dungeonId)!;
    const normal40 = resolveRound(ordinary, local).battle;
    expect(normal40.nextPhase).toBe('ready');
    expect(normal40.failureReason).toBeUndefined();
    stage.towerFloor = 1;
    const tower40 = resolveRound(ordinary, local).battle;
    expect(tower40.nextPhase).toBe('failed');
    expect(tower40.failureReason).toBe('ラウンド上限に達しました');
    delete stage.towerFloor;
    const normal100 = structuredClone(ordinary); normal100.round = 100;
    expect(resolveRound(normal100, local).battle.nextPhase).toBe('failed');
  });

  it('lets AI select a stronger rolled gem over a weaker innate skill of the same kind', () => {
    const item = { ...gem('none', 100), defId:'pale-ward' };
    const battle = ready(item); delete battle.partyOrder;
    battle.units.find(unit => unit.characterId === 'noelle')!.hp = 1000;
    const local = structuredClone(content);
    local.characters.find(character => character.id === 'seris')!.skillIds = ['barrier-23', 'attack-23'];
    expect(action(resolveRound(battle, local).battle).skillId).toBe(gemSkill(item).id);
    const older = ready({ id:'legacy-ward', defId:'pale-ward', variant:'pure' }); delete older.partyOrder;
    older.units.find(unit => unit.characterId === 'noelle')!.hp = 1000;
    expect(action(resolveRound(older, local).battle).skillId).toBe('barrier-23');
  });

  it('caps rolled utility effects without changing the legacy rewind or allowing gem cooldown loops', () => {
    const rewind = { ...gem('none', 100), defId:'rewind-thread' };
    const battle = ready(rewind); battle.crystalRole = 'attacker';
    const ally = battle.units.find(unit => unit.characterId === 'liora')!;
    const native = content.characters.find(character => character.id === 'liora')!.skillIds[0];
    ally.cooldowns[native] = 9; ally.cooldowns['memory:slot'] = 9;
    const snapshot = action(run(battle)).unitsAfter!.find(unit => unit.uid === ally.uid)!;
    expect(snapshot.cooldowns[native]).toBe(7); expect(snapshot.cooldowns['memory:slot']).toBe(9);
    const legacy = ready({ id:'legacy-rewind', defId:'rewind-thread', variant:'pure' }); legacy.crystalRole = 'attacker';
    legacy.units.find(unit => unit.characterId === 'liora')!.cooldowns[native] = 9;
    expect(action(run(legacy)).unitsAfter!.find(unit => unit.uid === ally.uid)!.cooldowns[native]).toBe(8);
    const battery = ready({ ...gem('none', 100), defId:'star-furnace' }); battery.crystalRole = 'attacker';
    battery.units.find(unit => unit.uid === ally.uid)!.attack = 1000;
    expect(action(run(battery)).unitsAfter!.find(unit => unit.uid === ally.uid)!.ultimateCharge).toBe(70);
  });

  it('caps rolled sleep at 60 percent on bosses and 95 percent on ordinary enemies', () => {
    for (const [boss, seed] of [[true, 1000], [false, 1900]] as const) {
      const item = { ...gem('none', 100), defId:'dream-lace' };
      const battle = ready(item); battle.crystalRole = 'attacker'; battle.seed = seed;
      const target = battle.units.find(unit => unit.side === 'enemy')!; target.boss = boss;
      expect(action(run(battle)).statusAction).toBe('resist');
    }
  });

  it('improves only the equipped active skill and preserves legacy and zero-roll power equivalence', () => {
    const legacy: MemoryGem = { id: 'legacy', defId: 'night-dew', variant: 'pure' };
    const old = ready(legacy), low = ready(gem()), high = ready(gem('none', 100));
    const before = { ...high.units[0], cooldowns: {} };
    const older = run(old), lower = run(low), higher = run(high);
    expect(action(older).amount).toBe(action(lower).amount);
    expect(action(higher).amount).toBeGreaterThan(action(lower).amount! * 2.4);
    const actor = higher.units[0];
    expect([actor.maxHp, actor.attack, actor.defense, actor.speed]).toEqual([before.maxHp, before.attack, before.defense, before.speed]);
    expect(higher.events.filter(event => event.actionSelection && event.actorId === actor.uid)).toHaveLength(1);
  });

  it('chains once into another enemy, records real HP changes separately, and awards each killed enemy once', () => {
    const item = gem('chain'); const battle = ready(item);
    for (const unit of battle.units) { if (unit.side === 'enemy') unit.hp = 1; else if (unit.uid !== 'party:seris') unit.hp = 0; }
    const done = run(battle);
    const hits = done.events.filter(event => event.skillId === gemSkill(item).id && event.kind === 'attack');
    expect(hits).toHaveLength(2);
    expect(hits[0].targetIds).not.toEqual(hits[1].targetIds);
    expect(hits[0].actionSelection).toBe(true); expect(hits[1].actionSelection).toBeUndefined();
    expect(hits[1].amount).toBe(1);
    expect(done.events.filter(event => event.kind === 'drop')).toHaveLength(2);
    expect(done.units.filter(unit => unit.side === 'enemy' && unit.hp <= 0)).toHaveLength(2);
    expect(done.memoryEchoes).toBeUndefined();
  });

  it('applies execution only to a low-HP target rather than every damaging gem hit', () => {
    const regular = ready(gem()), execute = ready(gem('execution'));
    regular.units.find(unit => unit.side === 'enemy')!.hp = 25000;
    execute.units.find(unit => unit.side === 'enemy')!.hp = 25000;
    const lowDamage = action(run(regular)).amount!;
    expect(action(run(execute)).amount).toBeGreaterThan(lowDamage * 1.5);
    expect(action(run(ready(gem('execution')))).amount).toBe(action(run(ready(gem()))).amount);
  });

  it('converts primary damage into a bounded heal on the most injured living ally', () => {
    const item = gem('mercy'); const battle = ready(item);
    battle.units.find(unit => unit.characterId === 'noelle')!.hp = 1000;
    const done = run(battle);
    const primary = action(done);
    const heal = done.events.find(event => event.kind === 'heal' && event.skillId === gemSkill(item).id)!;
    expect(heal.targetIds).toEqual(['party:noelle']);
    expect(heal.amount).toBe(Math.floor(primary.amount! * .5));
    expect(heal.actionSelection).toBeUndefined();
    expect(heal.unitsAfter!.find(unit => unit.uid === 'party:noelle')!.hp).toBe(1000 + heal.amount!);
  });

  it('adds bulwark to a utility gem while bounding accumulated barriers without reducing an existing larger one', () => {
    const item = { ...gem('bulwark', 100), defId: 'pale-ward' }; const battle = ready(item);
    const recipient = battle.units.find(unit => unit.characterId === 'noelle')!;
    recipient.hp = 1000; recipient.barrier = 5500; recipient.barrierUntil = 3;
    const done = run(battle);
    const shield = done.events.find(event => event.kind === 'guard' && event.skillId === gemSkill(item).id && !event.actionSelection)!;
    expect(shield.targetIds).toEqual([recipient.uid]);
    expect(shield.unitsAfter!.find(unit => unit.uid === recipient.uid)!.barrier).toBe(6000);
    const stronger = ready(item); const strongerTarget = stronger.units.find(unit => unit.characterId === 'noelle')!;
    strongerTarget.hp = 1000; strongerTarget.barrier = 7000; strongerTarget.barrierUntil = 3;
    expect(action(run(stronger)).unitsAfter!.find(unit => unit.uid === strongerTarget.uid)!.barrier).toBe(7000);
  });

  it('scales every tower enemy including escorts while leaving party stats and regular encounters unchanged', () => {
    const local: Content = structuredClone(content);
    const baseStage = local.dungeons.find(stage => stage.id === 'silent-cathedral')!;
    baseStage.waves = [[{ characterId:'pale-wolf', boss:true }, { characterId:'stone-drake' }]];
    const ordinary = createBattle(local, ['seris', 'liora'], 'liora', baseStage.id, 0, 42, 'plain');
    baseStage.enemyScale = { hp: 2, attack: 1.5, defense: 1.2 };
    const tower = createBattle(local, ['seris', 'liora'], 'liora', baseStage.id, 0, 42, 'tower');
    for (const unit of tower.units) {
      const previous = ordinary.units.find(candidate => candidate.uid === unit.uid)!;
      if (unit.side === 'party') expect(unit).toEqual(previous);
      else {
        const def = local.characters.find(character => character.id === unit.characterId)!;
        const baseline = characterStats(def, undefined, unit.boss, baseStage.bossScale);
        expect(unit.maxHp).toBe(Math.round(baseline.hp * 2));
        expect(unit.attack).toBe(Math.round(baseline.attack * 1.5));
        expect(unit.defense).toBe(Math.round(baseline.defense * 1.2));
        expect(unit.speed).toBe(previous.speed);
      }
    }
  });
});
