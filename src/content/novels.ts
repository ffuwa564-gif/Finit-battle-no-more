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
      "text": "同じ朝、療養室では、エレインが台帳の「砂糖なし」を確かめていた。\n魔女は砂糖壺を引き寄せる。「今日は甘いのがいい。窓際で、自分で淹れたい」\n「まだ手が震えています。注ぐのだけは、私にさせてください」\nエレインは盆を持ったまま、返事を待った。"
    },
    {
      "backgroundId": "cathedral",
      "text": "「じゃあ、茶碗の半分までね」\n魔女が窓際の椅子を指すと、エレインは傍らの小卓へ盆を置いた。砂糖壺も、魔女の手の届くところへ。\n台帳の「砂糖なし」を消しかけたエレインに、魔女は首を振る。「それは残して。今日の分は、その下に書いて」。エレインは新しい行に日付を入れた。"
    },
    {
      "backgroundId": "novel-awakening-garden",
      "text": "庭園へ戻ると、女は卓に残していた茶碗を私の前へ滑らせた。「それで。あなたは、何を望むの？」\n「あの人に会いに行きたい」\n茶碗の欠けを指でなぞった。私を覚えていなくても、今日、何が好きかは聞けるかもしれない。"
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
