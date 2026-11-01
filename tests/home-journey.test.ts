import { describe,expect,it } from 'vitest';
import { content } from '../src/content';
import { createInitialSave } from '../src/application/game';
import { campaignStageIds } from '../src/domain/campaign';
import { homeJourneyTarget } from '../src/domain/home-journey';
import { IVORY_TOWER_VERSION } from '../src/domain/ivory-tower';

describe('home journey objective',()=>{
  it('finds an unclaimed published chapter route, with its actual first-clear reward',()=>{
    const save=createInitialSave(content);
    const first=homeJourneyTarget(content,save)!;
    expect(first.kind).toBe('campaign');expect(first.firstClearStones).toBe(3);
    expect(first.dungeon.id).toBe(campaignStageIds(content)[0]);
    save.completedDungeonIds.push(first.dungeon.id);
    expect(homeJourneyTarget(content,save)?.dungeon.id).not.toBe(first.dungeon.id);
  });
  it('does not fabricate earlier rewards from a later legacy arrival',()=>{
    const save=createInitialSave(content);save.completedDungeonIds=[campaignStageIds(content)[10]];
    const next=homeJourneyTarget(content,save)!;
    expect(next.dungeon.id).toBe(campaignStageIds(content)[0]);
    expect(next.firstClearStones).toBe(3);
  });
  it('uses the next new tower floor only after all published campaign routes are completed',()=>{
    const save=createInitialSave(content);save.completedDungeonIds=[...campaignStageIds(content),'silent-cathedral'];
    save.towerRecord={version:IVORY_TOWER_VERSION,completedFloors:[1,2],legacyHighest:59};
    const target=homeJourneyTarget(content,save)!;
    expect(target.kind).toBe('tower');expect(target.dungeon.towerFloor).toBe(3);expect(target.firstClearStones).toBe(0);
    save.towerRecord.completedFloors=Array.from({length:100},(_,i)=>i+1);
    expect(homeJourneyTarget(content,save)).toBeNull();
  });
});
