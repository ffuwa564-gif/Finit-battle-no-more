import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { assertSaveCompatibility } from '../src/platform/save';
import { partyOrderOptions } from '../src/domain/party-orders';
import { GEM_CRAFT_COST, GEM_DEFINITIONS, dungeonGemFamily, gemSkill } from '../src/domain/memory-gems';
import type { GameSave } from '../src/domain/types';

const command = (save: GameSave, value: Parameters<typeof applyCommand>[1]) => applyCommand(save, value, content);
function replay(save: GameSave): GameSave {
  let result = save;
  for (let n = 0; result.battle?.phase === 'playing' && n < 300; n++) result = command(result, { type: 'replay' });
  expect(result.battle?.phase).not.toBe('playing');
  return result;
}
function begin(): GameSave {
  return replay(command(createInitialSave(content, 42), { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }));
}
function clearWave(save: GameSave): GameSave {
  const next = structuredClone(save);
  for (const unit of next.battle!.units) {
    if (unit.side === 'party') { unit.attack = 100000; unit.hp = unit.maxHp; unit.speed = 100; }
    else { unit.hp = 1; unit.defense = 0; unit.attack = 0; unit.speed = 0; }
  }
  next.battle!.initialUnits = structuredClone(next.battle!.units);
  return replay(command(next, { type: 'round' }));
}

describe('memory gem exploration to combat integration', () => {
  it('secures the first chest through retreat, JSON restore and the next expedition without changing character stats', () => {
    let save = begin();
    const before = save.battle!.units.filter(unit => unit.side === 'party').map(unit => ({ id: unit.characterId, hp: unit.maxHp, attack: unit.attack, defense: unit.defense, speed: unit.speed }));
    save = clearWave(save);
    expect(save.battle!.phase).toBe('ready');
    expect(save.memoryGems!.items).toHaveLength(1);
    const gem = save.memoryGems!.items[0];
    const checks = [...save.battle!.gemChestChecks!];
    assertSaveCompatibility(JSON.parse(JSON.stringify(save)), content);
    save = command(save, { type: 'equipMemoryGem', characterId: save.partyIds[0], gemId: gem.id });
    expect(save.battle!.memoryGems![save.partyIds[0]]).toEqual(gem);
    expect(save.battle!.gemChestChecks).toEqual(checks);
    save = command(command(save, { type: 'retreat' }), { type: 'leaveFailure' });
    save = JSON.parse(JSON.stringify(save)) as GameSave;
    assertSaveCompatibility(save, content);
    expect(save.memoryGems!.items).toEqual([gem]);
    save = replay(command(save, { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }));
    const after = save.battle!.units.filter(unit => unit.side === 'party').map(unit => ({ id: unit.characterId, hp: unit.maxHp, attack: unit.attack, defense: unit.defense, speed: unit.speed }));
    expect(after).toEqual(before);
    const pilot = save.battle!.units.find(unit => unit.characterId === save.partyIds[0] && unit.side === 'party')!;
    expect(partyOrderOptions(pilot, save.battle!, content)).toContainEqual(expect.objectContaining({ id: 'skill:' + gemSkill(gem).id }));
    expect(save.battle!.gemChestChecks ?? []).toHaveLength(0);
  });

  it('turns six successful clears into a chosen skill and consumes its normal action when ordered', () => {
    let save = createInitialSave(content, 99);
    const definition = GEM_DEFINITIONS.find(def => !def.bossOnly && def.skill.template === 'drain')!;
    expect(definition).toBeDefined();
    const dungeon = content.dungeons.find(def => dungeonGemFamily(def) === definition.family && def.id === 'silent-cathedral')
      ?? content.dungeons.find(def => def.kind !== 'trial' && dungeonGemFamily(def) === definition.family)!;
    // Start with a mature save so the chosen family's entrance is unlocked.
    save.completedDungeonIds = content.dungeons.map(def => def.id);
    for (let run = 0; run < GEM_CRAFT_COST; run++) {
      save = replay(command(save, { type: 'depart', dungeonId: dungeon.id, potions: 0 }));
      for (let wave = 0; save.battle!.phase === 'ready' && wave < dungeon.waves.length; wave++) save = clearWave(save);
      expect(save.battle!.phase).toBe('reward');
      save = command(save, { type: 'claim' });
      if (save.novels?.active) save.novels.active = undefined;
    }
    expect(save.memoryGems!.dust[definition.family]).toBeGreaterThanOrEqual(GEM_CRAFT_COST);
    const previous = new Set(save.memoryGems!.items.map(gem => gem.id));
    save = command(save, { type: 'craftMemoryGem', defId: definition.id });
    const gem = save.memoryGems!.items.find(item => !previous.has(item.id))!;
    expect(gem.defId).toBe(definition.id);
    save = command(save, { type: 'equipMemoryGem', characterId: save.partyIds[0], gemId: gem.id });
    save = replay(command(save, { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }));
    const pilot = save.battle!.units.find(unit => unit.characterId === save.partyIds[0] && unit.side === 'party')!;
    for (const enemy of save.battle!.units.filter(unit => unit.side === 'enemy')) { enemy.hp = enemy.maxHp = 100000; enemy.speed = 0; }
    pilot.speed = 100;
    save.battle!.initialUnits = structuredClone(save.battle!.units);
    const skill = gemSkill(gem);
    save = command(save, { type: 'partyOrder', battleId: save.battle!.id, order: { kind: 'skill', skillId: skill.id } });
    save = command(save, { type: 'round' });
    const actions = save.battle!.events.filter(event => event.actionSelection && event.actorId === pilot.uid);
    expect(actions).toHaveLength(1);
    expect(actions[0].skillId).toBe(skill.id);
    expect(save.battle!.units.find(unit => unit.uid === pilot.uid)!.cooldowns[skill.id]).toBeGreaterThan(save.battle!.round);
    assertSaveCompatibility(JSON.parse(JSON.stringify(save)), content);
  });
});
