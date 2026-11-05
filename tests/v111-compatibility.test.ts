import {describe,expect,it} from 'vitest';
import {content}from'../src/content';
import {createInitialSave,applyCommand}from'../src/application/game';
import {createBattle,advanceReplay,resolveRound}from'../src/domain/engine';
import {migrateSaveTo110}from'../src/platform/save-migration';
import {isUpgradeableSaveVersion,assertSaveCompatibility}from'../src/platform/save';
import {decodeBackup,encodeBackup}from'../src/platform/save-backup';
const previousContent={...content,...content.legacyCombat,appVersion:'1.10.0',contentVersion:'v1.10-r1',rulesVersion:'2'};
describe('1.20 legacy expedition upgrade',()=>{
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
