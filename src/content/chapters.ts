import type { ChapterDef, DungeonDef } from '../domain/types';

export const campaignChapters: ChapterDef[] = [
  { id: 'mistbound-sanctuary', number: 1, title: '霧に沈む聖域', subtitle: '白い足跡を辿り、眠れる庭の守り手へ。', dungeonIds: ['silent-cathedral', 'moon-garden', 'stone-fountain'], bossHint: '3ターンごとの石燐の突進に注意。大技で障壁が消える隙を狙い、かばう・回復で備えよう。' },
  { id: 'sealed-gate', number: 2, title: '閉ざされた門', subtitle: '白花の約束を拾い、錆銀の門を開く。', dungeonIds: ['veiled-cloister', 'thorn-court', 'hollow-gate'], bossHint: '3ターンごとに銀盾の重撃。大技で障壁が消える隙に攻め、回復薬を準備しよう。' },
  { id: 'promise-of-dawn', number: 3, title: '白夜の約束', subtitle: '失われた星と弔鐘の先に、夜明けの答えを。', dungeonIds: ['silver-crypt', 'ashen-library', 'last-observatory', 'pale-throne'], bossHint: '3ターンごとに弔鐘の一閃。強化解除にも注意し、かばう・障壁・回復で守ろう。' },
];
/** Stable exploration IDs and reward records are preserved. */
export function chapterRoute(stage: DungeonDef): DungeonDef {
  const ids = campaignChapters.flatMap(chapter => chapter.dungeonIds);
  const index = ids.indexOf(stage.id);
  if (index < 0) return stage;
  const chapter = campaignChapters.find(item => item.dungeonIds.includes(stage.id))!;
  const finale = chapter.dungeonIds.at(-1) === stage.id;
  const scales = [{ hp: 320, attack: 240 }, { hp: 400, attack: 240 }, { hp: 550, attack: 240 }];
  const strikes = ['石燐の突進', '銀盾の重撃', '弔鐘の一閃'];
  return { ...stage, chapterId: chapter.id, previousDungeonId: index > 0 ? ids[index - 1] : undefined,
    ...(finale ? { waves: [...stage.waves.slice(0, -1).map(wave => wave.slice(0, 2)), stage.waves.at(-1)!], bossScale: scales[chapter.number - 1], bossStrike: { every: 3, power: chapter.number === 1 ? 280 : 230, name: strikes[chapter.number - 1]! } } : {}),
  };
}
