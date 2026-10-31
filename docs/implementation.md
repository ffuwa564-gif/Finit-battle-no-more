# 実装・動作確認・公開手順

初期実装はReact＋TypeScript＋Viteの静的Webアプリです。ゲーム状態はブラウザーのIndexedDBに保存し、配信先はCloudflare Pagesを想定しています。アカウント接続、Cloudflareプロジェクト作成、DNS設定、実デプロイは行っていません。これらはユーザーが行います。

## 開発

```sh
npm ci
npm run dev
```

Viteの表示URLをブラウザーで開きます。画面のURLはhashで切り替え、サーバー側の画面ルーティングを必要としません。同一オリジンの同じブラウザープロファイルで再開してください。プレビューURL、本番URL、独自ドメインではセーブ領域が異なります。

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` は開発確認用です。型、全コンテンツ定義と実アセット、共通UIの使用経路を検査してから `dist/` を作り、実装と出力ファイルのハッシュを接続するビルド記録を残します。公開承認が済んだことは意味しません。公開包装はその後にソースや出力が変わっていれば拒否します。

## コンテンツとUIの追加

1. `src/content` の単一台帳へ追加します。既存効果で表現できる追加に、キャラ固有の戦闘コードや画面別の登録配列を作りません。
2. 画像は `public/art` に置き、台帳にアセットID、パス、種別、寸法、アンカー、権利情報を登録します。
3. `npm run check:content` で全参照・役割・意味キー・素材・公開入手経路・ファイルを検証します。
4. `npm run check:ui` で、画面層の独自ボタン、ネイティブ要素への操作処理、内部UI・音声APIの直接使用、inline style等を検出します。共通部品は `src/ui` の公開窓口から使ってください。許可した例外はcomposition rootの音声イベント接続だけです。
5. 共通プレビューで追加した画像・文章・演出を確認します。静的チェックは顔の切り抜き、読みやすさ、音の適切さまで保証しません。共通部品を変更した場合は既存画面への影響も確認します。

## SEとBGM

SEは共通のbattleSounds/commandSoundsを型付きRecordで定義し、操作や戦闘イベントが増えた際の設定漏れをコンパイル時に検出します。ボタンのクリックに加え、敵ページのスワイプ・左右キー、ダイアログのEscape終了、薬・購入・交換・出発・報酬確定・会話・失敗にも共通SEを割り当てます。ラウンド・演出送りはボタン音と戦闘イベント音、設定変更はボタン音を使います。音声初期化中の直近2秒以内のイベントを最大8件保留し、初回の戦闘音が失われるのを防ぎます。

従来の出力係数0.18を0.9へ引き上げ、音源のレベルも増幅しました。最終段に-2dBのリミッターを置き、レア素材等の重なる音のピークを抑えます。保存済みの音量・ミュート設定は維持します。ブラウザーテストでは実際のWeb Audio出力を測定し、音の有無と過大なピーク、ミュートを確認します。

SEはTone.jsのシンセサイザーで生成します。`src/platform/audio.ts` の共通イベント窓口に集約し、画面・キャラごとに別の再生処理を作りません。最初のユーザー操作後に音声を有効化し、SE音量0でミュートできます。ブラウザーが音声を拒否・中断してもゲーム結果には影響させません。

通常素材、レア素材、希少素材では異なる音列を再生します。レアな音は音量だけでなく音数・余韻で区別します。BGMは指定ページからホーム用「悲しみの曖昧な対象」、戦闘用「渦巻き」を選定し、規約確認後に同梱しました。[曲と利用条件](music-credits.md)に取得日・出典・ハッシュを記録しています。初回操作でHTMLAudioElementを有効化し、街と探索でループ曲を切り替えます。設定からSEとは独立してBGM音量・ミュートを保存できます。非表示タブでは一時停止し、復帰時に再開します。音源・自動再生の失敗はゲーム進行を止めません。

## 視聴確認と公開ゲート

```sh
npx tsx scripts/check-approvals.ts --report
```

`.reports/content-review.json` に、コンテンツ版と実装・画像等のファイルハッシュを出力します。この操作は承認を記録しません。共通プレビューと実際の画面を見て、各イベントの音を聞いた担当者が、確認後にルートの `content-approval.json` を記録します。

```json
{
  "contentVersion": "レポート内のcontentVersion",
  "fingerprint": "レポート内のfingerprint",
  "reviewer": "実際に確認した担当者名",
  "confirmedAt": "実際の確認日時のISO文字列",
  "visualConfirmed": true,
  "audioConfirmed": true
}
```

未確認のまま上記のフラグを真にしてはいけません。現行の初期ゲートは、版・全ファイルの集合をまとめて確認する保守的な方式です。差分IDごとの確認記録再利用は設計書の拡張要件であり、まだ実装していません。内容が変わると承認は失効します。承認のない初期状態では公開用コマンドが失敗するのが正しい動作です。

```sh
npm run release
```

テスト、開発ビルド、視聴承認がすべて成功した場合だけ、Cloudflare Pagesへ渡す `dist-release/` を生成します。コマンドはアップロードしません。`dist/` 単体を本番へ出すと、固定版再開用の起動ページが含まれないため、本番用の出力先には使いません。

## Cloudflareへの受け渡し

- ビルドコマンド：`npm run release`。
- 公開ディレクトリ：`dist-release`。
- 公開用の視聴確認記録をコミットしてから実行してください。初回の接続・配信設定はユーザー担当です。
- 初期構成ではWorkers、R2、D1、秘密鍵、APIトークンは不要です。
- 本番オリジンを固定してください。URLの変更はブラウザー保存先の変更です。
- `_headers` は起動ページ・配信一覧の再検証と、リリース配下のimmutableキャッシュを分離します。実際のCloudflare配信で適用状態を確認してください。

`dist-release/index.html` は安定した起動メタだけを読み、進行中の探索があれば同じオリジン内の `/releases/<appVersion>/` を選びます。保存メタと対応リリースが不一致なら、セーブを消さず停止します。各リリースにはindex、実行コード、画像、互換manifestを含めます。既存ディレクトリの内容を別物で上書きする場合は、同じ版を再利用せずappVersionを上げてください。

以前のリリースは、次の成果物の `dist-release/releases/` にも残す必要があります。ローカルで残っているディレクトリは包装時に維持・ハッシュ検証しますが、クリーンなCI環境には自動復元されません。過去の承認済み配布物をCI入力として復元してから包装してください。Cloudflareの過去デプロイURLを旧版アセットの保持先と見なさず、未確定探索がある利用者向けの旧ディレクトリを欠落させないでください。

初回は旧リリースが存在しません。二回目以降の公開では、同じ本番オリジンの旧index、manifest、主要画像・音が取得可能で、HTMLの誤応答ではなく期待した形式・内容・ハッシュであることをプレビュー配信で検証してください。URL変更、アップロード失敗、キャッシュ設定、古い版の削除までローカル包装だけで保証することはできません。

## 現段階の限界

- 配信確認、実機での音と見た目の最終承認は別途必要です。
- 初期リリース0.1.0／保存形式1以外のセーブ移行は未実装です。対応できない版を自動初期化しません。
- ローカルセーブの不正改変耐性、複数端末同期、サーバー抽選は提供しません。
- コンテンツの数値バランス・周回時間・素材獲得分布は、実プレイで確認する課題です。

## 現在の画面とアセット

アプリアイコンは銀髪の女性を顔中心で描いた新規生成原画app-icon-portrait.png（1254px）です。角丸を焼き込まず、背景は不透明。縮小書き出しのapple-touch-icon.png（180px）をiPhoneのホーム画面追加とブラウザーfaviconで共用します。

ホームは少女と狼の原画、生成した3列×2段のメニュー、探索入口、下端ナビを同じ額縁に収めます。メニューは単色のロゴ原画を使い、ホーム内ナビも単色へ揃えます。戦闘用パレットは月光色の半透明パネルと銀の細枠を使います。モバイルの残る画面高は原画・敵ステージへ配分し、枠外のpaddingや不要なスクロールを作りません。

menu-logos.pngは少女の横顔・狼・カバン・結晶・開いた本・羅針盤を単色の紋章として生成した透過原画です。共通AtlasIconがメニューの台帳参照と表示範囲を管理します。ホーム下部のナビは同じ線幅のシンプルなSVGアイコンで統一します。

戦闘の下部は保存した新しい見本 modern-command-palette.png に合わせ、BattleControlPad内で作戦3種を横並びの選択パネル、ITEMを小カード、音量・速度・RETREATを補助操作、ATTACK/NEXTを全幅の大きな進行ボタンとして構成します。方向パッドと丸いボタンは使用しません。新規生成のcommand-moonlight.pngを選択状態と進行ボタンに使い、細い銀枠・半透明の青灰色面・共通線画シンボルを重ねます。英語ラベルは実テキスト、操作名・選択状態・無効状態は共通Buttonで維持します。ATTACKは既存のラウンド進行、NEXTは演出送りで、戦闘ロジックは変更しません。パーティ帯は顔とHPのみです。

敵6種は、切り抜きの立ち絵と別背景を合成する方式を廃止し、1536×1024の背景込みの一枚絵を使います。人物は女性のみで、自然な顔・手と読みやすい衣装の面を優先します。CharacterDef.encounterArtIdで戦闘用の絵を指定し、公開ダンジョンの敵に未登録・不正なシーンがある場合はコンテンツ検査で拒否します。敵の図鑑・仲間カードも同じ新原画を参照し、旧透過素材を再表示しません。

公開コンポーネント名EnemyCarouselは互換のため維持していますが、内部は1枚のenemy-pageを表示するページ切替です。3D回転、控え敵の重ね描き、案内文はありません。左右ボタン・左右キー・横スワイプで表示UIDだけを変更し、セーブ・攻撃対象・行動順は変更しません。行動やボス会話へ追従し、撃破時のドロップ元も保持します。ページの短いフェードは動き軽減設定で停止します。

敵名・HP・定数は最上部へまとめ、Wave・ラウンド・仮取得素材数を同じHUD内に表示します。スキルトーストはHUDより下、ボス会話はステージ下部へ配置します。背景込みの絵全体を跳ねたり点滅させず、戦闘イベントの共通粒子とSEで行動を示します。素材は出現からカバンへ収納する演出と、最終の獲得確定を分離します。

PortraitArtは台帳のanchor・portraitZoom・portraitOriginを使い、ホーム・パーティ・敵カードの顔表示を共通化します。題字には端末内の明朝とNoto Serif CJK JP／Noto Serif JPのfallbackを使用し、外部フォント配信は追加しません。数字は共通設定で等幅・ライニング数字に揃えます。紙肌はローカルの手続き的SVGをパネル背景へ薄く適用し、顔や文字には重ねません。

## シェーダーとパーティクル

SceneEffectsはホームと敵の一枚絵に透過Canvasを重ねます。fx-rendererはWebGL1のGLSLで月光・薄霧を描き、GL_POINTSで攻撃・範囲魔法・回復・防御・強化・弱体・ドロップ・Wave・敗北の共通演出を描きます。レア素材は金、希少素材は淡い紫の星状粒子と光輪を使います。同じBattleEventからGSAP・Tone.jsの生成SE・GPU演出へ接続し、視覚乱数と戦闘の乱数を分離しています。

最大30fps、DPR1.5、140万画素・各辺2048px、粒子176個・光輪5個を上限とします。非表示タブ・画面外で停止し、退出時にGL資源とリスナーを解放します。ゲーム設定とOSのprefers-reduced-motionを尊重し、WebGL非対応・初期化失敗・コンテキスト喪失時は静的な月光へ切り替えます。Canvasは入力を受けません。CIではSwiftShaderで実GLSLを検証し、物理端末の性能・発熱は実機確認の対象です。

## 数値と通知のフィードバック

CombatFeedbackは戦闘イベント直前のUnitとunitsAfterのHP差から、対象ごとの実ダメージ・実回復量を表示します。範囲攻撃の合計amountを各対象へ重複表示しません。かばう場合は実際にHPが減った味方、回復上限では実際の回復量を使います。薬は保存完了後に同じ差分計算へ通知します。演出は戦闘・乱数・保存・進行タイマーを変更しません。

敵へのダメージは金白、味方の被ダメージは赤、回復は緑の符号付き数値です。表示中の敵・味方は当該位置へ、ページ外の敵は名前付きでステージ内へ表示します。1.15秒で消え、動きを控えめにする設定では移動・拡大を止め、数値は残します。

NoticeSurfaceは新規生成のnotice-moonlight.pngを使い、スキル・ボス会話・成功/エラー通知の銀枠と月光色を統一します。文言は画像に焼き込まず実テキストで読み上げ可能に保ちます。

## 初期ガチャコレクション

`src/content/gacha.ts`のinitialGachaが「ゴス☆イザナミコレクション」の名称・SSRの表示順・石コスト・排出率・保証回数を定義し、画面と抽選処理が共用します。SSR2体をGachaShowcaseで並べ、R/SR2体も別枠で確認できます。獲得時は共通のキャラ詳細を表示し、重複する獲得トーストを省きます。キャラ詳細にはレア度も表示します。

保存済みの所有・編成・スキル参照を維持するため、既存のガチャ専用4枠の内部IDは保持し、表示名・文章・絵を更新しています。evelyn＝イザナミ、asteria＝アマテラス、mireille＝コノハナサクヤヒメ、iris＝アメノウズメです。強さ・役割は既存の定数予算に従い、特別な隠し倍率は付けません。スキル名は定数と効果テンプレートの正本内で更新し、同じ効果の別名スキルによるクールダウン回避を作りません。

4枚のgacha-*.pngは1024×1536の背景込みの生成原画です。黄泉・太陽・桜と富士・神楽という象徴、髪型、表情、衣装、構図を描き分けます。R/SRは静止画のまま、SSR2体には後述の動画を追加しています。

## ホームのアニメーションとキャラ選択

ホーム原画 `menu-hero.png` の銀髪女性と白い狼をRunwayで動画化しています。現在版は髪の量・長さ・輪郭を保ち、数本の束と毛先だけを小さく揺らす指示で再生成しました。一本ごとの実写的な流れや、強風で髪全体が大きく膨らむ動きを抑えています。原出力は1440×1440・約10秒、配信用は1080×1080・24fps、H.264 High Level 4.0／yuv420p・faststart・無音で、逆再生をせず順再生でループします。実行時は同じ配信元の `public/video/home-portrait-anime.mp4` を読み込みます。

ホーム左下から、所持キャラの原画・アニメーションへ切り替えられます。選択はリーダーや編成とは別の任意設定で、旧セーブ・バックアップも維持します。[仕様](home-characters.md)を参照してください。

`AnimatedIllustration` は原画を常に背面へ置き、動画準備後にフェード表示します。再生・停止、画面外・別タブ・候補一覧の背面での停止、動き軽減・通信量節約、動画エラー時の原画表示に対応します。動画アセットのパス・寸法・ftypヘッダーは共通のコンテンツ検査を通します。既存の正式公開前の視聴承認チェックを維持します。

2026-10-24: iPhoneのアプリモードで自動再生できない報告に対応。muted/defaultMuted・autoPlay・playsInlineを揃え、自動再生の拒否を動画ファイルのエラーと分離。準備中も再生ボタンを表示し、再生/停止アイコンは実際のplaying/pauseイベントに追従します。OSによる停止後もタップで復帰できます。


## ガチャSSRのアニメーション

イザナミとアマテラスにそれぞれ約10秒の無音動画を追加しています。既存gacha-izanami.png / gacha-amaterasu.pngを原画に、Runwayで生成します。イザナミは視線・首の動き、黄泉の紫灯、ヴェールと冷気、アマテラスは微笑み、八咫鏡に流れる光、日輪とリボンを中心に描き分けます。開始・終了には同じ原画を指定し、生成された全編を順再生します。逆再生編集は使用しません。

生成タスクはイザナミ `d2d265ba-0283-46ed-84cd-bdee1ffd8ccf`、アマテラス `3b46aceb-e02f-4277-9ec0-ba114d5afcf1`。原出力はともに1176×1764px・約10.04秒です。iPhone向けに720×1080px、H.264 High Level 4.0 / yuv420p、24fps、faststartのMP4へ変換し、音声を除いています。イザナミは約1.37MB、アマテラスは約1.19MBです。実行時は外部生成サービスへアクセスせず、同じ配信元のローカルアセットを使います。

CharacterDefの任意motionIdで動画アセットを参照し、参照先がvideoであることをコンテンツ検査で保証します。CharacterArtworkが静止画/動画を選択し、紹介・キャラ詳細・獲得結果で共有します。SSR専用の条件分岐を画面ごとに作らず、動画未登録キャラは静止画のままとし、動画登録キャラは顔アイコン・戦闘の顔グラにも後述の軽量動画を使います。再生制御はホームと同じAnimatedIllustrationで、停止・再読み込み・画面外/別タブ停止・OS/ゲームの動き軽減・データ節約設定を共用します。

紹介カードの詳細ボタンと動画の停止ボタンは兄弟要素とし、ボタンを入れ子にしません。詳細モーダルを開いている間は背後の紹介動画を停止し、閉じると再開します。ユーザーが手動停止した動画は、モーダルを閉じても停止を維持します。抽選率・石コスト・SSR保証・キャラの強さは変更しません。


## イベント「宵宮に咲く九尾」

`src/content/boss-events.ts`がボス収集イベント・段階・補正・素材・交換費用の正本です。EventDefとDungeonDefの参照から共通EventDungeonsを生成し、ダンジョンの「イベント」タブに表示します。通常ダンジョン10件、祈願石イベント3件、葛葉イベント5件を区別し、ガチャ公開条件は通常ダンジョンの件数だけを使います。

素材は既存の保存形式へ追加できる`kuzuha-contract:rare`（契りの欠片）と`:epic`（覚醒核）。予約した素材種族を通常敵に指定することと、その素材の合成・分解を拒否します。ボスは専用素材を確定個数だけ仮取得し、道中は従来素材を落とします。専用素材も共通のドロップイベント・SE・レア演出・報酬確定・全滅時喪失を使います。部外の難易度に覚醒核を設定する参照はコンテンツ検査で拒否します。

仲間化はeventRecruitコマンド。通常版30欠片、覚醒版5核で、未所持・イベント公開・クリア実績・必要な通常版所持・素材残高を検査し、費用と所持追加を一括保存します。葛葉のfamilyIdは両形態で共通とし、UI・コマンド・戦闘生成・セーブ互換性検査で重複編成を防ぎます。既存キャラ・通常ダンジョンの数値と保存フィールドは変更しません。

ボスのHP/攻撃の百分率は戦闘生成と難易度表示が共用します。`npm run balance:events`で1750戦を再計測し、結果を`docs/reports/event-balance.json`へ保存できます。戦闘の条件と結果の解釈は設計書7.2節を参照してください。

原画はimage generationで制作した1024×1536pxの背景込みイラスト2枚。覚醒版はRunwayタスク`aaafd36f-ba2c-4282-a8d8-a263ac011992`で動画化しました（最初のタスク`6ee01c86-497b-4272-bf9e-5259d8c34c5d`はテキストの入力判定で失敗し、簡潔な動作指示で再生成）。原動画1176×1764px・約10.04秒を、720×1080px・24fps・H.264 High Level 4.0 / yuv420p・faststartの無音MP4、約2.47MBへ書き出しました。逆再生は使用せず、生成元を別途保持しています。紹介・取得・詳細・覚醒ボス戦で同じAnimatedIllustrationを使い、非表示停止・動き軽減・手動再生・エラー時の再読み込みを共用します。

祈願石周回3種（src/content/events.ts）とも共存し、ダンジョン入口は通常・イベント・祈願石の3タブ。ボス収集は `#dungeons/boss-events`、祈願石周回は既存の `#dungeons/events` を維持します。石は最新の共通dungeonStoneRewardに従い、通常初回3個・両イベント毎回1個で、報酬確定時のみ付与します。


