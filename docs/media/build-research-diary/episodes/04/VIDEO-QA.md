# Episode04 QA・梱包契約

対象はO04=`artifacts/build-diary-04`、完成版`delivery/STILLVEIL-BuildResearchDiary-04.mp4`。旧作/実ゲームsrcを変更しない。04 sourceはvideo/build-research-diary-04、配布はdownloads/build-research-diary-04。

## 固定の順序

1. 研究evidenceと全入力/コードSHAを凍結する。旧Ruka/Neriの◆再審、Ioneの◇役割再審を別に記録する。Fioが旧編成の相方でもあるため、旧Fioでの再現と新Fioへ差し替えた再審を混同しない。
2. 独立native検査、研究報告審査、最終story/semanticSHAを確定する。報告のpassedと、新exclusive認定/研究目的達成boolを分ける。
3. registry.mtsを再生成し、必要性/十分性/edge/反例/旧証拠/独立reviewへbindする。研究が未確定ならfinalized:false、未再審の前回認定は保留。最終台帳SHAをopeningへ通知した後はデータを変更しない。
4. OP/roster/bodyを完成させ、その最終一本を全検査する。SourceGameメタデータ2件もregistryが自動生成する。

## 宣言と同期

final render-planのclipsにchapter/sourceId/sourceSha256を全件宣言する。必要coverageは4cut、各3点、OP3、3話者各3、BGM3の計27点、全72姿。

```json
{"requiredCoverage":{"gameCutCount":4,"gameAnchorsPerCut":3,"openingAnchors":3,"voiceSpeakers":["t","z","m"],"voiceAnchorsPerSpeaker":3,"musicAnchors":3,"rosterForms":72},"nextEpisodePreview":{"chapter":"next-episode","characterId":"elaine","seriesId":"BD001"}}
```

qa_contract.pyは宣言と全actualrows、3原本SHA、pieceSHA、末尾独立NEXT EPISODEを照合し、減ったcutや検査点を黙って合格にしない。映像/音源は同じcutでtrimし、30fps/48kHzで一度だけmix。原音から独立再構成し、各thirdの実遷移を跨ぐ9フレームと実SEを照合する。80ms超・相関不足・coverage不足で停止する。

## 次回予告と目視

次回はElaine BD001、問いは正式指定「同じ回復役、エレインだから出来ることは？」。実原画をcontainし全頭と名前IDを表示、既存の役割履歴を否定せず「次回の新ビルドは未検証・認定前」と明示する。新認定を先付けしない。

完成版を実見したManual-Visual-Review.jsonにはpassed/finishedSha256/reviewer/reviewedAssets/contactSheetPathsに加え、次を保存する。

```json
{"nextEpisodePreview":{"chapter":"next-episode","characterId":"elaine","seriesId":"BD001","artPath":"台帳と同じ原画パス","artSha256":"実原画SHA","fullHeadVisible":true,"nameAndIdVisible":true,"unverifiedLabelVisible":true,"noNewGemClaim":true,"samples":[{"timeSeconds":0,"path":"完成版から抽出したframeのrepo相対path","sha256":"frameSHA"}]}}
```

sample時刻は最終区画の実時刻を入れる。render/next-episode-preview.jsonの原画SHA/contain矩形/padding32/plateSHA/処理SHAと最終目視を結ぶ。全72カードは各3秒以上の完全表示、原画/台帳/宝石SHAと完成フレームを照合する。

## 原画と保存

新原画はschemaVersion2/active-approved-originals/active2（thumbnail-original.pngとresearch-lab-overflow.png）。supersededの非採用初稿はaccepted:false/理由/retainedCopy/元SHAを保存し、activeへ混ぜない。再利用は01/02/03の正確なassetsパスとSHAへ固定し、/tmp-backed symlinkも実ファイルSHAで検証する。

## 実行

```sh
python scripts/build-diary-04/audit.py
python scripts/build-diary-04/roster_qc.py
python scripts/build-diary-04/visual_qc.py
node scripts/build-diary-04/validate.mjs
python scripts/build-diary-04/package.py --check-inputs
python scripts/build-diary-04/package.py
python scripts/build-diary-04/publish.py --check-only
```

visual_qcは最終Manual完成後。validateは全デコードとChromium/WebKitの実再生/seekを別gateとして実行する。HTTP originは04 validate.mjsの指定を使用し、Range配信を用意する。全reportは同じcurrent finishedSha256が必要。

3原本PCM MOV＋OP、CFR前.tmporiginalを原本のまま保存する。各ZIPは90MiB raw予算で分け、各公開ファイル100MiB未満。研究・台本・next-preview素材・原画出典/非採用履歴・SourceGame・制作HEADを保存する。publisherはローカル読み取り専用gateで、最終Git操作/公開はrootが行う。
