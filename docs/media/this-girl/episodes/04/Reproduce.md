# 再現手順

research/noelle-this-girl-04のコードと制作ZIPをrepoへ展開。npm ci。Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKit。VOICEVOX Core0.17.1、style8のモデル/辞書/ONNX Runtimeは別途用意し、環境固有パスを調整。原曲「夢」は公式から取得しmusic-source.jsonのSHAと照合。

1. VITE_SAKUYA_RESEARCH=0。protocol.md、src全SHAを照合。run-search.py→lock.mts。Git6a3f7afで確認条件を固定した後、run-confirmation.py→analyze.py→reports.py。元データを上書きせず別出力先で再検証する。追加石研究はstone-extension.mts、別の256入力をGit8a3139fに先に固定。主仮説へすり替えない。
2. prepare-recording.mts→prepare-proof.mts。native/実アプリの全HP/乱数/薬/宝箱を一致検査。X11/Pulseをstartし、record-native.mjs reference 1 / noelle 1。日本語、通常表示、ゲーム設定×1。新規録画。録画中は接続を維持しCPU過負荷を避ける。
3. native-clean.py→native-buffer-qa.py。全体マーカー差80ms以内と独立グラフPCMの実音を検査。extract-command.pyで最初の実宛先変更を元frameへ束縛。50は通常攻撃の実ダメージで追加ダメージではない。
4. story.py→rerecord/synth-core.pyで全48発話を新規合成。実queryを保管。reports.py→rerecord/editorial.py→editor/plan.py --pending-calibration→setup-intervals.py→capture/measure-used-shots.py→media/plan_audio_offsets.py→apply-offsets.py→editor/plan.py。原区間は測定前に固定、境界tailも全対象音も測定し、カットごとに一つの固定sample差だけを用いる。
5. preflight-plates.pyで文字/枠/図を確認。editor/mixer.py→editor/render.py。30fps/48kHz、一度の最終AAC encode、最後1秒fade。後から音だけ動かさない。
6. 完成MP4そのものへcapture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjs。実戦の始中末9連続frameとSE、全発話、4停止像、全編decode、両ブラウザ各3点を検査。review-final.pyで目視。再encodeしたら全検査を再実行。

公開ゲーム能力の変更はない。次回リゼットは未検証、旧認定/研究中の意味を変えない。新たな最終盤認定は0。