## 顔グラと敵の共通アニメーション

PortraitArtはmotionIdのあるキャラにAnimatedIllustrationを使い、portraitMotionIdがあればそちらを読みます。イザナミ・アマテラス・九尾葛葉には元動画から320×480px / 18fps / H.264 Constrained Baseline Level 3.0の顔グラ用MP4を作成しています。各原画に対応する元動画から、動きを維持した顔グラ版を書き出します。小さな表示に停止ボタンを重ねず、親の編成/詳細/回復ボタンを保ちます。自動再生が止められたときは次の実操作で再試行します。

元絵と動画は同じアセット台帳のanchor・portraitZoom・portraitOriginを使います。中央寄せになっていた葛葉を上端基準・倍率2.6・原点上端へ修正し、動画登録キャラも同じ顔中心の設定へ揃えました。画像だけに重ねて倍率を適用していた既存CSSを直接の画像に限定し、動画とポスターで二重拡大の差を作りません。

MotionSettingsProviderがゲームの動き軽減設定と詳細/祈願オーバーレイの停止状態を顔グラへ渡します。OS設定・データ節約・画面外/非表示タブ停止も共通AnimatedIllustrationに従います。戦闘の敵は入手区分で動画を制限せず、motionIdだけで再生を選び、縦長の素材は顔がHUDに隠れない共通の配置へ揃えます。

