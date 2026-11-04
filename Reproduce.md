# 再現手順

ソースは research/miette-this-girl-02-v2。ゲーム差分は research/miette-spare-thread / draft PR144。公開版へマージしない。npm ci、Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKit。VOICEVOX Core0.17.1 style8のモデル/辞書/Runtimeと、甘茶「夢」は別途公式から取得し記録SHAを照合。

1. PRODUCTION-POLICY.md、protocol.md、confirmation-lock.jsonを読む。ゲーム変更386ac8c、探索条件752ac25、未開封512確認パネルを0554a83で固定。失敗した4試作も研究資料へ残した。研究/選抜/確認乱数を分離。rawデータを上書きせず、別出力先で再検証する。
2. VITE_SAKUYA_RESEARCH=0、改修前はVITE_MIETTE_RESEARCH=0、改修後は1。セーブ/既存戦闘/乱数再生/750ユニットテスト/Chromium・WebKit実アプリ/ビルドを検証。verify-implementation.pyを実行。episode-implementation.jsonと凍結証拠のSHAが一致しなければ動画を作らない。
3. prepare-recording.mtsとcapture/prepare-proof.mts。native計算と実アプリの全HP/乱数/薬/宝箱を一致検査。X11/Pulseを開始しrecord-native.mjs reference 1 / miette 1で新規収録。日本語・通常描画・ゲーム×1。収録中の重い処理を避ける。
4. native-clean.py→native-buffer-qa.py。共通マーカー80ms以内と独立グラフPCMを検証。extract-miette.mtsで真の回復イベントを実frameへ束縛。キャプチャ自体に数値を描き足さない。
5. story.py→rerecord/synth-core.py。全48発話を新規合成しqueryを保存。rerecord/editorial.py→editor/plan.py --pending-calibration→setup-intervals.py→capture/measure-used-shots.py→media/plan_audio_offsets.py→apply-offsets.py→editor/plan.py。使用区間は測定前に固定。一カット一つの固定sample差のみ許可し、音ごとの変形はしない。
6. preflight-plates.pyで文字と実画面の枠を確認。editor/mixer.py→editor/render.py。30fps/48kHz、一度の最終AAC encode、最後1秒fade。render-input-freeze.jsonに全入力を凍結。
7. 最終MP4そのものへcapture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjs。全カット始中末9連続frameとSE、全発話、4停止像、全編decode、両ブラウザ各3点の再生/seek。review-final.pyで目視。再encode時は全検査を再実行。同一SHAに完成判定を束縛。

改修は採用しましたが最終盤認定ではありません。悪化条件、最良代替、全体監査の未検証範囲を残します。次回ティッカ改修は未検証。旧パート2は保持します。
