import { describe, expect, it } from 'vitest';
import { applyCommand, createInitialSave } from '../src/application/game';
import { content } from '../src/content';
import { emptyGemInventory, gemPowerMultiplier, gemSkill, gemTier, refinementCost, resolveGemRefinement, validGemInventory } from '../src/domain/memory-gems';
import type { GameSave } from '../src/domain/types';
import { assertSaveCompatibility } from '../src/platform/save';
import { decodeBackup, encodeBackup } from '../src/platform/save-backup';

const act = (save: GameSave, command: Parameters<typeof applyCommand>[1]) => applyCommand(save,command,content);
function fixture(): GameSave {
  const save = createInitialSave(content,42);
  save.memoryGems = emptyGemInventory();
  save.memoryGems.items = [
    {id:'old:no:roll',defId:'night-dew',variant:'pure'},
    {id:'old:230',defId:'night-dew',variant:'pure',roll:{power:87,trait:'mercy',value:50}},
    {id:'old:250',defId:'night-dew',variant:'pure',roll:{power:100,trait:'execution',value:100}},
    {id:'drop:boss:upper',defId:'night-dew',variant:'pure',roll:{power:125,trait:'mercy',value:170}},
  ];
  save.memoryGems.seen = ['night-dew'];
  save.memoryGems.dust.grave = 1000;
  return save;
}
const restore = (save: GameSave) => decodeBackup(encodeBackup(save,content),content).save;

describe('tiered gem save compatibility', () => {
  it('preserves old 230/250 percent items beside new higher tiers without rewriting their identity', () => {
    const save = fixture();
    const recovered = restore(save);
    expect(recovered).toEqual(save);
    expect(recovered.memoryGems!.items.map(gemTier)).toEqual([1,3,3,5]);
    expect(gemPowerMultiplier(recovered.memoryGems!.items[1])).toBeCloseTo(2.305);
    expect(gemPowerMultiplier(recovered.memoryGems!.items[2])).toBe(2.5);
    expect(gemSkill(recovered.memoryGems!.items[0]).id).toBe('memory:night-dew:pure:old:no:roll');
  });

  it('restores an old paid tuning offer, keeps its price paid, and accepts its original legal result', () => {
    const save = fixture(), original = save.memoryGems!.items[1];
    save.memoryGems!.pending = {gemId:original.id,candidate:{...original,roll:{power:95,trait:'mercy',value:50}}};
    save.memoryGems!.dust.grave = 37;
    const recovered = restore(save);
    const accepted = act(recovered,{type:'resolveGemRefinement',accept:true});
    expect(accepted.memoryGems!.items.find(item => item.id === original.id)!.roll).toEqual({power:95,trait:'mercy',value:50});
    expect(accepted.memoryGems!.dust.grave).toBe(37);
    expect(accepted.memoryGems!.pending).toBeUndefined();
    assertSaveCompatibility(accepted,content);
  });

  it('keeps both tiers and ownership through a paid offer, backup restore, and one acceptance', () => {
    const save = fixture(), stone = save.memoryGems!.items[3], pilot = save.partyIds[0];
    const equipped = act(save,{type:'equipMemoryGem',characterId:pilot,gemId:stone.id});
    const cost = refinementCost(stone,'power');
    const offered = act(equipped,{type:'startGemRefinement',gemId:stone.id,mode:'power'});
    const recovered = restore(offered);
    expect(recovered.memoryGems!.pending).toEqual(offered.memoryGems!.pending);
    expect(recovered.memoryGems!.dust.grave).toBe(1000-cost);
    const candidate = structuredClone(recovered.memoryGems!.pending!.candidate);
    const accepted = act(recovered,{type:'resolveGemRefinement',accept:true});
    expect(accepted.memoryGems!.items.find(item => item.id === stone.id)).toEqual(candidate);
    expect(candidate.roll!.power).toBeGreaterThanOrEqual(120);
    expect(candidate.roll!.power).toBeLessThanOrEqual(139);
    expect(candidate.roll!.value).toBe(170);
    expect(accepted.memoryGems!.equipped[pilot]).toBe(stone.id);
    expect(accepted.memoryGems!.dust.grave).toBe(1000-cost);
    expect(() => act(accepted,{type:'resolveGemRefinement',accept:true})).toThrow();
    expect(restore(accepted)).toEqual(accepted);
  });

  it('restores an upper-tier battle snapshot and queued skill, but rejects a mismatching owned item', () => {
    const save = fixture(), stone = save.memoryGems!.items[3], pilot = save.partyIds[0];
    let active = act(act(save,{type:'equipMemoryGem',characterId:pilot,gemId:stone.id}),{type:'depart',dungeonId:'silent-cathedral',potions:0});
    while (active.battle!.phase === 'playing') active = act(active,{type:'replay'});
    active = act(active,{type:'partyOrder',battleId:active.battle!.id,order:{kind:'skill',skillId:gemSkill(stone).id}});
    const recovered = restore(active);
    expect(recovered.battle!.memoryGems![pilot]).toEqual(stone);
    expect(recovered.battle!.partyOrder).toEqual({kind:'skill',skillId:gemSkill(stone).id});
    const corrupt = structuredClone(recovered);
    corrupt.memoryGems!.items.find(item => item.id === stone.id)!.roll!.power = 126;
    expect(() => assertSaveCompatibility(corrupt,content)).toThrow();
    const invalid = structuredClone(recovered);
    invalid.memoryGems!.items.find(item => item.id === stone.id)!.roll!.value = 150;
    expect(() => encodeBackup(invalid,content)).toThrow();
  });

  it('rejects fabricated pending offers that promote a tier or alter both stats', () => {
    for (const [originalId, roll] of [
      ['old:250',{power:120,trait:'execution',value:100}],
      ['drop:boss:upper',{power:160,trait:'mercy',value:170}],
      ['drop:boss:upper',{power:126,trait:'chain',value:170}],
      ['drop:boss:upper',{power:125,trait:'none',value:0}],
    ] as const) {
      const save = fixture(), original = save.memoryGems!.items.find(item => item.id === originalId)!;
      save.memoryGems!.pending = {gemId:original.id,candidate:{...original,roll:{...roll}}};
      expect(validGemInventory(save.memoryGems)).toBe(false);
      const backup = JSON.parse(encodeBackup(fixture(),content)); backup.save = save;
      expect(() => decodeBackup(JSON.stringify(backup),content)).toThrow();
      expect(() => encodeBackup(save,content)).toThrow();
      expect(() => resolveGemRefinement(structuredClone(save.memoryGems!),true)).toThrow();
      expect(() => act(save,{type:'resolveGemRefinement',accept:true})).toThrow();
    }
  });
});
