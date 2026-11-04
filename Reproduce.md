# 再現手順

ソース：research/noelle-this-girl-04-v2。ゲームのみ：research/noelle-resource-safety / draft PR146、前回研究ブランチがbase。mainへマージしない。npm ci、Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKit、VOICEVOX Core0.17.1 style8の公式モデル/辞書/runtime、甘茶「夢」を記録SHAで用意。

1. PRODUCTION-POLICY.mdとprotocol.md。実装568c57f、比較717308e、未使用256パネル98273ae。16開発/32選抜/256確認を分離。C-Bは号令運用という制約内、N/L/Aは別の機会費用。凍結済み構成を結果から選び直さない。lockの最終選抜の説明語順と旧終了ログ512ラベルは記録訂正を参照し、実コード/固定構成/実256行を優先する。
2. SAKUYA/MIETTE/TIKKAの研究フラグは0。改修前VITE_NOELLE_RESEARCH=0、後は1。775unit（新12）、両版build、型/content/UI/locales、Chromium/WebKit実予約・見送り・通常一手、旧04の72結果一致、保存と乱数再現を確認。
3. prepare-recording.mts→prepare-proof.mtsでnativeとapplicationの全HP/RNG/薬/宝箱一致。episode-implementation.jsonとverify-implementation.pyが本台本/収録の前提。recording-selectionは事前優先条件と昇順入力、実見送り→同R本人通常行動を要求し、同条件内で実発令ありを優先。良い一戦だけには変えない。
4. services.sh start --foreground、native環境をsource。公開Vite4480/研究4481。record-native.mjs reference 1 / noelle 1、日本語・通常描画・×1。重い処理を並行しない。最初の独立PCM連続性エラーのテイクは不使用。継ぎ足しや波形修理せず再収録。native-clean→normalize_capture→native-buffer-qa。元OSと独立グラフPCM/時刻マーカーを照合。
5. extract-command.mtsで実イベントを実録frameへ束縛。story.py→synth-core→voice_qa。editorial→plan --pending-calibration→setup-intervals→source-motion→measure-used-shots→plan_audio_offsets→apply-offsets→plan。区間は測定前固定、各カット一つの48k固定差だけ許可。
6. preflight-platesで枠/原画/字幕を確認。mixerで共通48k音源を一度ミックス、renderで30fps/H264baseline/yuv420p/AAC/faststart。全入力を凍結。art/thumbnail.py --root <repository-root>で手とペンの見える1280x720サムネイル。
7. 完成ファイルへfinished-qa/extra-qa/browser/review-final。全編decode、全使用実戦カット始中末、全38発話、4停止像、両ブラウザ各3点。同期80ms/相関不足は配布停止。ブラウザは初期待ち最大5sを別記し、その後2sの速度0.85–1.15倍・400msごとの停止を検査。再encode後は全再検査。同じSHAでfinalize→package→publish、公開全ファイルの匿名全量SHA照合。
