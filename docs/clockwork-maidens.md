# 機巧少女 ― 無慈悲な歯車 ―

機巧少女シリーズの最初の限定SSRは「ノクス／零式・無赦の執行者」。現在は下記のヴェスパ・ミエット・ティッカを加えた4人編成のラインナップ。ノクスは表情に乏しく、命乞いにも刃を止めない機械人形として制作する。黒髪のボブと白い一房、氷色の瞳、陶器の肌、精密な機械関節、黒・生成り・銀の軍装ドレス、下向きの長剣で識別する。

## ガチャと能力

- シリーズID：`clockwork-maidens`。限定SSRは `nox` / `vespera`、限定SRは `miette`、限定Rは `tikka`。4人は他のシリーズへ混入しない。
- 共通R/SR16体・共通SSR3体は維持する。
- 単発は石5個、10連は石50個。R80%／SR17%／SSR3%。通常SSR内はピックアップ50%／共通SSR50%を継承するため、ノクスとヴェスパの通常基準排出率は各0.75%、共通SSRは各0.5%。
- 通算2回目の一度きりの保証・90回天井はノクス／ヴェスパの均等抽選。祈願回数・天井は全シリーズ共通で、切替で保証を復活させない。重複時はSSR共通の石3個還元。
- ノクスはSSR・剣士・強さ2.5。既存の単体攻撃／貫通テンプレートと瀕死追撃リーダー効果を使用。個別の戦闘ロジックや保存形式は追加しない。
- 紹介はSSR2人を並べる。限定SR/Rは「ほかの機巧少女」へ表示し、個別の基準排出率・詳細・必殺技を確認できる。日英に対応。

## 追加の機巧少女と専用スキル

| キャラ | レアリティ / 強さ | 役割 | 自動スキル / リーダー効果 |
| --- | --- | --- | --- |
| ヴェスパ / 星炉の調律師 | SSR / 2.4 | 導き手 | 攻撃強化＋星炉の過充填 / 銀灯の庇護 |
| ミエット / 修繕庭の縫い手 | SR / 1.8 | 癒し手 | 回復＋装甲リサイクル / 月の慈愛 |
| ティッカ / 秒針のいたずら | R / 1.4 | 呪術師 | 防御低下＋秒針ジャミング / 薄明の追撃 |

3人とも成人型のオリジナル機巧人形。新規の2Dアニメ原画を台帳からガチャ・獲得・図鑑・詳細・ホーム・顔枠・必殺カットインへ共用する。既存の2スキル予算を保ち、3人の必殺技にも専用名を設定する。新たな動画生成は行わない。

- `overclock`：最大HPの10%を直接消費（障壁を消費せず、1HP未満にしない）し、自分以外の生存中の味方に必殺ゲージ35を充填。ゲージ65以下で予約していない相手から攻撃力が高い人を選ぶ。発動者HPが20%以下・対象不在なら使用せず、既存の攻撃強化へ切り替わる。自身の行動分25は得るが、支払ったHPで被ダメージ分10は得ない。再使用4ラウンド。ゲージ100へ到達しても自動で必殺予約しない。
- `barrier_mend`：HP75%以下で有効な障壁を持つ味方を、HP割合が低い順で選ぶ。障壁を「残量・最大HP15%・必要回復量の半分（切上げ）」の最小値だけ消費し、消費の2倍を実HP上限まで回復。残りの障壁と期限は維持。誰かがHP30%以下で単体回復が使用可能ならそちらを優先し、障壁切れや全快時には無駄撃ちしない。再使用3ラウンド。
- `jam`：使用可能な通常スキルがある敵を攻撃力順で選び、全通常スキルの次回使用ラウンドを `max(既存値, 現ラウンド+2)` へ遅らせる。既存の長いクールダウンは短縮しない。ダメージ・状態異常ではなく、通常攻撃、ボスの周期大技、時計の終鐘、ビット展開・射撃を止めない。素早いティッカが行動前に妨害すると有効。再使用4ラウンド。

新テンプレートは既存のbuff / heal / debuffイベント、効果音系統、HP差分表示とリプレイを使う。HPコストも実際の差分で表示する。永続状態の追加はなく、既存のHP・障壁・必殺ゲージ・クールダウンに保存。Wave移行時は従来通りクールダウンと障壁を解除する。低レア2人も新編成の選択肢になるよう、SRの障壁再利用とRの行動前妨害を別の役割として用意する。

検証は `tests/clockwork-skills.test.ts`（回復と支払量、ゲージ、予約、スキル遅延、ボス・ビットの除外）と `tests/clockwork-gacha.test.ts`（実抽選、確率総和、保証、専用プール、旧所持の互換）、`e2e/clockwork-roster.spec.ts`（日英詳細、実戦での充填と必殺予約、顔枠・原画・スマホ表示）。

## 追加3人の原画

画像生成で制作した各1086×1448pxのPNG。原本は生成出力のまま保持し、ゲーム用パスへ複製した。全員アニメ調・成人型・露出を抑えた長袖衣装とし、顔を原画上部へ置いて共通の上端基準の顔枠を使う。

- ヴェスパ：`public/art/gacha-vespera.png`、生成原本 `exec-204f2e01-6389-4390-a372-1951caa910e8.png`。星炉・天球儀・青緑のエネルギー糸。
- ミエット：`public/art/gacha-miette.png`、生成原本 `exec-9618fc58-1e6f-4b54-9542-325b62b03f99.png`。薔薇色の短髪・修繕針・金の糸で繕う障壁。
- ティッカ：`public/art/gacha-tikka.png`、生成原本 `exec-e4b85fac-6b5e-469d-a6d5-42774dc772b3.png`。灰紫の三つ編み・懐中時計・機械蛾。

