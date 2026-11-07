# 再現手順

research/tikka-this-girl-03のコードと制作ZIPをrepoへ展開。npm ci。Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKitを用意する。大きな録画はtmpfsへsymlinkしても、同じファイルSHA/時刻/画素を保つ。環境固有のパスは調整する。

1. VITE_SAKUYA_RESEARCH=0。公開版1.12の既存技能。srcの全SHAとprotocol.mdを照合。run-search.py→select-diverse.mts→lock.mts。確認用シード開封前に条件をGit cf7593eへ固定。confirm.mts --development-preflightの後、run-confirmation.py→analyze.py→reports.py。元の固定データを上書きする再検証は別出力先へ。
2. prepare-recording.mtsは事前ルールに従い最初の両勝利/実jamシードを選ぶ。prepare-proof.mtsでnativeと実アプリの全HP/乱数/薬/宝箱を一致検査。capture/record-native.mjs reference 1 / tikka 1をX11/Pulse同時収録。通常表示、日本語、ゲーム設定×1。接続を維持しCPUを過負荷にしない。
3. native-clean.py→native-buffer-qa.py。マーカーと実音を検査し、80ms超/相関不足を隠さない。extract-jam.pyが最初の実jam、0→33、封印後の通常攻撃を録画frameへ束縛。33の内訳は通常25と固有8。
4. story.pyの台本をrerecord/synth-core.pyでVOICEVOX Core0.17.1から合成。モデル/辞書/ONNX Runtimeは別途用意し環境パスを調整。実queryを保持。原曲「夢」はeditor/fetch_music.pyで公式から取得し保存SHAと照合。単体配布しない。
5. rerecord/editorial.py→editor/plan.py --pending-calibration→setup-intervals.py→capture/measure-used-shots.py→media/plan_audio_offsets.py→apply-offsets.py→editor/plan.py。全対象音と境界tailを含めて測定し、各カット一つの固定sample差だけを使う。
6. preflight-plates.pyで字幕/図/枠を見直す。editor/mixer.py→editor/render.py。silent pagesと元48kHz FLACから、字幕/最後1秒のfade付きMP4を一度エンコード。後から音だけ動かさない。新しい次回予告はNoelleで、研究結果の先取り認定をしない。
7. capture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjsを配布MP4そのものへ実行。各nativeカットの始中末の連続9framesと独立実音、全48発話、全4停止像、全編decode、両browser各3点を照合。rerecord/review-final.pyで頭/文字/図も目視。再エンコードしたら全て再検査。

今回はゲーム本体の能力変更をしていない。有限研究・今回の実戦・動画QAを混同せず、研究中のまま記録する。
