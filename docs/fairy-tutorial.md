# 妖精リュミのチュートリアル

## 実装前のウェブ調査（2026-10-26）

以下の資料の本文をオンラインで確認してから実装した。既存ゲームのキャラクターや画面を流用せず、本作向けの案内妖精と会話を作成している。

| 資料 | 確認した方針 | 本作への適用 |
| --- | --- | --- |
| [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)（[本文Markdown](https://developer.apple.com/design/human-interface-guidelines/onboarding.md)） | 短く楽しく任意参加。実操作で教え、関連する場所の近くへヒントを置く。スキップ後は再表示を強制せず、後から見直せるようにする | 起動演出後のホームでリュミが声をかける。承諾すると現在の画面に合った短い案内を開始。ホーム・設定・妖精アイコンから必要なときだけ手動で再開できる |
| [Microsoft XAG 114: UI context](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/114) | ボタンが何をするか、操作後に何が起こるかを事前に伝える。ラベルを対象の近くに配置し、支援技術でも関連を伝える | 実際のボタンを枠で示し、出発・石消費・仮素材の確定を説明。対象に吹き出しへのaria-describedbyを一時付与する |
| [NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | 重要な少数の操作から始め、詳細を段階的に提示する | 最初の街の案内は3項目。出発準備・戦闘・報酬などはその画面に来てから教える |
| [W3C APG: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | aria-modalは実際にモーダルとして振る舞う場合に使う。閉じる操作と適切なフォーカスの扱いが必要 | 通常の案内は非モーダルで、ゲームのボタンも操作できる。Escape・スキップ・キーボード操作を提供。出発確認内の案内は既存モーダルの中に置く |

## 体験

案内役はミント色の羽根を持つ妖精「リュミ」。初回のホームで一度だけ紹介と「案内をお願い！」「自分で始める」を表示する。紹介を表示した時点で案内済みを記録するため、無視して次に起動しても再表示しない。タイトルの開始操作を妨げず、参加は任意。

案内中はリュミの原画、短い会話、対象の光る枠、進行数、前へ・次へ・スキップを表示する。プレイヤーは光っている対象の本物のボタンを直接押す。対象操作は画面遷移前に案内の進捗だけを進める。「このボタンへ」というフォーカス移動だけの中間ボタンは撤去した。操作を自動実行したり、案内の「次へ」で石や道具を消費したりしない。

- ホーム：パーティ、祈願、ダンジョンへの入り口。
- 探索一覧・出発確認：章と解放順、準備、薬の持込、本当の出発操作。
- パーティ：リーダー効果、能力確認、編成。
- 祈願：シリーズと排出内容、単発・10連の費用。無料の模擬抽選は追加しない。
- カバン・設定：薬の補充、バックアップ、音と動きの設定。
- 戦闘の指示待ち：ATTACK/NEXT、作戦、ITEM、必殺ゲージと発動予約。
- 結果：報酬確定、失敗後の再挑戦。腕試しは戦利品なしの説明を使う。

戦闘の演出中には案内を隠し、指示待ちで再表示する。キャラ詳細・祈願演出・他の確認画面とも競合させない。案内を開始した同じプレイ中は、画面ごとの途中位置から案内する。戻る操作で最初へ巻き戻さない。案内が終わった画面では自動で繰り返さず、別の未学習画面で次の案内を行う。次の起動・リロードでは、途中の案内も自動再開しない。必要なときだけ妖精アイコンやホーム・設定から手動で再開する。スキップすると自動案内全体を停止する。

## 保存と実装

`src/ui/fairy-tutorial-data.ts`が会話・安定したdata-guideアンカー・進捗形式の正本。`FairyGuide.tsx`はDOMの実際の位置を測り、スクロールと画面サイズ変更に合わせて枠・吹き出しを更新する。対象がなくても閉じる・次へは使える。

案内の進捗・スキップは端末のlocalStorageキー`stillveil-fairy-tutorial-v1`へ保存する。これは表示上の好みで、GameSave・乱数・所持数・探索・天井・IndexedDBの保存トランザクションを変更しない。ゲームのバックアップには含まれず、別端末では再度案内を選べる。保存が禁止されたブラウザーでも案内とスキップはそのセッションで使える。保存形式はversion 2。以前のversion 1は案内済みとして移行し、最後の説明位置と完了済み画面を維持する。`checkpoints`で画面ごとの説明位置を保存する。実行中かどうかはセッション内だけの状態として保存と分離する。不正な設定は案内だけ初期状態へ戻す。

日本語・英語、タップ、キーボード、動き軽減に対応。出発確認内では案内をモーダル本文の子にし、既存のフォーカス管理を維持する。通常時の説明にはaria-modalを付けない。

## 原画と生成条件

- 原画タスク：Runway `0914273a-a1b8-435a-be15-da6e29422b0a`。
- モデル：GPT Image 2.5 Flare、1:1、1枚、新規生成。参照画像なし。
- ゲーム素材：`public/art/fairy-guide-lumi.webp`、512×512。原画を同じ比率のまま縮小しWebPへ変換。動画は生成していない。
- アセットID：`fairy-guide`。権利情報と寸法は共通レジストリへ登録。

```text
Original anime mobile fantasy RPG tutorial mascot character portrait, one friendly tiny adult fairy guide named Lumi. Charming expressive young adult face, mint-silver short bob, pointed elf ears, large luminous teal eyes, warm welcoming smile, delicate translucent butterfly wings, ivory and mint layered petal dress with tasteful gold trim, tiny crescent hairpin, small glowing star wand pointing to the right as if kindly explaining a game button. Three-quarter seated hovering pose, body and wings fully visible inside frame. Premium polished anime game illustration, soft cel shading, clear silhouette readable at small size, elegant warm cream and pale mint watercolor background with only a few tiny gold stars, gentle and helpful personality. No letters, no text, no logo, no frame, no UI, no watermark. Square portrait composition with head and wings centered in upper two thirds.
```

## 検証

`tests/fairy-tutorial.test.ts`で不正設定、スキップ、途中再開、画面ごとの完了記録を検証する。`e2e/fairy-tutorial.spec.ts`では実ボタンの操作、案内だけではセーブが変わらないこと、途中再開、キャラ詳細との切替、出発確認、戦闘、祈願の非消費、英訳・狭幅、ストレージ拒否を検証する。

初回実装（PR #83）の確認では、単体233件、チュートリアル画面6件、itch用iframe・音声・保存10件が成功し、通常ビルドとitch用ビルドも完了した。追加確認した既存の`e2e/ultimates.spec.ts`の必殺技同期1件は、数値表示と音の予定時刻の差が60ms未満という条件に失敗した。同じテストを変更前のmain `7d5f013` の独立したworktreeでも実行して同じ失敗を確認しており、このPRでは同期処理やその許容値を変更していない。

再表示・巻き戻りの修正では、単体235件、チュートリアル画面9件、itch相当の埋め込みで初回限定・手動再開を確認する1件が成功した。既存形式からの移行、案内を無視したままの再起動、実ボタン操作後の戻る操作、画面ごとの続き、完了済み画面の非再表示を回帰確認している。


## 誓鎖の稽古の案内

専用試練 `oath-chain-rehearsal` の指示待ちには、通常の戦闘説明とは別の `coordination` トピックを使う。既存の妖精ボタンから、予定の読み方・同じ敵への協撃・孤立反撃と免責の3ページを任意で開ける。通常ダンジョンの戦闘説明や完了記録は変更しない。

鎖印が今回の連携相手を示す。仲間の技と対象はATTACK前に読み取れ、考えている間にタイマーは進まない。相手が狙う敵への攻撃は35%強化。相手が支援中の攻撃、または違う敵への攻撃にはラウンド末の反撃があり、基準は左端の最大HP40%。通常の防御・障壁・かばうで軽減できる。防御と補助は安全で、予定の行動を妨げる途中の行動不能や、対象の先行撃破をプレイヤーの誤読扱いにしない。

長いルール説明はこの案内と出発前の説明に置く。通常の戦闘操作盤へ常時説明文を追加しない。
