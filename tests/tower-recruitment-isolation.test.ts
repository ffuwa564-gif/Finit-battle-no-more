import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { validateContent } from '../src/content/validation';
import { gachaCollections, gachaPoolIds } from '../src/content/gacha';
import { createInitialSave, applyCommand } from '../src/application/game';
import { IVORY_TOWER_VERSION } from '../src/domain/ivory-tower';
import type { GameSave } from '../src/domain/types';

/** Artificially accelerate kills to test rewards, never to measure difficulty. */
function finish(input: GameSave) {
  let save = input;
  for (let i = 0; i < 2000 && save.battle && !['reward', 'failed'].includes(save.battle.phase); i++) {
    if (save.battle.phase === 'playing') { save = applyCommand(save, { type:'replay' }, content); continue; }
    for (const unit of save.battle.units) {
      if (unit.side === 'party') { unit.hp = unit.maxHp = 1000000; unit.attack = 1000000; unit.speed = 1000000; }
      else { unit.hp = 1; unit.defense = 0; unit.speed = 0; }
    }
    save.battle.initialUnits = structuredClone(save.battle.units);
    save = applyCommand(save, { type:'round' }, content);
  }
  expect(save.battle?.phase).toBe('reward');
  return save;
}

describe('tower phantoms cannot provide a recruitment route', () => {
  it('all 100 floors drop no character materials, including personal encounter rewards', () => {
    for (const stage of content.dungeons.filter(d => d.towerFloor !== undefined)) {
      const save = createInitialSave(content, stage.towerFloor!);
      save.completedDungeonIds = ['silent-cathedral'];
      save.towerRecord = {version:IVORY_TOWER_VERSION,completedFloors:Array.from({length:stage.towerFloor!-1},(_,i)=>i+1),legacyHighest:0};
      const ready = finish(applyCommand(save, {type:'depart',dungeonId:stage.id,potions:0}, content));
      expect(ready.battle!.pendingMaterials, stage.id).toEqual({});
      expect(ready.battle!.events.some(e => e.materialId), stage.id).toBe(false);
      expect(ready.battle!.goldEarned, stage.id).toBeGreaterThan(0);
      const claimed = applyCommand(ready, {type:'claim'}, content);
      expect(claimed.materials, stage.id).toEqual(save.materials);
      expect(claimed.ownedIds, stage.id).toEqual(save.ownedIds);
      expect(Object.values(claimed.memoryGems!.dust).reduce((a,b)=>a+b,0), stage.id).toBeGreaterThan(0);
      expect(claimed.towerRecord!.completedFloors).toContain(stage.towerFloor);
    }
  });
  it('discovery and plentiful materials cannot recruit any summon-pool character', () => {
    const ids = new Set([...gachaCollections.flatMap(pool=>[...gachaPoolIds(pool)]),...content.characters.filter(c=>c.origin.includes('xr_gacha')).map(c=>c.id)]);
    const save = createInitialSave(content);
    save.discoveredIds = content.characters.map(c=>c.id);
    for (const species of content.species) for (const rarity of ['common','rare','epic']) save.materials[`${species.id}:${rarity}`] = 1000000;
    for (const material of content.materials ?? []) save.materials[material.id] = 1000000;
    const before = structuredClone(save);
    for (const id of ids) expect(()=>applyCommand(save,{type:'recruit',characterId:id},content),id).toThrow();
    expect(save).toEqual(before);
  });
  it('rejects a mixed gacha/recruit definition in both validation and the command boundary', () => {
    const invalid = structuredClone(content), target = invalid.characters.find(c=>c.origin.includes('gacha'))!;
    target.origin.push('recruit');
    expect(validateContent(invalid).some(error=>error.includes('gacha-exclusive'))).toBe(true);
    const save = createInitialSave(content); save.discoveredIds.push(target.id);
    for (const rarity of ['common','rare','epic']) save.materials[`${target.speciesId}:${rarity}`] = 1000000;
    expect(()=>applyCommand(save,{type:'recruit',characterId:target.id},invalid)).toThrow();
  });
  it('keeps normal exploration material rewards available', () => {
    const save = createInitialSave(content);
    const reward = finish(applyCommand(save,{type:'depart',dungeonId:'silent-cathedral',potions:0},content));
    expect(Object.keys(reward.battle!.pendingMaterials).length).toBeGreaterThan(0);
    expect(Object.keys(applyCommand(reward,{type:'claim'},content).materials).length).toBeGreaterThan(0);
  });
});
