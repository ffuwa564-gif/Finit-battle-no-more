import type { NovelSceneDef } from '../domain/types';

/** Mid-chapter scenes add time with the characters without changing exploration rewards. */
export const storyMilestones: NovelSceneDef[] = [
  {
    "id": "greenhouse-seat",
    "title": "温室の席",
    "trigger": {
      "kind": "dungeon-clear",
      "dungeonId": "thorn-court"
    },
    "pages": [
      {
        "backgroundId": "thorn-witch-art",
        "text": "雨がやんでも、温室の硝子には水滴が残っていた。\n私は二つの茶碗を拭き、椅子を机の向かいへ戻そうとした。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "speaker": "荊の魔女",
        "text": "その椅子、もう少しこっちへ。鉢の陰じゃなくて、私の隣。\n……遠いと、呼ぶのが面倒だから。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "椅子を寄せると、彼女はポットを持ち上げた。\n私の茶碗に先に注ぎ、それから自分の分を。並んで座った机の端で、二人の肘が触れた。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "speaker": "荊の魔女",
        "text": "砂糖は入れないで。お茶まで甘いと、お菓子を食べる理由がなくなるでしょう。\nあなたの分？ それは、自分で決めて。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "speaker": "荊の魔女",
        "text": "明日は、木の実の焼き菓子にする。\n焦がしたら、端っこはあなたが食べて。……約束ね。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "帰るとき、椅子を元へ戻そうとすると、彼女が背もたれを押さえた。\n「そこが、あなたの席だから」。私は空の皿を布に包んで鞄へしまい、明日のお菓子を包む紙を一枚、机に残した。"
      }
    ]
  },
  {
    "id": "tomorrows-key",
    "title": "明日の鍵",
    "trigger": {
      "kind": "dungeon-clear",
      "dungeonId": "closed-consultation"
    },
    "pages": [
      {
        "backgroundId": "thorn-witch-art",
        "text": "診療室から戻ると、彼女は炉の設計図を一枚ずつめくった。\n朱で囲まれた手順を見つけ、その頁を抜き取る。何度も開いたらしく、折り目が擦り切れていた。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "speaker": "荊の魔女",
        "text": "止め方、ここにあった。鍵を預かって。\n私、また怖いって言うかもしれない。でも、今夜は止めよう。……覚えているうちに。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "鍵を受け取り、停止の頁を自分の手帳に挟んだ。\n彼女が奥の部屋へ引き上げたあと、私は一度、外へ出た。夜、温室へ戻ると、まだ炉の灯がついていた。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "「おかえり」。聞こえたのは、私の声だった。\n続いて、あの午後の彼女の返事が流れた。茶碗が机に触れる音も、その前の短い沈黙も、覚えているとおりだった。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "炉の扉の前で、鍵を握り直した。\n止めたら、この返事も聞けなくなる。もう片方の手で手帳を開いたまま、停止の手順を親指で隠した。",
        "shade": "dark"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "「明日には、止める」\n手帳を閉じ、鍵を握ったまま温室を出た。窓の灯を背に、歩き出した。",
        "shade": "dark"
      }
    ]
  },
  {
    "id": "beyond-the-night",
    "title": "夜の外へ",
    "trigger": {
      "kind": "dungeon-clear",
      "dungeonId": "erased-star-chart"
    },
    "pages": [
      {
        "backgroundId": "cathedral",
        "text": "皆が星図の前へ集まると、ノエルは帰還名簿のセリスの名を指で押さえていた。\n「帰ってくる人数から、あなたを引くつもりはないから」。セリスはひびの入った剣の柄から手を離し、封印を解く持ち場にも自分の名を書いた。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "セリス",
        "text": "帰ってくる人の中にも、入れておいて。でも、封印を解く役目も、私にやらせて。\nもし合図が来なかったら……私だけが、ここに残れば――"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "リオラ",
        "text": "私が戻る前から、残ると決めるな。避難する者を連れて帰ってくる。\n道が塞がったら、私が盾を立てる。おまえのところまで戻れるかどうかは、私に確かめさせろ。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "エレイン",
        "text": "療養室は、私が。歩けない人は順に運びます。\n花を持って帰る約束は、その後です。だから、少し待っていてくださいね。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "私",
        "text": "一人でも足りなければ、中断の合図を出す。\n皆が着いたのを確かめてから、私が呼ぶ。セリス、それまで待っていて。"
      },
      {
        "backgroundId": "cathedral",
        "text": "セリスは頷きかけ、一度だけ唇を結んだ。\n「……呼んでね」。ノエルが名簿から指を離し、星図の水門の印を示した。皆がそこを覗き込む。セリスも、剣から手を離したまま、その輪に加わった。"
      }
    ]
  }
];
