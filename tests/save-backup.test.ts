import { describe,it,expect } from 'vitest';
import { content } from '../src/content';
import { createInitialSave,applyCommand } from '../src/application/game';
import { encodeBackup,decodeBackup } from '../src/platform/save-backup';
describe('portable save backups',()=>{
 it('round trips an active expedition with effects and pity intact',()=>{
  let save=createInitialSave(content,42);save.stones=18;save.drawCount=8;save.ssrPity=4;
  save=applyCommand(save,{type:'depart',dungeonId:content.dungeons[0].id,potions:2},content);
  Object.assign(save.battle!.units[0],{barrier:20,barrierUntil:2,regenUntil:3,regenStrength:14});
  const backup=decodeBackup(encodeBackup(save,content,new Date('2026-10-24T00:00:00Z')),content);
  expect(backup.save).toEqual(save);expect(backup.exportedAt).toBe('2026-10-24T00:00:00.000Z');
 });
 it('rejects unrelated, corrupt, oversized and incompatible files',()=>{
  expect(()=>decodeBackup('not json',content)).toThrow('JSON');
  expect(()=>decodeBackup('{}',content)).toThrow('STILLVEIL');
  expect(()=>decodeBackup('x'.repeat(2*1024*1024+1),content)).toThrow('大きすぎ');
  const file=JSON.parse(encodeBackup(createInitialSave(content),content));file.save.stones=-1;
  expect(()=>decodeBackup(JSON.stringify(file),content)).toThrow();
  file.save.stones=0;file.save.contentVersion='another-release';expect(()=>decodeBackup(JSON.stringify(file),content)).toThrow();
 });
});
