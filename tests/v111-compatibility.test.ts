import {describe,expect,it} from 'vitest';
import {content}from'../src/content';
import {createInitialSave,applyCommand}from'../src/application/game';
import {createBattle,advanceReplay}from'../src/domain/engine';
import {migrateSaveTo110}from'../src/platform/save-migration';
import {isUpgradeableSaveVersion,assertSaveCompatibility}from'../src/platform/save';
import {decodeBackup,encodeBackup}from'../src/platform/save-backup';
const previousContent={...content,appVersion:'1.10.0'};
describe('1.13 presentation-only upgrade',()=>{
 it.each(['1.10.0','1.11.0','1.12.0'])('preserves an entire %s exploration and progression, changing only app version and revision',appVersion=>{
  const previousContent={...content,appVersion};
  const old=createInitialSave(previousContent,7586);
  old.settings.bgmVolume=.4;old.settings.seVolume=.25;
  old.towerRecord={version:'1.10',completedFloors:[1,2,3],legacyHighest:9};old.gold=912;old.stones=43;
  let battle=createBattle(previousContent,old.partyIds,old.leaderId,'silent-cathedral',0,42,'v111-upgrade');
  while(battle.phase==='playing')battle=advanceReplay(battle,previousContent);
  old.battle=battle;const before=structuredClone(old),next=migrateSaveTo110(old,content);
  expect(next).toEqual({...before,appVersion:content.appVersion,revision:before.revision+1});expect(old).toEqual(before);
  expect(()=>assertSaveCompatibility(next,content)).not.toThrow();expect(()=>applyCommand(next,{type:'round'},content)).not.toThrow();
  const imported=decodeBackup(encodeBackup(old,previousContent),content).save;expect(imported).toEqual(next);
 });
 it('only accepts released compatible contracts and leaves an already-updated save alone',()=>{
  const old=createInitialSave(previousContent,1);
  for(const changed of [{...old,appVersion:'1.14.0'},{...old,contentVersion:'unknown'},{...old,rulesVersion:'3'}]){
   expect(isUpgradeableSaveVersion(changed)).toBe(false);expect(()=>migrateSaveTo110(changed,content)).toThrow();
  }
  const current=createInitialSave(content,2);expect(migrateSaveTo110(current,content)).toBe(current);
 });
});
