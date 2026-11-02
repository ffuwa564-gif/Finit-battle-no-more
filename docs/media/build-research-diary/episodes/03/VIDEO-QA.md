# Episode03 完成動画QA・梱包

O=`artifacts/build-diary-03`、完成版は`delivery/STILLVEIL-BuildResearchDiary-03.mp4`。コード/資料はvideo/build-research-diary-03、配布はdownloads/build-research-diary-03。旧01/02の完成ファイルや合格を流用しない。

## 先に作る入力

`registry.mts`を実行し、台帳とmetadataSourceGame.json/research/source-game.jsonを生成する。ゲーム原本はmain489・1.11.0、後の制作sourceHEADとは区別する。イオネは未証明なら◇。合法反例が確かめられた結論も、必要性falseを偽装せず◇のまま独立レビューとSHAで確定できる。旧ルカ・ネリの認定は新研究追加後に別途再審する。Fio BD071は既存◇を維持し新認定を先付けしない。

final render-planは4主要cutのchapter/sourceId/sourceSha256、requiredCoverage、nextEpisodePreviewを持つ。

```json
{"requiredCoverage":{"gameCutCount":4,"gameAnchorsPerCut":3,"openingAnchors":3,"voiceSpeakers":["t","z","m"],"voiceAnchorsPerSpeaker":3,"musicAnchors":3,"rosterForms":72},"nextEpisodePreview":{"chapter":"next-episode","characterId":"fio","seriesId":"BD071"}}
```

`qa_contract.py`はplanSHA、宣言全cutとactualrows、3原本のSHA、各pieceSHAを照合し、省略されたcutや不足する検査点を黙って合格にしない。

## 完成後

```sh
python scripts/build-diary-03/audit.py
python scripts/build-diary-03/roster_qc.py
python scripts/build-diary-03/visual_qc.py
node scripts/build-diary-03/validate.mjs
python scripts/build-diary-03/package.py --check-inputs
python scripts/build-diary-03/package.py
python scripts/build-diary-03/publish.py --check-only
```

同期は4cut×3・OP3・3話者×3・BGM3の計27点、80ms以下。原音から独立再構成したmixと実効果音・変化を跨ぐ9フレームを完成版へ照合する。72姿は各3秒以上の完全表示と原画/台帳/宝石SHA、完成カード画像を検査する。全デコードとChromium/WebKit再生は別gate。Range対応HTTP配信が必要で、既定MEDIA_QA_ORIGINはhttp://127.0.0.1:4329。

Visual-QCの前に完成MP4を目視し、delivery/Manual-Visual-Review.jsonへpassed/finishedSha256/reviewer/reviewedAssets/contactSheetPathsを保存する。NEXT EPISODEは独立した最終区画であることに加え、次の情報を必須とする。

```json
{"nextEpisodePreview":{"chapter":"next-episode","characterId":"fio","seriesId":"BD071","artPath":"art/scout-fio.webp","artSha256":"台帳と実原画のSHA","fullHeadVisible":true,"nameAndIdVisible":true,"unverifiedLabelVisible":true,"noNewGemClaim":true,"samples":[{"timeSeconds":0,"path":"完成版から抽出した実frameのrepo相対path","sha256":"そのframeのSHA"}]}}
```

sample時刻は必ず最終区画内の実時刻を入れる。render/next-episode-preview.jsonのcontain矩形・元寸法・plateSHA・名前ID/未検証表示と、新完成版の目視を結ぶ。実Fio原画を使い、頭全体、名前とBD071、問い「余った回復は、どんな勝ち筋になる？」、未検証文言を確認する。生成イラストへの置換や先付け◆は不可。

## 保持・公開

03は初めからcue y765を使い、02のpost-cue-fix工程は依存に含めない。基礎render-input-freezeのfinalSHAと配布SHAが一致し、全入力不変を検査する。

3原本PCM MOV＋OP、CFR前.tmporiginalをそのまま保持する。ZIPは90MiB raw予算で分割、全配布ファイル100MiB未満。旧必要性証拠はルカ/Neriの2件だけ明示参照し、過去エピソードの媒体を一括再梱包しない。梱包に新原画/再利用出典、次回予告metadataと目視frame、SourceGame metadata、コードHEADを含める。publish.pyは読み取り専用のローカル整合gateで、push・itch更新をしない。
