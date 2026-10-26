import type { DungeonDef } from '../domain/types';

/** Narrative is presented before departure and after victory; it never changes combat saves. */
const route = [
  {
    "id": "silent-cathedral",
    "name": "忘却の聖堂",
    "narrative": {
      "before": "庭園の女が水鏡に映した、朝の来ない街。セリスたち四人と聖堂へ向かうと、白霧の狼が壊れた礼拝堂を振り返った。",
      "after": "祭壇の白花だけが新しい。何を願って残されたのか、まだ分からない。私は旅の手帳を開いた。"
    },
    "chapter": 0,
    "position": 0
  },
  {
    "id": "chapel-approach",
    "name": "祈りの参道",
    "narrative": {
      "before": "狼の足跡を追うと、消えた街灯が一つずつ灯る。願いが叶った後の世界を見てこい。庭園の女は、そう言った。",
      "after": "リオラは灯を数えた。「帰る者の数だ。ここでは、誰も数え直さない」。迎える支度だけが、夜に残っていた。"
    },
    "chapter": 0,
    "position": 1
  },
  {
    "id": "bell-stairs",
    "name": "鐘楼の階段",
    "narrative": {
      "before": "鳴らない鐘の下で地図を拾う。泉の位置が削られている。ノエルは、消えた場所にも名前があったはずだと言う。",
      "after": "裏には「水音を辿るな」。庭園の泉と同じ音が、階段の先から聞こえた。私は帰り道より、禁じられた先を見た。"
    },
    "chapter": 0,
    "position": 2
  },
  {
    "id": "moon-garden",
    "name": "月翅の庭",
    "narrative": {
      "before": "月の蛾が閉じた花を渡る。狼は庭の入口で伏せた。セリスが名を呼ぼうとして、言葉を失った。",
      "after": "「知っている気がする。でも、思い出せない」。狼は急かさなかった。待つことだけは、忘れていないようだった。"
    },
    "chapter": 0,
    "position": 3
  },
  {
    "id": "root-waterway",
    "name": "根の水路",
    "narrative": {
      "before": "花の根に青い石が絡む。水路を開くと、石の奥の鼓動に合わせて水が引いた。庭そのものが何かを守っている。",
      "after": "エレインは根を切らず、ほどいて通した。「守りたいものがあるのでしょうね」。扉の前で争った少女たちにも、あったはずだ。"
    },
    "chapter": 0,
    "position": 4
  },
  {
    "id": "drowned-vestry",
    "name": "水没の祭具室",
    "narrative": {
      "before": "水没した祭具室には、人の手で直された花瓶が並ぶ。壊れても捨てずに使う。その暮らしだけが続いている。",
      "after": "竜の彫像に「次の春まで花を守れ」と刻まれていた。春の来ない街で、命令はまだ終わっていなかった。"
    },
    "chapter": 0,
    "position": 5
  },
  {
    "id": "blue-lantern-path",
    "name": "青灯の小径",
    "narrative": {
      "before": "泉へ近づくほど、セリスの剣のひびが熱を持つ。彼女は理由を知らない。知るのが怖いとも、言わなかった。",
      "after": "「誰も失いたくなかった」。眠る庭から声がした。誰の声か、セリスは答えなかった。"
    },
    "chapter": 0,
    "position": 6
  },
  {
    "id": "sealed-arbor",
    "name": "封じられた東屋",
    "narrative": {
      "before": "朽ちた回廊の窓に、同じ月が並ぶ。ノエルは何度目かの観測日を書き、日付の先を空白にした。",
      "after": "朝が来なければ、別れの日も来ない。そう願った人がいたのかもしれない。私は、それをまだ責められなかった。"
    },
    "chapter": 0,
    "position": 7
  },
  {
    "id": "scale-bridge",
    "name": "石鱗の橋",
    "narrative": {
      "before": "泉へ続く橋が身じろぎする。石燐の守り手は、侵入者より先に、その足元の花を見ていた。",
      "after": "狼が初めて吠えた。セリスは刃を下げる。「壊したいんじゃない。ここを通って、その先を見たいんだ」"
    },
    "chapter": 0,
    "position": 8
  },
  {
    "id": "withered-nursery",
    "name": "枯れ苗の温室",
    "narrative": {
      "before": "枯れ苗の温室に、ひと鉢だけ新しい芽がある。竜が守ってきた庭にも、まだ変わろうとするものがあった。",
      "after": "芽を届ける先は、荊の魔女の温室だという。「花を咲かせようとしている人がいるの」。エレインは鉢を包んだ。"
    },
    "chapter": 0,
    "position": 9
  },
  {
    "id": "fountain-threshold",
    "name": "泉の前庭",
    "narrative": {
      "before": "泉の前で守り手が立ち上がる。三度目の鼓動の後、石鱗が開く。リオラは盾を構え、私は鉢を抱え直した。",
      "after": "庭を守る者を倒せば、願いまで否定することになるのだろうか。セリスは「続きを渡そう」とだけ言った。"
    },
    "chapter": 0,
    "position": 10
  },
  {
    "id": "stone-fountain",
    "name": "石燐の泉",
    "narrative": {
      "before": "眠りを解くため、石燐の竜と向き合う。壊すべきは竜ではなく、春を待ったまま終われない誓いだ。",
      "after": "竜は花を踏まずに身を伏せた。泉の先には、灯の消えない温室がある。私は手帳に「優しい人たちがいた」と書いた。"
    },
    "chapter": 0,
    "position": 11
  },
  {
    "id": "veiled-cloister",
    "name": "白帳の回廊",
    "narrative": {
      "before": "芽を届けに白帳の回廊を越える。エレインに似た古い祈りの残響が道を塞ぐ。彼女は自分の声に耳を澄ませた。",
      "after": "奥の温室には、うつ病の療養を続ける二十七歳の「荊の魔女」がいた。「元気なふりは、しなくていい？」。私は鉢を差し出した。"
    },
    "chapter": 1,
    "position": 0
  },
  {
    "id": "rain-glasshouse",
    "name": "雨音の温室",
    "narrative": {
      "before": "雨の日、私は食事を届けた。彼女は扉を少しだけ開ける。世界を調べる手帳は、鞄の底にしまった。",
      "after": "「今日は会えないと思った」。並んで食べた。次に来る理由を、庭園の女へ説明する必要はなかった。"
    },
    "chapter": 1,
    "position": 1
  },
  {
    "id": "two-teacups",
    "name": "ふたつの茶碗",
    "narrative": {
      "before": "棚に二つ目の茶碗が置かれた。会えない日は手紙を交換する。私の一日にも、待ち遠しい時間ができた。",
      "after": "「好きになっても、病気は治らないよ」。私は頷いた。明日も会いたい。その小さな願いを、初めて自分のものだと思った。"
    },
    "chapter": 1,
    "position": 2
  },
  {
    "id": "thorn-court",
    "name": "荊冠の中庭",
    "narrative": {
      "before": "中庭の荊をほどき、二人は恋人として約束する。無理な日は無理だと言う。相手の返事を、勝手に決めない。",
      "after": "「あなたが帰る場所になりたい。でも、それだけの人にはなりたくない」。彼女は研究机に小さな椅子を足した。私は隣に座った。"
    },
    "chapter": 1,
    "position": 3
  },
  {
    "id": "unwritten-cradle",
    "name": "白紙の揺籠",
    "narrative": {
      "before": "二人の記憶を種に、新しい個体を育てる培養炉の設計図が見つかる。「この街でも、私たちの先へ続くものを育てられるかな」",
      "after": "茶碗を選んだ午後の記憶を渡すと、小さな核が光った。「私たちの家族」。彼女の言葉に、私も頷いていた。"
    },
    "chapter": 1,
    "position": 4
  },
  {
    "id": "memory-grafting",
    "name": "記憶の接ぎ木",
    "narrative": {
      "before": "核は声に反応するが、同じ挨拶しか返さない。「まだ足りないのかな」。彼女が手帳を開き、私も次の記憶を選んだ。",
      "after": "彼女は茶碗を買った店を忘れていた。私も約束の言葉を思い出せない。計測値は安定している。その数字に、二人とも縋った。"
    },
    "chapter": 1,
    "position": 5
  },
  {
    "id": "closed-consultation",
    "name": "閉ざした診療室",
    "narrative": {
      "before": "診療室で、記憶の欠落は炉の負荷だと告げられる。療養を続け、実験は休止するよう勧められた。帰り道、二人で休もうと決めた。",
      "after": "夜、温室に炉の灯を見た。私には止める鍵があった。失敗だったと認めるのが怖くて、私は扉を叩かなかった。"
    },
    "chapter": 1,
    "position": 6
  },
  {
    "id": "borrowed-lullaby",
    "name": "借りものの子守歌",
    "narrative": {
      "before": "培養槽が、私の声で彼女を呼ぶ。愛情を学んだのか、声を写しただけなのか。確かめる問いを、私は飲み込んだ。",
      "after": "「この子は、私を忘れない」。彼女は泣きながら笑った。停止レバーの鍵を外そうとして、私は手を止めた。"
    },
    "chapter": 1,
    "position": 7
  },
  {
    "id": "missing-name",
    "name": "名前の欠片",
    "narrative": {
      "before": "彼女は私を別の名で呼んだ。炉を止めようとすると、怯えて設計図を抱え込む。私たちが何を望んだのか、もう一緒に確かめられない。",
      "after": "「ここまで失くしたのに、何も生まれなかったことにしないで」。好きだという言葉で、次の記憶を渡す理由を作っていたのは、私も同じだった。"
    },
    "chapter": 1,
    "position": 8
  },
  {
    "id": "overwritten-room",
    "name": "上書きされた部屋",
    "narrative": {
      "before": "記録紙に同じ一日が何百回も並ぶ。炉は個体を育てず、二人の記憶を複製して自分を保っていた。",
      "after": "彼女は眠れず、時間も場所も分からなくなった。救援を呼ぶ私の背後で、炉が街の封印にまで根を伸ばしていた。"
    },
    "chapter": 1,
    "position": 9
  },
  {
    "id": "last-safety-key",
    "name": "最後の安全鍵",
    "narrative": {
      "before": "リオラが温室を封鎖し、エレインが彼女を療養室へ運ぶ。防衛機構は、停止の鍵を持つ私たちを敵と見なした。",
      "after": "「私が盾で引き受ける。その間に止めろ」。リオラの意識ごと機構が盾を奪っていく。私は最後の鍵を握り直した。"
    },
    "chapter": 1,
    "position": 10
  },
  {
    "id": "hollow-gate",
    "name": "虚ろの門",
    "narrative": {
      "before": "防衛機構に操られたリオラの盾を越え、炉へ向かう。彼女が避難した療養室にも、街の封印から伸びた根が迫っていた。",
      "after": "炉は止まった。個体は生まれず、殻が私の声で「おかえり」と繰り返す。療養室の彼女は「どなたですか」と尋ねた。二つの茶碗を抱え、私は庭園へ戻った。"
    },
    "chapter": 1,
    "position": 11
  },
  {
    "id": "silver-crypt",
    "name": "錆銀の地下墓所",
    "narrative": {
      "before": "庭園で報告できないまま、私は街へ戻った。セリスは何も尋ねず、地下墓所への灯を持った。療養室へ続く根を断つ道を探す。",
      "after": "墓の名には朝の日付がない。街全体が、終われなかった日の中にいる。「私も、似たことをしたのかもしれない」とセリスが言った。"
    },
    "chapter": 2,
    "position": 0
  },
  {
    "id": "nameless-graves",
    "name": "名のない墓列",
    "narrative": {
      "before": "名を削られた墓を辿る。炉を止めても、二人の記憶は戻らない。失くしたものを埋める答えを、ここで探してはいけない気がした。",
      "after": "墓標の裏に、セリスの剣と同じ紋があった。「誰も失いたくなかった」。庭で聞いた声を、彼女は今度は自分で口にした。"
    },
    "chapter": 2,
    "position": 1
  },
  {
    "id": "soot-corridor",
    "name": "煤の回廊",
    "narrative": {
      "before": "燃やされた記録を拾い集める。セリスは街が滅びる朝を、剣で夜から切り離した。それが人々を守った最初の夜だった。",
      "after": "封印は残された人々の記憶を継ぎ足し、夜を保っていた。培養炉は、その仕組みを小さく写したものだった。"
    },
    "chapter": 2,
    "position": 2
  },
  {
    "id": "ashen-library",
    "name": "灰の書庫",
    "narrative": {
      "before": "灰の書庫でノエルの筆跡を探す。封印を解けば、止めた滅びも動き出す。閉じ続ければ、人々は帰る理由まで忘れてしまう。",
      "after": "一人に代償を負わせる古い式の脇に、「本当に？」と書かれていた。セリス一人で決めた夜を、今度は皆で読み直す。"
    },
    "chapter": 2,
    "position": 3
  },
  {
    "id": "unburned-letter",
    "name": "燃え残った手紙",
    "narrative": {
      "before": "燃え残った手紙に、セリスを待つ仲間の名が並んでいる。白花、門の鍵、星図、鐘。帰りを待つ約束が、別々の形で残っていた。",
      "after": "エレインが、渡せなかった花のことを話した。「帰ったら、一緒に摘むはずだったんです」。私は手紙を燃やさず、持ち帰ることにした。"
    },
    "chapter": 2,
    "position": 4
  },
  {
    "id": "pendulum-hall",
    "name": "振子の広間",
    "narrative": {
      "before": "止まった振子を越えるたび、温室で扉を叩かなかった夜が戻る。願いがなければ苦しまずに済んだ、とはもう思えなかった。",
      "after": "振子は、止めた時間の重さを測っていた。戻せない時間がある。それでも療養室へ行く足まで、止める必要はなかった。"
    },
    "chapter": 2,
    "position": 5
  },
  {
    "id": "starless-terrace",
    "name": "星なき露台",
    "narrative": {
      "before": "星のない露台で、ノエルは観測を続けていた。「救える保証はない」。私は、保証が欲しくて来たのではないと答えた。",
      "after": "街の夜だけが空から切り離されている。外の星の動きを、ノエルはずっと記録していた。待つ間にも、彼女は道を探していた。"
    },
    "chapter": 2,
    "position": 6
  },
  {
    "id": "erased-star-chart",
    "name": "消された星図",
    "narrative": {
      "before": "星図の余白に、危険を知った仲間がそれぞれ自分の名を書く。私は誰かの返事を代筆せず、自分の名だけを書いた。",
      "after": "仲間と私の名が消えずに残る。独りを封印の支えにする式が崩れ、溜まった力を街の外へ逃がす水路が見えた。"
    },
    "chapter": 2,
    "position": 7
  },
  {
    "id": "last-observatory",
    "name": "終わりの天文台",
    "narrative": {
      "before": "ノエルが天文台の出口を塞ぐ。願えば救えると信じるだけでは、通せない。私たちは星図と、水路を開く順序を彼女に示した。",
      "after": "リオラは避難する者を守り、エレインは療養室へ向かう。セリスは剣のひびを引き受けた。ノエルは計算を書き足し、最後の鍵を渡した。"
    },
    "chapter": 2,
    "position": 8
  },
  {
    "id": "dawn-sluice",
    "name": "薄明の水門",
    "narrative": {
      "before": "薄明の水門を開く。外へ流れ始めたものの中に、なくした日々は見つからなかった。それでも根は、療養室から離れていく。",
      "after": "窓に薄い光が入った。彼女が私を思い出したという知らせは来ない。私は湯を沸かす時間だけを、手帳に書いた。"
    },
    "chapter": 2,
    "position": 9
  },
  {
    "id": "bell-sword-approach",
    "name": "弔剣の参道",
    "narrative": {
      "before": "リゼットが最後の道で待つ。「また、ひとりで行くつもり？」。セリスは仲間の方を見て、剣を抜いた。",
      "after": "「今度は帰る。皆と」。師の剣を越えるのは、独りで夜を引き受けた少女ではなく、帰り道を託せる剣士だった。"
    },
    "chapter": 2,
    "position": 10
  },
  {
    "id": "pale-throne",
    "name": "白夜の玉座",
    "narrative": {
      "before": "弔鐘の剣姫を越え、白夜の玉座に残る封印を解く。水路を開き、避難を確かめ、セリスの剣を支える。誰か一人を置き去りにはしない。",
      "after": "街に朝が来た。彼女の記憶は戻らず、温室の椅子は空のままだった。私は茶碗を洗う。今日は、自分の意思で療養室の扉を叩きに行く。"
    },
    "chapter": 2,
    "position": 11
  }
] as const;

export const chapterStageIds = [0, 1, 2].map(chapter => route.filter(stage => stage.chapter === chapter).map(stage => stage.id));

export function expandCampaign(originals: DungeonDef[]): DungeonDef[] {
  const enemies = [['pale-wolf', 'moon-moth', 'stone-drake'], ['veil-priestess', 'thorn-witch', 'hollow-keeper'], ['hollow-keeper', 'moon-moth', 'thorn-witch']] as const;
  return route.map(entry => {
    const existing = originals.find(stage => stage.id === entry.id);
    const pool = enemies[entry.chapter]!;
    const main = pool[entry.position % pool.length]!;
    const second = pool[(entry.position + 1) % pool.length]!;
    return { ...(existing ?? { id: entry.id, name: entry.name, subtitle: entry.narrative.before.split('。')[0]! + '。', description: entry.narrative.before, artId: 'cathedral', published: true, waves: [[{ characterId: main }, { characterId: second }, ...(entry.position % 3 === 2 ? [{ characterId: second }] : [])], [{ characterId: main, boss: true }]] }), ...(!existing && entry.chapter === 1 || entry.id === 'thorn-court' ? { artId: 'thorn-witch-art' } : {}), narrative: entry.narrative };
  });
}
