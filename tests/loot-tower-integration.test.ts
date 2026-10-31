import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { emptyGemInventory, dungeonGemFamily } from '../src/domain/memory-gems';
import { dungeonLock } from '../src/domain/events';
import { highestTowerFloor } from '../src/domain/ivory-tower';
import { assertSaveCompatibility } from '../src/platform/save';
import { decodeBackup, encodeBackup } from '../src/platform/save-backup';
import type { GameCommand, GameSave } from '../src/domain/types';

const command = (save: GameSave, next: GameCommand) => applyCommand(save, next, content);
function replay(save: GameSave): GameSave {
  let result = save;
  for (let count = 0; result.battle?.phase === 'playing' && count < 400; count++) result = command(result, { type:'replay' });
  expect(result.battle?.phase).not.toBe('playing');
  return result;
}

describe('loot refinement and tower progression integrity', () => {
  it('ends a stalled tower encounter at40 rounds while regular expeditions keep their100-round limit', () => {
    const stage = content.dungeons.find(dungeon => dungeon.towerFloor === 1)!;
    function stalled(dungeonId: string, round: number) {
      let save = createInitialSave(content, 42);
      save.completedDungeonIds.push('silent-cathedral');
      save = replay(command(save, { type:'depart', dungeonId, potions:0 }));
      for (const unit of save.battle!.units) { unit.hp=unit.maxHp=1000000;unit.attack=0; }
      save.battle!.round=round;
      save.battle!.initialUnits=structuredClone(save.battle!.units);
      return command(save, { type:'round' });
    }
    const tower = stalled(stage.id, 40);
    expect(tower.battle!.nextPhase).toBe('failed');
    expect(replay(tower).battle!.phase).toBe('failed');
    expect(stalled('silent-cathedral', 40).battle!.nextPhase).toBe('ready');
    expect(stalled('silent-cathedral', 100).battle!.nextPhase).toBe('failed');
  });

  it('persists a paid offer through portable backup and applies only the explicitly accepted roll', () => {
    const initial = createInitialSave(content, 487);
    const characterId = initial.partyIds[0];
    initial.memoryGems = emptyGemInventory();
    initial.memoryGems.items = [{ id:'legacy-refine', defId:'night-dew', variant:'pure', locked:true }];
    initial.memoryGems.seen = ['night-dew'];
    initial.memoryGems.equipped = { [characterId]:'legacy-refine' };
    initial.memoryGems.dust.grave = 40;
    const offered = command(initial, { type:'startGemRefinement', gemId:'legacy-refine', mode:'power' });
    expect(initial.memoryGems.pending).toBeUndefined();
    expect(initial.memoryGems.dust.grave).toBe(40);
    expect(offered.memoryGems!.dust.grave).toBeLessThan(40);
    const paid = offered.memoryGems!.dust.grave;
    const pending = structuredClone(offered.memoryGems!.pending!);
    expect(offered.memoryGems!.items[0].roll).toBeUndefined();
    expect(() => command(offered, { type:'startGemRefinement', gemId:'legacy-refine', mode:'power' })).toThrow();
    expect(() => command(offered, { type:'salvageMemoryGem', gemId:'legacy-refine' })).toThrow();
    const restored = decodeBackup(encodeBackup(offered, content), content).save;
    expect(restored.memoryGems!.pending).toEqual(pending);
    expect(restored.seed).toBe(offered.seed);
    const kept = command(restored, { type:'resolveGemRefinement', accept:false });
    expect(kept.memoryGems!.pending).toBeUndefined();
    expect(kept.memoryGems!.items[0].roll).toBeUndefined();
    expect(kept.memoryGems!.dust.grave).toBe(paid);
    const accepted = command(restored, { type:'resolveGemRefinement', accept:true });
    expect(accepted.memoryGems!.items[0].roll).toEqual(pending.candidate.roll);
    expect(accepted.memoryGems!.items[0].id).toBe('legacy-refine');
    expect(accepted.memoryGems!.items[0].locked).toBe(true);
    expect(accepted.memoryGems!.equipped[characterId]).toBe('legacy-refine');
    expect(accepted.memoryGems!.dust.grave).toBe(paid);
    expect(() => command(accepted, { type:'resolveGemRefinement', accept:true })).toThrow();
    assertSaveCompatibility(accepted, content);
  });

  it('unlocks the next tower floor only after claim and preserves progress without repeat first-clear stones', () => {
    const floors = content.dungeons.filter(dungeon => dungeon.towerFloor).sort((a,b) => a.towerFloor! - b.towerFloor!);
    expect(floors).toHaveLength(100);
    let save = createInitialSave(content, 42);
    expect(dungeonLock(floors[0], save, content)).toBeTruthy();
    save.completedDungeonIds.push('silent-cathedral');
    expect(dungeonLock(floors[0], save, content)).toBeNull();
    expect(dungeonLock(floors[1], save, content)).toBeTruthy();
    expect(() => command(save, { type:'depart', dungeonId:floors[99].id, potions:0 })).toThrow();
    save = replay(command(save, { type:'depart', dungeonId:floors[0].id, potions:0 }));
    for (let wave = 0; wave < 3 && save.battle!.phase !== 'reward'; wave++) {
      for (const unit of save.battle!.units) {
        if (unit.side === 'party') { unit.attack = 100000; unit.hp = unit.maxHp; unit.speed = 100; }
        else { unit.hp = 1; unit.attack = 0; unit.defense = 0; unit.speed = 0; }
      }
      save.battle!.initialUnits = structuredClone(save.battle!.units);
      save = replay(command(save, { type:'round' }));
    }
    expect(save.battle!.phase).toBe('reward');
    expect(highestTowerFloor(save)).toBe(0);
    expect(dungeonLock(floors[1], save, content)).toBeTruthy();
    const family = dungeonGemFamily(floors[0]);
    const beforeDust = save.memoryGems!.dust[family];
    save = command(save, { type:'claim' });
    expect(highestTowerFloor(save)).toBe(1);
    expect(save.stones).toBe(0);
    expect(save.memoryGems!.dust[family]).toBeGreaterThan(beforeDust);
    expect(() => command(save, { type:'claim' })).toThrow();
    const restored = decodeBackup(encodeBackup(save, content), content).save;
    expect(highestTowerFloor(restored)).toBe(1);
    expect(dungeonLock(floors[1], restored, content)).toBeNull();
    expect(() => command(restored, { type:'depart', dungeonId:floors[1].id, potions:0 })).not.toThrow();
  });
});
