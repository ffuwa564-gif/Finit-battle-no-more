# 完成動画の再生検査範囲

完成MP4 SHA256: `8e86d4f4f9a8100437ac500bdf7be8febef5cf34c345fd90acd78b7f5e915058`。1920×1080、30fps、7分01.833秒。

- 全デコードと全frameの30fps時刻、元映像12動的窓、独立音源18窓に合格。完成映像と元素材の照合で測定したlagは各0ms。元収録全域の同期未達とは別の検査です。
- Chromium/WebKitで5%・50%・90%の各位置を**新しいプレイヤー**からseekし、2秒間観察、0.7秒以上5秒以下の実進行、ended:false、1920×1080、エラーなしを全6点で確認しました。
- **同じLinux WPE WebKitプレイヤーでの連続seekは未達**です。途中で末尾へ飛ぶ事象を観測し、元fixtureのFAILも保存しています。動画のその位置を新しく開く診断は成功しましたが、原因を動画・runtimeいずれかに断定しません。WebKit全面互換やSafari実機確認を意味しません。
- 元fixture・MP4・既存render入力は変更していません。独立fixtureを別ファイルで追加し、scopeと旧FAILのSHA参照をreportへ記録しました。1秒観察でpreroll後の進行が0.680秒だった初回FAILも残し、実進行の基準を維持して観察時間を2秒へ変更しました。

[検査結果と旧FAIL](../evidence/final-media/)を参照してください。Debian公式の `gstreamer1.0-libav` をSHA照合して一時ディレクトリへ展開しました。グローバルなパッケージ導入はしていません。

再実行の追加環境:

```sh
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
LD_LIBRARY_PATH=/tmp/sakuya-webkit-libs/usr/lib/x86_64-linux-gnu \
GST_PLUGIN_PATH=/tmp/sakuya-webkit-libav/root/usr/lib/x86_64-linux-gnu/gstreamer-1.0 \
node scripts/this-girl-01/capture/browser-independent-qa.mjs artifacts/this-girl-01/delivery/ThisGirl-01.mp4 artifacts/this-girl-01/research/final-browser-qa.json
```

不足依存とcodecの公式入手先・版・SHAはprovenanceに保存しています。既存環境で依存が揃う場合は専用path指定を省けます。音声・BGMの権利と研究認定の範囲は、別途Credits・Character-Judgmentを確認してください。
