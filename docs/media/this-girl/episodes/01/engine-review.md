# 桜の返礼：エンジンレビューと保存状況

日付：2026-11-03。状態：**physics固定・新規native試験11件合格を観測。全体検査とバランス認定は未完了。**

## 固定した候補

研究版だけに適用する。障壁量90%、主攻撃の実吸収量/守られた本人の最大HP×500で花びらを蓄え、上限100%。付与ラウンド+2までの次の主攻撃の、最初の実被弾対象への実HPダメージを一度だけ割合強化する。空の印は攻撃だけでは消費しない。印は非重複・非更新であり、受取人の戦闘不能または期限で消える。付与者が後に倒れても、既に支払った印は撤回しない。

追加分は追撃・石特性・追加ゲージの入力にしない。無料の花、連鎖、残響、自動ビットから花びらを増やさない。強制された状態異常の攻撃は印を消費しない。攻撃で最初の対象を既に倒した場合は、追加分を別の対象へ移さない。

## 今回の監査で修正した箇所

1. 研究障壁のAI期待量が元の100%のままだったため、既存の薄い障壁と有効な印へ無意味に再使用し得た。研究契約を持つ障壁だけ、実量90%に合わせた。
2. 残響による戦闘不能でも印を消すようにした。通常ダメージ経路も戦闘不能時に明示的に印を消す。

数値候補そのものは変更していない。公開版の障壁については元の計算と同じ `Math.floor(baseExpected)` と `Math.floor(baseShield)` の分岐を保持する。100を掛けて100で割り直して、無関係な丸め差を導入しない。

GitHubから取得した `src/domain/engine.ts` のblob `0d9632346e2d7308a4029cb1209188c77853fe87` に、上記の修正が既に含まれていることを読み取り確認した。不要な重複更新はしていない。

## 実行して観測した試験

新規ファイル：

- `tests/barrier-return.test.ts`：5件。実吸収限定、空印、上限、非重複/非更新、1回消費、期限/死亡、付与者死亡、中立化の費用維持、不正な状態。
- `tests/barrier-return-engine.test.ts`：6件。通常/研究版隔離と安定ID、既存ステージ定義の同一性、native実吸収から一度だけの強化、追加行動/RNG/ゲージを生まないこと、overkillの非転送、guard実受取人、ビット/無料花除外、保存再生と旧セーブ保全/不正印拒否。

実行コマンド：
```sh
node_modules/.bin/vitest run tests/barrier-return.test.ts tests/barrier-return-engine.test.ts
```

接続が切れる前に、ツール出力で以下を観測した。

```text
Test Files  2 passed (2)
Tests       11 passed (11)
Start at    12:11:22
Duration    4.31s
```

ログはローカルの `artifacts/this-girl-01/research/engine-unit-first.log` に出力したが、環境offline後にログそのもののバイト取得・SHA算定はできていない。この文書は観測したツール出力の転記であり、未取得のログをアップロードした証拠ではない。

これらのnative試験は、隔離したHP/行動順/ビット状態などを使う回帰用fixtureである。研究用の専用ステージや実プレイ勝率の証拠ではない。通常ダンジョンの追加・敵弱点・報酬の変更は行わない。

## コード確認と未完了事項

コード上、CompanionChoiceは `actionSelection` のあるイベントだけを次の行動として扱う。資源記録を次の技能と誤表示しない。UI表示は共通UnitEffectsと個体別characterSkillsを通す。音の資源記録は有料技能を再度鳴らさない構造だが、今回の実音声/browser検査はまだ実行していない。

環境が再度 `connectivity: offline / observed_phase: running / failure: null` となったため、以下は未完了。

- 最新ソースでの全既存テスト。
- 公開/研究版の最終buildと全check gate。
- Chromium/WebKitのnativeUI、状態アイコンの高さ/位置、既存の長押し・画像・音回復のE2E。
- 公開版に影響しないことのnative複数seed trace検算。
- 研究の最終確認、勝率、代替比較、全キャラ監査、認定。

この11件の合格を、全体の検査完了やサクヤヒメの採用価値の認定としない。比較研究では、固有追加効果を中立化しても印/消費/AI/CD/90%障壁という費用を残す。確認データ取得後にphysicsを変更した場合、その版に依存する計測を再実行する。

## 実行環境復旧後の追加確認（2026-11-03 13:18 UTC）

`src` 全体がHEADと一致し、engine blobが上記凍結値のままであることを確認した。研究opt-inと通常envの双方で新規2ファイル・11件の試験が合格した。opt-in時のpublic比較fixtureは、flagを一時0にして実際の公開moduleを独立ロードする。異なるmodule間のダンジョン定義は参照同一性ではなく深い一致を検査する。公開内容の再構成やproduction sourceの変更は行っていない。

`VITE_SAKUYA_RESEARCH=1` を全工程へ適用し、typecheck・content（75キャラ/445技能/192ダンジョン、sakuya-research-v2）・UI契約・localesとVite buildが成功した。出力先は `/tmp/stillveil-sakuya-research-dist` であり、公開配信物ではない。標準stamp/release・視覚音声承認を行ったという意味ではない。

実行コマンド、全src SHA-256、試験source SHA-256、実ログのSHA-256を `artifacts/this-girl-01/research/engine-verification-current.json` に保存した。ログは同ディレクトリの `engine-tests-current.log`、`engine-tests-public-current.log`、`research-build-current.log`。WebKit/nativeUIと最新CIのE2E完了・全体試験件数は引き続き未確認であり、別途記録する。

## 研究UIのWebKit確認（2026-11-03 13:27 UTC）

別originの研究buildでnativeUI既存4件が合格した。操作portalの画像・文字の選択防止、入力欄の選択維持、先頭とleaderの独立操作・保存、320/390pxの日英編成ボタンを実際のWebKitで検査した。追加の研究UI試験1件も合格し、実図鑑の個別技能名と90%説明、未充填印の非表示、充填した小花、タップ先の説明、操作列の位置/高さの維持、横overflowと長押し選択防止を確認した。これはUI用の人工状態fixtureであり、攻略成績の証拠ではない。

不足していたliblzo2とlibGLESv2は公式Debian debを `/tmp` に展開した。両libraryを実ロード後、ldconfigキャッシュだけを見るPlaywrightの事前判定をこの実行に限り省略し、実ブラウザ試験は全件実行した。URL/SHAは `webkit-library-provenance.json`、実ログは `research-webkit-current.log`（4件）、`research-flower-webkit-current.log`（1件）。資源イベントが追加の効果音を要求しないnative assertionも追加し、最終sourceで通常/研究envの双方の11件合格を再確認した。実音声の最終動画との照合は収録担当の別検査である。

再現時は研究build後、`VITE_SAKUYA_RESEARCH=1` を指定し `playwright test --config playwright.sakuya-research.config.ts` を実行する。恒久helperは `scripts/this-girl-01/verify/preview.mjs`、手順は同ディレクトリのREADME。`SAKUYA_UI_DIST` / `SAKUYA_UI_PORT` で研究buildと隔離originを指定できる。不足libraryを一時展開したhostでは同じLD_LIBRARY_PATHも指定する。configはworker1・WebKit1台・port4197を既定とする。helperの移動後はnode構文検査と実HTTP 200応答が研究indexとbyte一致することを確認し、`preview-http-check.json` に保存した。公開版の保存領域や配信物を書き換えない。
