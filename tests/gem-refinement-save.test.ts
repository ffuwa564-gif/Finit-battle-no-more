import { describe, expect, it } from 'vitest';
import { applyCommand, createInitialSave } from '../src/application/game';
import { content } from '../src/content';
import { emptyGemInventory, gemRollKey, refinementCost } from '../src/domain/memory-gems';
import { towerDustReward } from '../src/domain/ivory-tower';
import type { GameSave } from '../src/domain/types';
import { assertSaveCompatibility } from '../src/platform/save';
import { decodeBackup, encodeBackup } from '../src/platform/save-backup';

const act = (save: GameSave, command: Parameters<typeof applyCommand>[1]) => applyCommand(save, command, content);
function fixture(): GameSave {
  const save = createInitialSave(content, 42);
  save.memoryGems = emptyGemInventory();
  save.memoryGems.items = [{ id:'refine-me', defId:'echo-shard', variant:'pure', roll:{ power:30, trait:'chain', value:50 } }];
  save.memoryGems.seen = ['echo-shard'];
  save.memoryGems.dust = { sanctuary:100, clock:100, grave:100 };
  save.memoryGems.equipped[save.partyIds[0]] = 'refine-me';
  return save;
}
function replay(save: GameSave): GameSave {
  let result = save;
  for (let i=0; result.battle?.phase === 'playing' && i<200; i++) result = act(result, { type:'replay' });
  expect(result.battle?.phase).not.toBe('playing');
  return result;
}
function wonWave(save: GameSave, final: boolean): GameSave {
  const result = structuredClone(save), battle = result.battle!;
  for (const unit of battle.units.filter(unit => unit.side === 'enemy')) unit.hp = 0;
  if (final) battle.wave = content.dungeons.find(dungeon => dungeon.id === battle.dungeonId)!.waves.length-1;
  battle.phase = 'playing'; battle.nextPhase = final ? 'reward' : 'wave'; battle.cursor = 0;
  battle.events = [{ id:'test-wave-victory', kind:'dialogue', text:'wave won', unitsAfter:structuredClone(battle.units) }];
  battle.initialUnits = structuredClone(battle.units);
  return replay(result);
}

