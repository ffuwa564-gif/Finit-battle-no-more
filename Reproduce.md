# 再現手順

完成物の `Packaging-Manifest.json`、`SHA256SUMS.txt` を起点にします。SHAが異なるファイルへ以前のQA結果を流用しません。研究結果の成功・未達成と、動画ファイルの検査合否は別です。

## 1. ソース・環境

1. 元リポジトリをcloneし、manifestの `sourceCommit` をcheckoutします。研究ブランチは `research/sakuya-this-girl-01`、動画配布ブランチは `downloads/this-girl-01` です。mainやitch.ioへの配信はこの手順に含みません。
2. `Production-and-Evidence.zip.part001` 以降を連番順に連結し、manifestのZIP全体SHAを照合してから同じリポジトリルートへ展開します。各partも個別のSHAを持ち、元録画のバイト列を再圧縮で置き換えていません。
3. Node 24系と `npm ci` を使用します。実際のNode/V8/npm版とlockfile SHAは研究runnerのprovenanceに記録しています。Python 3、FFmpeg/FFprobe、Noto CJKのRegular/Boldが必要です。Python依存は `scripts/this-girl-01/requirements-media.txt` を参照します。
4. 公開比較のbaselineは `f6595da6c5f4bd3950e412d92e3e08f3529e0706` の `src/` を `artifacts/this-girl-01/baseline/src/` へ復元します。元commitからの `git archive` を使用し、研究コードをbaselineへコピーしません。

```sh
git fetch origin f6595da6c5f4bd3950e412d92e3e08f3529e0706
mkdir -p artifacts/this-girl-01/baseline
git archive f6595da6c5f4bd3950e412d92e3e08f3529e0706 src | tar -xf - -C artifacts/this-girl-01/baseline
npm ci
python3 -m pip install -r scripts/this-girl-01/requirements-media.txt
```

大きなrender/capture/speechキャッシュには十分な作業領域を用意します。元資料・確定データは一時領域だけに置かず保存します。

## 2. 研究

`scripts/this-girl-01/RESEARCH-PIPELINE.md` に段階ごとの実行方法があります。既存の共通戦場を使い、全所持・合法な同Tier石4個・薬5個という条件を揃えます。現在入手できないXRを含む仮想最終盤の比較であり、通常の入手手順の紹介ではありません。

- `before-policy.mts` と `after-policy.mts` は、それぞれ実際の公開baseline・研究版エンジンを使用します。Wave境界の宝箱乱数も消費します。
- 開発・選抜seedと確認seedは分離。930001等は論理行IDであり、`seed-bank.mts` のSHA256変換と出発時のLCGを通した実seedはlockに保存しています。
- `.github/workflows/sakuya-research-search.yml` は32の独立caseを実行します。各runnerはnative探索1process、候補数・seed・selectorを変えません。`import-search.py` は全caseの完備、計算ソース一致、local重複の全candidate/全raw row一致を確認してから取り込みます。
- 確認は `confirmation-lock.json` の正確なSHAと、確認前のレビューを必要とします。研究後の数値調整を同じ確認結果の認定に使いません。
- 確認側のActionsは12主条件＋育成・感度・隠し戦場・号令・全形態screen・24戦場の計18job。実際のレビュー後に保存する `confirmation-approval.json` がpushの起点で、各runnerでも承認SHAと全研究sourceを検査してから戦闘を開始します。
- A/B/C/D/E、育成、感度、隠し戦場、号令対照、全形態screenの範囲と限界は研究報告書へ記録しています。有限探索を大域最適化の証明として扱いません。
- 統計解析は `analyze-study.py`、事前仕様は `statistical-analysis-plan.md`、独立判定は `reports/judgment.json`。総合が研究中なら宝石を検証済みに変更しません。

再計測時にソース・lock・公式原音・原画が異なる場合は、新しい実験・新しいQAとして記録します。

## 3. 実アプリ収録

`capture/README.md` を参照します。研究版は `VITE_SAKUYA_RESEARCH=1`、公開版とは版・セーブを分離します。

録画対象は事前の優先順と昇順seed規則から選び、`recording-selection.json` に保存しています。同一敵・同一seed・同等予算のA/Cを実際のアプリで再生し、`applyCommand` とnative結果のHP/乱数/薬/宝箱/石の一致を確認します。実戦例1つを勝率の証拠として扱いません。

ゲーム画像と実際のゲームSEは同じOS録画から取得します。開始・中間・末尾の信号で同期を測り、診断用の帯と音を除去し、CFR 30fps・48kHz PCMへ正規化します。各frameは1600 audio samples。元音のsample clockと共通開始PTSを保ち、途中の時間伸縮はしません。

完成動画は戦闘の抜粋です。元録画全域の未達・FAILは保存し、使用区間を先に固定してから、その全eligible cueと境界tailを別に検証します。収録音声の固定遅延は、独立graph PCM参照の全測定から決めた**shotごと1つの整数sample補正**で編集します。`audioSourceOffsetSamples` が正なら、映像sourceFrameより後ろの実音を同じ長さだけ読み、音を前へ寄せます。波形・tempo・pitch・順序は変えず、音の再演やcue別補正を行いません。元全域をPASSへ書き換えず、「使用区間・編集補正後」のscopeを示し、補正前後と最終MP4の両方を検査します。

## 4. 映像・音声の再構築

`art/README.md` と `editor/README.md` に入力schemaとコマンドがあります。

1. `art/prepare.py` で保存済み生成原画、旧名簿、72元絵のSHAを照合。原画像不在でもGit保存原画から復元できます。
2. 楽曲は `music-source.json` の公式入手先から取得しSHA照合。音声は利用条件を確認したVOICEVOX 0.26.0 / 春日部つむぎ style8で台本・読み・queryを使って生成。生音素材は配布ZIPにありません。
3. 最終台本と実測に紐づいた `editorial.json` から、整数frameのタイムライン、SRT、Script、Chaptersを生成。
4. `mixer.py` で独立の声・ゲームSE・ピアノを48kHzへ混合。`render.py` で静かな図解と本物のgame cutを編集し、最終AACは一度だけ生成します。元音と切り離した後付けの長さ調整はしません。
5. 全入力をrender前にfreezeし、render後に変更がないことを確認します。

## 5. 完成ファイルの検証と保存

最終MP4そのものを検査します。sourceに対する動的9frame連続照合、各game cutの始・中・末のSE、声3点、音楽3点の独立音源相関で80ms以内を要求。全frame/全音声decode、実30fps grid、Chromium/WebKitの各3seek、字幕・図・頭部・研究版表示・名簿認定を確認します。

```sh
python3 scripts/this-girl-01/capture/finished-qa.py artifacts/this-girl-01/delivery/ThisGirl-01.mp4
node scripts/this-girl-01/capture/browser-independent-qa.mjs artifacts/this-girl-01/delivery/ThisGirl-01.mp4 artifacts/this-girl-01/research/final-browser-qa.json
python3 scripts/this-girl-01/package.py package
python3 scripts/this-girl-01/publish.py
```

`publish.py` の既定動作はcheckのみ。`--push` では専用media branchだけを更新し、公開後の全ファイルをHTTPで読み戻してSHAを照合します。再encode・入力変更後は古いQAを破棄し、完成ファイルから検査をやり直します。開発PRを自動mergeする機能はありません。

## ブラウザ検査の範囲

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
