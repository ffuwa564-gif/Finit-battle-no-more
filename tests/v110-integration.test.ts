import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import { encodeBackup, decodeBackup } from '../src/platform/save-backup';
import { highestTowerFloor, ivoryTowerId, towerLock, type TowerRecord } from '../src/domain/ivory-tower';
import { duplicateFamily } from '../src/domain/events';
import type { GameSave, Content } from '../src/domain/types';
import { migrateSaveTo110 } from '../src/platform/save-migration';
import { createBattle } from '../src/domain/engine';
import { scoutRecruitments } from '../src/content/scout-maidens';

const scoutIds = ['ione', 'neri', 'fio', 'ruka'];
const tower = () => content.dungeons.filter(d => d.towerFloor).sort((a,b) => a.towerFloor! - b.towerFloor!);

/** The test fixture accelerates damage only, while using the real command/replay/reward lifecycle. */
function clearCurrentExploration(input: GameSave): GameSave {
  let save = input;
  for (let guard = 0; guard < 24 && save.battle?.phase !== 'reward'; guard++) {
    while (save.battle?.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
    if (save.battle?.phase === 'reward') break;
    expect(save.battle?.phase).toBe('ready');
    for (const unit of save.battle!.units) {
      if (unit.side === 'party') { unit.hp = unit.maxHp; unit.attack = 1_000_000; unit.speed = 1000; }
      else { unit.hp = 1; unit.defense = 0; unit.attack = 0; unit.speed = 0; }
    }
    save.battle!.initialUnits = structuredClone(save.battle!.units);
    save = applyCommand(save, { type: 'round' }, content);
  }
  while (save.battle?.phase === 'playing') save = applyCommand(save, { type: 'replay' }, content);
  expect(save.battle?.phase).toBe('reward');
  return save;
}

describe('1.10 integrated local release contracts', () => {
  it('identifies the new game version without changing the save schema silently', () => {
    expect(content.appVersion).toMatch(/^1\.10(?:\.0)?$/);
    const save = createInitialSave(content, 0x12345678);
    expect(save.appVersion).toBe(content.appVersion);
    expect(save.schemaVersion).toBe(content.schemaVersion);
    assertValidSave(save);
    assertSaveCompatibility(save, content);
  });

  it('round-trips a new save without losing locked equipment, the build goal or randomness', () => {
    const save = createInitialSave(content, 0x12345678);
    save.memoryGems!.items.push({ id:'v110-locked-echo', defId:'echo-shard', variant:'pure', locked:true, roll:{ power:80, trait:'none', value:0 } });
    save.memoryGems!.seen.push('echo-shard');
    save.memoryGems!.equipped[save.partyIds[0]] = 'v110-locked-echo';
    save.buildGoal = { buildId:'echo-chain', stage:'starter' };
    const before = structuredClone(save);
    const restored = decodeBackup(encodeBackup(save, content), content).save;
    expect(restored).toEqual(before);
    expect(restored.memoryGems!.items[0].locked).toBe(true);
    expect(restored.seed).toBe(0x12345678);
    expect(save).toEqual(before);
  });

  it('does not interpret old cleared IDs as new tower progress or unlock later floors', () => {
    const save = createInitialSave(content, 42) as GameSave & { towerRecord: TowerRecord };
    save.completedDungeonIds = ['silent-cathedral', ...Array.from({ length:59 },(_,i) => ivoryTowerId(i+1))];
    save.towerRecord = { version:'1.10', completedFloors:[], legacyHighest:59 };
    expect(highestTowerFloor(save)).toBe(0);
    expect(towerLock(tower()[0], save)).toBeNull();
    expect(towerLock(tower()[1], save)).not.toBeNull();
    expect(towerLock(tower()[58], save)).not.toBeNull();
    const restored = decodeBackup(encodeBackup(save, content), content).save as typeof save;
    expect(restored.towerRecord.legacyHighest).toBe(59);
    expect(restored.completedDungeonIds).toEqual(save.completedDungeonIds);
    expect(highestTowerFloor(restored)).toBe(0);
  });

  it('claims a new tower clear once, unlocks the next floor, and retains the old record', () => {
    let save = createInitialSave(content, 42) as GameSave & { towerRecord: TowerRecord };
    save.completedDungeonIds = ['silent-cathedral', ...Array.from({ length:59 },(_,i) => ivoryTowerId(i+1))];
    save.towerRecord = { version:'1.10', completedFloors:[], legacyHighest:59 };
    expect(() => applyCommand(save, { type:'depart', dungeonId:ivoryTowerId(2), potions:0 }, content)).toThrow();
    let progress = clearCurrentExploration(applyCommand(save, { type:'depart', dungeonId:ivoryTowerId(1), potions:0 }, content));
    expect(highestTowerFloor(progress)).toBe(0);
    const claimed = applyCommand(progress, { type:'claim' }, content) as typeof save;
    expect(highestTowerFloor(claimed)).toBe(1);
    expect(claimed.towerRecord.completedFloors).toEqual([1]);
    expect(claimed.towerRecord.legacyHighest).toBe(59);
    expect(claimed.completedDungeonIds).toContain(ivoryTowerId(59));
    expect(towerLock(tower()[1], claimed)).toBeNull();
    expect(towerLock(tower()[2], claimed)).not.toBeNull();
    expect(() => applyCommand(claimed, { type:'claim' }, content)).toThrow();
    expect(decodeBackup(encodeBackup(claimed, content), content).save).toEqual(claimed);
  });

  it('provides one hundred distinct final formations covering all published combat forms', () => {
    const floors = tower();
    expect(floors).toHaveLength(100);
    const signatures = new Set(floors.map(d => d.waves.at(-1)!.map(e => e.characterId).join(',')));
    expect(signatures.size).toBe(100);
    const mainIds = new Set(floors.flatMap(d => d.waves.at(-1)!.filter(e => e.boss).map(e => e.characterId)));
    for (const c of content.characters.filter(c => c.published)) expect(mainIds.has(c.id), `missing tower main: ${c.id}`).toBe(true);
    for (const floor of floors) {
      for (const wave of floor.waves) {
        expect(wave.length).toBeGreaterThan(0);
        expect(wave.length).toBeLessThanOrEqual(4);
        expect(duplicateFamily(wave.map(e => e.characterId), content), floor.id).toBeFalsy();
        for (const e of wave) {
          const c = content.characters.find(c => c.id === e.characterId);
          expect(c?.published).toBe(true);
          expect(content.assets.some(a => a.id === c!.artId)).toBe(true);
          expect(c!.skillIds.every(id => content.skills.some(s => s.id === id))).toBe(true);
        }
      }
    }
  });

  it('registers each new scout with real artwork and its own available skill definitions', () => {
    for (const id of scoutIds) {
      const c = content.characters.find(c => c.id === id);
      expect(c, id).toBeDefined();
      expect(c!.published).toBe(true);
      expect(c!.origin).toContain('recruit');
      const art = content.assets.find(a => a.id === c!.artId);
      expect(art, id).toBeDefined();
      expect(existsSync(`public/${art!.path}`), id).toBe(true);
      expect(c!.skillIds.length).toBeGreaterThanOrEqual(2);
      expect(c!.skillIds.some(skillId => !content.characters.some(other => other.id !== c!.id && other.skillIds.includes(skillId)))).toBe(true);
      for (const skillId of c!.skillIds) expect(content.skills.some(skill => skill.id === skillId)).toBe(true);
    }
  });
});


const legacyContent = (): Content => ({ ...content, appVersion:'0.1.0', contentVersion:'initial-r1', rulesVersion:'1' });
function legacySave(seed = 91): GameSave {
  const save = createInitialSave(legacyContent(), seed);
  delete save.towerRecord;
  save.gold=150; save.potions=7; save.stones=4; save.drawCount=9; save.ssrPity=5;
  save.materials={'pilgrim:common':8};
  save.memoryGems!.items=[{id:'legacy-locked',defId:'echo-shard',variant:'pure',locked:true,roll:{power:80,trait:'none',value:0}}];
  save.memoryGems!.seen=['echo-shard'];save.memoryGems!.equipped[save.partyIds[0]]='legacy-locked';
  return save;
}

describe('1.0 to1.10 migration safeguards', () => {
  it('preserves ownership, locked loot, currency, pity, RNG and legacy ascent without granting new progress', () => {
    const old=legacySave();old.completedDungeonIds=['silent-cathedral',...Array.from({length:59},(_,i)=>ivoryTowerId(i+1))];
    const before=structuredClone(old),next=migrateSaveTo110(old,content);
    expect(old).toEqual(before);
    for(const key of ['ownedIds','partyIds','leaderId','memoryGems','materials','gold','potions','stones','drawCount','ssrPity','seed','completedDungeonIds'] as const) expect(next[key],key).toEqual(before[key]);
    expect(next.towerRecord).toEqual({version:'1.10',completedFloors:[],legacyHighest:59});
    assertSaveCompatibility(next,content);
    expect(migrateSaveTo110(next,content)).toBe(next);
    expect(decodeBackup(encodeBackup(next,content),content).save).toEqual(next);
  });

  it('imports a1.0 backup with its original source attached and never consumes resources while decoding', () => {
    const old=legacySave(0x34567890);old.completedDungeonIds=['silent-cathedral',ivoryTowerId(1)];
    const before=structuredClone(old),text=encodeBackup(old,legacyContent());
    const imported=decodeBackup(text,content);
    expect(imported.legacySource).toEqual(before);expect(old).toEqual(before);
    expect(imported.save.memoryGems).toEqual(before.memoryGems);expect(imported.save.seed).toBe(before.seed);expect(imported.save.gold).toBe(before.gold);
    expect(imported.save.towerRecord).toEqual({version:'1.10',completedFloors:[],legacyHighest:1});
    expect(decodeBackup(encodeBackup(imported.save,content),content).save).toEqual(imported.save);
  });

  it('safely carries pending materials from an interrupted old fight without adding earned gold or secured gems twice', () => {
    const old=legacySave(),b=createBattle(legacyContent(),old.partyIds,old.leaderId,'silent-cathedral',0,old.seed,'legacy-interrupted');
    b.phase='ready';b.nextPhase='ready';b.cursor=b.events.length;b.pendingMaterials={'pilgrim:common':3};b.goldEarned=42;old.battle=b;
    const next=migrateSaveTo110(old,content);
    expect(next.battle).toBeNull();expect(next.materials['pilgrim:common']).toBe(11);
    expect(next.gold).toBe(old.gold);expect(next.memoryGems).toEqual(old.memoryGems);expect(next.seed).toBe(old.seed);
    expect(next.completedDungeonIds).toEqual(old.completedDungeonIds);
    expect(migrateSaveTo110(next,content).materials['pilgrim:common']).toBe(11);
  });

  it('settles an already won old tower fight once and records it only in the old ascent', () => {
    const old=legacySave();old.completedDungeonIds=['silent-cathedral',...Array.from({length:58},(_,i)=>ivoryTowerId(i+1))];
    const b=createBattle(legacyContent(),old.partyIds,old.leaderId,ivoryTowerId(59),0,old.seed,'legacy-won-59');
    b.wave=content.dungeons.find(d=>d.id===b.dungeonId)!.waves.length-1;b.phase='playing';b.nextPhase='reward';b.events=[{id:'last-victory-frame',kind:'defeat',text:'completed'}];b.cursor=0;
    b.pendingMaterials={'pilgrim:common':3};b.goldEarned=42;old.battle=b;
    const next=migrateSaveTo110(old,content);
    expect(next.battle).toBeNull();expect(next.materials['pilgrim:common']).toBe(11);expect(next.gold).toBe(old.gold+20);
    expect(next.memoryGems!.items).toEqual(old.memoryGems!.items);expect(next.seed).toBe(old.seed);expect(next.stones).toBe(old.stones);
    expect(next.completedDungeonIds).toContain(ivoryTowerId(59));expect(next.claimedExplorationIds).toContain(b.id);
    expect(next.towerRecord).toEqual({version:'1.10',completedFloors:[],legacyHighest:59});expect(highestTowerFloor(next)).toBe(0);
    expect(migrateSaveTo110(next,content)).toBe(next);
  });

  it('rejects current-version saves whose missing tower record would reuse an old ascent', () => {
    const save=createInitialSave(content,42);save.completedDungeonIds=['silent-cathedral',ivoryTowerId(1)];delete save.towerRecord;
    expect(()=>assertSaveCompatibility(save,content)).toThrow();
    expect(()=>decodeBackup(JSON.stringify({format:'stillveil-save',formatVersion:1,exportedAt:'2026-11-01T00:00:00Z',save}),content)).toThrow();
  });

  it('does not legitimize invalid trial loot during a version conversion', () => {
    const old=legacySave(),trial=content.dungeons.find(d=>d.kind==='trial')!;
    old.battle=createBattle(legacyContent(),old.partyIds,old.leaderId,trial.id,0,old.seed,'legacy-invalid-trial');
    old.battle.pendingMaterials={'pilgrim:common':1};const before=structuredClone(old);
    expect(()=>migrateSaveTo110(old,content)).toThrow();expect(old).toEqual(before);
  });

  it('rejects unknown versions without mutating the original data', () => {
    const bad=legacySave();bad.appVersion='9.9.9';const before=structuredClone(bad);
    expect(()=>migrateSaveTo110(bad,content)).toThrow();expect(bad).toEqual(before);
  });
});


describe('1.10 guaranteed scout recruitment journeys', () => {
  it('turns each story clear token into its intended companion once through the real command API', () => {
    for(const offer of scoutRecruitments){
      let save=createInitialSave(content,42);
      const ids=content.chapters!.flatMap(ch=>ch.dungeonIds),index=ids.indexOf(offer.dungeonId);
      expect(index).toBeGreaterThan(0);save.completedDungeonIds=ids.slice(0,index);
      save.novels={seen:(content.novels??[]).filter(n=>n.trigger.kind==='opening'||save.completedDungeonIds.includes(n.trigger.dungeonId)).map(n=>n.id)};
      expect(save.discoveredIds).not.toContain(offer.characterId);
      expect(()=>applyCommand(save,{type:'recruit',characterId:offer.characterId},content)).toThrow();
      const won=clearCurrentExploration(applyCommand(save,{type:'depart',dungeonId:offer.dungeonId,potions:0},content));
      save=applyCommand(won,{type:'claim'},content);
      expect(save.discoveredIds).toContain(offer.characterId);
      expect(save.materials[offer.materialId]).toBeGreaterThanOrEqual(offer.count);
      if(save.novels?.active)save=applyCommand(save,{type:'novelFinish'},content);
      const before=structuredClone(save);
      save=applyCommand(save,{type:'recruit',characterId:offer.characterId},content);
      expect(save.ownedIds).toContain(offer.characterId);
      expect(save.materials[offer.materialId]).toBe(before.materials[offer.materialId]-offer.count);
      expect(save.stones).toBe(before.stones);expect(save.seed).toBe(before.seed);
      expect(()=>applyCommand(save,{type:'recruit',characterId:offer.characterId},content)).toThrow();
      expect(decodeBackup(encodeBackup(save,content),content).save).toEqual(save);
    }
  });
});
