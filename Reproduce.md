# 再現手順

ソース：research/tikka-this-girl-03-v2。ゲームのみ：research/tikka-signal / draft PR145（前の研究ブランチがbase）。mainへマージしない。npm ci、Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKit、VOICEVOX Core0.17.1 style8公式モデル/辞書/runtime、甘茶「夢」を用意し記録SHAを照合。

1. PRODUCTION-POLICY.mdとprotocol.md。コードde639b1、研究条件281d71f、未開封512パネル2894940。失敗4案はattemptフォルダ。未使用確認を調整に使ったら別パネルが必要。既存rawは上書きしない。
2. VITE_MIETTE_RESEARCH=0/VITE_SAKUYA_RESEARCH=0。改修前はVITE_TIKKA_RESEARCH=0、後は1。763unit/型/content/UI/locales/両版build/Chromium・WebKit/旧公開72結果一致/セーブ/乱数再現を確認。
3. prepare-recording.mts→prepare-proof.mtsでnativeと実applicationの全HP/RNG/薬/宝箱が一致。episode-implementation.jsonとverify-implementation.pyが本収録/最終台本の前提。実戦例は事前条件の昇順入力。結果の良い戦いだけを選ばない。
4. services.sh start --foreground、native環境をsource。公開Vite4460/研究4461。record-native.mjs reference 1 / tikka 1。日本語・通常描画・ゲーム×1、収録中に重い処理を行わない。native-clean.py→normalize_capture.py→native-buffer-qa.py。独立グラフPCM/共通マーカー/実OS録画を照合。
5. extract-jam.mtsで実イベントを録画frameへ束縛。story.py→synth-core.py→voice_qa.py。editorial.py→plan.py --pending-calibration→setup-intervals.py→source-motion.py→measure-used-shots.py→plan_audio_offsets.py→apply-offsets.py→plan.py。区間は測定前に固定し、各カット一つの48k固定差だけを許可。
6. preflight-plates.pyで停止枠/実拡大/短い字幕/原画頭部を確認。mixer.pyで1度の共通48kミックス、render.pyで整数frame編集/30fps/H264baseline/yuv420p/AAC/faststart。入力を凍結。
7. 完成ファイルへfinished-qa.py、extra-qa.py、browser.mjs、review-final.py。主要カット始中末の実frame+実SE、全発話、4停止ページ、全編decode、両ブラウザ各3点。最大80ms/相関不足は配布停止。再encode後は全再検査。finalize.py→package.py→publish.py。匿名全ファイルSHA照合まで完了としない。

サムネイル最終配置は、手とペンを隠さない docs/media/this-girl/episodes/03-v2/thumbnail.py（配布版Thumbnail-Source.py）で作成。`python Thumbnail-Source.py --root <repository-root>`。映画入力の凍結後に変更したのは配布用サムネイルだけで、完成MP4は再エンコードしない。

ブラウザ最終検査は docs/media/this-girl/episodes/03-v2/browser-final.mjs（配布版Browser-QA-Source.mjs）。初期待ちを最大5秒として別記し、その後2秒間の実再生速度0.85–1.15倍と各400msの停止を検査。seek直後から1.5秒だけ測った旧検査の失敗ログ/起動診断も保存し、MP4を変更せずに全6点を再確認しています。
