# 再現

1. video/this-girl-01-rerecordの制作コードを取得。素材partを番号順に連結し、manifestのSHAを照合してrepoのルートへ展開する。原曲、VOICEVOXモデル・生音声は含まない。
2. 元の固定研究はresearch/sakuya-this-girl-01の2e200b4。ゲームの収録用srcは264ef08。公開側ver1.12最適化と隔離した研究能力を統合している。VITE_SAKUYA_RESEARCH=1で起動し、通常セーブとは分ける。
3. prepare.mts→full-proofs.mtsで同じ条件を再構成。record-native.mjs reference-full 1 / sakuya-full 1はX11/Pulseを同時収録する。通常表示・ja-JP。capture/README.mdの常時接続と時刻検査を守る。
4. 一般の合格素材はnative-clean.py。失敗素材のnative-clean-used.pyは失敗を保存した未承認正規化だけで、使用の合格ではない。used-intervals.json→measure-used-shots.py→plan_audio_offsets.pyで全対象音を測定する。相関不足・80ms超過を隠さない。今回の元の区間失敗もrerecord/interval-v1へ保存。
5. narrationの元はrerecord/story.json。ローカルVOICEVOX Core、0.vvm、辞書、ONNX Runtimeを別途用意してsynth-core.pyを実行。runtimeの場所は環境に合わせる。queryを参照し慈雨はジ・ウを維持する。
6. 曲は甘茶の音楽工房「夢」。editor/fetch_music.pyで公式から取得し、保存済みSHAを確認する。原曲を単体で配布しない。
7. 同梱のeditorial.jsonは最終条件。差し戻し前の区間を誤って使わない。plan.py→mixer.py→render.py。すべて30fps・48kHz、一つの共通sample0へ混合し最終AACは一度だけ。
8. 完成MP4へcapture/finished-qa.pyとrerecord/extra-qa.pyを実行。rerecord/browser.mjsでChromium/WebKitをfresh playerで検査し、全体デコード・図・字幕・頭の目視も行う。再encode後は以前の報告を流用しない。

今回の制作は実装済み能力と既存研究の説明です。元の256シードデータ、今回の同一実戦再生、動画QAを混同しない。認定は研究中のまま。
