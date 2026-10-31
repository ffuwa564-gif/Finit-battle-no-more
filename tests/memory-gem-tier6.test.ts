import { describe, expect, it } from 'vitest';
import { applyCommand, createInitialSave } from '../src/application/game';
import { content } from '../src/content';
import { craftGem, dungeonGemLootProfile, emptyGemInventory, gemFromSkill, gemPowerMultiplier, gemPowerTier, gemRollKey, gemSkill, gemTier, gemTraitTier, resolveGemRefinement, rollGemDrop, startGemRefinement, validGemInventory, validMemoryGem, type MemoryGem } from '../src/domain/memory-gems';
import type { DungeonDef, GameSave } from '../src/domain/types';
import { assertSaveCompatibility } from '../src/platform/save';
import { decodeBackup, encodeBackup } from '../src/platform/save-backup';

const item = (power = 220, value = 170): MemoryGem => ({id:'tier6:owned:chest',defId:'night-dew',variant:'pure',roll:{power,trait:'mercy',value}});
const seed = (index: number) => Math.imul(index+1,0x9e3779b1) >>> 0;
const stage = (): DungeonDef => ({...structuredClone(content.dungeons.find(d => d.id === 'silent-cathedral')!),gemLoot:{tier4Chance:.2,tier5Chance:.1}});
function fixture(): GameSave {
  const save = createInitialSave(content,42);
  save.memoryGems = emptyGemInventory(); save.memoryGems.items = [item()];
  save.memoryGems.seen = ['night-dew']; save.memoryGems.dust.grave = 10000;
  return save;
}
const restore = (save: GameSave) => decodeBackup(encodeBackup(save,content),content).save;

describe('Tier 6 item boundaries and persistence', () => {
  it('preserves old tiers and carries each acquired Tier 6 attribute through skill IDs', () => {
    for (const [power,value,expectedPower,expectedTrait] of [[87,100,3,3],[179,179,5,5],[220,170,6,5],[239,239,6,6],[100,220,3,6]] as const) {
      const stone = item(power,value);
      expect(validMemoryGem(stone)).toBe(true);
      expect(gemPowerTier(stone)).toBe(expectedPower); expect(gemTraitTier(stone)).toBe(expectedTrait);
      expect(gemTier(stone)).toBe(Math.max(expectedPower,expectedTrait));
      expect(gemFromSkill(gemSkill(stone).id)).toEqual(stone);
    }
    expect(gemPowerMultiplier(item(87))).toBeCloseTo(2.305);
    expect(gemPowerMultiplier(item(179))).toBeCloseTo(3.685);
    expect(gemPowerMultiplier(item(220))).toBeCloseTo(4.3);
    expect(gemRollKey(item(179))).not.toBe(gemRollKey(item(220)));
    for (const raw of [180,200,219,220.5,240,100000,NaN,Infinity]) {
      expect(validMemoryGem(item(raw))).toBe(false);
      expect(validMemoryGem(item(220,raw))).toBe(false);
      if (Number.isInteger(raw) && Number.isFinite(raw)) expect(gemFromSkill(`memory:night-dew:pure:@roll=${raw}~mercy~170:chest:6`)).toBeUndefined();
    }
  });

  it('finishes the acquired attribute within its band and restores a paid offer without charging twice', () => {
    const save = fixture();
    let next = applyCommand(save,{type:'equipMemoryGem',characterId:save.partyIds[0],gemId:item().id},content);
    next = applyCommand(next,{type:'startGemRefinement',gemId:item().id,mode:'power'},content);
    const paid = next.memoryGems!.dust.grave, offered = structuredClone(next.memoryGems!.pending!);
    expect(offered.candidate.roll!.power).toBeGreaterThanOrEqual(220);
    expect(offered.candidate.roll!.power).toBeLessThanOrEqual(239);
    expect(offered.candidate.roll!.value).toBe(170);
    next = restore(next);
    next = applyCommand(next,{type:'resolveGemRefinement',accept:true},content);
    expect(next.memoryGems!.items[0]).toEqual(offered.candidate);
    expect(next.memoryGems!.dust.grave).toBe(paid);
    expect(next.memoryGems!.equipped[next.partyIds[0]]).toBe(item().id);
    expect(restore(next)).toEqual(next);
    expect(() => applyCommand(next,{type:'resolveGemRefinement',accept:true},content)).toThrow();
    for (const mode of ['power','trait'] as const) {
      const inventory = fixture().memoryGems!;
      for (let index = 0; index < 32; index++) {
        const before = structuredClone(inventory.items[0]);
        startGemRefinement(inventory,before.id,mode,seed(index));
        const candidate = inventory.pending!.candidate;
        expect(gemPowerTier(candidate)).toBe(6); expect(gemTraitTier(candidate)).toBe(5);
        if (mode === 'trait') expect(candidate.roll!.power).toBe(before.roll!.power);
        else expect(candidate.roll!.value).toBe(before.roll!.value);
        resolveGemRefinement(inventory,true);
      }
    }
  });

  it('restores a queued Tier 6 combat skill, rejecting a mismatching inventory snapshot', () => {
    let save = fixture(); const pilot = save.partyIds[0], stone = save.memoryGems!.items[0];
    save = applyCommand(save,{type:'equipMemoryGem',characterId:pilot,gemId:stone.id},content);
    save = applyCommand(save,{type:'depart',dungeonId:'silent-cathedral',potions:0},content);
    while (save.battle!.phase === 'playing') save = applyCommand(save,{type:'replay'},content);
    save = applyCommand(save,{type:'partyOrder',battleId:save.battle!.id,order:{kind:'skill',skillId:gemSkill(stone).id}},content);
    const recovered = restore(save);
    expect(recovered.battle!.partyOrder).toEqual(save.battle!.partyOrder);
    expect(recovered.battle!.memoryGems![pilot]).toEqual(stone);
    recovered.memoryGems!.items[0].roll!.power = 221;
    expect(() => assertSaveCompatibility(recovered,content)).toThrow();
  });

  it('rejects fabricated T5-to-T6 promotion and dual-attribute rewrites at save and acceptance boundaries', () => {
    for (const [original,candidate] of [[item(179,170),item(220,170)],[item(220,170),item(179,170)],[item(220,170),item(239,220)],[item(220,170),item(220,220)]] as const) {
      const save = fixture(); save.memoryGems!.items = [original];
      save.memoryGems!.pending = {gemId:original.id,candidate};
      expect(validGemInventory(save.memoryGems)).toBe(false);
      expect(() => resolveGemRefinement(structuredClone(save.memoryGems!),true)).toThrow();
      expect(() => encodeBackup(save,content)).toThrow();
      const backup = JSON.parse(encodeBackup(fixture(),content)); backup.save = save;
      expect(() => decodeBackup(JSON.stringify(backup),content)).toThrow();
    }
    const inventory = emptyGemInventory(); inventory.dust.grave = 10000;
    const crafted = craftGem(inventory,'night-dew');
    for (let index = 0; index < 64; index++) {
      startGemRefinement(inventory,crafted.id,index%2?'trait':'power',seed(index));
      expect(gemTier(inventory.pending!.candidate)).toBeLessThanOrEqual(3);
      resolveGemRefinement(inventory,true);
    }
  });
});

