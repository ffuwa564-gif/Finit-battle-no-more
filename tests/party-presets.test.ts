import {describe,it,expect} from 'vitest';
import {content} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import {assertValidSave} from '../src/platform/save';
import {createBattle,advanceReplay} from '../src/domain/engine';
describe('ten saved formations',()=>{
 it('restores order, leader and exact equipment, including transfers and empty slots',()=>{
  let s=createInitialSave(content);const [a,b,c]=s.partyIds;
  s.memoryGems!.items=[{id:'one',defId:'night-dew',variant:'pure'},{id:'two',defId:'pale-ward',variant:'pure'}];s.memoryGems!.equipped={[a]:'one'};
  for(let slot=0;slot<10;slot++)s=applyCommand(s,{type:'savePartyPreset',slot,name:`test ${slot}`},content);
  expect(s.partyPresets).toHaveLength(10);assertValidSave(s);
  s=applyCommand(s,{type:'savePartyPreset',slot:0,name:'renamed'},content);expect(s.partyPresets).toHaveLength(10);expect(s.partyPresets![0].name).toBe('renamed');
  s.partyIds=[c,b,a];s.leaderId=c;
  // Start from valid equipment: the spare stone is on the formerly empty slot.
  s.memoryGems!.equipped={[c]:'one',[b]:'two'};
  const before=structuredClone(s);s=applyCommand(s,{type:'loadPartyPreset',slot:9},content);
  expect(s.partyIds).toEqual(before.partyPresets![9].partyIds);expect(s.leaderId).toBe(before.partyPresets![9].leaderId);
  expect(s.memoryGems!.equipped).toEqual({[a]:'one'});expect(before.memoryGems!.equipped).toEqual({[c]:'one',[b]:'two'});assertValidSave(s);
  s=applyCommand(s,{type:'deletePartyPreset',slot:9},content);expect(s.partyPresets).toHaveLength(9);expect(()=>applyCommand(s,{type:'loadPartyPreset',slot:9},content)).toThrow();
 });
 it('rejects excess slots, missing stones, corrupt records and changes during exploration without mutating the save',()=>{
  let s=createInitialSave(content);s.memoryGems!.items=[{id:'gone',defId:'night-dew',variant:'pure'}];s.memoryGems!.equipped={[s.partyIds[0]]:'gone'};
  s=applyCommand(s,{type:'savePartyPreset',slot:0,name:'test'},content);s.memoryGems!.items=[];s.memoryGems!.equipped={};const before=structuredClone(s);
  expect(()=>applyCommand(s,{type:'loadPartyPreset',slot:0},content)).toThrow('記憶石');expect(s).toEqual(before);
  expect(()=>applyCommand(s,{type:'savePartyPreset',slot:10,name:'bad'},content)).toThrow();
  expect(()=>assertValidSave({...s,partyPresets:[...s.partyPresets!,...s.partyPresets!]})).toThrow();
  s.battle=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',0,42,'preset-lock');expect(()=>applyCommand(s,{type:'loadPartyPreset',slot:0},content)).toThrow('探索');
 });
 it('keeps replay changes independent while preserving event snapshots and loot with the owned replay path',()=>{
  let s=createInitialSave(content);s.battle=createBattle(content,s.partyIds,s.leaderId,'silent-cathedral',0,42,'replay-owner');
  const original=structuredClone(s);const expected=advanceReplay(s.battle,content);const next=applyCommand(s,{type:'replay'},content);
  expect(s).toEqual(original);expect(next.battle!.events).toEqual(expected.events);expect(next.battle!.cursor).toBe(expected.cursor);
  next.battle!.units[0].hp=1;expect(s.battle!.units[0].hp).toBe(original.battle!.units[0].hp);
 });
});
