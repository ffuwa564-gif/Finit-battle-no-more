import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { buildIvoryTowerDungeons, towerEncounterShape, towerEnemyScale } from '../src/content/ivory-tower';
import { highestTowerFloor, ivoryTowerId, isTowerDungeon, IVORY_TOWER_VERSION, towerDustReward, towerFloorFromId, towerLock } from '../src/domain/ivory-tower';
import { duplicateFamily } from '../src/domain/events';
import { dungeonDifficulty } from '../src/domain/engine';
import { runTowerBattle, towerBalanceParties, towerBalanceQualities } from '../scripts/balance-tower';

const floors = () => buildIvoryTowerDungeons(content.characters);

describe('Ivory Tower 1.10 encounters', () => {
  it('uses every existing published combat form as a main in 100 distinct final formations', () => {
    const stages = floors();
    expect(content.dungeons.filter(isTowerDungeon)).toHaveLength(100);
    expect(stages).toHaveLength(100);
    const mainIds = new Set(stages.map(stage=>stage.waves.at(-1)![0]!.characterId));
    expect(mainIds).toEqual(new Set(content.characters.filter(character=>character.published).map(character=>character.id)));
    expect(mainIds.size).toBeGreaterThanOrEqual(71);
    expect(new Set(stages.map(stage=>stage.waves.at(-1)!.map(enemy=>enemy.characterId).join('|'))).size).toBe(100);
    for (let index=0;index<stages.length;index++) {
      const stage=stages[index]!,floor=index+1;
      expect(stage.id).toBe(ivoryTowerId(floor));
      expect(stage.previousDungeonId).toBe(floor===1?'silent-cathedral':ivoryTowerId(floor-1));
      expect(stage.waves.at(-1)![0]!.boss).toBe(true);
      expect(stage.waves.every(wave=>wave.length>0&&wave.length<=4)).toBe(true);
      expect(stage.waves.every(wave=>!duplicateFamily(wave.map(enemy=>enemy.characterId),content))).toBe(true);
      expect(stage.waves.every(wave=>wave.filter(enemy=>content.characters.find(character=>character.id===enemy.characterId)?.role==='healer').length<=1)).toBe(true);
      expect(stage.towerBattle).toEqual({healLimit:3,barrierLimit:2});
      expect(content.assets.some(asset=>asset.id===stage.artId)).toBe(true);
      expect(Object.values(stage.enemyScale!).every(value=>Number.isFinite(value)&&value>0)).toBe(true);
    }
  });

  it('varies tactical shape without compressing a whole party budget into a solo healer', () => {
    const stages=floors(),shapes=new Set(stages.map(towerEncounterShape));
    expect(shapes).toEqual(new Set(['duel','pair','trio','quartet','relay']));
    for(const stage of stages.filter(stage=>towerEncounterShape(stage)==='duel')) {
      const budget=towerEnemyScale(stage.towerFloor!);
      expect(stage.enemyScale!.hp).toBeLessThanOrEqual(budget.hp*.85+.000001);
      expect(stage.enemyScale!.attack).toBeLessThanOrEqual(budget.attack*1.25+.000001);
      expect(stage.bossStrike?.windup).toBeDefined();
    }
    expect(dungeonDifficulty(stages[0]!,content)).toBeGreaterThanOrEqual(31);
    expect(dungeonDifficulty(stages[99]!,content)).toBeGreaterThanOrEqual(170);
    expect(stages[9]!.waves).toHaveLength(2);
  });

  it('gives the two rabbit forms and Chrona their existing distinctive mechanics', () => {
    const stages=floors();
    for(const id of ['lunette','lunette-awakened']) {
      const stage=stages.find(stage=>stage.waves.at(-1)![0]!.characterId===id)!;
      expect(stage.bossBits).toEqual({every:4,count:2,duration:1,power:45});
      expect(stage.bossStrike?.every).toBe(4);
      expect(stage.bossStrike?.windup).toBeDefined();
    }
    const clock=stages.find(stage=>stage.waves.at(-1)![0]!.characterId==='chrona')!;
    expect(clock.bossClock?.deadline).toBe(19);
    expect(clock.bossClock?.shield).toBe(170);
    expect(clock.bossStrike).toBeUndefined();
    expect(clock.bossBits).toBeUndefined();
    expect(stages.filter(stage=>stage.bossStrike?.windup).length).toBeGreaterThanOrEqual(20);
  });
});

describe('Ivory Tower versioned ascent', () => {
  it('retains the old highest in the archive while current progress starts from its own contiguous record', () => {
    const stages=floors();
    const completedDungeonIds=['silent-cathedral',...Array.from({length:59},(_,i)=>ivoryTowerId(i+1))];
    const save={completedDungeonIds,towerRecord:{version:IVORY_TOWER_VERSION,completedFloors:[] as number[],legacyHighest:59}};
    expect(highestTowerFloor(save)).toBe(0);
    expect(towerLock(stages[0]!,save)).toBeNull();
    expect(towerLock(stages[1]!,save)).not.toBeNull();
    save.towerRecord.completedFloors.push(1,2,70);
    expect(highestTowerFloor(save)).toBe(2);
    expect(towerLock(stages[2]!,save)).toBeNull();
    expect(towerLock(stages[3]!,save)).not.toBeNull();
    expect(save.towerRecord.legacyHighest).toBe(59);
    expect(save.completedDungeonIds).toHaveLength(60);
  });

  it('keeps plain old fixtures readable, never skips a missing clear, and retains the introductory gate', () => {
    const stages=floors(),save={completedDungeonIds:[] as string[]};
    expect(towerLock(stages[0]!,save)).not.toBeNull();
    save.completedDungeonIds.push('silent-cathedral',ivoryTowerId(70));
    expect(highestTowerFloor(save)).toBe(0);
    expect(towerLock(stages[0]!,save)).toBeNull();
    save.completedDungeonIds.push(ivoryTowerId(1),ivoryTowerId(2));
    expect(highestTowerFloor(save)).toBe(2);
    expect(towerFloorFromId('ivory-tower-000')).toBeNull();
    expect(towerFloorFromId('ivory-tower-101')).toBeNull();
    expect(towerFloorFromId('ivory-tower-050-extra')).toBeNull();
  });

  it('gives deeper ascents more refinement progress without multiplying preliminary-wave reward', () => {
    const stages=floors();
    expect(towerDustReward(stages[0]!)).toBe(1);
    expect(towerDustReward(stages[19]!)).toBe(1);
    expect(towerDustReward(stages[20]!)).toBe(2);
    expect(towerDustReward(stages[99]!)).toBe(5);
  });
});

describe('Ivory Tower 1.10 real combat gates', () => {
  const party=towerBalanceParties.find(item=>item.name==='SSR')!;
  const bare=towerBalanceQualities.find(item=>item.name==='bare')!;
  const ideal=towerBalanceQualities.find(item=>item.name==='ideal')!;
  it('still stops unequipped SSR teams at the entrance', () => {
    expect(Array.from({length:10},(_,i)=>runTowerBattle(1,party,bare,i+1)).filter(result=>result.win).length).toBeLessThanOrEqual(2);
  },15000);
  it('keeps the summit beyond the existing sampled counterbuilds while every battle retains legal inputs', () => {
    for(const profile of towerBalanceParties.filter(p=>['SSR','mixed-awakened','curse-burst'].includes(p.name))) {
      for(const seed of [1,2,3]) expect(runTowerBattle(100,profile,ideal,seed).win).toBe(false);
    }
  },15000);
});
