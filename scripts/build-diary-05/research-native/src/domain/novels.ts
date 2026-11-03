import type { Content, GameSave, NovelProgress, NovelSceneDef } from './types';

export function novelAvailable(scene: NovelSceneDef, save: GameSave): boolean {
  return scene.trigger.kind === 'opening' || save.completedDungeonIds.includes(scene.trigger.dungeonId);
}
export function initialNovelProgress(content: Content, opening: boolean): NovelProgress {
  const scene = opening ? content.novels?.find(scene => scene.trigger.kind === 'opening') : undefined;
  return { seen: [], ...(scene ? { active: { sceneId: scene.id, page: 0 } } : {}) };
}
export function enqueueMilestone(save: GameSave, dungeonId: string, previouslyCleared: boolean, content: Content): void {
  if (!save.novels || previouslyCleared) return;
  const scene = content.novels?.find(scene => scene.trigger.kind === 'dungeon-clear' && scene.trigger.dungeonId === dungeonId && !save.novels!.seen.includes(scene.id));
  if (scene) save.novels.active = { sceneId: scene.id, page: 0 };
}