2026-10-24: 縦長の敵絵を44px下げる配置を廃止し、原画の上端から画面を満たす配置に修正。縦長素材の時だけ上部HUDをコンパクトな半透明表示へ切り替え、顔・月・鳥居に重なる範囲を減らします。切り替え元の絵も同じ位置基準でページ送りし、動画の再生成や追加デコーダーは使いません。


## ゴス☆イザナミコレクションのSR/R拡張

`toyotama`（SR1.7）、`wakahirume`（SR1.9）、`iwanagahime`（R1.3）、`kukurihime`（R1.4）を追加しました。各`gacha-*.png`は画像生成した1024×1536pxの背景込み原画で、原本を別途保持しています。静止画4枚を共通台帳からガチャ紹介・図鑑・獲得・詳細・顔グラへ接続します。既存の保存契約やキャラIDは維持し、セーブ移行は不要です。

2人回復・障壁破壊・強化解除は共通SkillTemplateへ追加。既存スキルIDを残し、mend_pairのスキルIDだけは安定IDの規則に合わせ`mend-pair-17`のようにハイフン化します。意味キーはテンプレート＋強さ単位で変えず、同効果の別名による待機時間の回避を認めません。SkillTemplateごとの音をskillSoundProfilesに列挙し、新規テンプレートの音指定漏れを型検査で防ぎます。

