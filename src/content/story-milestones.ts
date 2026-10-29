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
        "text": "椅子を寄せると、彼女はポットを持ち替えた。\n私の茶碗から先に満たして、それから自分の分を注ぐ。狭くなった机の端で、二人の肘が触れた。"
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
        "text": "帰るとき、彼女は椅子を片づけなかった。\n「そこが、あなたの席だから」。私は空の皿を鞄へしまい、明日の分の包み紙を一枚、机に残した。"
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
        "text": "診療室から戻ると、彼女は炉の設計図を裏返した。\n折り目の奥から、朱で囲まれた頁を探し出す。いつもの記録より、その紙だけが薄く擦り切れていた。"
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
        "text": "「おかえり」。聞こえたのは、私の声だった。\n続いて、あの午後の彼女の返事が流れた。茶碗を机へ置く音まで、記憶の中と同じ間で繰り返された。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "扉の前で、鍵を握り直した。\n炉を止めたら、この返事も聞けなくなる。紙の端に書いた停止の手順を、親指で隠した。",
        "shade": "dark"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "「明日には、止める」。誰にも届かない声で言った。\n鍵は使わなかった。窓の灯を背に歩き出しても、手帳の中の薄い紙だけが、指に残っている気がした。",
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
        "text": "星図の余白には、皆が書いた名前が並んでいた。\nセリスの指だけが、封印を解く持ち場の上に残っている。剣のひびを隠すように、もう片方の手が柄を握った。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "セリス",
        "text": "もし、合図が来なかったら。\nそのときは、私だけがここに残れば――"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "リオラ",
        "text": "残る順番を決める話じゃない。私は、避難する者を連れて戻る。\n道が塞がったら盾を立てる。それより先の返事まで、私の代わりに決めるな。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "エレイン",
        "text": "療養室は、私が。歩けない人は順に運びます。\n花を持って帰る約束は、その後です。だから、少し待っていてくださいね。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "私",
        "text": "数が合わなければ、中断の合図を出す。\n私が見ていない人を、戻ったことにはしない。セリス、呼ぶまで待っていて。"
      },
      {
        "backgroundId": "cathedral",
        "text": "セリスは頷きかけ、一度だけ唇を結んだ。\n「……呼んでね」。自分の名前から指を退けると、その下にノエルの書いた水門の印が見えた。まだ誰も動いていない。それでも、皆の持ち場が地図の上に残った。"
      }
    ]
  }
];
