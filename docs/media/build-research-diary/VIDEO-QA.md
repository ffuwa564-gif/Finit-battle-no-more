# Episode 01 完成動画の検査

対象は `artifacts/build-diary-01/delivery/STILLVEIL-BuildResearchDiary-01.mp4`。書き出し変更後は以下を全て再実行する。全レポートの `finishedSha256` が配布ファイルと一致し、`passed:true` になるまで公開しない。

## 入力契約

- `timeline-narration.json`: `duration`, `commonOpening:{start,duration:25.6,frames:768,source}` と `chapters[{id,start,duration,lines:[{speaker,start,end,wav}]}]`。話者は t / z / m。
- `edit-timeline.json`: 4件。chapter は ruka-now / lab-victory-a / lab-victory-b / no-ruka。各 `{start,frames,playDuration,piece,pieceHash,gameRect:[310,66,486,864]}`。
- `mix-manifest.json`: 現行render.pyが出力する入力ハッシュ・gain・ducking・musicPlan。`render/final-mix.flac` と `render/opening/opening.mov` が必要。
- `head-safety.json`、各章の `render/{id}-visual.json` とASS、確定済み `registry.json`。
- `delivery/Manual-Visual-Review.json`: 実際の完成版と素材の目視後に `{passed:true,finishedSha256,reviewer,reviewedAssets:[...],contactSheetPaths:[リポジトリ相対パス...],notes}` を作る。プレースホルダーで合格させない。

## 実行

リポジトリrootで：

```sh
python scripts/build-diary-01/audit.py
python scripts/build-diary-01/visual_qc.py
python scripts/build-diary-01/roster_qc.py
node scripts/build-diary-01/validate.mjs
```

ブラウザ検査にはリポジトリrootをRange対応で配信するHTTPサーバーが必要。既定 `http://127.0.0.1:4329`、変更は環境変数 `MEDIA_QA_ORIGIN`。`--browser-only` は同一SHAの `Decode-Validation.json` が既に合格している時だけ使える。環境に応じたWebKit動的ライブラリ設定は前回の配信検査と同じ。

出力：`Finished-Movie-Sync.json`（実音声・実映像同期）、`Visual-QC.json`（自動形状/字幕/役割検査＋目視記録）、`Decode-Validation.json`（全デコード）、`Validation.json`（Chromium/WebKit各3点の実再生・シーク）。

同期は4cut×3点、OP×3点、3話者×開始/中間/終了、BGM×3点を必須とする。完成版を原音・原フレームと照合し80ms超、相関不足、動くフレーム不足、検査点不足は不合格。BGMはrender.pyをimportせず元MP3から独立再構成し、OPの途中配置・ループ・duck・fadeを含め最終ミックス前FLACに照合する。

`Visual-QC`だけで全72フォームのパレード通過や内容の分かりやすさまで保証しない。rosterの生成証拠と完成映像コンタクトシートを併せて目視確認し、原画の頭・眼鏡・帽子・字幕・宝石表示を確認する。

`Roster-Coverage.json` は72IDの可視区間を独立列挙し、各3秒以上の完全可視・元art/台帳/producer入力ハッシュ・宝石表示・完成版カードのRGB誤差（RMSE≤12）を検査する。両行で同じsampleFrameの抽出を共有する。
