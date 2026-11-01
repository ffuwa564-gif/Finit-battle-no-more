白亜の塔攻略日記 Part2 制作コード

Production-Inputs.zip と Recording-Sources.zip をリポジトリルートへ展開。
Python依存：numpy, Pillow, scipy。FFmpegと既存Node依存も必要。
Playwrightの標準OS依存ライブラリも必要（通常は npx playwright install-deps で導入）。
VOICEVOX0.26.0をlocalhost:50021へ起動し bootstrap.py で公式立ち絵・共通OP取得、FLAC/MKV復元。

render.py : 本編のフレーム／サンプル単位編集（OPは次のaudit.pyで追加）
audit.py : 共通OP v4を追加し、配布MP4の実フレーム・実SE・全3話者・必殺反応を照合
validate.mjs : 全体デコードとChromium/WebKitの再生・シーク検証（Vite port4328）
finish.py : 資料・サムネ・公開用ZIP・ハッシュを作成（2つの検査合格が必須）

初回の録画は capture.mjs と sync_capture.py。録画中に音声生成や書き出しを動かさない。
route.ts / verify-native.ts は実戦の入力と素材入手を検証。
声の再生成が必要な場合だけ synth.py。会話は chapters.py。

ゲーム本体は変更しません。前回の比較用所持条件を継続する実戦動画です。
BGM・立ち絵・共通OPの権利表記と詳しい開始条件は完成物のCredits.md / Methods.mdを参照。
