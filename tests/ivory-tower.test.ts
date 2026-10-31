import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { ivoryTowerDungeons, towerEnemyScale } from '../src/content/ivory-tower';
import { highestTowerFloor, ivoryTowerId, isTowerDungeon, towerDustReward, towerFloorFromId, towerLock } from '../src/domain/ivory-tower';
import { runTowerBattle, towerBalanceParties, towerBalanceQualities } from '../scripts/balance-tower';

describe('Ivory Tower structure and ascent', () => {
  it('contains exactly 100 individually addressable, sequential encounters using real escalating enemy stats', () => {
    expect(ivoryTowerDungeons).toHaveLength(100);
    expect(content.dungeons.filter(isTowerDungeon)).toHaveLength(100);
    for (let floor=1;floor<=100;floor++) {
      const dungeon = ivoryTowerDungeons[floor-1];
      expect(dungeon.id).toBe(ivoryTowerId(floor));
      expect(dungeon.towerFloor).toBe(floor);
      expect(dungeon.previousDungeonId).toBe(floor===1 ? 'silent-cathedral' : ivoryTowerId(floor-1));
      expect(dungeon.waves.at(-1)![0].boss).toBe(true);
      expect(dungeon.waves.every(wave=>wave.length>0&&wave.length<=3)).toBe(true);
      expect(dungeon.enemyScale).toEqual(towerEnemyScale(floor));
      if (floor>1) {
        expect(dungeon.enemyScale!.hp).toBeGreaterThan(ivoryTowerDungeons[floor-2].enemyScale!.hp);
        expect(dungeon.enemyScale!.attack).toBeGreaterThan(ivoryTowerDungeons[floor-2].enemyScale!.attack);
      }
    }
    expect(ivoryTowerDungeons[99].enemyScale!.hp/ivoryTowerDungeons[0].enemyScale!.hp).toBeGreaterThan(3);
    // The entrance is already dangerous; deep floors still multiply that stronger baseline.
    expect(ivoryTowerDungeons[99].enemyScale!.attack/ivoryTowerDungeons[0].enemyScale!.attack).toBeGreaterThan(3);
    expect(ivoryTowerDungeons[0].waves[0]).toHaveLength(2);
    expect(ivoryTowerDungeons[4].bossStrike?.windup).toBeDefined();
    expect(ivoryTowerDungeons[9].waves).toHaveLength(2);
    expect(ivoryTowerDungeons[9].waves.at(-1)).toHaveLength(3);
  });

  it('unlocks after the introductory clear, never skips missing floors, and preserves retries', () => {
    const progress={completedDungeonIds:[] as string[]};
    expect(towerLock(ivoryTowerDungeons[0],progress)).not.toBeNull();
    progress.completedDungeonIds.push('silent-cathedral',ivoryTowerId(70));
    expect(highestTowerFloor(progress)).toBe(0);
    expect(towerLock(ivoryTowerDungeons[0],progress)).toBeNull();
    expect(towerLock(ivoryTowerDungeons[1],progress)).not.toBeNull();
    progress.completedDungeonIds.push(ivoryTowerId(1),ivoryTowerId(2));
    expect(highestTowerFloor(progress)).toBe(2);
    expect(towerLock(ivoryTowerDungeons[0],progress)).toBeNull();
    expect(towerLock(ivoryTowerDungeons[2],progress)).toBeNull();
    expect(towerLock(ivoryTowerDungeons[3],progress)).not.toBeNull();
    expect(towerFloorFromId('ivory-tower-000')).toBeNull();
    expect(towerFloorFromId('ivory-tower-101')).toBeNull();
    expect(towerFloorFromId('ivory-tower-050-extra')).toBeNull();
  });

  it('gives deeper ascents more refinement progress without multiplying gem inventory per preliminary wave', () => {
    expect(towerDustReward(ivoryTowerDungeons[0])).toBe(1);
    expect(towerDustReward(ivoryTowerDungeons[19])).toBe(1);
    expect(towerDustReward(ivoryTowerDungeons[20])).toBe(2);
    expect(towerDustReward(ivoryTowerDungeons[99])).toBe(5);
    expect(new Set(ivoryTowerDungeons.map(dungeon=>dungeon.waves.at(-1)![0].characterId)).size).toBeGreaterThanOrEqual(5);
    expect(ivoryTowerDungeons.filter(dungeon=>dungeon.bossStrike?.windup).length).toBeGreaterThanOrEqual(10);
  });
});

describe('Ivory Tower real combat difficulty', () => {
  const party=towerBalanceParties.find(item=>item.name==='SSR')!;
  const practical=towerBalanceQualities.find(item=>item.name==='practical')!;
  const excellent=towerBalanceQualities.find(item=>item.name==='excellent')!;
  const ideal=towerBalanceQualities.find(item=>item.name==='ideal')!;
  const bare=towerBalanceQualities.find(item=>item.name==='bare')!;
  it('requires loot already at a shallow wall, with flowers, fairies, crystal switching, items and ultimates available', () => {
    const wins = (quality: typeof practical) => Array.from({ length:10 }, (_, index) => runTowerBattle(12,party,quality,index+1)).filter(result => result.win).length;
    expect(wins(bare)).toBe(0);
    expect(wins(practical)).toBeGreaterThanOrEqual(6);
    expect(wins(excellent)).toBe(10);
    expect(wins(ideal)).toBeGreaterThanOrEqual(8);
  }, 15000);
  it('stops bare SSR teams in the shallows and keeps the summit beyond the sampled ideal counterbuilds', () => {
    for (const seed of [1,2,3]) expect(runTowerBattle(20,party,bare,seed).win).toBe(false);
    for (const profile of towerBalanceParties.filter(p => ['SSR','mixed-awakened','curse-burst'].includes(p.name))) {
      for (const seed of [1,2,3]) expect(runTowerBattle(100,profile,ideal,seed).win).toBe(false);
    }
  }, 15000);
});
