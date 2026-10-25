# 覚醒後ルネット：Runwayアニメーションの見本

2026-10-25に生成した「星時計・ルネット」の記録。4秒の試作をユーザーが確認し、「めちゃいい」と評価。そのプロンプトの時間指定だけを8秒へ変更して完成版を生成した。別のキャラクターへ応用する際も、参照原画と動かしたい箇所に合わせて調整する。同じプロンプトでも生成結果は変わる。

## 生成条件

| 項目 | 設定 |
| --- | --- |
| サービス | Runway |
| モデルID | `seedance-2` |
| 入力方式 | Image-to-video：既存原画を開始フレームに指定 |
| 原画 | [`public/art/event-lunette-awakened.png`](../public/art/event-lunette-awakened.png) |
| 縦横比 | `3:4` |
| 解像度指定 | `720p` |
| 音声 | `generateAudio: false`（無音） |
| 完成版の長さ | `duration: 8` |
| 完成版タスクID | `8359e9fb-8015-4c91-8232-8a937424eab2` |
| 4秒試作タスクID | `436732db-a57c-433a-9760-ac571574e5c5` |

シードは指定していない。参照画像の一時的な署名付きURLは保存せず、リポジトリ内の原画を正本とする。

## 実際に使用したプロンプト全文（8秒版）

以下が生成時に送信した英語プロンプト。4秒試作では末尾の `over eight seconds` が `over four seconds` で、それ以外の本文は同一。

```text
A single locked-off shot animating this exact detailed 2D anime illustration. The lavender-haired girl maintains her raised-key pose and eye contact with the viewer. She makes one clearly visible small playful head tilt toward her lowered hand, blinks once, and gives a slightly wider mischievous smile. Her short hair tips and sleeve ribbons follow the tilt with gentle secondary movement. Her raised hand keeps a firm steady grip on the gold key, with the key retaining its exact shape. The two airborne clockwork rabbits gently bob up and down in place. The seated foreground rabbits remain seated. Preserve the full-body composition, face, costume ornaments, rabbit designs, intricate observatory background and drawn illustration style throughout. Keep her entire head, key and boots inside the frame. Camera stays completely stationary, all feet stay in their original places. One restrained readable character gesture over eight seconds, continuous shot.
```

## 見本として押さえる点

- カメラを固定し、元絵の顔・衣装・背景・全身構図を保つよう指定する。
- 主動作は小さな首の傾き・瞬き・笑顔に絞り、髪先とリボンには追従する動きを指定する。
- 持ち物を握る手と鍵の形、足の位置を保つよう指定する。
- 浮遊ウサギは小さく上下させ、座っているウサギは座ったままにする。
- 最初に4秒で試し、出来を確認してから8秒へ進めた。長さの変更でも再生成されるため、完成版も確認する。

この8秒版プロンプトは開始・終了フレームの一致を指定していない。当初はそのままループ再生していたが、その後の依頼で約2秒の復帰動作を追加した。[ループ補間の記録](lunette-loop-bridge.md)を参照。

## ループ再生で分かった課題

生成後、ユーザーから「ループしたときに違和感がある」との報告があった。当初は修正不要との指示だったため、その時点では動画をそのまま採用した。以下は当初の問題と原因の記録であり、その後の依頼で[補間動画を追加](lunette-loop-bridge.md)している。

### 確認できたこと

- 今回の指示は首を傾けて瞬きし、笑顔になる動きで、最後に元の姿勢へ戻ることや、開始・終了フレームを一致させることは指定していない。
- 8秒版の連続フレームでは、冒頭で上げていた鍵を持つ腕が途中で下がる。元のポーズを保つ指示があっても、生成結果が完全に従うとは限らない。
- ゲームの共通プレイヤーは動画を通常の順方向でループ再生する。末尾から冒頭へ戻る際の姿勢や動きのつながりを自動で補正する処理はない。

### 原因の見立て

主因は、末尾の姿勢と冒頭の姿勢がつながらず、再生が戻る瞬間に腕・首・表情などが飛んで見えることと考えられる。髪・ウサギ・光の位置や、境界での動く向き・速度の違いも違和感を強める可能性があるが、各要素の寄与を個別に測定したわけではない。固定カメラは構図の変化を抑えるもので、ループの連続性までは保証しない。

### 次回の制作方針（未検証）

- ループ用途なら、生成時から「小さな仕草の後に元の姿勢へ戻る」周期的な動きとして設計する。
- 開始と終了で、構図・手足・持ち物・表情・周囲の物体の位置を合わせる。位置だけでなく動く向きと速度もつながるようにする。
- 対応モデルでは終了フレームの指定も検討する。ただし、同じ絵を指定するだけで自然な継ぎ目が保証されるわけではない。
- 短い試作でも数回繰り返して見て、動画単体の自然さとループ境界の自然さをそれぞれ確認する。

上記は当初記録した未検証の方針。後日の補間では、元動画の末尾・冒頭フレームを指定して復帰動作を別途生成した。この8秒版のプロンプト本文や元の演技は変更していない。

## ゲームに組み込んだファイル

- 全身用：[`public/video/lunette-awakened-loop.mp4`](../public/video/lunette-awakened-loop.mp4)（720×960・24fps）
- 顔枠用：[`public/video/lunette-awakened-portrait-loop.mp4`](../public/video/lunette-awakened-portrait-loop.mp4)（320×480・18fps）

現在の両ファイルは、8秒版に約2秒の復帰動作を連結して書き出した無音のH.264 MP4。初回の8秒版は[Git履歴](https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/cf7da7a6347ab7c5858908e76655882c276da5cf/public/video/lunette-awakened.mp4)に保持している。表示・フォールバックの仕様は[時計庭のうさぎ姫](lunette-event.md#原画と表示)を参照。
