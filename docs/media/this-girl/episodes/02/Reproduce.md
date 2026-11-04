# 再現手順

制作ブランチresearch/miette-this-girl-02のコードと、同梱のartifacts/this-girl-02以下の制作証拠を組み合わせる。npm ci。Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKitを用意する。

1. 公開版1.12のsrcでVITE_SAKUYA_RESEARCH=0。既存サクヤ研究のopt-inコードは使用しない。confirmation-lock.jsonのsrc全SHAとprotocol.mdを確認。search.mts→select-diverse.mts→lock.mts→confirm.mts→analyze.py→reports.py。lockは確認用シード開封前にGit保存。再測定時は元ロックを上書きせず別の出力先を使う。
2. prepare-recording.mtsで記録用シードと対照/Mietteの合法操作を再生しproofを生成。record-native.mjs reference 1 / miette 1をX11/Pulse同時収録。ゲーム×1、通常表示、日本語。captureのREADMEに従い接続を維持。native-clean.py→native-buffer-qa.py。公的mainのゲーム規則と同じだが研究用全所持セーブである。
3. extract-miette.pyでnative実イベントの障壁/HPと録画frameを束縛する。今回の最初の発動は障壁216→168 / HP218→314。後付けのHUD数字は描いていない。
4. synth-core.pyはローカルVOICEVOX Coreとモデル/辞書の場所を環境に合わせる。queryと読み替えを保持。元曲「夢」は公式から取得しmusic-source.jsonのSHAを照合。原曲/モデル/生音声を配布しない。
5. rerecord/editorial.py→editor/plan.py --pending-calibration→setup-intervals.py→capture/measure-used-shots.py→media/plan_audio_offsets.py→apply-offsets.py→editor/plan.py。実録画の全対象音と境界tailを含め、各カット一つの固定sample差で整える。音程・テンポ・cue順序を変えない。
6. editor/mixer.py→editor/render.py。30fps/48kHzの共通sample0で混合、最終AACは一度だけ。元映像/音声・原画・コード/フォント/権利記録のSHAをrender-input-freeze.jsonへ固定。
7. 配布するThisGirl-02.mp4そのものへcapture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjsを実行。全編デコード、実映像の連続9frame×各カット始中末、独立音源由来の波形、全発話、全停止像を検査。再エンコードしたら全報告を作り直す。目視も別途保存。

計算/録画/編集のための環境別パスは適宜置換する。研究能力の改修はなく、main/itchを更新しない。
