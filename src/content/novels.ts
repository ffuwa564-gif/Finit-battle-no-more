import { zakuroEpilogue } from './zakuro';
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
    {"backgroundId": "novel-awakening-garden", "speaker": "庭園の女", "text": "ここで生き延びるなら、まずはギルドに入りなさい。\n仕事を受けて、誰かと旅をするの。一人で歩ける街ではないわ。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "私", "text": "……あなたは、一緒に来ないの？"},
    {"backgroundId": "novel-awakening-garden", "speaker": "庭園の女", "text": "私はここで、世界の可能性を探るの。\n街で何が起きているのかは、あなたの言葉で聞かせてちょうだい。"},
    {"backgroundId": "novel-awakening-garden", "text": "彼女が名を呼ぶと、銀の盾を背負った女性が木陰から進み出た。\n私を一瞥し、すぐに庭園の女の前へ膝をつく。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "庭園の女", "text": "リオラ。あなたに頼むわ。\nこの子をギルドへ連れていって。仕事の選び方も、帰ってくる術も、教えてあげて。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "リオラ", "text": "仰せのままに。\nあなたの望まれることなら、何なりと。"},
    {"backgroundId": "novel-awakening-garden", "text": "私に向けられた声とは、温度が違った。\nリオラは、ただあの人だけを見ていた。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "私", "text": "……私のために、そこまでしなくても。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "リオラ", "text": "勘違いするな。あの方に命じられたからだ。\n私はリオラ。道では私の後ろを歩け。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "庭園の女", "text": "それで。あなたは、何を望むの？"},
    {"backgroundId": "novel-awakening-garden", "text": "分からない。\n私の答えに、彼女は困った顔をせずに笑った。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "庭園の女", "text": "なら、まずは帰っていらっしゃい。\nギルドで居場所を作って、旅をして。話の続きは、それからよ。"},
    {"backgroundId": "novel-awakening-garden", "text": "泉に、朝の来ない街が映った。\n水鏡へ踏み出す直前、リオラは一度だけ振り返った。その視線の先に、私はいなかった。"},
  ],
};
/** Returns to the garden develop the observer and the protagonist between chapters. */
const chapterReturns: Record<number, NovelSceneDef['pages']> = {
  "1": [
    {
      "backgroundId": "novel-awakening-garden",
      "text": "ギルドに踏破の記録を預け、水鏡を渡って庭園へ戻る。\n街で託された鉢を抱えた私の隣で、リオラは身なりを整えた。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "庭園の女",
      "text": "おかえり。リオラ、ご苦労さま。\nあなたはどうだった？ ひどい世界だった？"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "私",
      "text": "……優しい人たちがいた。\n待っているものを、誰も捨てられないみたいだった。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "庭園の女",
      "text": "そう。あなたは、そこを見たのね。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "リオラ",
      "text": "ご指示のとおり、ギルドへの登録と聖域の調査を終えました。\n次も、どうか私にお命じください。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "庭園の女が頷くと、リオラの張りつめた肩が下りた。\n旅の間、私に見せることのなかった顔だった。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "私",
      "text": "街へ戻る。\nこの芽を届ける相手に、会ってみたい。ギルドにも、次の仕事を聞いてくる。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "庭園の女",
      "text": "いいわ。庭園の祈りは街の外へも届くの。\n旅に力を貸してくれる女神たちも、迎えてあげて。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "リオラは私の手の包帯を見て、新しい布を置いた。\n「傷を放っておくと、次の仕事に差し支える」。それだけ言って、またあの人へ向き直る。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "手帳には、初仕事を終えたと書いた。\n私のことを知ろうともしない同行者と、明日も同じ道を歩く。そのことは、書かなかった。"
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
      ...(chapter.number === 4 ? zakuroEpilogue : chapterReturns[chapter.number] ?? []),
    ] }];
  });
}
