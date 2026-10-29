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
        "text": "そこだと、鉢を動かさないと顔が見えない。\n隣にしてくれる？ 今日はもう、あれを持ち上げたくないの。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "椅子を寄せると、彼女はポットを持ち上げた。\n私の茶碗に先に注ぎ、それから自分の分を。並んで座った机の端で、二人の肘が触れた。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "speaker": "荊の魔女",
        "text": "私のには砂糖、いらない。お菓子が甘かったから。\n……食べ切れないと思ったのに、二人だとなくなるのね。"
      },
      {
        "backgroundId": "thorn-witch-art",
        "speaker": "荊の魔女",
        "text": "明日は木の実のを焼こうかな。まだ残ってるから。\nでも、今日みたいに起きられるかは分からない。焼けなかったら、お茶だけでもいい？"
      },
      {
        "backgroundId": "thorn-witch-art",
        "text": "「お茶だけでも、来るよ」\nそう答えてから、二人で茶碗を拭いた。彼女が食べこぼしを集め、私は空の皿を布に包む。帰るとき、並べた椅子はそのままにした。"
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
        "text": "皆が星図の前へ集まると、ノエルは帰還名簿と水路の図を並べた。\nセリスは封印を解く持ち場に自分の名を書く。ノエルはセリスの退路を書き入れかけたが、同じ通路を避難の列も使うと分かって、筆を止めた。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "セリス",
        "text": "根が迫ってきても、合図が来るまで待つの？\nこっちからは、避難が終わったか見えない。合図が遅れているだけなら、先に始めるわけにはいかない？"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "リオラ",
        "text": "合図が届かなければ、私が戻って知らせる。\nだが、避難する列を途中で放り出すことはできない。すぐに来いと言われても、約束はできん。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "エレイン",
        "text": "療養室の人たちは、一度には運べません。戻って、もう一度連れてくることになります。\nセリス、途中で封印を解かれると困ります。最後の人を運び終わるまで、待ってください。"
      },
      {
        "backgroundId": "cathedral",
        "speaker": "私",
        "text": "私が人数を確かめる。一人でも足りなければ、中断の合図を出す。\n待たせている間、そっちがどうなっているかは分からないけど……確かめないまま、始めていいとは言えない。"
      },
      {
        "backgroundId": "cathedral",
        "text": "セリスは返事をせず、剣の柄を握り直した。\nノエルが図を引き寄せる。「ここで避難の列と合流するなら……」。セリスも覗き込んだ。セリスが水門まで戻る道は、まだ決まっていなかった。"
      }
    ]
  }
];
