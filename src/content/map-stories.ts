import type { NovelSceneDef } from '../domain/types';

/** Optional field encounters: unlocks follow canon progress, never auto-play on claim. */
export const mapStories: NovelSceneDef[] = [
  {
    "id": "map-counted-footsteps",
    "title": "数え直す足音",
    "trigger": {
      "kind": "map",
      "dungeonId": "silent-cathedral"
    },
    "mapEncounter": {
      "x": 0.37,
      "y": 0.47,
      "characterId": "liora",
      "teaser": "門の外に、仲間たちの帰りの足跡が重なっている。",
      "leadDungeonId": "chapel-approach"
    },
    "pages": [
      {
        "backgroundId": "world-map",
        "text": "聖堂の外で、狼が足を止めた。泥には細い足跡が幾重にも重なっている。聖堂から戻ってきた仲間たちの足跡だ。"
      },
      {
        "backgroundId": "liora-art",
        "text": "五人。それと、狼。\n戻るときも、同じ数だ。",
        "speaker": "リオラ"
      },
      {
        "backgroundId": "seris-art",
        "text": "数えるなら、名前で呼んでくれない？\n振り向かなかったら、もう一度呼んで。",
        "speaker": "セリス"
      },
      {
        "backgroundId": "liora-art",
        "text": "リオラは報告書を開いた。人数を書く欄の端に、小さく「セリス」と書き足す。"
      },
      {
        "backgroundId": "liora-art",
        "text": "私の名前も、そこに書くの？",
        "speaker": "私"
      },
      {
        "backgroundId": "liora-art",
        "text": "呼んでほしい名を教えてくれ。\n歩きながらでいい。参道へ行くぞ。",
        "speaker": "リオラ"
      }
    ]
  },
  {
    "id": "map-erased-spring",
    "title": "消された泉",
    "trigger": {
      "kind": "map",
      "dungeonId": "bell-stairs"
    },
    "mapEncounter": {
      "x": 0.46,
      "y": 0.57,
      "characterId": "noelle",
      "teaser": "削られた地図に、濡れた指の跡がある。",
      "leadDungeonId": "moon-garden"
    },
    "pages": [
      {
        "backgroundId": "world-map",
        "text": "拾った地図を広げると、泉があったはずの場所だけ紙が薄かった。ノエルは光に透かし、すぐに裏返した。"
      },
      {
        "backgroundId": "noelle-art",
        "text": "消した跡の上に、調査済みの印がある。\n消したあとで、誰かがここを歩いてる。",
        "speaker": "ノエル"
      },
      {
        "backgroundId": "liora-art",
        "text": "報告には、泉の記載がない。",
        "speaker": "リオラ"
      },
      {
        "backgroundId": "noelle-art",
        "text": "だから、いきなり水音を追わないで。\n庭の入口なら、紙に残った道を確かめられる。",
        "speaker": "ノエル"
      },
      {
        "backgroundId": "noelle-art",
        "text": "誰かが危険だから消したのか、来てほしくなくて消したのか。",
        "speaker": "私"
      },
      {
        "backgroundId": "noelle-art",
        "text": "ノエルは答えず、月翅の庭を鉛筆で囲んだ。私の手帳には、先ほど見た足跡の向きも残しておいた。"
      }
    ]
  },
  {
    "id": "map-two-names",
    "title": "呼ばれなかった名前",
    "trigger": {
      "kind": "map",
      "dungeonId": "memory-grafting"
    },
    "mapEncounter": {
      "x": 0.65,
      "y": 0.66,
      "characterId": "elaine",
      "teaser": "療養室の戸口で、呼び名の違う札が揺れている。",
      "leadDungeonId": "closed-consultation"
    },
    "pages": [
      {
        "backgroundId": "elaine-art",
        "text": "エレインは、療養室から預かった二枚の札を重ねた。似た筆跡で、違う名前が書かれていた。"
      },
      {
        "backgroundId": "elaine-art",
        "text": "古い名前で呼んだときだけ、返事をするんです。\nでも、それで呼ばないでほしいとも言われました。",
        "speaker": "エレイン"
      },
      {
        "backgroundId": "seris-art",
        "text": "覚えている名前と、呼んでほしい名前は、違うんだね。",
        "speaker": "セリス"
      },
      {
        "backgroundId": "elaine-art",
        "text": "札を、新しい方だけにすれば？",
        "speaker": "私"
      },
      {
        "backgroundId": "elaine-art",
        "text": "その札では、薬の記録を見つけてもらえなくて。\n名前を残すだけでも、消すだけでも困るんです。",
        "speaker": "エレイン"
      },
      {
        "backgroundId": "elaine-art",
        "text": "彼女は二枚を別々の紐で結び、裏に同じ診療番号を書いた。「相談室で、本人にも確かめます」。札を持つ手が、ようやく止まった。"
      }
    ]
  },
  {
    "id": "map-folded-chart",
    "title": "地図を畳む手",
    "trigger": {
      "kind": "map",
      "dungeonId": "last-observatory"
    },
    "mapEncounter": {
      "x": 0.62,
      "y": 0.48,
      "characterId": "noelle",
      "teaser": "セリスが、描かれていない水門の位置を指した。",
      "leadDungeonId": "dawn-sluice"
    },
    "pages": [
      {
        "backgroundId": "world-map",
        "text": "観測所を離れる前に、ノエルが地図を広げた。セリスの指は、描かれていない水門の上で止まった。"
      },
      {
        "backgroundId": "noelle-art",
        "text": "どうして、その位置が分かるの？",
        "speaker": "ノエル"
      },
      {
        "backgroundId": "seris-art",
        "text": "分からない。ここを通ると、誰かが嫌な顔をした気がする。\n……エレイン、だったかな。",
        "speaker": "セリス"
      },
      {
        "backgroundId": "noelle-art",
        "text": "今は、私が見てくる。\n思い出せるまで、先頭を歩かなくていい。",
        "speaker": "ノエル"
      },
      {
        "backgroundId": "noelle-art",
        "text": "セリスが地図を畳もうとした。ノエルは端を押さえたまま、水門から戻る道を二本、描き足した。"
      },
      {
        "backgroundId": "noelle-art",
        "text": "入口より、帰り道の方が詳しくなったね。",
        "speaker": "私"
      },
      {
        "backgroundId": "noelle-art",
        "text": "今日は、それでいい。",
        "speaker": "ノエル"
      }
    ]
  },
  {
    "id": "map-red-cord",
    "title": "結び直された赤い紐",
    "trigger": {
      "kind": "map",
      "dungeonId": "ritual-stone-grove"
    },
    "mapEncounter": {
      "x": 0.35,
      "y": 0.68,
      "characterId": "liora",
      "teaser": "赤い紐の向こうで、行列の少女が仲間を待っている。",
      "leadDungeonId": "zakuro-procession"
    },
    "pages": [
      {
        "backgroundId": "world-map",
        "text": "倒木の陰まで下がると、鈴の音が少し遠のいた。細道を塞ぐ少女が、枝の赤い紐を結び直している。もう一人が、腕を吊った仲間を支えていた。"
      },
      {
        "backgroundId": "liora-art",
        "text": "あの人たち、もうここまで来てる。",
        "speaker": "私"
      },
      {
        "backgroundId": "liora-art",
        "text": "枝が腕に触れないように、紐で上げている。\n……こちらを見た。ここに長くは留まれない。",
        "speaker": "リオラ"
      },
      {
        "backgroundId": "liora-art",
        "text": "あんなに大勢いたのに、誰が傷ついたか分かるんだ。",
        "speaker": "私"
      },
      {
        "backgroundId": "liora-art",
        "text": "前に出た者が下がると、すぐ次が出てきた。\nさっきの戦いでもそうだった。もう一度囲まれたら、抜けるのは難しい。",
        "speaker": "リオラ"
      },
      {
        "backgroundId": "world-map",
        "text": "鈴が一度鳴り、少女たちが再び槍を構えた。リオラは盾の縁から細道を指す。私は地図をしまい、その陰へ戻った。あそこを抜けるしかない。"
      }
    ]
  },
  {
    "id": "map-return-address",
    "title": "帰り先を聞く",
    "trigger": {
      "kind": "map",
      "dungeonId": "infirmary-handover"
    },
    "mapEncounter": {
      "x": 0.34,
      "y": 0.27,
      "characterId": "elaine",
      "teaser": "配達札の「帰り先」だけが、埋まっていない。",
      "leadDungeonId": "old-return-seal"
    },
    "pages": [
      {
        "backgroundId": "elaine-art",
        "text": "薬布を届けたあとも、エレインは療養室の戸口に残っていた。帰還の名簿に添える札は、「帰り先」の欄だけ空いている。"
      },
      {
        "backgroundId": "elaine-art",
        "text": "元の庭園の名前なら、記録にあるよ。",
        "speaker": "私"
      },
      {
        "backgroundId": "elaine-art",
        "text": "でも、今夜そこへ帰りたいかは、まだ聞いていません。",
        "speaker": "エレイン"
      },
      {
        "backgroundId": "liora-art",
        "text": "……帰らないと言われたら、報告はどう書く。",
        "speaker": "リオラ"
      },
      {
        "backgroundId": "elaine-art",
        "text": "今日は療養室に泊まる。そう決まった分だけ、書けばいいと思います。",
        "speaker": "エレイン"
      },
      {
        "backgroundId": "world-map",
        "text": "リオラは札を裏返し、今夜の部屋番号を書いた。古い帰還印は、明日、本人と一緒に確かめに行くことになった。"
      }
    ]
  },
{
  "id": "map-unopened-letter",
  "title": "封をする前に",
  "trigger": {
    "kind": "map",
    "dungeonId": "register-return"
  },
  "mapEncounter": {
    "x": 0.36,
    "y": 0.22,
    "characterId": "ione",
    "teaser": "同じ人に宛てた封筒が、二通ある。",
    "leadDungeonId": "night-watch-request"
  },
  "pages": [
    {
      "backgroundId": "world-map",
      "text": "記録庫を出たところで、イオネに呼び止められた。手には、宛先の違う二通の封筒がある。どちらにも、さっき見送った少女の名が書かれていた。"
    },
    {
      "backgroundId": "ione-art",
      "speaker": "イオネ",
      "text": "庭には帰らないと聞きました。でも、ここからの便りまで断るかどうかは、聞いていなくて。"
    },
    {
      "backgroundId": "liora-art",
      "speaker": "リオラ",
      "text": "封は、まだするな。寝台まで持っていけば、起こすことになる。"
    },
    {
      "backgroundId": "world-map",
      "text": "私は、街の住所を書いた方を受け取った。もう一通は、イオネが机へ戻す。朝、少女が起きてから、どこへ届くようにするか聞くことにした。"
    },
    {
      "backgroundId": "ione-art",
      "speaker": "イオネ",
      "text": "夜番の人なら、起きた時刻が分かりますね。ついでに、祭りの当番表も届けてもらえますか。"
    },
    {
      "backgroundId": "world-map",
      "text": "封筒を当番表に挟むと、リオラが門の方へ歩き出した。私は後を追いながら、忘れないよう手帳に「朝、宛先を聞く」と書いた。"
    }
  ]
},
{
  "id": "map-cold-soup",
  "title": "交代のあとの食事",
  "trigger": {
    "kind": "map",
    "dungeonId": "watch-relay"
  },
  "mapEncounter": {
    "x": 0.69,
    "y": 0.72,
    "characterId": "neri",
    "teaser": "門を離れたネリが、空いた椅子に座れずにいる。",
    "leadDungeonId": "unlit-lantern"
  },
  "pages": [
    {
      "backgroundId": "world-map",
      "text": "交代を終えたネリは、食卓と門の間を何度も行き来していた。椅子には上着を掛けたのに、まだ腰を下ろしていない。"
    },
    {
      "backgroundId": "neri-art",
      "speaker": "ネリ",
      "text": "灯が一本、傾いてたんだ。あれだけ直してこようかな。"
    },
    {
      "backgroundId": "liora-art",
      "speaker": "リオラ",
      "text": "次の番に伝えた。直したら、こちらへ合図をするそうだ。"
    },
    {
      "backgroundId": "world-map",
      "text": "ネリは門を見たまま待っていた。やがて、通路の灯が一度だけ揺れる。それを見て、ようやく椅子に座った。"
    },
    {
      "backgroundId": "neri-art",
      "speaker": "ネリ",
      "text": "……冷めちゃったね。温め直す間に、あの灯の話でもしようか。火を入れないのが、一本あるでしょう。"
    },
    {
      "backgroundId": "world-map",
      "text": "私は供物棚へ目を向けた。火のない灯の下にも、小さな椀が置かれている。ネリは私の椀へ汁を注ぎ、今度は門を振り返らなかった。"
    }
  ]
},
{
  "id": "map-unfinished-path",
  "title": "地図に残す印",
  "trigger": {
    "kind": "map",
    "dungeonId": "stop-signal"
  },
  "mapEncounter": {
    "x": 0.43,
    "y": 0.17,
    "characterId": "ruka",
    "teaser": "ルカが、先へ続く道に引き返すための印を付けている。",
    "leadDungeonId": "unfinished-name"
  },
  "pages": [
    {
      "backgroundId": "world-map",
      "text": "結界の手前で支度を確かめていると、ルカが赤い糸を一本取り出した。道の分かれ目に結び、少し歩いてから振り返る。"
    },
    {
      "backgroundId": "ruka-art",
      "speaker": "ルカ",
      "text": "帰りは、向こうから来るでしょう。こっち側だけだと、枝に隠れて見えないんだ。"
    },
    {
      "backgroundId": "liora-art",
      "speaker": "リオラ",
      "text": "私が戻る側から確かめる。おまえは、そこにいてくれ。"
    },
    {
      "backgroundId": "world-map",
      "text": "リオラが枝の陰へ回った。合図を聞いて、ルカが糸を結ぶ位置を変える。私は二人が確かめた分かれ目を、地図へ写した。"
    },
    {
      "backgroundId": "ruka-art",
      "speaker": "ルカ",
      "text": "これなら、暗くなっても灯を向ければ見える。……袋のほつれは、戻ってからでいい？ 糸、少し残しておきたい。"
    },
    {
      "backgroundId": "world-map",
      "text": "私は袋を抱え直した。リオラが盾の紐を締め、ルカは残りの糸を巻き取る。先へ進む前に、帰り道の印が見えることを、もう一度確かめた。"
    }
  ]
}
];
