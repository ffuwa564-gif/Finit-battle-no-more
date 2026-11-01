import { describe, expect, it } from 'vitest';
import { content as original } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { campaignFrontier, campaignStageIds, chapterUnlocked } from '../src/domain/campaign';
import { dungeonLock } from '../src/domain/events';
import { novelAvailable } from '../src/domain/novels';
import { campaignChapters } from '../src/content/chapters';
import { campaignNovels } from '../src/content/novels';
import { lateCampaignDungeons, lateStoryMilestones } from '../src/content/late-chapters';
import type { Content, GameSave } from '../src/domain/types';

const lateIds = new Set(lateCampaignDungeons.map(d => d.id));
const allDungeons = [...original.dungeons.filter(d => !lateIds.has(d.id)), ...lateCampaignDungeons];
const newNovels = [...campaignNovels(campaignChapters, allDungeons).filter(n => n.id.match(/^chapter-[567]-/)), ...lateStoryMilestones];
const newNovelIds = new Set(newNovels.map(n => n.id));
const materials = ['name-register:rare', 'herbal-cloth:rare', 'night-watch:rare', 'night-thread:rare'];
const fixture: Content = { ...original, chapters: campaignChapters, dungeons: allDungeons,
  novels: [...(original.novels ?? []).filter(n => !newNovelIds.has(n.id)), ...newNovels],
  materials: [...(original.materials ?? []).filter(m => !materials.includes(m.id)), ...materials.map(id => ({ id, name: id }))],
};
function arrived(): GameSave {
  const save = createInitialSave(fixture, 42);
  save.completedDungeonIds = campaignChapters.filter(ch => ch.number <= 4).flatMap(ch => ch.dungeonIds);
  save.novels = { seen: [] };
  return save;
}
/** Combat is sped up solely to inspect native progression/reward/novel commands, not balance. */
function win(save: GameSave, id: string): GameSave {
  let current = applyCommand(save, { type: 'depart', dungeonId: id, potions: 0 }, fixture);
  for (let guard = 0; guard < 500 && current.battle?.phase !== 'reward'; guard++) {
    if (current.battle!.phase === 'failed') throw new Error('fixture lost');
    if (current.battle!.phase === 'ready') {
      for (const u of current.battle!.units.filter(u => u.side === 'party')) { u.attack = 1_000_000; u.speed = 100; u.defense = 1_000_000; }
    }
    current = applyCommand(current, { type: current.battle!.phase === 'playing' ? 'replay' : 'round' }, fixture);
  }
  expect(current.battle?.phase).toBe('reward');
  return current;
}
describe('1.10 continuation chapters and story', () => {
  it('opens chapter5 after the existing chapter4 rather than exposing all new routes', () => {
    const save = arrived();
    expect(campaignChapters.map(ch => ch.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(chapterUnlocked(campaignChapters[4]!, save, fixture)).toBe(true);
    expect(chapterUnlocked(campaignChapters[5]!, save, fixture)).toBe(false);
    expect(lateCampaignDungeons.filter(d => !dungeonLock(d, save, fixture)).map(d => d.id)).toEqual(['guild-blank-request']);
    for (const n of newNovels) expect(novelAvailable(n, save)).toBe(false);
  });
  it('plays all30 routes in order, pays normal first-clear stones once and guarantees the four recruitment tokens', () => {
    let save = arrived(); const initialStones = save.stones;
    const recruits: Record<string, { characterId: string; materialId: string }> = {
      'infirmary-handover': { characterId: 'fio', materialId: 'herbal-cloth:rare' },
      'register-return': { characterId: 'ione', materialId: 'name-register:rare' },
      'lantern-return': { characterId: 'neri', materialId: 'night-watch:rare' },
      'two-signatures': { characterId: 'ruka', materialId: 'night-thread:rare' },
    };
    const received = new Set<string>();
    for (const [index, d] of lateCampaignDungeons.entries()) {
      const reward = win(save, d.id);
      expect(reward.completedDungeonIds).not.toContain(d.id);
      save = applyCommand(reward, { type: 'claim' }, fixture);
      expect(save.completedDungeonIds).toContain(d.id);
      expect(save.stones).toBe(initialStones + (index + 1) * 3);
      const expected = newNovels.find(n => n.trigger.kind === 'dungeon-clear' && n.trigger.dungeonId === d.id);
      if (expected) {
        expect(save.novels?.active?.sceneId).toBe(expected.id);
        const resources = { stones: save.stones, materials: { ...save.materials } };
        save = applyCommand(save, { type: 'novelFinish' }, fixture);
        expect(save.stones).toBe(resources.stones); expect(save.materials).toEqual(resources.materials);
        expect(save.novels?.seen).toContain(expected.id);
      } else expect(save.novels?.active).toBeUndefined();
      const offer = recruits[d.id];
      if (offer) {
        expect(save.materials[offer.materialId]).toBeGreaterThanOrEqual(1);
        expect(save.discoveredIds).toContain(offer.characterId);
        received.add(offer.materialId);
        save = applyCommand(save, { type: 'recruit', characterId: offer.characterId }, fixture);
        expect(save.ownedIds).toContain(offer.characterId);
        expect(save.materials[offer.materialId]).toBe(0);
      }
      if (index + 1 < lateCampaignDungeons.length) expect(dungeonLock(lateCampaignDungeons[index + 1]!, save, fixture)).toBeNull();
    }
    expect([...received].sort()).toEqual([...materials].sort());
    for (const id of ['ione', 'neri', 'fio', 'ruka']) expect(save.ownedIds).toContain(id);
    expect(save.novels?.seen.filter(id => newNovelIds.has(id))).toHaveLength(12);
    const repeated = applyCommand(win(save, 'register-return'), { type: 'claim' }, fixture);
    expect(repeated.stones).toBe(save.stones); expect(repeated.novels?.active).toBeUndefined();
    expect(campaignFrontier(save, fixture)).toBe(campaignStageIds(fixture).length - 1);
  });
  it('uses distinct story triggers and existing backgrounds, with post-battle endings for all added chapters', () => {
    const triggers = newNovels.map(n => n.trigger.kind === 'dungeon-clear' ? n.trigger.dungeonId : 'opening');
    expect(new Set(triggers).size).toBe(triggers.length);
    for (const n of newNovels) for (const p of n.pages) expect(original.assets.some(a => a.id === p.backgroundId)).toBe(true);
    for (const ch of campaignChapters.filter(ch => ch.number >= 5)) {
      const scene = newNovels.find(n => n.id === `chapter-${ch.number}-epilogue`)!;
      expect(scene.pages.length).toBeGreaterThan(4);
      expect(scene.pages[1]!.text).toBe(lateCampaignDungeons.find(d => d.id === ch.dungeonIds.at(-1))!.narrative!.after);
    }
  });
});
