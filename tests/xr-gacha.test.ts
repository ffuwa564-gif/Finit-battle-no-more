import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { baseStats, rng } from '../src/domain/engine';
import { pickXR, xrChapterCleared, xrGachaLock } from '../src/domain/xr-gacha';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import { gachaCollections, gachaPoolIds, gachaPity } from '../src/content/gacha';
import type { Content } from '../src/domain/types';

function futureContent(): Content {
  const definitions = structuredClone(content);
  for (let number = definitions.chapters!.length + 1; number <= 10; number++) {
    const id = `future-chapter-${number}`;
    const stages = [1, 2].map(index => `${id}-${index}`);
    for (const [index, stage] of stages.entries()) {
      const original = definitions.dungeons.find(dungeon => dungeon.id === definitions.chapters!.at(-1)!.dungeonIds.at(-1))!;
      definitions.dungeons.push({ ...structuredClone(original), id: stage, chapterId: id, previousDungeonId: index ? stages[index - 1] : definitions.chapters!.at(-1)!.dungeonIds.at(-1), ...(index === 0 ? { bossStrike: undefined, waves: [...original.waves.slice(0, -1), [original.waves.at(-1)![0]!]] } : {}) });
    }
    definitions.chapters!.push({ id, number, title: id, subtitle: id, bossHint: id, dungeonIds: stages });
  }
  definitions.xrGacha!.published = true;
  return definitions;
}
function unlocked(definitions: Content, seed = 42) {
  const save = createInitialSave(definitions, seed);
  save.completedDungeonIds = definitions.chapters!.flatMap(chapter => chapter.dungeonIds);
  save.astralStones = 20; save.drawCount = 17; save.ssrPity = 16; save.stones = 100;
  return save;
}

