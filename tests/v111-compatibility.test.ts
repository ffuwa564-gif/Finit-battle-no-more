import {describe,expect,it} from 'vitest';
import {content}from'../src/content';
import {createInitialSave,applyCommand}from'../src/application/game';
import {createBattle,advanceReplay,resolveRound}from'../src/domain/engine';
import {migrateSaveTo110}from'../src/platform/save-migration';
import {isUpgradeableSaveVersion,assertSaveCompatibility}from'../src/platform/save';
import {decodeBackup,encodeBackup}from'../src/platform/save-backup';
const previousContent={...content,...content.legacyCombat,appVersion:'1.10.0',contentVersion:'v1.10-r1',rulesVersion:'2'};
describe('1.25 compatible expedition upgrade',()=>{
 it.each([{appVersion:'1.20.0',contentVersion:'v1.20-r1'},{appVersion:'1.21.0',contentVersion:'v1.21-r1'},{appVersion:'1.22.0',contentVersion:'v1.22-r1'},{appVersion:'1.23.0',contentVersion:'v1.23-r1'},{appVersion:'1.24.0',contentVersion:'v1.24-r1'}])('preserves $appVersion inventory, active combat, travel and dialogue through migration and backup import',version=>{
  const previousContent={...content,...version};
  let old=createInitialSave(previousContent,28113);
  old=applyCommand(old,{type:'worldStoryBegin',profile:{name:'ミオ',voice:'soft',favorite:'flowers'},from:'beginning'},previousContent,{now:1000});
  old=applyCommand(old,{type:'worldTravel',destinationId:content.worldStory!.nodes[0].hubId},previousContent,{now:1000});
  old.gold=912;old.stones=43;old.settings.seVolume=.25;
  old.battle=createBattle(previousContent,old.partyIds,old.leaderId,'silent-cathedral',0,42,'v120-upgrade');
  const before=structuredClone(old),next=migrateSaveTo110(old,content);
  expect(isUpgradeableSaveVersion(old)).toBe(true);
  expect(next).toEqual({...before,battle:{...before.battle,contentVersion:content.contentVersion},appVersion:content.appVersion,contentVersion:content.contentVersion,rulesVersion:content.rulesVersion,revision:before.revision+1});
  expect(old).toEqual(before);
  expect(decodeBackup(encodeBackup(old,previousContent),content).save).toEqual(next);
  expect(advanceReplay(next.battle!,content)).toEqual({...advanceReplay(old.battle!,previousContent),contentVersion:content.contentVersion});
  let resumed=next.battle!,original=old.battle!;
  while(resumed.phase==='playing')resumed=advanceReplay(resumed,content);
  while(original.phase==='playing')original=advanceReplay(original,previousContent);
  expect(resolveRound(resumed,content).battle).toEqual({...resolveRound(original,previousContent).battle,contentVersion:content.contentVersion});
  // Keep a separate mid-conversation save: the exact line remains resumable.
  old.battle=null;
  old=applyCommand(old,{type:'worldTalk',nodeId:content.worldStory!.nodes[0].id},previousContent,{now:47000});
  old=applyCommand(old,{type:'worldTalkNext'},previousContent);
  expect(migrateSaveTo110(old,content).worldStory).toEqual(old.worldStory);
  expect(isUpgradeableSaveVersion({...old,contentVersion:'v1.20-unknown'})).toBe(false);
 });
 it.each(['1.10.0','1.11.0','1.12.0','1.13.0'])('preserves an entire %s exploration and progression, upgrading version metadata and revision',appVersion=>{
  const previousContent={...content,...content.legacyCombat,appVersion,contentVersion:'v1.10-r1',rulesVersion:'2'};
  const old=createInitialSave(previousContent,7586);
  old.settings.bgmVolume=.4;old.settings.seVolume=.25;
  old.towerRecord={version:'1.10',completedFloors:[1,2,3],legacyHighest:9};old.gold=912;old.stones=43;
  let battle=createBattle(previousContent,old.partyIds,old.leaderId,'silent-cathedral',0,42,'v111-upgrade');
  while(battle.phase==='playing')battle=advanceReplay(battle,previousContent);
  old.battle=battle;const before=structuredClone(old),next=migrateSaveTo110(old,content);
  expect(next).toEqual({...before,appVersion:content.appVersion,contentVersion:content.contentVersion,rulesVersion:content.rulesVersion,revision:before.revision+1});expect(old).toEqual(before);
  expect(()=>assertSaveCompatibility(next,content)).not.toThrow();expect(()=>applyCommand(next,{type:'round'},content)).not.toThrow();
  const imported=decodeBackup(encodeBackup(old,previousContent),content).save;expect(imported).toEqual(next);
 });
 it('restores missing legacy battle rule metadata and resolves the same next round',()=>{
  const old=createInitialSave(previousContent,42);let b=createBattle(previousContent,old.partyIds,old.leaderId,'silent-cathedral',0,42,'legacy-rule');
  while(b.phase==='playing')b=advanceReplay(b,previousContent);
  const expected=resolveRound(b,previousContent).battle;
  delete (b as Partial<typeof b>).rulesVersion;old.battle=b;
  const next=migrateSaveTo110(old,content),result=applyCommand(next,{type:'round'},content);
  expect(result.battle).toEqual(expected);
  expect(result.rulesVersion).toBe('3');expect(result.battle!.rulesVersion).toBe('2');
 });
 it('only accepts released compatible contracts and leaves an already-updated save alone',()=>{
  const old=createInitialSave(previousContent,1);
  for(const changed of [{...old,appVersion:'1.14.0'},{...old,contentVersion:'unknown'},{...old,rulesVersion:'3'}]){
   expect(isUpgradeableSaveVersion(changed)).toBe(false);expect(()=>migrateSaveTo110(changed,content)).toThrow();
  }
  const current=createInitialSave(content,2);expect(migrateSaveTo110(current,content)).toBe(current);
 });
});