新しい永続効果・イベント種別は増やしていません。既存のHP・障壁・攻撃強化・再生フィールドを共通ロジックで処理し、保存済みのスナップショットとスキル参照を保持します。全身絵のanchorもCharacterArtworkが台帳から読み、追加4枚は上端からの表示で顔が切れないようにします。排出率・天井・石コスト・重複還元・既存キャラの能力とスキル構成は維持しています。


## 一部キャラの胸元の表現調整

サクヤヒメ・トヨタマヒメ・ククリヒメ・葛葉（通常／覚醒）の原画5点を、顔・衣装の意匠・背景構図を引き継いだまま、バストと胸元の強調を控えた編集版へ更新。既存のアセットパスを維持し、ガチャ・詳細・編成・敵の表示が共通原画を参照します。他キャラやゲーム内パラメータは変更しません。

編集原本：サクヤ`exec-2097370e-013d-44ea-baab-488049d60a03.png`、トヨタマ`exec-dca506e2-c39b-43ca-b66f-48c69d06c575.png`、ククリ`exec-59917a1b-b6d2-47e0-bc99-71543560e10e.png`、葛葉`exec-d1bf230c-10b7-4a04-b7fe-b95159799baf.png`、覚醒葛葉`exec-835ef3d7-b9d8-4fd8-99a8-e8c61c13b4e9.png`。調整前の絵はGit履歴に保持しています。