describe('Tier 6 loot probability contracts', () => {
  it('keeps omitted and explicit-zero T6 profiles identical for every old random draw', () => {
    const omitted = stage(), explicit = stage(); explicit.gemLoot!.tier6Chance = 0;
    for (let index = 0; index < 512; index++) {
      expect(rollGemDrop(omitted,seed(index),'same-id',{boss:true})).toEqual(rollGemDrop(explicit,seed(index),'same-id',{boss:true}));
    }
    for (const invalid of [null,NaN,-.01,1.01,'0.1']) {
      const invalidStage = stage();
      invalidStage.gemLoot = {...invalidStage.gemLoot!,tier6Chance:invalid} as unknown as NonNullable<DungeonDef['gemLoot']>;
      expect(() => dungeonGemLootProfile(invalidStage)).toThrow();
    }
    const excessive = stage(); excessive.gemLoot!.tier6Chance = .71;
    expect(() => dungeonGemLootProfile(excessive)).toThrow();
  });

  it('reserves T6 for eligible final chests, excluding first gifts, ordinary waves and trials', () => {
    const dungeon = stage(); dungeon.gemLoot = {tier4Chance:0,tier5Chance:0,tier6Chance:1};
    let finals = 0;
    for (let index = 0; index < 256; index++) {
      const final = rollGemDrop(dungeon,seed(index),`final:${index}`,{boss:true}).gem;
      if (final) { finals++; expect(gemPowerTier(final)).toBe(6); expect(gemTraitTier(final)).toBe(final.roll!.trait==='none'?0:6); }
      const ordinary = rollGemDrop(dungeon,seed(index),`wave:${index}`).gem;
      if (ordinary) expect(gemTier(ordinary)).toBeLessThanOrEqual(3);
      const first = rollGemDrop(dungeon,seed(index),`first:${index}`,{boss:true,first:true}).gem!;
      expect(gemTier(first)).toBe(1);
    }
    expect(finals).toBeGreaterThan(100);
    dungeon.kind = 'trial';
    expect(rollGemDrop(dungeon,1,'trial',{boss:true}).gem).toBeUndefined();
  });

  it('adds T6 without taking probability mass from T4 or T5', () => {
    const dungeon = stage(); dungeon.gemLoot!.tier6Chance = .05;
    const counts = {4:0,5:0,6:0}; let drops = 0;
    for (let index = 0; index < 16000; index++) {
      const gem = rollGemDrop(dungeon,seed(index),'probability',{boss:true}).gem;
      if (!gem) continue;
      drops++; const tier = gemPowerTier(gem); if (tier>=4) counts[tier as 4|5|6]++;
    }
    expect(Math.abs(counts[4]/drops-.2)).toBeLessThan(.012);
    expect(Math.abs(counts[5]/drops-.1)).toBeLessThan(.012);
    expect(Math.abs(counts[6]/drops-.05)).toBeLessThan(.008);
  });
});
