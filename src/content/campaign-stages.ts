import type { DungeonDef } from '../domain/types';

/** Narrative is presented before departure and after victory; it never changes combat saves. */
const route = [
  {
    "id": "silent-cathedral",
    "name": "忘却の聖堂",
    "narrative": {
      "before": "朝の来ない街に着いた。白霧の狼が、壊れた礼拝堂を振り返っている。",
      "after": "祭壇には新しい足跡があった。誰かが、今もこの街で暮らしている。"
    },
    "chapter": 0,
    "position": 0
  },
  {
    "id": "chapel-approach",
    "name": "祈りの参道",
    "narrative": {
      "before": "狼の足跡を追う。消えたはずの街灯が、一つずつ灯っていく。",
      "after": "灯は人を迎えるためではない。庭の眠りを乱す者を数えていた。"
    },
    "chapter": 0,
    "position": 1
  },
  {
    "id": "bell-stairs",
    "name": "鐘楼の階段",
    "narrative": {
      "before": "鳴らない鐘の下で、古い地図を拾う。泉の位置だけが削り取られていた。",
      "after": "地図の裏に「水音を辿るな」とある。階段の先から、水音がした。"
    },
    "chapter": 0,
    "position": 2
  },
  {
    "id": "moon-garden",
    "name": "月翅の庭",
    "narrative": {
      "before": "月の蛾が、閉じた花の上を渡る。狼は庭の入口で待つことを選んだ。",
      "after": "花の根には青い石が絡んでいる。これは庭ではなく、何かを眠らせる蓋だった。"
    },
    "chapter": 0,
    "position": 3
  },
  {
    "id": "root-waterway",
    "name": "根の水路",
    "narrative": {
      "before": "水路を塞ぐ根を外す。石の奥から、ゆっくりした鼓動が聞こえる。",
      "after": "鼓動に合わせて水が引いた。泉へ向かう通路が現れる。"
    },
    "chapter": 0,
    "position": 4
  },
  {
    "id": "drowned-vestry",
    "name": "水没の祭具室",
    "narrative": {
      "before": "濡れた祭具室に、人の手で直された花瓶が並ぶ。",
      "after": "小さな竜の彫像に、花を守る誓いが刻まれていた。"
    },
    "chapter": 0,
    "position": 5
  },
  {
    "id": "blue-lantern-path",
    "name": "青灯の小径",
    "narrative": {
      "before": "青い灯を追うほど、足元の石が鱗に似てくる。",
      "after": "道そのものが、眠る竜の背を覆っていた。もう引き返すにも、その上を歩くしかない。"
    },
    "chapter": 0,
    "position": 6
  },
  {
    "id": "sealed-arbor",
    "name": "封じられた東屋",
    "narrative": {
      "before": "東屋の錠を外すと、長いあいだ閉じ込められた花の香りがした。",
      "after": "手記には「眠りが終われば庭も枯れる」とあった。守ることと止めることは、同じではない。"
    },
    "chapter": 0,
    "position": 7
  },
  {
    "id": "scale-bridge",
    "name": "石鱗の橋",
    "narrative": {
      "before": "泉へ続く橋が身じろぎする。石鱗の守り手は、侵入者の数を知っている。",
      "after": "橋を渡りきると、狼が初めて小さく吠えた。逃げろという声ではなかった。"
    },
    "chapter": 0,
    "position": 8
  },
  {
    "id": "withered-nursery",
    "name": "枯れ苗の温室",
    "narrative": {
      "before": "枯れた苗の間に、ひと鉢だけ新しい芽がある。",
      "after": "竜は庭を守ったが、次の季節を知らない。この芽を外へ運ぼう。"
    },
    "chapter": 0,
    "position": 9
  },
  {
    "id": "fountain-threshold",
    "name": "泉の前庭",
    "narrative": {
      "before": "水面に大きな影が浮く。仲間は回復薬と盾を確かめた。",
      "after": "三度目の鼓動で石鱗が開く。大きな突進の後にこそ、攻める隙がある。"
    },
    "chapter": 0,
    "position": 10
  },
  {
    "id": "stone-fountain",
    "name": "石燐の泉",
    "narrative": {
      "before": "眠りを解くため、庭の守り手と向き合う。壊すべきは竜ではなく、終わらない誓いだ。",
      "after": "竜は花を踏まないように身を伏せた。泉の先には、灯の消えない温室が見える。"
    },
    "chapter": 0,
    "position": 11
  },
  {
    "id": "veiled-cloister",
    "name": "白帳の回廊",
    "narrative": {
      "before": "回廊でエレインに道を尋ねる。彼女は、奥の温室に住む成人の女性「荊の魔女」を案じていた。",
      "after": "魔女は二十七歳だという。うつ病の療養を続けながら、枯れない花の研究をしていた。「元気なふりは、しなくていい？」"
    },
    "chapter": 1,
    "position": 0
  },
  {
    "id": "rain-glasshouse",
    "name": "雨音の温室",
    "narrative": {
      "before": "雨の日、あなたは食事を届ける。彼女は扉を少しだけ開けた。",
      "after": "「今日は会えないと思った」。黙って並んで食べた。沈黙を埋めなくても、帰れとは言われなかった。"
    },
    "chapter": 1,
    "position": 1
  },
  {
    "id": "two-teacups",
    "name": "ふたつの茶碗",
    "narrative": {
      "before": "棚に二つ目の茶碗が置かれる。調子の悪い日には、会わずに手紙だけを交換した。",
      "after": "「好きになっても、病気は治らないよ」。あなたは頷いた。彼女はその手を、初めて握った。"
    },
    "chapter": 1,
    "position": 2
  },
  {
    "id": "thorn-court",
    "name": "荊冠の中庭",
    "narrative": {
      "before": "中庭の荊をほどきながら、二人は恋人としての最初の約束をする。無理な日は、無理だと言う。",
      "after": "「あなたが帰る場所になりたい。でも、それだけの人にはなりたくない」。彼女は自分の研究机に、小さな椅子を足した。"
    },
    "chapter": 1,
    "position": 3
  },
  {
    "id": "unwritten-cradle",
    "name": "白紙の揺籠",
    "narrative": {
      "before": "古い設計図が見つかる。二人の記憶を種に、自分の意思を持つ新しい個体を育てる培養炉。彼女はそれを「私たちの家族」と呼んだ。",
      "after": "二人で安全装置を確かめ、最初の記憶を渡す。茶碗を選んだ午後。小さな核が、淡く光った。"
    },
    "chapter": 1,
    "position": 4
  },
  {
    "id": "memory-grafting",
    "name": "記憶の接ぎ木",
    "narrative": {
      "before": "核は声に反応する。でも同じ挨拶しか返さない。彼女は「まだ足りないのかな」と手帳を開く。",
      "after": "計測値は安定している。それでも、彼女は茶碗を買った店を思い出せなくなっていた。あなたも、止める理由を探すのをやめた。"
    },
    "chapter": 1,
    "position": 5
  },
  {
    "id": "closed-consultation",
    "name": "閉ざした診療室",
    "narrative": {
      "before": "診療室で、記憶の欠落は培養炉の負荷だと告げられる。療養を続け、実験を休止するよう勧められた。",
      "after": "帰り道、彼女は休むと約束した。夜、あなたは炉の灯を見た。そして扉を叩かなかった。"
    },
    "chapter": 1,
    "position": 6
  },
  {
    "id": "borrowed-lullaby",
    "name": "借りものの子守歌",
    "narrative": {
      "before": "培養槽があなたの声で彼女を呼ぶ。個体は愛情を学んだのか、それとも声を写しただけなのか。",
      "after": "彼女は泣きながら笑った。「この子は、私を忘れない」。停止レバーには、いつの間にか鍵が掛かっていた。"
    },
    "chapter": 1,
    "position": 7
  },
  {
    "id": "missing-name",
    "name": "名前の欠片",
    "narrative": {
      "before": "彼女はあなたを別の名で呼んだ。炉を止めようとすると、怯えて設計図を抱え込む。",
      "after": "「ここまで失くしたのに、何も生まれなかったことにしないで」。あなたは鍵を受け取れなかった。好きだという言葉も、もう届かない。"
    },
    "chapter": 1,
    "position": 8
  },
  {
    "id": "overwritten-room",
    "name": "上書きされた部屋",
    "narrative": {
      "before": "記録紙に同じ一日が何百回も並ぶ。炉は個体を育てず、二人の記憶を複製して自分を保っていた。",
      "after": "彼女は眠れず、場所も時間も分からなくなった。あなたが救援を呼ぶ間に、炉は街の封印まで食べ始めた。"
    },
    "chapter": 1,
    "position": 9
  },
  {
    "id": "last-safety-key",
    "name": "最後の安全鍵",
    "narrative": {
      "before": "リオラが温室を封鎖した。彼女を避難させたが、暴走した炉へ近づく者を、門の防衛機構が敵と見なす。",
      "after": "「私が盾で機構を引き受ける。その間に止めろ」。炉を止めても、奪われた記憶は戻らない。あなたは最後の鍵を握った。"
    },
    "chapter": 1,
    "position": 10
  },
  {
    "id": "hollow-gate",
    "name": "虚ろの門",
    "narrative": {
      "before": "防衛機構に操られたリオラの盾を越え、炉を止める。今度こそ、失うのが怖いという理由で遅れるわけにはいかない。",
      "after": "炉は止まった。個体は生まれず、殻があなたの声で「おかえり」と繰り返す。療養室の彼女は窓を見たまま、「どなたですか」と尋ねた。二つの茶碗を持ち帰る。翌朝、空の温室から、またあなたの声がした。"
    },
    "chapter": 1,
    "position": 11
  },
  {
    "id": "silver-crypt",
    "name": "錆銀の地下墓所",
    "narrative": {
      "before": "温室から離れても、あの声が耳に残る。セリスは何も尋ねず、地下墓所への灯を持った。",
      "after": "死者の名前には朝の日付がない。この街全体が、終われなかった日の中にいる。"
    },
    "chapter": 2,
    "position": 0
  },
  {
    "id": "nameless-graves",
    "name": "名のない墓列",
    "narrative": {
      "before": "名前の削られた墓を辿る。忘れたからといって、起きたことまで消えはしない。",
      "after": "墓標の裏には、朝を斬った剣の紋があった。セリスは長く目を閉じた。"
    },
    "chapter": 2,
    "position": 1
  },
  {
    "id": "soot-corridor",
    "name": "煤の回廊",
    "narrative": {
      "before": "煤の足跡が書庫へ続く。誰かが、燃やされた記録を拾い集めている。",
      "after": "拾った紙には、封印を解く代償が残っていた。止めていた滅びも、動き出す。"
    },
    "chapter": 2,
    "position": 2
  },
  {
    "id": "ashen-library",
    "name": "灰の書庫",
    "narrative": {
      "before": "灰の中でノエルの筆跡を探す。答えを知れば、救えるという保証はない。",
      "after": "計算は一人の犠牲を必要としていた。余白に、別の手で「本当に？」と書かれている。"
    },
    "chapter": 2,
    "position": 3
  },
  {
    "id": "unburned-letter",
    "name": "燃え残った手紙",
    "narrative": {
      "before": "一通だけ燃え残った手紙に、四人の名が並んでいた。",
      "after": "「ひとりに返さない」。書き手は、答えより先に約束を残した。"
    },
    "chapter": 2,
    "position": 4
  },
  {
    "id": "pendulum-hall",
    "name": "振子の広間",
    "narrative": {
      "before": "止まった振子を越えるたび、温室で扉を叩かなかった夜を思い出す。",
      "after": "時間を戻す装置ではなかった。振子は、止めた時間の重さを測っている。"
    },
    "chapter": 2,
    "position": 5
  },
  {
    "id": "starless-terrace",
    "name": "星なき露台",
    "narrative": {
      "before": "空に星はない。それでもノエルは、観測をやめていなかった。",
      "after": "星が消えたのではない。街の夜だけが、空から切り離されている。"
    },
    "chapter": 2,
    "position": 6
  },
  {
    "id": "erased-star-chart",
    "name": "消された星図",
    "narrative": {
      "before": "星図の消えた部分に、仲間の名を書き直す。",
      "after": "四つの名が消えずに残った。独りで支えるための式が、初めて崩れる。"
    },
    "chapter": 2,
    "position": 7
  },
  {
    "id": "last-observatory",
    "name": "終わりの天文台",
    "narrative": {
      "before": "ノエルが星図を抱えて道を塞ぐ。希望だけで封印を解くなら、ここは通せないという。",
      "after": "危険を引き受ける名を、全員が自分で書いた。彼女はようやく、鍵を差し出す。"
    },
    "chapter": 2,
    "position": 8
  },
  {
    "id": "dawn-sluice",
    "name": "薄明の水門",
    "narrative": {
      "before": "夜明けを閉じ込めた水門を開く。取り戻せないものまで戻るわけではない。",
      "after": "遠くの療養室にも、薄い光が入った。彼女があなたを思い出したという知らせは、来ない。"
    },
    "chapter": 2,
    "position": 9
  },
  {
    "id": "bell-sword-approach",
    "name": "弔剣の参道",
    "narrative": {
      "before": "リゼットが最後の道で待つ。「失う覚悟と、誰かを見捨てることを混同しないで」",
      "after": "セリスは剣を抜く。正しい結末を貰うためではなく、選んだ明日を引き受けるために。"
    },
    "chapter": 2,
    "position": 10
  },
  {
    "id": "pale-throne",
    "name": "白夜の玉座",
    "narrative": {
      "before": "弔鐘の剣姫を越え、街の朝を解き放つ。誰か一人を代償にはしない。",
      "after": "街に朝が来る。温室の椅子は空のままだった。あなたは茶碗を洗い、今日は扉を叩く。返事がなくても、そこにいることを伝えるために。"
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
