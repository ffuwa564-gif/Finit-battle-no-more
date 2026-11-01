import { campaignStageIds } from './campaign';
import { dungeonLock } from './events';
import { highestTowerFloor, IVORY_TOWER_FLOORS } from './ivory-tower';
import { dungeonStoneReward } from './rewards';
import type { ChapterDef, Content, DungeonDef, GameSave } from './types';

export interface HomeJourneyTarget {
  kind: 'campaign' | 'tower';
  dungeon: DungeonDef;
  chapter?: ChapterDef;
  firstClearStones: number;
}

/** Read-only next step: reward claims and old arrival proofs remain separate. */
export function homeJourneyTarget(content: Content, save: GameSave): HomeJourneyTarget | null {
  const stages=campaignStageIds(content).flatMap(id=>{
    const stage=content.dungeons.find(d=>d.id===id&&d.published&&!d.towerFloor&&(d.kind??'normal')==='normal');
    return stage?[stage]:[];
  });
  const next=stages.find(stage=>!save.completedDungeonIds.includes(stage.id)&&!dungeonLock(stage,save,content));
  if(next)return {kind:'campaign',dungeon:next,chapter:content.chapters?.find(chapter=>chapter.dungeonIds.includes(next.id)),firstClearStones:dungeonStoneReward(next,save.completedDungeonIds)};
  // A locked remaining chapter is not the same as a completed campaign.
  if(!stages.length||stages.some(stage=>!save.completedDungeonIds.includes(stage.id)))return null;
  const floor=highestTowerFloor(save)+1;
  if(floor>IVORY_TOWER_FLOORS)return null;
  const tower=content.dungeons.find(d=>d.published&&d.towerFloor===floor);
  return tower&&!dungeonLock(tower,save,content)?{kind:'tower',dungeon:tower,firstClearStones:0}:null;
}
