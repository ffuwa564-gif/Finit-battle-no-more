# Episode05 QA・梱包契約

図中心の基準は共通の[visual-first-guide.md](../../visual-first-guide.md)。ここには05の技術契約だけを記す。完成版はartifacts/build-diary-05/delivery/STILLVEIL-BuildResearchDiary-05.mp4、sourceはvideo/build-research-diary-05、配布はdownloads/build-research-diary-05。

## 先に固定するもの

研究必要性/十分性/因果/edge/合法代替/旧全役割を凍結し、独立研究レビュー、最終True台本とsemanticSHA、registryの順に固定。エレインの◆は必要性trueと独立exclusive承認が揃った時だけ。旧ルカ/ネリとイオネ/フィオは新案を全適用して再審する。

raw nativeの校正/CFR/源データ、原画とroot承認別紙を保持。schema2 active2、supersededは0でも複数でも正当で、無駄な再生成を要求しない。非採用稿があればaccepted:false/理由/retainedCopy/SHAを保存する。pendingの生成provenanceを後から書き換えず、root-artwork-approval.jsonが凍結済み原画/provenanceのSHAへ署名する。

## 最終planと実行

```json
{"requiredCoverage":{"gameCutCount":4,"gameAnchorsPerCut":3,"openingAnchors":3,"voiceSpeakers":["t","z","m"],"voiceAnchorsPerSpeaker":3,"musicAnchors":3,"rosterForms":72},"nextEpisodePreview":{"chapter":"next-episode","characterId":"seris","seriesId":"BD003"}}
```

clips全件へchapter/sourceId/sourceSha256を宣言し、4cut/3原本/全rows/pieceSHAと照合する。8〜11分、最終の原画予告30〜45秒を準備段階で確かめる。

```sh
python scripts/build-diary-05/audit.py
python scripts/build-diary-05/roster_qc.py
python scripts/build-diary-05/visual_qc.py
node scripts/build-diary-05/validate.mjs
python scripts/build-diary-05/package.py --check-inputs
python scripts/build-diary-05/package.py
python scripts/build-diary-05/publish.py --check-only
```

同期は4cut各3・OP3・3話者各3・BGM3の27点。原音から独立再構成し、実SE/変化を跨ぐ9フレームを完成MP4へ照合。80ms超、相関不足、coverage不足は不合格。全72姿は各3秒以上の完全表示、原画/台帳/宝石SHAと完成カードを照合する。全デコード、Chromium/WebKit再生、目視は別gateで同じ完成SHAへ結ぶ。

## Manualで確認するもの

Manual-Visual-Review.jsonは完成MP4を実見したpassed/finishedSha256/reviewer/reviewedAssets/contactSheetPathsを保存する。visualFirstReviewにはguideSha256と、diagramsLeadExplanation/oneQuestionPerScene/sampledScenesAvoidDenseConcurrentText/conditionsDeferredToMaterials/noMeaninglessPaddingの確認を保存する。全フレーム無欠陥という自称ではなく、確認した最終サンプルを記録する。

nextEpisodePreviewはSeris BD003の実原画SHA、全頭/名前ID/未検証文言/新認定なしの確認、最終区画の実frame時刻/path/SHAを持つ。正式問いは「強い仲間が増えても、セリスを選ぶ理由は？」。既存別形態の実績を否定しない。layoutのcontain矩形/padding32/原比率/plateSHAと実目視を結ぶ。

## 保存

3原本PCM MOV＋OP、CFR前.tmporiginalをそのまま保存。全reviewedAssets、contact sheets、sourceStill PNGと出典JSON、予告frame、共通guide、原画/root承認、SourceGame、研究/コード/制作HEADをZIPへ。90MiB raw予算で分割し各配布ファイル100MiB未満。rootがGit公開/readbackを担当し、publish.pyは読み取り専用gateとする。

## 仮ビルド名

05のresearchBuildは主役履歴の5フォームのみ。命名自体でgems状態を変えない。visibility metadataのresearchBuild(id/name/provisional)は元台帳のsubsetと一致し、actualTextは「仮：」＋名称全文とする。buildNameRectはfontSize/actualText/cardLocalBBox/bbox、gemRectは同じPIL型[x1,y1,x2,y2]で記録する。

独立QAは実フォント幅、カード内収まり、ローカル→画面座標変換、宝石が名前左に収まることを確認。72カード各3秒の完全可視に加え、5名称の文字cropを元/最終動画でRMSE≤12照合し、expectedNamedSeriesIds/shownNamedSeriesIdsを保存する。別フォームや他の少女に名が増えた場合、略称/省略記号へ無断変更した場合は合格にしない。
