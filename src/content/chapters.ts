import { zakuroChapter } from './zakuro';
import type { ChapterDef, DungeonDef } from '../domain/types';
import { chapterStageIds } from './campaign-stages';

export const campaignChapters: ChapterDef[] = [
  { id: 'mistbound-sanctuary', number: 1, title: '霧に沈む聖域', subtitle: 'リオラに連れられ、ギルドの初仕事へ。', dungeonIds: chapterStageIds[0]!, bossHint: '3ターンごとの石燐の突進に注意。大技で障壁が消える隙を狙い、かばう・回復で備えよう。' },
  { id: 'sealed-gate', number: 2, title: 'ふたりぶんの空席', subtitle: '温室に通い、荊の魔女と過ごす日々。', dungeonIds: chapterStageIds[1]!, bossHint: '3ターンごとに銀盾の重撃。大技で障壁が消える隙に攻め、回復薬を準備しよう。' },
  { id: 'promise-of-dawn', number: 3, title: '白夜の約束', subtitle: '朝を取り戻すため、街に残された封印を調べる。', dungeonIds: chapterStageIds[2]!, bossHint: '3ターンごとに弔鐘の一閃。強化解除にも注意し、かばう・障壁・回復で守ろう。' },
  zakuroChapter,
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
    ...(stage.id === 'hollow-gate' ? { bossDialogue: { intro: '盾が、もう私の命令を聞かない……今のうちに、止めろ。', threshold: 'まだ意識はある。迷うな、炉へ行け！', defeat: '……止まったか。彼女のところへ、行ってやれ。' } } : {}),
    ...(finale ? { waves: [...stage.waves.slice(0, -1).map(wave => wave.slice(0, 2)), stage.waves.at(-1)!], bossScale: scales[chapter.number - 1], bossStrike: { every: 3, power: chapter.number === 1 ? 280 : 230, name: strikes[chapter.number - 1]! } } : {}),
  };
}