覚醒葛葉は調整版原画から10秒の動画を再作成（Runway task `7b9e961c-2a25-47cc-89f1-2f537bc7d520`）。全身表示と顔グラ用の両MP4を同じ新動画から書き出し、静止画と動画の体つきを揃えます。顔・髪・九尾・袖・狐火の動きは残し、カメラを固定します。

## 通常ルートの記憶と覚醒

`seris-story.ts`にストーリー、固定関係者4人、段階別フレーバー、専用素材、覚醒レシピ、固定遭遇と追憶5ステージを定義。CharacterMemoryDef / AwakeningDef / StorylineDef / NamedMaterialDefを共通契約とし、覚醒の前提・素材名・進捗をUIとコマンドで共有する。専用素材は名前付きの隔離種族として既存の素材マップに格納し、保存スキーマの追加は不要。既存ID・スキル・所持・踏破・探索スナップショットを残す。

`awaken`は探索外でのみ受理し、元キャラ、全ての前提覚醒、確定踏破、確定素材を検証してから一度の保存で消費と所有追加・編成置換を行う。人物そのものは消費しない。familyIdで同時編成を禁止する。保存済みownedIds・discoveredIdsから章の解放を導出するため、既読フラグの移行は不要。未解放本文は画面へ出さない。

追憶はnormal種別とstoryIdを持つ。通常の10ルートを既存順で表示し、追加5ルートは通常内の「追憶・覚醒」に表示する。bossLootの確定＋保存済みseedでの追加抽選を共通撃破処理に追加。素材の仮取得、演出、SE、確定、喪失は従来の処理を使用。カバンへ未吸収のドロップはイベント数ではなくamountを合計して差し引く。

