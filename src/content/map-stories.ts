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
      "teaser": "門の外に、戻りの足跡だけが残っている。",
      "leadDungeonId": "chapel-approach"
    },
    "pages": [
      {
        "backgroundId": "world-map",
        "text": "聖堂の外で、狼が足を止めた。泥には細い足跡が幾重にも重なっている。どれも門へ向かっていた。"
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
        "text": "……まだ聞いていない。\n歩きながらでいい。参道へ行くぞ。",
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
        "text": "彼女は二枚を別々の紐で結び、裏に薬の番号を書いた。「相談室で、本人にも確かめます」。札を持つ手が、ようやく止まった。"
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
      "teaser": "枝に残る赤い紐の結び目が、さっきと違う。",
      "leadDungeonId": "zakuro-procession"
    },
    "pages": [
      {
        "backgroundId": "world-map",
        "text": "樹海の縁まで下がって、私はようやく息を吸った。枝に結ばれた赤い紐が、さっきより高い位置へ移されている。"
      },
      {
        "backgroundId": "liora-art",
        "text": "あの人たち、もうここまで来てる。",
        "speaker": "私"
      },
      {
        "backgroundId": "liora-art",
        "text": "傷を負った子が通れるよう、枝を上げたんだ。\n追ってくるだけなら、その紐は切ればいい。",
        "speaker": "リオラ"
      },
      {
        "backgroundId": "liora-art",
        "text": "あんなに大勢いたのに、誰が傷ついたか分かるんだ。",
        "speaker": "私"
      },
      {
        "backgroundId": "liora-art",
        "text": "だから危険なんだ。\n倒れた一人を、別の一人がすぐに支える。崩れた場所を放っておかない。",
        "speaker": "リオラ"
      },
      {
        "backgroundId": "world-map",
        "text": "遠くで鈴が一度鳴った。リオラは地図の細道に線を引く。私たちは、塞がれる前に次の退路を確かめた。"
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
        "text": "配達を終えても、エレインは戸口に残っていた。返却する札の「帰り先」だけが空いている。"
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
  }
];
