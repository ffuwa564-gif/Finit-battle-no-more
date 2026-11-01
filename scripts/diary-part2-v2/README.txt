Part2 可愛いピンクの改良版（同じ実戦を再編集）

ゲームのsource commit 1f4e970117c95a11ef38c8f1e12fe232e5a7b964をcheckoutし、Production-Inputs.zipをルートへ展開。
Python: numpy / scipy / Pillow。FFmpeg / Node / Playwright、Noto Sans CJK JPも必要。
bootstrap.pyでピン留めされたRecording-Sources.zipと共通OPを取得・展開・30fps/48kHz PCMに統一。
アーカイブには選択済みナレーションFLACと新しい挿絵ピクセルを収録。
render.pyはOPを含む最終動画を一度の48kHzミックスから書き出す。新規TTSは不要。
再度会話を編集する場合だけ、VOICEVOX0.26.0 localhost50021を起動してedit.py。

python scripts/diary-part2-v2/render.py
python scripts/diary-part2-v2/audit.py
python scripts/diary-part2-v2/visual_qc.py
Viteを127.0.0.1:4328で起動し、node scripts/diary-part2-v2/validate.mjs
最後に package.py。同期・全体デコード・両ブラウザ・頭の安全域の検査が同じ完成SHAで合格した場合だけ資料を生成する。

媒体の見た目と尺の変更です。ゲーム内容、実戦の確率、セーブを変えていません。
YouTube外部本編へのアクセス制限と参照範囲はResearch.mdに記録しています。
