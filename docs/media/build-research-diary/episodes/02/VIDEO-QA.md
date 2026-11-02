# Episode02 再現・完成動画検査

入力はO=`artifacts/build-diary-02`、完成版は`delivery/STILLVEIL-BuildResearchDiary-02.mp4`。Episode01の完成ファイル・QAレポートを流用しない。

`render-plan.json` は `finalized:true`、`clips` の各値に `chapter`・`sourceId`・`sourceSha256`、次の必須coverageを持つ。clip名と章IDは同一とは限らない。

```json
{"requiredCoverage":{"gameCutCount":4,"gameAnchorsPerCut":3,"openingAnchors":3,"voiceSpeakers":["t","z","m"],"voiceAnchorsPerSpeaker":3,"musicAnchors":3,"rosterForms":72}}
```

`qa_contract.py` はplanSHAとナレーション、宣言cut全件と実rows、実収録SHA、編集pieceSHAを照合する。4cut未満、未宣言cut、章省略、少ない検査点を黙って合格しない。clipに短い1行ラベルと、現行実戦か未実装LABか・抜粋範囲を説明するdisclosureを用意する。

レンダー・入力の凍結後に、リポジトリrootで次を実行する。

```sh
python scripts/build-diary-02/audit.py
python scripts/build-diary-02/roster_qc.py
python scripts/build-diary-02/visual_qc.py
node scripts/build-diary-02/validate.mjs
python scripts/build-diary-02/package.py --check-inputs
python scripts/build-diary-02/package.py
python scripts/build-diary-02/publish.py --check-only
```

`visual_qc.py` の前に、完成版を実際に目視し、`delivery/Manual-Visual-Review.json` に `passed:true,finishedSha256,reviewer,reviewedAssets,contactSheetPaths` を保存する。生成素材の確認だけを完成動画の目視済み記録に置き換えない。

同期は4cut各3点・OP3点・3話者各3点・BGM3点。OPは45–60秒の全員紹介の後に25.6秒。BGMを原MP3から独立再構成し、共通48kHz軸で最終mixを照合する。画面遷移は各cutの各third内から独立選択し、その前後9実フレームを完成版と照合。音ピークに画面変化を無理に寄せない。80ms、相関、RMSEの基準はEpisode01と同じ。

全72姿は30fpsで連続完全可視を独立算出し、各3秒以上・原画SHAと台帳と宝石・完成版のカードcropを検査。全レポートは完成SHAに固定。ブラウザ検査にはRange対応のroot HTTP配信が必要（`MEDIA_QA_ORIGIN`既定`http://127.0.0.1:4329`）。

新原画は`assets/artwork-provenance.json`、再利用は`asset-reuse.json`で別に追跡。旧provenanceは`reused-artwork-provenance.json`を再利用原本として保持し、新原画を前回制作と偽装しない。

梱包はsourceHEADとゲーム原本main489を分けて記録。3収録MOV＋OPのPCM原本、CFR前`.tmporiginal`をそのまま保ち、90MiB raw予算でZIPを分ける。各配布ファイルは100MiB未満。今回はheader_fix後段・旧masterの退避工程を使わない。`publish.py`は読み取り専用ローカルgateで、pushやitch更新を行わない。