コンテンツ検査は、覚醒専用形態・同一家族の通常版・一意の元キャラ・循環しない前提・関係者集合と最終前提の一致・専用素材の通常敵流用禁止・確定/追加ドロップ・参照先を検証する。dawnテンプレートは既存attackイベントと効果音を使い、状態フィールドを追加しない。防御低下ボーナスはかばう後の受け手で判定する。

原画：セリス覚醒 `exec-5c3592c7-3996-4fe5-bc74-1ad217d1da3c.png`、リゼット `exec-cbaaddee-f0df-4674-b5dd-2a78555727f9.png`、エレイン覚醒 `exec-5607e2ef-ece4-4d35-a640-534966116d60.png`、リオラ覚醒 `exec-b6a44099-5e94-491d-8717-e0e7d890a40f.png`、ノエル覚醒 `exec-86b7a173-04c0-46c2-9e47-eeb262753e1b.png`、リゼット覚醒 `exec-e7f73cc6-8c53-4361-9b1a-7fb9c956b4cd.png`。いずれも1024×1536の背景込みイラスト。既存の胸元を控える美術方針を適用している。

セリス動画：Runway task `5e312a67-100d-448a-afa6-b2b00b7a8bb7`、10秒、無音。全身版720×1080/24fps/H.264 High Level 4.0、顔グラ版320×480/18fps/Constrained Baseline Level 3.0。共通AnimatedIllustrationの自動再生復帰・手動再生・画面外停止・設定連動を利用する。

戦闘試算：seed 1〜20、均衡、回復薬5個（HP50%未満で使用）、リオラをリーダーにした初期4人で、関係者の通常固定遭遇と追憶4種はそれぞれ20/20踏破。最終追憶は初期編成0/20、エレイン・リオラ・ノエルを覚醒した3人と通常セリスでは20/20踏破（平均16ラウンド）。ガチャSSRなしで到達する一例を確認したもので、全ての編成の勝率を保証するものではない。

## 動画と静止画の構図の再発防止

全動画に専用の表示静止画を登録し、動画・顔枠動画それぞれの先頭フレームからPNGを書き出します。`npm run export:motion-posters` で生成し、ビルドのコンテンツ検査で登録寸法・実寸・先頭フレームの画素一致を確認します。更新漏れや同じ寸法の別構図も検出し、検査時の自動修復は行いません。[詳細と制作手順](animation-posters.md)


## 左端キャラの任意指示と仲間の選択演出

左端は `battle.partyIds[0]` の操作枠で、リーダースキルの担当とは独立する。長押し約320msから右側の半円パレットへドラッグして離すと、通常攻撃・所持スキル・防御・必殺技を一手だけ予約する。中央へ戻して離す、PointerCancel、Escape、画面離脱で選択を閉じる。タップまたはキーボードでも開き、各ボタンから選べる。説明は既存の妖精ガイドへ置き、常時表示の説明文は増やさない。

`partyOrder` と `focusEnemy` は探索IDを照合し、既存の保存トランザクションを使う。予約は変更・取消・再開が可能。演出中のコマンドは直前の保存を待ち、現在の探索IDで再検証する。ラウンド全体を先に確定する既存方式のため、演出中の指示は次の未解決ラウンドへの予約とする。既に確定したイベント・素材・ゴールド・乱数を巻き戻さない。未操作時の行動選択と、他の仲間の既存必殺予約は維持する。

指示は行動順の実行時にも再検証する。使用不可になったスキルは自動選択へ戻り、睡眠などによる行動不能・強制行動を優先する。対象の撃破時は生存する敵へ変更し、回復・補助は各テンプレートに沿って味方を自動選択する。防御は本人の一手を使い、次の行動が始まるまで被ダメージを半減。状態は共通の付与効果一覧から確認でき、Wave移動で解除する。

敵の手動ページ送りは閲覧だけを変える。パレット確定とATTACKは、その瞬間に表示中の生存敵IDをコマンドへ添付し、指示と対象を一度の保存で確定する。ピンと足元の輪で確定した狙いを表示し、閲覧や演出による自動ページ送りは狙いを変更しない。狙った敵が別ページにいるときはピンのボタンで表示を戻せる。Wave移動で旧ターゲットを解除する。

仲間の選択演出は確定した主行動に付けた `actionSelection` と技IDから表示する。推測したランダムな技は使わず、追加の戦闘待ち時間や乱数消費を生まない。右3人の顔グラ上に吹き出しを表示する。180msずつずらして約620msの選択カーソルを動かし、選択後は実際のコマンド名をその主行動の終了まで残す。吹き出しはポータルで描画し、額縁の背面に隠れない。プレイヤーのパレットを開いている間と必殺技中は隠し、動き軽減時は選択アニメを省略して技名を表示する。旧セーブには新フィールドがなくても互換性を保つ。


### パレットの視覚整理と参考資料

