# 予告追加版の再現

元パート2の制作資料： https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/this-girl-02 。先にこの元版の制作ZIPを展開してartifacts/this-girl-02の素材を復元します。元のReproduce.mdに従い元48行の音声と公式BGM「夢」を復元し、検査済みsilent page bitstreamsを用意します。完成MP4やAACを編集入力には使いません。

その上で予告追加版の制作ZIPを展開し、scripts/this-girl-02-preview/rerecord/synth-core.pyで追加3行を合成。rerecord/build-preview.pyは元のpage SHAを照合し、Tikka予告を研究記録の前に挿入します。30fps/48kHzで全原音源を再ミックスし、最終AACはこの出力で一度だけ生成します。公表済み研究結果、元48行、3本のnative使用区間は継承します。

capture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjsをこの予告追加版MP4へ実行。extra-qa用の原停止plateとsidecarは、元パート2のrender/platesから追加版render/platesへコピーします。これは元のsilent pageと同一のplateで、新しい偽のHUDを作る操作ではありません。全51発話と4停止像、実映像/SE、全編デコード、両browserの3点を照合し、新SHAに結びつけます。
