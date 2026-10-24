# STILLVEIL gameplay trailer

既存のキャラアニメーションと、実際のゲーム操作を収録して編集する約38秒の16:9トレーラー。英語メイン＋日本語サブ。新規画像・動画の生成やRunwayの課金処理は行わない。

## 再作成

Linux、Node、Python 3、ffmpeg/ffprobe、Noto Sans/Serif CJKフォントが必要。`npm ci`と`npx playwright install chromium`を済ませる。

```sh
npm run build:itch
npm run capture:trailer
python scripts/edit-trailer.py --preview
npm run edit:trailer
```

生成先はGit管理外の`artifacts/trailer/`。720p確認版、1080p完成版を出力する。変更のない中間素材を再利用する場合のみ`--resume`を使う。部分再撮影は`TRAILER_SHOTS=battle,loot npm run capture:trailer`のように指定できる。再撮影後は古い中間動画を消すか、`--resume`を付けずに再編集する。

キャプチャはビルド済みゲームをローカルサーバーで開き、独立した新規ブラウザーコンテキストにデモ用バックアップを読み込む。ユーザーのプロファイル・セーブにアクセスしない。デモでは進行・所有・素材を撮影用に用意し、戦闘能力やスキル・抽選の処理は改変しない。ボス到達・撃破直前の準備も実際のゲームコマンドで進める。

映像はChromiumの実画面をCDPで記録。音はゲームのAudioContextから効果音を収録し、コンテキストが複数ある場合は直近のrunningコンテキストを使う。可変フレーム間隔と音声開始の差を補正し、H.264・30fpsに統一。ゲームBGM「渦巻き」と録音SEを混ぜ、AAC音声・faststart付きMP4で出力する。

構成：既存ホームアニメーション → 作戦と戦闘 → 素材ドロップ → 女神の祈願とアテナ → 九尾戦 → セリス覚醒 → 題字とゲームURL。字幕や時間は`edit-trailer.py`のshotsとcaptionに定義。

## 投稿

完成MP4は外部へ自動アップロードしない。itch.ioのTrailer欄には、YouTubeやVimeoへ投稿した動画URLを指定する。紹介文と音楽クレジットは納品フォルダーの`upload-description.txt`に同梱する。

音楽：甘茶の音楽工房「渦巻き」（作曲：甘茶）。映像BGMとして利用し、動画中と紹介文にクレジットを記載。音楽単体の再配布・自作としての表示・Content ID登録をしない。原音や撮影の中間ファイルは投稿用ZIPに含めない。

- https://amachamusic.chagasi.com/music_uzumaki.html
- https://amachamusic.chagasi.com/terms.html
