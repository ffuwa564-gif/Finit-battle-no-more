# 機巧少女 ― 無慈悲な歯車 ―

新シリーズの限定SSRは、機巧少女「ノクス／零式・無赦の執行者」1体。表情に乏しく、命乞いにも刃を止めない機械人形として制作する。黒髪のボブと白い一房、氷色の瞳、陶器の肌、精密な機械関節、黒・生成り・銀の軍装ドレス、下向きの長剣で識別する。

## ガチャと能力

- シリーズID：`clockwork-maidens`。限定SSRは `nox` のみ。既存2シリーズにはノクスを混入しない。
- 既存の共通R/SR16体・共通SSR3体を使用し、今回はシリーズ限定のR/SRは増やさない。
- 単発は石5個、10連は石50個。R80%／SR17%／SSR3%。通常SSR内はピックアップ50%／共通SSR50%を継承するため、ノクスの通常基準排出率は1.5%、共通SSRは各0.5%。
- 通算2回目の一度きりの保証・90回天井はノクス確定。祈願回数・天井は全シリーズ共通で、切替で保証を復活させない。重複時はSSR共通の石3個還元。
- SSR・剣士・強さ2.5。既存の単体攻撃／貫通テンプレートと瀕死追撃リーダー効果を使用。個別の戦闘ロジックや保存形式は追加しない。
- 紹介はSSR1体に対応した1列レイアウト。既存シリーズの2体表示は維持する。日英に対応。

## 原画と動画

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