describe('persistent gem refinement and tower rewards', () => {
  it('pays once for a deterministic stored offer, restores it from a backup and accepts it without changing ownership', () => {
    const initial = fixture();
    const cost = refinementCost(initial.memoryGems!.items[0], 'power');
    const offer = act(initial, { type:'startGemRefinement', gemId:'refine-me', mode:'power' });
    expect(initial.memoryGems!.pending).toBeUndefined();
    expect(offer.memoryGems!.dust.clock).toBe(100-cost);
    expect(offer.seed).not.toBe(initial.seed);
    expect(offer.memoryGems!.items).toEqual(initial.memoryGems!.items);
    expect(act(initial, { type:'startGemRefinement', gemId:'refine-me', mode:'power' })).toEqual(offer);
    expect(() => act(offer, { type:'startGemRefinement', gemId:'refine-me', mode:'trait' })).toThrow();
    expect(() => act(offer, { type:'salvageMemoryGem', gemId:'refine-me' })).toThrow();
    expect(() => act(offer, { type:'depart', dungeonId:'silent-cathedral', potions:0 })).toThrow();
    const restored = decodeBackup(encodeBackup(offer, content), content).save;
    expect(restored.memoryGems!.pending).toEqual(offer.memoryGems!.pending);
    const candidate = restored.memoryGems!.pending!.candidate;
    const accepted = act(restored, { type:'resolveGemRefinement', accept:true });
    expect(gemRollKey(accepted.memoryGems!.items[0])).toBe(gemRollKey(candidate));
    expect(accepted.memoryGems!.equipped).toEqual(initial.memoryGems!.equipped);
    expect(accepted.memoryGems!.dust.clock).toBe(100-cost);
    expect(accepted.memoryGems!.pending).toBeUndefined();
    assertSaveCompatibility(accepted, content);
    expect(() => act(accepted, { type:'resolveGemRefinement', accept:true })).toThrow();
  });

  it('can retain the old stone but never refunds the paid offer, and cannot refine during an expedition', () => {
    const initial = fixture();
    const offer = act(initial, { type:'startGemRefinement', gemId:'refine-me', mode:'trait' });
    const kept = act(offer, { type:'resolveGemRefinement', accept:false });
    expect(kept.memoryGems!.items).toEqual(initial.memoryGems!.items);
    expect(kept.memoryGems!.dust.clock).toBeLessThan(100);
    expect(kept.memoryGems!.pending).toBeUndefined();
    const active = replay(act(initial, { type:'depart', dungeonId:'silent-cathedral', potions:0 }));
    expect(() => act(active, { type:'startGemRefinement', gemId:'refine-me', mode:'power' })).toThrow();
    expect(() => act(active, { type:'resolveGemRefinement', accept:true })).toThrow();
  });

  it('keeps rolled identity when transferring equipment and rejects a fabricated rolled battle snapshot', () => {
    const initial = fixture(), target = initial.partyIds[1];
    const moved = act(initial, { type:'equipMemoryGem', characterId:target, gemId:'refine-me', transfer:true });
    const active = replay(act(moved, { type:'depart', dungeonId:'silent-cathedral', potions:0 }));
    expect(active.battle!.memoryGems![target].roll).toEqual(initial.memoryGems!.items[0].roll);
    assertSaveCompatibility(active, content);
    const corrupt = structuredClone(active); corrupt.battle!.memoryGems![target].roll!.power++;
    expect(() => assertSaveCompatibility(corrupt, content)).toThrow();
  });

  it('unlocks tower floors only after a claimed victory, gives dust and a chest, and never adds wishstones', () => {
    const floor1 = content.dungeons.find(dungeon => dungeon.towerFloor === 1)!;
    const floor2 = content.dungeons.find(dungeon => dungeon.towerFloor === 2)!;
    const initial = fixture();
    expect(() => act(initial, { type:'depart', dungeonId:floor1.id, potions:0 })).toThrow();
    initial.completedDungeonIds = ['silent-cathedral'];
    expect(() => act(initial, { type:'depart', dungeonId:floor2.id, potions:0 })).toThrow();
    const ready = replay(act(initial, { type:'depart', dungeonId:floor1.id, potions:0 }));
    const completed = wonWave(ready, true);
    expect(completed.memoryGems!.items).toHaveLength(2);
    expect(completed.completedDungeonIds).not.toContain(floor1.id);
    const stones = completed.stones;
    const claimed = act(completed, { type:'claim' });
    expect(claimed.stones).toBe(stones);
    expect(claimed.completedDungeonIds).toContain(floor1.id);
    expect(Object.values(claimed.memoryGems!.dust).reduce((a,b) => a+b,0)).toBe(300+towerDustReward(floor1));
    expect(() => act(claimed, { type:'claim' })).toThrow();
    expect(() => act(claimed, { type:'depart', dungeonId:floor2.id, potions:0 })).not.toThrow();
    assertSaveCompatibility(claimed, content);
  });

  it('does not grant high-quality tower loot or floor progress for clearing only an early wave and retreating', () => {
    const floor = content.dungeons.find(dungeon => dungeon.towerFloor && dungeon.waves.length > 1)!;
    const initial = fixture();
    initial.completedDungeonIds = ['silent-cathedral', ...content.dungeons.filter(dungeon => dungeon.towerFloor && dungeon.towerFloor < floor.towerFloor!).map(dungeon => dungeon.id)];
    const ready = replay(act(initial, { type:'depart', dungeonId:floor.id, potions:0 }));
    const next = wonWave(ready, false);
    expect(next.memoryGems!.items).toHaveLength(1);
    expect(next.battle!.gemFinds).toBeUndefined();
    const failed = act(next, { type:'retreat' });
    expect(failed.completedDungeonIds).not.toContain(floor.id);
    expect(Object.values(failed.memoryGems!.dust).reduce((a,b) => a+b,0)).toBe(300);
  });
});
