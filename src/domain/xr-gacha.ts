import type { CharacterDef, CharacterRarity, Content, GameSave, XRGachaDef } from './types';

export const characterRarities: readonly CharacterRarity[] = ['R', 'SR', 'SSR', 'XR'];

/** Absence of future chapters is locked; never infer a clear from a numeric stage count. */
export function xrChapterCleared(save: Pick<GameSave, 'completedDungeonIds'>, content: Content): boolean {
  const target = content.xrGacha?.unlockChapter;
  if (!target) return false;
  for (let number = 1; number <= target; number++) {
    const chapter = content.chapters?.find(chapter => chapter.number === number);
    if (!chapter?.dungeonIds.length || chapter.dungeonIds.some(id => !content.dungeons.some(dungeon => dungeon.id === id && dungeon.published && dungeon.chapterId === chapter.id) || !save.completedDungeonIds.includes(id))) return false;
  }
  return true;
}

export function xrGachaLock(save: Pick<GameSave, 'completedDungeonIds'>, content: Content): string | undefined {
  if (!xrChapterCleared(save, content)) return '第10章クリア後に解放予定です。';
  const banner = content.xrGacha;
  if (!banner?.published) return '星晶の祈願は準備中です。';
  const pool = content.characters.filter(character => character.published && banner.characterIds.includes(character.id));
  if (characterRarities.some(rarity => banner.rates[rarity] > 0 && !pool.some(character => character.rarity === rarity))) return '星晶の祈願は準備中です。';
  return undefined;
}

/** No normal introductory guarantee or SSR pity is applied to this separate banner. */
export function pickXR(pool: CharacterDef[], banner: XRGachaDef, rarityRoll: number, characterRoll: number): CharacterDef {
  let boundary = 0;
  const rarity = characterRarities.find(rarity => {
    boundary += banner.rates[rarity] / 100;
    return rarityRoll < boundary;
  }) ?? 'XR';
  const group = pool.filter(character => character.rarity === rarity);
  if (!group.length) throw new Error('星晶の祈願は準備中です。');
  return group[Math.min(group.length - 1, Math.floor(characterRoll * group.length))]!;
}