describe('future XR summons', () => {
  it('accepts old saves without premium fields and rejects corrupt premium balances', () => {
    const save = createInitialSave(content); delete save.astralStones; delete save.xrDrawCount;
    assertSaveCompatibility(JSON.parse(JSON.stringify(save)), content);
    for (const value of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1, '1']) {
      expect(() => assertValidSave({ ...save, astralStones: value })).toThrow('星晶');
      expect(() => assertValidSave({ ...save, xrDrawCount: value })).toThrow('星晶');
    }
  });
  it('cannot be obtained in current content even if all existing stages and normal funds are present', () => {
    const save = createInitialSave(content); save.completedDungeonIds = content.dungeons.map(dungeon => dungeon.id);
    save.stones = 10000; save.astralStones = 100;
    const before = structuredClone(save);
    expect(xrChapterCleared(save, content)).toBe(false);
    expect(() => applyCommand(save, { type: 'drawXR' }, content)).toThrow('第10章');
    expect(save).toEqual(before);
    expect(createInitialSave(content).astralStones).toBe(0);
    const roster = content.characters.filter(character => character.rarity === 'XR');
    expect(roster.map(character => character.id)).toEqual(['astraea']);
    expect(content.xrGacha!.characterIds).toContain('astraea');
    expect(content.xrGacha!.published).toBe(false);
    expect(createInitialSave(content).ownedIds).not.toContain('astraea');
    expect(roster[0].origin).toEqual(['xr_gacha']);
    for (const banner of gachaCollections) expect(gachaPoolIds(banner).every(id => content.characters.find(character => character.id === id)!.rarity !== 'XR')).toBe(true);
  });
  it('requires every chapter through ten, a published roster and premium currency', () => {
    const definitions = futureContent(), save = unlocked(definitions);
    expect(validateContent(definitions)).toEqual([]);
    const finale = save.completedDungeonIds.pop()!;
    expect(xrChapterCleared(save, definitions)).toBe(false);
    save.completedDungeonIds.push(finale); expect(xrChapterCleared(save, definitions)).toBe(true);
    definitions.xrGacha!.published = false;
    expect(xrGachaLock(save, definitions)).toContain('準備中');
    definitions.xrGacha!.published = true; save.astralStones = 0;
    const before = structuredClone(save);
    expect(() => applyCommand(save, { type: 'drawXR' }, definitions)).toThrow('星晶石が不足');
    expect(save).toEqual(before);
    save.completedDungeonIds = definitions.chapters!.at(-1)!.dungeonIds;
    expect(xrChapterCleared(save, definitions)).toBe(false);
  });
  it('partitions a deterministic sweep into exactly 0.1% XR with no regular SSR guarantee', () => {
    const definitions = futureContent(), banner = definitions.xrGacha!;
    const pool = definitions.characters.filter(character => banner.characterIds.includes(character.id));
    const counts = { R: 0, SR: 0, SSR: 0, XR: 0 };
    for (let index = 0; index < 100000; index++) counts[pickXR(pool, banner, (index + 0.5) / 100000, 0).rarity]++;
    expect(counts).toEqual({ R: 70000, SR: 25000, SSR: 4900, XR: 100 });
    const xr = definitions.characters.find(character => character.rarity === 'XR')!;
    const higher = baseStats(xr), ssr = baseStats({ ...xr, rarity: 'SSR', strength: 30 });
    expect(higher.hp).toBeGreaterThan(ssr.hp); expect(higher.attack).toBeGreaterThan(ssr.attack); expect(higher.defense).toBeGreaterThan(ssr.defense);
    xr.strength = 30; expect(validateContent(definitions)).toContain('characters/astraea: XR strength 31..40 required');
  });
  it('awards XR with premium stones and keeps all normal stones, counts and pity unchanged', () => {
    const definitions = futureContent();
    let seed = 0; while (rng(seed).value < 0.999) seed++;
    const save = unlocked(definitions, seed), before = structuredClone(save);
    const next = applyCommand(save, { type: 'drawXR' }, definitions);
    expect(next.lastGachaResult).toEqual({ characterId: 'astraea', duplicate: false, refund: 0, currency: 'astralStones' });
    expect(next.astralStones).toBe(19); expect(next.stones).toBe(before.stones); expect(next.drawCount).toBe(before.drawCount); expect(next.ssrPity).toBe(before.ssrPity); expect(next.xrDrawCount).toBe(1);
    expect(save).toEqual(before); assertSaveCompatibility(JSON.parse(JSON.stringify(next)), definitions);
    next.seed = seed;
    const duplicate = applyCommand(next, { type: 'drawXR' }, definitions);
    expect(duplicate.lastGachaResult!.refund).toBe(1); expect(duplicate.astralStones).toBe(19); expect(duplicate.ownedIds.filter(id => id === 'astraea')).toHaveLength(1);
  });
  it('preserves legacy normal pity even when premium history replaces older normal rolls', () => {
    const definitions = futureContent(), save = unlocked(definitions);
    delete save.ssrPity;
    save.history = [0, 1, 2, 3].map(index => ({ id: `legacy-${index}`, text: `召喚：${index === 3 ? 'SSR' : 'R'} legacy` }));
    const before = gachaPity(save);
    const next = applyCommand(save, { type: 'drawXR', count: 10 }, definitions);
    expect(gachaPity(next)).toBe(before); expect(next.ssrPity).toBe(3); expect(next.drawCount).toBe(save.drawCount);
  });
  it('saves ten premium draws atomically, matches sequential draws and validates result currency', () => {
    const definitions = futureContent(), save = unlocked(definitions);
    const batch = applyCommand(save, { type: 'drawXR', count: 10 }, definitions);
    let singles = save;
    const results = [];
    for (let index = 0; index < 10; index++) { singles = applyCommand(singles, { type: 'drawXR' }, definitions); results.push(singles.lastGachaResult!); }
    expect(batch.lastGachaResults).toEqual(results); expect(batch.astralStones).toBe(singles.astralStones); expect(batch.seed).toBe(singles.seed); expect(batch.revision).toBe(save.revision + 1);
    assertSaveCompatibility(JSON.parse(JSON.stringify(batch)), definitions);
    const invalid = structuredClone(batch); invalid.lastGachaResults![0].currency = 'stones';
    expect(() => assertValidSave(invalid)).toThrow('結果');
    save.astralStones = 9; const before = structuredClone(save);
    expect(() => applyCommand(save, { type: 'drawXR', count: 10 }, definitions)).toThrow('不足'); expect(save).toEqual(before);
  });
});