2026-10-31に『鳴潮』『崩壊：スターレイル』の公式App Store掲載画像と、Prydwenの戦闘解説を確認。鳴潮の戦闘画像に見られる小さな単色アイコン、薄い外周線、控えめな通常状態と強い選択状態を参考に、独自の濃紺と銀のデザインへ整理した。画像やロゴの流用はしない。ターン制の行動区分は参考にするが、本作の一ラウンド一行動・任意指示を維持する。

- [鳴潮 公式掲載画像](https://apps.apple.com/jp/app/id6475033368)
- [崩壊：スターレイル 公式掲載画像](https://apps.apple.com/jp/app/id1599719154)
- [Prydwen: Combat and exploration](https://www.prydwen.gg/star-rail/guides/combat-and-exploration/)

半円の半径を112pxから88pxへ縮小。ボタンのタッチ領域44pxは保ち、技名と対象の確認欄を上へ移して横幅を抑える。暗い非選択状態、明るい選択状態、金色の必殺技の3段階で判別する。


## 仲間の仕草と、確定後のコマンド公開

指示待ちには仲間の仕草のみを表示する。技名・対象・攻撃/支援の正解分類・連携相手は公開しない。仕草は公開されている役割・HP・状態異常から作り、非公開の行動計画を参照しない。長押しパレットにも相手の確定コマンドを表示しない。仕草を押すと人物詳細の「戦い方」を開き、実際の役割AIの行動傾向を確認できる。通常ダンジョンでも仕草を読むことができる。

ATTACKでラウンドを確定した後に、実行する仲間の技と対象を吹き出しで公開する。誓鎖の稽古ではその時点のスナップショットから行動を決め、使用不能・対象撃破・状態異常への通常の再検証を通して素早さ順に実行する。プレイヤーの指示が仲間の事前予定を引き直すことはない。演出中の指示は次ラウンドへの予約とし、確定済みの結果は書き換えない。

「誓鎖の稽古」は、実際に異なる仲間の攻撃が同じ敵へ続いたとき、後の攻撃の与ダメージが35%増加する。宣言の一致だけでは強化しない。かばうによる実際の受け手も判定する。範囲攻撃の強化は連携が成立する受け手だけに適用し、同じキャラの連続ヒットだけでは成立しない。自動行動が非公開の計画を読み取って正解を選ぶ特例は廃止した。

固定の40%孤立反撃は廃止し、試練の女神が3ターンごとに先頭を狙う予告付き大技を放つ。対象は警告欄に明示し、指示確定時に選んだ自己防御は素早い敵の攻撃にも間に合う構えとなる。防御は通常の一行動を消費し、追加行動を与えない。読み違いの損害は守護・回復・HP・素早さ順から自然に発生する。旧セーブの確定済み孤立反撃イベントは互換性のため再生でき、新しいラウンドでは生成しない。自己防御の入力確定時準備は、予告を見てから素早い敵にも対処できるよう全ダンジョンで共通化する。

旧版の予定合わせによる勝率試算は、このルールには適用しない。検証は公開情報だけの仕草、確定後の技公開、実際の攻撃先による連携、ヒーラーの別対象回復と自己防御による生存差、保存・再生互換を対象とする。

紹介ページ用の操作GIFは `npm run capture:battle-guide` で製品ビルドから再撮影する。必要なツールはPlaywrightのChromium、ffmpeg、Python/Pillow。`artifacts/battle-guide-reading-v2/` に仕草・任意指示・確定後の公開の3クリップ、まとめ版、3MB未満の軽量版を出力する。個人のセーブや本番サイトの紹介文は変更しない。

試算（seed 1〜10、均衡、リオラをリーダー、薬5個、HP45%未満で薬、弱った敵へ使用可能な攻撃技）では、初期4人で攻撃を続ける方針は0/10踏破、大技のターンに自己防御する方針は5/10踏破。覚醒4人では両方10/10踏破で、攻撃方針が早かった。防御の固定正解化や初期編成の必勝を保証するものではなく、仲間の回復・守護と火力の状況で判断が変わることを確認する比較とする。


## 通常・イベントの戦術難度

2026-10-31の改修は[難度調整の検証](difficulty-tuning.md)を参照。通常中盤以降と上位イベントは護衛・回復役を組み合わせ、`bossStrike.windup`で「溜め→大技→隙」を定義する。直前ターンのボスへの実HPダメージが最大HPの8%に達すると、次の大技は設定された弱体威力になる。障壁吸収やかばう先へのダメージは含めず、発動ターンの後出し攻撃でも崩れない。大技を実行した直後から次ターン末まで、ボスの被ダメージが設定値（基本25%、第3章以降30%）だけ増える。行動不能で大技を実行しなければ隙も発生しない。

実HP累積と隙の期限はUnitに保存し、再起動・演出の早送りで再計算しない。新状態は省略可能で旧セーブを維持し、不正な型や将来ラウンドの状態は全スナップショットで拒否する。確定済みの戦闘ログ・報酬は変更しない。難易度定数には混成Waveと崩せなかった大技の平均攻撃倍率を反映する。

予告帯は護衛のページでも維持し、残量・弱体・攻撃後の隙を短く示す。操作パネルに説明文は増やさず、対処方法は妖精ガイド・章ヒントに置く。


## 操作音の所有権と拡大顔グラの画質

ボタンの即時音と保存コマンドの確定音を重ねないよう、共通Buttonは同期操作スコープを作る。Appのcommandは最初のawaitより前にスコープの音を引き受け、音声をユーザー操作中に解除し、保存後の成功音または失敗音だけを鳴らす。UI内で明示的に要求した音もスコープ内では保留し、コマンドが引き受けた場合は重ねない。時刻による重複抑制ではないため、正当な連続操作はそれぞれ鳴る。保存処理を呼ばない選択や閉じる操作は共通UI音を1回鳴らす。

settingsの音はcommandSoundに集約し、BGM音量変更も変更後のSE音量に従う。BGMを0にする操作にもSEが有効なら確認音を鳴らす。SEミュート中はBGMを操作しても鳴らさず、SEを再び有効にした操作は新しい音量で1回鳴らす。

アニメ顔グラは、一覧の軽量320×480動画と、拡大するface用640×960動画を使い分ける。8体すべての高解像度版はフル動画から生成し、低解像度動画の拡大は使わない。元動画が3:4のノクス/ルネットは従来と同じ中央2:3範囲を切り出す。faceの拡大率・基準位置を変えず、高解像度の先頭フレームposterを動画準備中・動画エラー・動き軽減中も使う。動画源変更では再生状態をリセットする。高解像度リンクの欠落・寸法・縦横比・実際の動画/poster寸法と先頭フレームはコンテンツ検査で拒否する。

再生成は npm run export:portrait-quality（単体は末尾に -- nox 等）。既存の軽量版と、高解像度版を元サイズに縮めた先頭フレームのSSIMが0.90未満なら書き出しを失敗させ、構図を確認する。今回8体は0.948〜0.984、ノクスの別切り抜きもこの比較で検出・修正した。追加メディアは約24MiB。

回帰検証は tests/interaction-feedback.test.ts、tests/portrait-quality.test.ts、e2e/ui-sound-ownership.spec.ts、e2e/portrait-quality.spec.ts。実際の装備/解除/保護で1操作1音、BGM変更とSEミュート、保存競合時に確定音なし・エラー音のみを確認する。DPR3の画面で動画失敗と動き軽減後にも640pxのposterを維持し、顔枠の寸法を変えないことを確認する。敵動画の停止ボタンは共鳴宝石と重ならない位置へ移す。

### Mobile native selection and audio interruption recovery

- The full game UI and the command-dial portal suppress native selection, callouts, and dragging. A shared guard also clears an in-flight selection inside game controls. Editable fields retain native selection/copy/paste; hold–drag party commands keep their existing behavior.
- SE now recovers on foreground visibility, focus, and pageshow, and retries from trusted pointer/key gestures including touchend. Recovery is silent and preserves saved SE volume. Hidden-page cues are discarded.
- A bounded, state-observing native resume avoids permanently waiting on WebKit's interrupted resume promise. New trusted gestures can call resume before the in-flight initialization guard. A closed native context rebuilds the Tone graph and resets its scheduling clock.
- Regression coverage: `tests/audio-resume.test.ts` simulates interrupted, hanging, rejected, and closed resume states. `e2e/mobile-recovery.spec.ts` checks selection protections and editable exceptions, suspends/closes the actual synthesis context, verifies audible PCM after recovery, and preserves mute. Existing equipment-feedback and hold–drag tests remain in place. Native app switching on a physical iPhone is not available in the automated browser environment.

### Native interaction interface and party formation correction

The previous `#root` and command-dial selectors missed the shared Modal's body portal, including dungeon preparation. All images/videos now use typed `GameImage` / `GameVideo` boundaries. Native media cannot own game gestures, enable dragging, or expose native video controls. Their pointer hit testing is disabled; actions remain on shared controls. All portals use `createGamePortal`, carrying the same `data-game-surface` policy as the application root. Editable fields retain native editing and all game surfaces retain scrolling.

`check:ui` rejects raw image/video JSX and raw/aliased react-dom portal imports throughout src. `tests/native-media.types.tsx` rejects weakening the media props contract. Release CI runs `test:native-ui` against Chromium and WebKit on the packaged nested iframe, covering the actual Hollow Gate preparation modal, static/animated art hit targets, selection, editable copying, scrolling and departure. Linux WebKit does not implement iOS's OS image menu or `-webkit-touch-callout`; iOS-only styling is applied as well, but physical iPhone OS menus are not automated here.

The party screen now starts with the saved formation in numbered slots, marking the first controlled companion separately from the leader. Selecting a member exposes large explicit actions for each role. Moving a companion first preserves the leader; changing the leader preserves the formation order. The existing shared party command persists both. The owned roster also labels its leader action instead of showing only a crown icon.

The native-interaction browser fixture starts with reduced motion only while leaving the unrelated title animation. It restores normal motion before opening preparation or party UI, and requires an actual MP4 source on the portrait video. Full title-animation coverage remains in the existing title-birth release test. This avoids conflating a headless title-renderer startup failure with the native-interaction assertions.
