import type { ChapterDef, Content, DungeonDef, GameSave } from './types';
type Progress = Pick<GameSave, 'completedDungeonIds'>;
export const campaignStageIds = (content: Content): string[] => content.chapters?.flatMap(chapter => chapter.dungeonIds) ?? [];
/** An old clear deep in the city proves arrival; it does not fabricate earlier reward claims. */
export function campaignFrontier(save: Progress, content: Content): number {
  const ids = campaignStageIds(content);
  return Math.min(ids.length - 1, Math.max(-1, ...save.completedDungeonIds.map(id => ids.indexOf(id))) + 1);
}
export function chapterUnlocked(chapter: ChapterDef, save: Progress, content: Content): boolean {
  return campaignStageIds(content).indexOf(chapter.dungeonIds[0]!) <= campaignFrontier(save, content);
}
export function campaignLock(stage: DungeonDef, save: Progress, content: Content): string | null {
  const ids = campaignStageIds(content), index = ids.indexOf(stage.id);
  if (index < 0 || index <= campaignFrontier(save, content)) return null;
  const chapter = content.chapters!.find(item => item.id === stage.chapterId)!;
  return chapter.dungeonIds[0] === stage.id ? `第${chapter.number - 1}章を踏破して解放` : `${content.dungeons.find(item => item.id === ids[index - 1])!.name}を踏破して解放`;
}
