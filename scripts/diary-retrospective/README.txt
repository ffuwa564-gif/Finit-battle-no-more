白亜の塔攻略日記 Part2までの反省会

承認済みのピンク版テンプレートを用いた、過去の実戦とゲーム仕様のレビュー。
新しい初見プレイや、提案を実装して勝率測定した動画ではありません。

ゲームsource 1f4e970117c95a11ef38c8f1e12fe232e5a7b964へ制作ZIPを展開。
Python: numpy / Pillow / scipy。FFmpeg7.1、Noto Sans CJK JP。ブラウザ検査はNode/Playwright。
OPはbootstrap.pyがユーザー提供の固定版から取得・30fps/48kHz PCMへ変換します。
KK「なんでしょう？」Track2へたっぴリコーダー版は公式サイトから取得し、
artifacts/diary-retrospective/assets/nandeshou-recorder.mp3 に保存してください。
楽曲の単体再配布を避けるため、このファイルと音楽のみのミックスは制作ZIPへ含めません。
music-source.jsonに公式ページ、取得版、検証用SHA256を記録しています。

python scripts/diary-retrospective/bootstrap.py
python scripts/diary-retrospective/render.py --use-approved-cuts
python scripts/diary-retrospective/audit.py
python scripts/diary-retrospective/visual_qc.py
Viteなどでrepo rootを127.0.0.1:4328へ配信し、node scripts/diary-retrospective/validate.mjs
全検査が同じ完成SHAで合格した後に package.py。

--use-approved-cuts は同梱の5カットのSHAとAV編集条件を照合してから再利用します。
長い元録画を持っている場合はフラグ無しで再カット可能。edit-timeline.jsonのsourceとsourceStart/Endを参照。
カットは30fps H.264/48kHz PCM MOV、AV同時編集済み。AAC音源の新しい中間ファイルは作りません。
最終音源はOP・リコーダー・実SE・3話者を共通サンプル0へ一度に配置。
背景は30fps H.264、透過立ち絵は30fps QTRLEへ展開してから合成し、フレーム待ち行列の肥大化を防ぎます。

声の再生成だけはVOICEVOX0.26.0 localhost50021を起動し script.py。
完成済みのFLACを使う再編集ではTTSは不要。新しいセリフに応じて図や反応時刻も調整してください。
20秒の必殺図鑑は実フラッシュ時刻と3行目の反応に対応。セリフを変更して尺を超えると停止します。

template/ に実際に使った企画メモ・絵コンテと、承認済みstyle.jsonを収録。
style.jsonはデザイン参照であり、現在のレンダラーの自動読込設定ではありません。
