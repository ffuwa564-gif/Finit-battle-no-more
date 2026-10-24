import { describe,it,expect } from 'vitest';
import { content } from '../src/content';
import { applyCommand,createInitialSave } from '../src/application/game';
import { assertSaveCompatibility,assertValidSave } from '../src/platform/save';
import { encodeBackup,decodeBackup } from '../src/platform/save-backup';
import type { GameCommand } from '../src/domain/types';

describe('owned home characters',()=>{
 it('persists the selected character through backup without changing party, leader, currency or gacha state',()=>{
  const initial=createInitialSave(content,42);initial.ownedIds.push('selene');
  const chosen=applyCommand(initial,{type:'settings',settings:{homeCharacterId:'selene'}},content);
  expect(chosen).toEqual({...initial,revision:initial.revision+1,settings:{...initial.settings,homeCharacterId:'selene'}});
  expect(initial.settings.homeCharacterId).toBeUndefined();
  const imported=decodeBackup(encodeBackup(chosen,content),content).save;expect(imported).toEqual(chosen);
  const original=applyCommand(imported,{type:'settings',settings:{homeCharacterId:null}},content);assertSaveCompatibility(original,content);expect(original.settings.homeCharacterId).toBeNull();
 });
 it('accepts older saves and owned static or awakened characters, and rejects unowned or malformed choices without mutation',()=>{
  const save=createInitialSave(content,42);assertSaveCompatibility(save,content);
  const before=structuredClone(save);
  for(const id of ['asteria','missing',42,''])expect(()=>applyCommand(save,{type:'settings',settings:{homeCharacterId:id}} as GameCommand,content)).toThrow('所持');
  expect(save).toEqual(before);
  const staticChoice=applyCommand(save,{type:'settings',settings:{homeCharacterId:'liora'}},content);assertSaveCompatibility(staticChoice,content);
  const invalid=structuredClone(save);invalid.settings.homeCharacterId='asteria';expect(()=>assertValidSave(invalid)).toThrow('ホーム');
  save.ownedIds.push('seris-awakened');const awakened=applyCommand(save,{type:'settings',settings:{homeCharacterId:'seris-awakened'}},content);assertSaveCompatibility(awakened,content);
 });
});
