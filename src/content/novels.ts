import type { ChapterDef, DungeonDef, NovelSceneDef } from '../domain/types';

export const openingNovel: NovelSceneDef = {
  id: 'opening-desire-gate', title: '序章 ― 欲望の扉、その向こう', trigger: { kind: 'opening' },
  pages: [
    { backgroundId: 'novel-desire-gate', text: '死にたがりの世界で、私はまだ息をしていた。', shade: 'dark' },
    { backgroundId: 'novel-desire-gate', text: '世界には、たったひとつの「欲望の扉」があった。\nその向こうでは、どんな願いも叶うのだと、誰かが言った。' },
    { backgroundId: 'novel-desire-gate', text: '愛されたい。取り戻したい。許されたい。\n数多の少女が、ひとつの扉へ手を伸ばした。' },
    { backgroundId: 'novel-desire-gate', text: '願いは、別の願いを押しのけた。\n少女たちは傷つけ合い、扉の前で、互いの明日を奪っていった。' },
    { backgroundId: 'novel-desire-gate', speaker: '私', text: '私には、願うものなんてなかった。\nただ、この世界にいることが苦しかった。' },
    { backgroundId: 'novel-desire-gate', text: 'それでも争いに巻き込まれ、手を伸ばす理由さえ見つけられないまま、私は扉の前に立っていた。' },
    { backgroundId: 'novel-desire-gate', text: 'やがて、声が途絶えた。\n皮肉なことに、生還したのは、何も望まなかった私ひとりだった。', shade: 'dark' },
    { backgroundId: 'novel-desire-gate', text: '終わりを望む世界で、私は終われなかった。', shade: 'black' },
    { backgroundId: 'novel-awakening-garden', text: '目を開けると、見知らぬ庭園にいた。\n白い花。水音。肌に触れる、柔らかな風。' },
    { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: 'あら、やっとお目覚め？\nお寝坊さんね。' },
    { backgroundId: 'novel-awakening-garden', speaker: '私', text: '……ここは、どこ？\nあなたは……。' },
    { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: '私は、世界の可能性を探っているの。\nあなたをここへ運んだのも、そのためよ。' },
    { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: 'あなた、なかなか珍しいわね。\n気に入ったわ。' },
    { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: '仕方ないから、こき使ってあげるわね。' },
    { backgroundId: 'novel-awakening-garden', text: '助けてくれた相手に、振り回される。\nそんな日々が始まることを、そのときの私は、まだ知らなかった。' },
  ],
};
/** Milestone scripts reuse the existing chapter prose; add a dungeon-clear trigger for further episodes. */
export function campaignNovels(chapters: ChapterDef[], dungeons: DungeonDef[]): NovelSceneDef[] {
  return chapters.flatMap(chapter => {
    const stage = dungeons.find(stage => stage.id === chapter.dungeonIds.at(-1));
    if (!stage?.narrative) return [];
    return [{ id: `chapter-${chapter.number}-epilogue`, title: `第${chapter.number}章 ― ${chapter.title}`, trigger: { kind: 'dungeon-clear' as const, dungeonId: stage.id }, pages: [
      { backgroundId: stage.artId, text: chapter.subtitle },
      { backgroundId: stage.artId, text: stage.narrative.after },
    ] }];
  });
}
