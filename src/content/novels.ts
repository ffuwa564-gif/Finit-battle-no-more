import { zakuroEpilogue } from './zakuro';
import type { ChapterDef, DungeonDef, NovelSceneDef } from '../domain/types';

export const openingNovel: NovelSceneDef = {
  id: 'opening-desire-gate', title: '序章 ― 欲望の扉、その向こう', trigger: { kind: 'opening' },
  pages: [
    { backgroundId: 'novel-desire-gate', text: '扉の前で、私はまだ息をしていた。', shade: 'dark' },
    { backgroundId: 'novel-desire-gate', text: '世界にひとつだけの「欲望の扉」。\nそこへ行けば、どんな願いも叶う。私はそう聞かされていた。' },
    { backgroundId: 'novel-desire-gate', text: '愛されたい。取り戻したい。許されたい。\n少女たちの叫ぶ声が、扉の前に重なっていた。' },
    { backgroundId: 'novel-desire-gate', text: '誰かが扉へ走り、別の少女がその腕を掴んだ。\n次に見えたのは、振り上げられた刃だった。' },
    { backgroundId: 'novel-desire-gate', speaker: '私', text: '私には、願うものなんてなかった。\nただ、この世界にいることが苦しかった。' },
    { backgroundId: 'novel-desire-gate', text: '逃げようとして押し戻され、倒れた誰かにつまずいた。\n立ち上がったとき、目の前に扉があった。' },
    { backgroundId: 'novel-desire-gate', text: 'やがて、声が途絶えた。\nあの争いで生き残ったのは、私ひとりだった。', shade: 'dark' },
    { backgroundId: 'novel-desire-gate', text: '扉の向こうを見ることもなく、私は目を閉じた。', shade: 'black' },
    { backgroundId: 'novel-awakening-garden', text: '目を開けると、見知らぬ庭園にいた。\n白い花。水音。肌に触れる、柔らかな風。' },
    { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: 'あら、やっとお目覚め？\nお寝坊さんね。' },
    { backgroundId: 'novel-awakening-garden', speaker: '私', text: '……ここは、どこ？\nあなたは……。' },
    { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: '私は、世界の可能性を探っているの。\nあなたをここへ運んだのも、そのためよ。' },
    { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: 'あなた、なかなか珍しいわね。\n気に入ったわ。' },
    { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: '仕方ないから、こき使ってあげるわね。' },
    { backgroundId: 'novel-awakening-garden', text: '起き上がろうとすると、腕に力が入らなかった。\n女は私の背を支えたまま、さっきまでと変わらない調子で話し続けた。' },
    {"backgroundId": "novel-awakening-garden", "speaker": "庭園の女", "text": "ここで生き延びるなら、まずはギルドに入りなさい。\nあの街では、帰ってきた者が次の道を教えるの。仕事を受けて、誰かと歩くことから覚えなさい。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "私", "text": "……あなたは、一緒に来ないの？"},
    {"backgroundId": "novel-awakening-garden", "speaker": "庭園の女", "text": "今は、ここで観測を続けたいの。\nあなたは街を見てきなさい。報告だけでなく、あなたがどう思ったかも聞かせてちょうだい。"},
    {"backgroundId": "novel-awakening-garden", "text": "彼女が名を呼ぶと、銀の盾を背負った少女が木陰から進み出た。\n私と同じ、ひとりの少女。けれど彼女は、私を一瞥しただけで庭園の女の前へ膝をついた。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "庭園の女", "text": "リオラ。あなたに頼むわ。\nこの子をギルドへ連れていって。仕事の選び方も、帰ってくる術も、教えてあげて。"},
    {"backgroundId": "novel-awakening-garden", "speaker": "リオラ", "text": "仰せのままに。\nあなたの望まれることなら、何なりと。"},
    {"backgroundId": "novel-awakening-garden", "text": "リオラは私に背を向けたまま、女の次の言葉を待っていた。\n膝をついた姿勢も崩さず、肩にかかった盾の紐を握っている。"},
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
      "text": "ギルドに踏破の記録を預け、水鏡を渡った。\nリオラは泥のついた袖を払い、盾の紐を直す。私の腕には、街で託された小さな鉢があった。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "庭園の女",
      "text": "おかえり。リオラ、ご苦労さま。\nあなたはどうだった？ ひどい世界だった？"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "私",
      "text": "……優しい人たちがいた。\n春が来るかも分からないのに、花を守っていた。この芽も、待っている人に届けるんだ。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "庭園の女",
      "text": "そう。その芽、しばらく預けていかない？\n枯れた庭で、それだけが芽吹いた理由を調べたいの。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "リオラ",
      "text": "ご指示のとおり、ギルドへの登録と聖域の調査を終えました。\n次も、どうか私にお命じください。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "庭園の女が頷くと、リオラはようやく盾の紐から手を離した。\n離してからも、指は曲がったままだった。私の包帯を替えるときには、あんなに手早く動いていたのに。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "speaker": "私",
      "text": "……この芽を待っている人がいる。先に、届けてくる。\nギルドにも、次の仕事を聞いてくるよ。"
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
      "text": "手帳には、初仕事を終えたと書いた。\n鉢を抱え直すと、リオラが黙って荷紐を締めてくれた。明日も同じ道を歩くことだけは、もう決まっていた。"
    }
  ],
  "2": [
    {
      "backgroundId": "cathedral",
      "text": "庭園へ戻る前、リオラが療養室の廊下で報告書を膝に置いた。\n封をする指が止まる。「……おまえの話を、先に聞く」。私は二つの茶碗を抱えたまま、隣の椅子に座った。"
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
      "text": "回路図は調べたいわ。ただ、どの言葉にどう反応したかは、会話の記録と照らし合わせないと分からない。\nそこを伏せるなら、調べきれない部分は残るわ。それでも、いい？",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "炉の回路図と計測値を渡した。会話の写しも取り出すと、リオラがその上に報告書を置いた。\n「あの人に、渡していいか聞いていないだろう」。私の声も書き留めてある。けれど、私だけでは決められない。写しを鞄へ戻すと、女は調査欄を空けたまま、回路図を広げた。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "彼女は「今夜、止めよう」って、私に鍵を預けた。\nそれなのに私は、「明日には止める」って言って帰った。止めてほしいと言われたのに、炉から聞こえるあの午後の声を、まだ聞いていたかった。",
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
      "text": "壊れた礼拝堂の床を、朝の光がゆっくり渡った。\nセリスは剣を鞘に戻す。白霧の狼の影が、初めて扉の外へ伸びていた。"
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
      "backgroundId": "cathedral",
      "text": "同じ朝、療養室では、魔女が栽培ノートを広げていた。\nお茶を運んできたエレインに、棚の図を見せる。「温室の鉢、誰か見に行ってる？ 枯れていても捨てないでほしいの。根を見たいから」\n「まだ確かめていません。今日は私が行けるか、まだ分からなくて」エレインの盆には、ほかの部屋へ運ぶ茶碗も載っていた。"
    },
    {
      "backgroundId": "cathedral",
      "text": "「全部じゃなくて、この段のだけ。土が違うの」\n魔女が図を指す。エレインは「伝言はします。どの鉢か分かるように、もう少し教えてください」と身を寄せたが、廊下から呼ばれて顔を上げた。\n「あとで伺います」。盆を持って出ていく背を見送り、魔女はノートに棚の位置を書き足した。まだ鉢の様子は分からないままだった。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "庭園へ戻ると、女は卓に残していた茶碗を私の前へ滑らせた。「それで。あなたは、何を望むの？」\n「あの人に会いに行きたい」\n茶碗の欠けを指でなぞった。二つ揃えて持っていけば喜ぶのか。それさえ、今の私には分からなかった。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "行ってらっしゃい。\nあの人に会うなら、会話の記録を調べたいことも伝えて。あなたが言いにくいなら、私から説明するわ。",
      "speaker": "庭園の女"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "すぐには頷けなかった。女はそのまま待っていたが、私が答えないのを見て、回路図へ目を戻した。\n「まずは、会ってくる」。帰る間際にそれだけ言うと、「ええ」と返ってきた。説明を頼むかどうかは、決めないまま庭園を出た。"
    },
    {
      "backgroundId": "cathedral",
      "text": "療養室の前で、私は二つの茶碗を持ち直した。\n手帳には「砂糖なし」とある。茶碗を買った店の名もあるのに、そこまでの道は思い出せない。今日は砂糖も一包み持ってきた。中から、私の名を呼ぶ声はしない。"
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
