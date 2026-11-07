# 研究独白03・改訂版：その一拍で、仲間を守る。

[完成MP4（8分42秒）](https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/2e1f6d5b276221164ee594e34f02359ef48da6c3/ThisGirl-03-v2.mp4) / [サムネイル・台本・字幕・研究データ](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/this-girl-03-v2)

Rティッカの技能「秒針の余白」を研究版へ実装し、同予算の改修前後と因果対照を新しい512入力で確認。5条件で限定的な改善を採用。全12条件で観測勝率の5pp超悪化なし。最終盤の全キャラ認定とは別。旧03は保持。main/itchは未更新。

ゲーム変更de639b1、確認条件281d71f、未開封確認の凍結2894940。ゲームのみのdraft PR145は前回研究ブランチがbase。本物の改修前後を新規収録し、4つの実frame停止解説とノエルの次回予告を付けた。映像の一戦では改修前が良く、512入力の改善と区別して説明している。

1080p/30fps・H264 Constrained Baseline level4.0/yuv420p・AAC48kHz・faststart。71,286,917 bytes。SHA256 `5249ac08962c2a8ca0eabe40ab39e4df2d4d04a4210f396731fad947ca9fac92`。

完成ファイルの全編decode、12実戦映像窓と18音声anchor、全45発話、4停止像、Chromium/WebKit各3点のplay/seekが同じSHAで通過。WebKit初期待ちを別計測し、その後の速度0.85–1.15倍と400msごとの停止を確認。旧instant-start検査の失敗も保存。最終ブラウザ検査コードはbrowser-final.mjs。使用しない改修前の終盤で原音対グラフ照合が1件不足したため全ソース合格とは呼ばず、実際に使う全カットを独立に再照合。固定カット補正後の残差は最大約7.2ms、80ms基準を緩和していない。

公開38ファイルを匿名で全量読み戻し、全SHAを照合。MP4のHTTP206・ftyp/moov先行も確認。サムネイルの最終版は手とペンを隠さないthumbnail.pyで再現する。動画の入力凍結と、その後の配布用サムネイル/ブラウザ検査コードを区別する。