## ノクスの原画と動画

原画は `public/art/gacha-nox.png`（1440×1920）。Runway画像生成タスク：`9aa1c874-6a50-464d-a5f8-1e9418c30a2d`。

動画は6秒・3:4・720p指定・無音。Runway動画生成タスク：`2a645eeb-ee32-44cd-81d1-e1418e599c58`。モデルIDは `seedance-2`。同じ原画を開始と終了の両フレームに指定した。前回の[ルネットのループ課題](lunette-animation-prompt.md#ループ再生で分かった課題)を踏まえ、手・剣・足を動かさず、首の小さな傾き・瞬き・動力核の明滅を一周期で元へ戻す指示としている。開始・終了参照は連続性を狙うもので、生成だけで完全な継ぎ目を保証するものではない。

配信は `public/video/gacha-nox.mp4`（720×960・24fps）と `public/video/nox-portrait.mp4`（320×480・18fps）。後者は中央の縦長範囲を切り出す。H.264 Baseline・yuv420p・faststart、音声なし。共通プレイヤーで紹介・獲得・詳細・ホーム・編成・図鑑・戦闘へ接続し、動き軽減・通信量節約・再生エラー時は原画を表示する。画面外・別タブ・オーバーレイ時の停止も共通処理を使う。

公開用視聴承認は別途必要。今回の制作で未確認の承認フラグを追加しない。

## 原画プロンプト

```text
One full-body character illustration for a dark fantasy anime RPG. A single original adult female clockwork automaton executioner, designated Nox, standing in a moonlit ruined cathedral machine workshop. She has a porcelain-pale expressionless face, icy pale-cyan eyes, straight black chin-length bob hair with one silver-white streak and blunt bangs. Her gaze is cold, detached and merciless, lips closed, no smile. Clearly visible delicate articulated mechanical joints at wrists and fingers, fine engraved silver clockwork at her neck and temples. High-necked black and ivory military-inspired gothic dress coat, silver filigree armor, layered long skirt with restrained lace, black gloves, sturdy heeled boots, fully covered chest, elegant practical silhouette. She holds a long narrow mechanical sword vertically pointing down beside her right leg, hand resting motionless on the hilt, the blade and both boots entirely visible. Left arm rests at her side. Controlled symmetric upright pose designed for subtle loop animation, no flying cloth or dramatic action. One small cyan clockwork core glows at her sternum. Background has towering dormant gears, abandoned pews, cold moonbeams, sparse suspended dust, deep charcoal and tarnished silver, small cyan accents. Menacing through composure and precision, no gore. Beautiful finely drawn 2D anime eyes and linework, detailed painted fantasy background, luminous metal textures, cohesive premium collectible RPG illustration. Portrait orientation 3:4, full figure from hair top to boots with breathing room, face clear and unobstructed near upper quarter, centered composition, no text, no letters, no logos, no interface.
```

## 動画プロンプト（実際の送信内容）

```text
A seamless six-second idle loop of this exact 2D anime illustration. Locked camera and unchanged full-body composition. The clockwork woman remains cold and utterly expressionless, lips closed, gaze fixed on the viewer throughout. One tiny precise mechanical inclination of her head by two degrees, then a smooth return to exactly her initial head position by second five. One slow natural blink in the middle, eyes fully open again before the end. Her bob hair tips settle back to their initial positions. The cyan chest core slowly brightens and dims through one complete cycle, ending at its initial brightness. Keep both arms, articulated fingers, sword hilt, downward blade, skirt silhouette, feet, background gears and moon perfectly steady. Preserve face identity, black hair with its white streak, mechanical joints and all silver costume details. No smile, speech, walking, sword swing or camera motion. Final second returns to the original pose and lighting with stillness matching the opening second; match the first and last frame. Restrained but readable hand-drawn anime animation, one continuous shot.
```

## 検証記録

- 原画生成モデル：`gpt-image-2.5-flare`。シードは指定していない。
- `npm test`：156件成功。限定SSR1体の抽選・初回保証・90回天井・重複還元・他シリーズへの混入防止を確認。
- `npm run build`：型・コンテンツ参照・共通UI・英語メッセージの検査を含め成功。
- ブラウザーテスト：新シリーズ3ケースと既存ガチャ／共通SSR／10連10ケースが成功。紹介・詳細・獲得・軽量顔枠の再生、静止画フォールバック、保証の消費、日英表示、ノクスの10連獲得を確認。
- 生成動画の連続フレームと配信用動画の冒頭・末尾を比較し、顔・手・剣・足の大きな姿勢の飛びがないことを確認。動画では指示した動力核の明滅に加え、刃や背景の光も変化している。完全な画素一致や、あらゆる表示環境での継ぎ目の知覚を保証するものではない。
- 1280×900のデスクトップ表示で横はみ出しがなく、動画がエラーなく2回ループすることを確認。
- 全身動画は約1.0MB、顔枠動画は約0.18MB。実機iPhoneの確認・本番公開・公開用の視聴承認記録は行っていない。

作業中にmainへ追加された10連祈願を取り込み、機巧少女シリーズでも単発・10連を使えるようにしている。全シリーズ共通の抽選・保存処理をそのまま利用し、ノクスが含まれる獲得画面では「女神」ではなく仲間として表示する。
