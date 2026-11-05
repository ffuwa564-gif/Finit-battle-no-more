import type { Content, GameSave, NovelProgress, NovelSceneDef } from './types';

export function novelAvailable(scene: NovelSceneDef, save: GameSave): boolean {
  return scene.trigger.kind === 'opening' || save.completedDungeonIds.includes(scene.trigger.dungeonId);
}
export function initialNovelProgress(content: Content, opening: boolean): NovelProgress {
  const scene = opening ? content.novels?.find(scene => scene.trigger.kind === 'opening') : undefined;
  return { seen: [], ...(scene ? { active: { sceneId: scene.id, page: 0 } } : {}) };
}
/** Retained for legacy save upgrades. Dungeon milestones now open on the map;
 * completedDungeonIds still unlock every scene in the manual archive. */
export function enqueueMilestone(_save: GameSave, _dungeonId: string, _previouslyCleared: boolean, _content: Content): void {}
