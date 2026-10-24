import { describe,it,expect } from 'vitest';
import { content } from '../src/content';
import { createInitialSave,applyCommand } from '../src/application/game';
import { flowerGacha,initialGacha,introductoryGuarantee,gachaPity } from '../src/content/gacha';
import { assertSaveCompatibility } from '../src/platform/save';

describe('flower banquet and shared guarantees',()=>{
 it('spends the introductory guarantee once across collections and keeps its state after a save round trip',()=>{
  let save=createInitialSave(content,42);save.stones=40;
  save=applyCommand(save,{type:'draw',collectionId:initialGacha.id},content);
  expect(introductoryGuarantee(save)).toBe(true);
  save=applyCommand(save,{type:'draw',collectionId:flowerGacha.id},content);
  expect(['selene','athena']).toContain(save.lastGachaResult!.characterId);
  expect(save.drawCount).toBe(2);expect(save.ssrPity).toBe(0);
  save=JSON.parse(JSON.stringify(save));assertSaveCompatibility(save,content);
  expect(introductoryGuarantee(save)).toBe(false);
  save.seed=42;save=applyCommand(save,{type:'draw',collectionId:initialGacha.id},content);
  save.seed=42;save=applyCommand(save,{type:'draw',collectionId:flowerGacha.id},content);
  expect(save.drawCount).toBe(4);expect(save.ssrPity).toBe(2);
  expect(content.characters.find(c=>c.id===save.lastGachaResult!.characterId)!.rarity).toBe('R');
 });
 it('carries the 90-wish pity to the other collection and refunds an owned SSR',()=>{
  let save=createInitialSave(content,42);save.drawCount=130;save.ssrPity=88;save.stones=20;
  save=applyCommand(save,{type:'draw',collectionId:initialGacha.id},content);
  // Use the saved streak, independent of the currently displayed collection.
  save.ssrPity=89;save.ownedIds.push('selene','athena');
  save=applyCommand(save,{type:'draw',collectionId:flowerGacha.id},content);
  expect(['selene','athena']).toContain(save.lastGachaResult!.characterId);
  expect(save.lastGachaResult).toMatchObject({duplicate:true,refund:3});expect(gachaPity(save)).toBe(0);
  assertSaveCompatibility(save,content);
 });
 it('never mixes any characters between collections, and rejects an invalid collection without mutation',()=>{
  for(const collection of [initialGacha,flowerGacha]){
   for(let seed=0;seed<500;seed++){
    const save=createInitialSave(content,Math.imul(seed,2654435761) >>> 0);save.stones=5;save.drawCount=10;
    const next=applyCommand(save,{type:'draw',collectionId:collection.id},content);
    expect(collection.characterIds).toContain(next.lastGachaResult!.characterId);
    const other = collection.id === flowerGacha.id ? initialGacha : flowerGacha;
    expect(other.characterIds).not.toContain(next.lastGachaResult!.characterId);
   }
  }
  const save=createInitialSave(content,42);save.stones=5;const before=structuredClone(save);
  expect(()=>applyCommand(save,{type:'draw',collectionId:'missing'},content)).toThrow();expect(save).toEqual(before);
 });
});

it('does not silently substitute an SSR when the SR pool is unavailable',()=>{
 const definitions=structuredClone(content);definitions.characters.filter(c=>['flora','rainbow-iris'].includes(c.id)).forEach(c=>c.published=false);
 const save=createInitialSave(content,1500);save.drawCount=10;save.stones=5;const before=structuredClone(save);
 expect(()=>applyCommand(save,{type:'draw',collectionId:flowerGacha.id},definitions)).toThrow('レアリティ');
 expect(save).toEqual(before);
});

it('recruits both exclusive R goddesses and refunds exactly one stone for a duplicate',()=>{
 for(const [seed,id] of [[42,'eos'],[3,'nike']] as const){
  let save=createInitialSave(content,seed);save.drawCount=10;save.stones=10;
  save=applyCommand(save,{type:'draw',collectionId:flowerGacha.id},content);
  expect(save.lastGachaResult).toMatchObject({characterId:id,duplicate:false,refund:0});expect(save.ownedIds).toContain(id);expect(save.stones).toBe(5);
  save=JSON.parse(JSON.stringify(save));assertSaveCompatibility(save,content);save.seed=seed;
  save=applyCommand(save,{type:'draw',collectionId:flowerGacha.id},content);
  expect(save.lastGachaResult).toEqual({characterId:id,duplicate:true,refund:1});expect(save.stones).toBe(1);expect(save.ssrPity).toBe(2);
  assertSaveCompatibility(save,content);
 }
});
