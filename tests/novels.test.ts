import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { createBattle } from '../src/domain/engine';
import { initialNovelProgress, novelAvailable } from '../src/domain/novels';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';

const start = () => createInitialSave(content, 42, { opening: true });
const close = () => applyCommand(start(), { type: 'novelFinish' }, content);
function won(id: string, completed: string[] = []) {
  const save = close(); save.completedDungeonIds = completed;
  save.battle = createBattle(content, save.partyIds, save.leaderId, id, 0, 42, 'novel-clear');
  save.battle.phase = 'reward'; save.battle.nextPhase = 'reward'; save.battle.cursor = save.battle.events.length;
  return save;
}
describe('saved visual novel stories', () => {
  it('starts the opening only for an explicitly new interactive game and preserves old saves', () => {
    expect(start().novels!.active).toEqual({ sceneId: 'opening-desire-gate', page: 0 });
    const old = createInitialSave(content); expect(old.novels).toBeUndefined(); assertSaveCompatibility(old, content);
    expect(initialNovelProgress(content, false)).toEqual({ seen: [] });
  });
  it('saves page navigation and rejects game mutations while the story is open', () => {
    const save = start(), original = structuredClone(save);
    const next = applyCommand(save, { type: 'novelNext' }, content);
    expect(next.novels!.active!.page).toBe(1); expect(save).toEqual(original);
    assertSaveCompatibility(JSON.parse(JSON.stringify(next)), content);
    const back = applyCommand(next, { type: 'novelBack' }, content); expect(back.novels!.active!.page).toBe(0);
    expect(() => applyCommand(back, { type: 'novelBack' }, content)).toThrow('ページ');
    expect(() => applyCommand(save, { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }, content)).toThrow('物語');
    expect(() => applyCommand(save, { type: 'draw' }, content)).toThrow('物語');
    expect(next.seed).toBe(save.seed); expect(next.gold).toBe(save.gold); expect(next.stones).toBe(save.stones);
  });
  it('marks a finished or skipped story seen once without changing resources', () => {
    const save = start(), done = applyCommand(save, { type: 'novelFinish' }, content);
    expect(done.novels).toEqual({ seen: ['opening-desire-gate'] });
    expect(done.gold).toBe(save.gold); expect(done.ownedIds).toEqual(save.ownedIds);
    expect(() => applyCommand(done, { type: 'novelFinish' }, content)).toThrow();
    const replay = applyCommand(done, { type: 'novelStart', sceneId: 'opening-desire-gate' }, content);
    expect(applyCommand(replay, { type: 'novelFinish' }, content).novels!.seen).toEqual(['opening-desire-gate']);
  });
  it('queues a chapter epilogue atomically after first-clear rewards and never grants those rewards twice', () => {
    const stageId = content.chapters![0]!.dungeonIds.at(-1)!;
    const before = won(stageId), after = applyCommand(before, { type: 'claim' }, content);
    expect(after.battle).toBeNull(); expect(after.novels!.active!.sceneId).toBe('chapter-1-epilogue');
    expect(after.gold).toBe(before.gold + 20); expect(after.stones).toBe(before.stones + 3); expect(after.revision).toBe(before.revision + 1);
    const finished = applyCommand(after, { type: 'novelFinish' }, content);
    expect(finished.gold).toBe(after.gold); expect(finished.stones).toBe(after.stones);
    expect(() => applyCommand(finished, { type: 'claim' }, content)).toThrow();
    const repeat = won(stageId, [stageId]); expect(applyCommand(repeat, { type: 'claim' }, content).novels!.active).toBeUndefined();
  });
  it('locks unreached chapter archives and includes the stage outcome before the garden return', () => {
    const scene = content.novels!.find(scene => scene.id === 'chapter-2-epilogue')!;
    expect(novelAvailable(scene, close())).toBe(false);
    expect(() => applyCommand(close(), { type: 'novelStart', sceneId: scene.id }, content)).toThrow('まだ');
    if (scene.trigger.kind !== 'dungeon-clear') throw Error('fixture');
    const stageId = scene.trigger.dungeonId;
    const stage = content.dungeons.find(stage => stage.id === stageId)!
    expect(scene.pages[1]!.text).toBe(stage.narrative!.after);
    expect(scene.pages.length).toBeGreaterThan(2);
    const save = close(); save.completedDungeonIds.push(stage.id);
    assertSaveCompatibility(applyCommand(save, { type: 'novelStart', sceneId: scene.id }, content), content);
  });
  it('resumes pre-rebuild final pages and reaches appended scenes without replaying rewards', () => {
    for (const sceneId of ['opening-desire-gate','chapter-1-epilogue','chapter-2-epilogue','chapter-3-epilogue']) {
      const save = close();
      save.completedDungeonIds = content.chapters!.flatMap(chapter => chapter.dungeonIds);
      const oldFinal = sceneId === 'opening-desire-gate' ? 14 : 1;
      save.novels = { seen: [], active: { sceneId, page: oldFinal } };
      assertSaveCompatibility(save, content);
      const next = applyCommand(save, { type: 'novelNext' }, content);
      expect(next.novels!.active).toEqual({ sceneId, page: oldFinal + 1 });
      expect(next.gold).toBe(save.gold); expect(next.stones).toBe(save.stones);
      expect(next.materials).toEqual(save.materials); expect(next.completedDungeonIds).toEqual(save.completedDungeonIds);
    }
  });
  it('rejects malformed saved positions, simultaneous combat and unknown content references', () => {
    const save = start();
    for (const page of [-1, .5, 999]) {
      const invalid = structuredClone(save); invalid.novels!.active!.page = page;
      expect(() => assertSaveCompatibility(invalid, content)).toThrow('物語');
    }
    const invalid = structuredClone(save); invalid.novels!.active!.sceneId = 'missing';
    expect(() => assertSaveCompatibility(invalid, content)).toThrow('物語');
    const both = start(); both.battle = createBattle(content, both.partyIds, both.leaderId, 'silent-cathedral', 0, 42, 'invalid');
    expect(() => assertValidSave(both)).toThrow('物語');
    const definitions = structuredClone(content); definitions.novels![0]!.pages[0]!.backgroundId = 'missing';
    expect(validateContent(definitions).some(error => error.includes('background required'))).toBe(true);
  });
});
