import { zakuroChapter } from './zakuro';
import type { ChapterDef, DungeonDef } from '../domain/types';
import { chapterStageIds } from './campaign-stages';

export const campaignChapters: ChapterDef[] = [
  { id: 'mistbound-sanctuary', number: 1, title: '霧に沈む聖域', subtitle: 'リオラに連れられ、ギルドの初仕事へ。', dungeonIds: chapterStageIds[0]!, bossHint: '3ターンごとの先頭狙いに備えよう。溜め中に集中して大技を弱めるか、防御でしのいで攻撃後の隙を狙おう。' },
  { id: 'sealed-gate', number: 2, title: 'ふたりぶんの空席', subtitle: '温室に通い、荊の魔女と過ごす日々。', dungeonIds: chapterStageIds[1]!, bossHint: '先頭狙いの大技に注意。護衛のかばう・回復を崩すか、ボスへ集中して溜めを崩そう。' },
  { id: 'promise-of-dawn', number: 3, title: '白夜の約束', subtitle: '朝を取り戻すため、街に残された封印を調べる。', dungeonIds: chapterStageIds[2]!, bossHint: '護衛の回復・妨害を見て狙う相手を決めよう。大技を弱めるか防御でしのぎ、攻撃後の隙に反撃しよう。' },
  zakuroChapter,
];
/** Stable exploration IDs and reward records are preserved. */
export function chapterRoute(stage: DungeonDef): DungeonDef {
  const ids = campaignChapters.flatMap(chapter => chapter.dungeonIds);
  const index = ids.indexOf(stage.id);
  if (index < 0) return stage;
  const chapter = campaignChapters.find(item => item.dungeonIds.includes(stage.id))!;
  const finale = chapter.dungeonIds.at(-1) === stage.id;
  const scales = [{ hp: 320, attack: 240 }, { hp: 500, attack: 260 }, { hp: 650, attack: 280 }];
  const strikes = ['石燐の突進', '銀盾の重撃', '弔鐘の一閃'];
  const position = chapter.dungeonIds.indexOf(stage.id);
  const introduced = chapter.number > 1 || position >= 2;
  const pressure = chapter.number > 1 || position >= 6;
  // Keep the opening two routes intact; later fights mix protection, damage and healing.
  const mobs = stage.waves.slice(0, -1).map((wave, waveIndex) => {
    if (!introduced) return wave;
    const ids = chapter.number === 1
      ? position < 5 ? ['pale-wolf', 'moon-moth', 'stone-drake'] : ['pale-wolf', 'moon-moth', 'veil-priestess']
      : chapter.number === 2
        ? (position + waveIndex) % 2 ? ['hollow-keeper', 'veil-priestess', 'pale-wolf'] : ['stone-drake', 'thorn-witch', 'moon-moth']
        : ['hollow-keeper', 'veil-priestess', 'thorn-witch', (position + waveIndex) % 2 ? 'moon-moth' : 'pale-wolf'];
    return ids.map(characterId => ({ characterId }));
  });
  const boss = stage.waves.at(-1)!;
  const escorts = chapter.number < 2 ? [] : finale ? ['hollow-keeper', 'veil-priestess'] : chapter.number === 2 ? ['veil-priestess'] : ['veil-priestess', 'thorn-witch'];
  const bossWave = [...boss, ...escorts.map(characterId => ({ characterId }))];
  const scale = finale ? scales[chapter.number - 1] : chapter.number === 2 ? { hp: 360, attack: 180 } : chapter.number >= 3 ? { hp: 500, attack: 230 } : { hp: 300, attack: 140 };
  const strike = pressure ? {
    every: 3, power: finale ? chapter.number === 1 ? 280 : 230 : chapter.number === 1 ? 180 : 210,
    name: finale ? strikes[chapter.number - 1]! : '封域の一撃', target: 'pilot' as const,
    windup: { breakPercent: 8, weakenedPower: 100, recoveryPercent: 25 },
  } : undefined;
  return { ...stage, chapterId: chapter.id, previousDungeonId: index > 0 ? ids[index - 1] : undefined,
    ...(stage.id === 'hollow-gate' ? { bossDialogue: { intro: '盾が、もう私の命令を聞かない……今のうちに、止めろ。', threshold: 'まだ意識はある。迷うな、炉へ行け！', defeat: '……止まったか。彼女のところへ、行ってやれ。' } } : {}),
    ...(introduced ? { waves: [...mobs, bossWave], bossScale: scale } : {}),
    ...(strike ? { bossStrike: strike } : {}),
  };
}
