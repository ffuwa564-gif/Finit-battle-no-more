# 慈雨の読みの修正

音声の「慈雨」が「じい」に聞こえる箇所を「じう」に修正しました。
VOICEVOXの保存queryで「ジ・イ」になっていた第2モーラを「ウ / u」と明示しています。
約3:00.45〜3:01.47の単語と前後の読点休止だけを、元の無損失masterへ差し込みました。
他の音声部分の無損失PCM、全12,655映像packetと時刻、動画尺・字幕・図・ゲーム音は維持しています。
AACは修正した無損失masterから生成し、元動画の圧縮音声の再圧縮は使用しません。

元の制作・研究ZIP5分割は変更していません。元のmanifest/checksumはBase-*へ保存し、
最新動画と差分パッケージは新Packaging-Manifest.json / SHA256SUMS.txtで照合してください。
原版の再現に最新動画のSHAを流用しません。研究結果・研究中の認定・未公開仕様はそのままです。

## 再現

1. Base-Packaging-Manifest-v1.jsonの元資料を復元し、元のReproduce手順でVOICEVOX0.26.0のmasterを再構築。
2. 原版MP4は https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/5684031a8a320ae0f323f094b4bfe2d7719796c4/ThisGirl-01.mp4 。原版のSHAを照合。
3. Audio-Correction-jiu.zipを同じrepositoryへ展開。既存のraw入力・研究データを改変しない。
4. VOICEVOX0.26.0 / 春日部つむぎstyle8で `python scripts/this-girl-01/corrections/mercy-reading.py` を実行。
5. `python scripts/this-girl-01/corrections/verify-mercy-reading.py` と、既存の独立browser検査を修正版に実行。

補正query・コード・検査報告を差分ZIPに含めます。生の合成音声、楽曲だけの素材は含めません。
ブラウザ検査は新規playerごとの6点です。Linux WPE同一player連続seekの既知未達は元報告と同じ限定範囲です。
