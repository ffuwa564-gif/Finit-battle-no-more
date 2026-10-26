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
    {"backgroundId": "novel-awakening-garden", "text": "最初の仕事は、朝の来ない街よ。\n誰かの願いが、今もそこに残っているの。", "speaker": "庭園の女"},
    {"backgroundId": "novel-awakening-garden", "text": "願いが叶った後、人はどう暮らすのか。\nあなたの目で見て、私に聞かせてちょうだい。", "speaker": "庭園の女"},
    {"backgroundId": "novel-awakening-garden", "text": "……あなたは、見に行かないの？", "speaker": "私"},
    {"backgroundId": "novel-awakening-garden", "text": "見えるものと、分かることは違うのよ。\nだから、あなたの話が聞きたいの。", "speaker": "庭園の女"},
    {"backgroundId": "novel-awakening-garden", "text": "それで。あなたは、何を望むの？", "speaker": "庭園の女"},
    {"backgroundId": "novel-awakening-garden", "text": "分からない。\nそう答えると、彼女は困った顔をせずに笑った。"},
    {"backgroundId": "novel-awakening-garden", "text": "なら、分からないまま行ってらっしゃい。\n街ではセリスたちが待っているわ。帰ったら、続きを聞かせて。", "speaker": "庭園の女"},
    {"backgroundId": "novel-awakening-garden", "text": "泉に壊れた聖堂が映った。\n私は水面へ手を伸ばす。帰ってきたら何を話そう。まだ見ぬ街のことを、少しだけ考えた。"},
  ],
};
/** Returns to the garden develop the observer and the protagonist between chapters. */
const chapterReturns: Record<number, NovelSceneDef['pages']> = {
  "1": [
    {
      "backgroundId": "novel-awakening-garden",
      "text": "水鏡を渡って庭園へ戻る。\n街で預かった鉢を、私は膝に乗せた。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "おかえり。あの街はどうだった？\nひどい世界だった？",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "……優しい人たちがいた。\n待っているものを、誰も捨てられないみたいだった。",
      "speaker": "私"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "そう。あなたは、そこを見たのね。",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "願った人を責めれば、あの夜は終わるの？\n彼女は答えず、私の抱える新しい芽を見た。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "街へ戻る。\nこれを届ける相手に、会ってみたい。",
      "speaker": "私"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "いいわ。庭園の祈りは街の外へも届くの。\n旅に力を貸してくれる女神たちも、迎えてあげて。",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "観測の続き、と手帳には書いた。\nけれど私の足は、もう温室へ向いていた。"
    }
  ],
  "2": [
    {
      "backgroundId": "novel-awakening-garden",
      "text": "泉の水面に、療養室の窓が映る。\nエレインは彼女のそばに、リオラは廊下に残っていた。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "庭園へ戻っても、茶碗を置く場所が分からない。\n片方を手放すと、あの午後まで消えてしまいそうだった。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "記憶で自分を保つ炉……。\n興味深い結果ね。",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "結果って、言わないで。\nあそこには、人がいた。私たちは、暮らしていた。",
      "speaker": "私"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "……そうね。\n話せるところから、聞かせて。",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "同じ世界を見ていても、私たちはまだ違うものを見ている。\n彼女の声が静かになっても、私は頷けなかった。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "私は止められた。鍵も持っていた。\n失敗だったと認めるのが怖くて、明日まで待ってしまった。",
      "speaker": "私"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "炉を止めても、昨日は戻らない。\n彼女は私を知らない。そのことを、別の願いで塗りつぶしたくなかった。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "街へ帰る。\nあの人のいる場所を、今度は放っておきたくない。",
      "speaker": "私"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "茶碗を一つ、庭園の卓に置いた。もう一つは持っていく。\n泉の向こうで、セリスが灯を掲げて待っていた。"
    }
  ],
  "3": [
    {
      "backgroundId": "cathedral",
      "text": "壊れた礼拝堂に、朝の光が差した。\nセリスは剣を鞘に戻す。白霧の狼は、その足元で目を細めた。"
    },
    {
      "backgroundId": "cathedral",
      "text": "摘みに行きましょう。\n帰ったら、一緒にって約束でしたから。",
      "speaker": "エレイン"
    },
    {
      "backgroundId": "cathedral",
      "text": "うん。今度は、皆で帰ろう。",
      "speaker": "セリス"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "庭園の卓には、置いていった茶碗があった。\n女は中を覗かず、私の前へそっと滑らせた。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "それで。あなたは、何を望むの？",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "あの人に会いに行きたい。\n覚えていなくても、今日の話はできるかもしれない。",
      "speaker": "私"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "世界の答えには、ずいぶん小さいわね。\n……いいわ。続きを、聞かせてちょうだい。",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "欲望の扉は、今もどこかにあるのだろう。\nけれど今日、私が行きたい場所は、もう分かっていた。"
    },
    {
      "backgroundId": "cathedral",
      "text": "療養室の前で、私は二つの茶碗を持ち直した。\n中から、私の名を呼ぶ声はしない。"
    },
    {
      "backgroundId": "cathedral",
      "text": "それでも、私は扉を叩いた。"
    }
  ]
};

/** Stable milestone IDs and the first two page positions preserve existing saves. */
export function campaignNovels(chapters: ChapterDef[], dungeons: DungeonDef[]): NovelSceneDef[] {
  return chapters.flatMap(chapter => {
    const stage = dungeons.find(stage => stage.id === chapter.dungeonIds.at(-1));
    if (!stage?.narrative) return [];
    return [{ id: `chapter-${chapter.number}-epilogue`, title: `第${chapter.number}章 ― ${chapter.title}`, trigger: { kind: 'dungeon-clear' as const, dungeonId: stage.id }, pages: [
      { backgroundId: stage.artId, text: chapter.subtitle },
      { backgroundId: stage.artId, text: stage.narrative.after },
      ...(chapterReturns[chapter.number] ?? []),
    ] }];
  });
}
