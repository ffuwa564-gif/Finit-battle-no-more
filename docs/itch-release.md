# itch.io公開準備

公開先は https://fluffy3546.itch.io/stillveil （butler: `fluffy3546/stillveil:html`）。ローカルの準備コマンドはレビュー用です。アップロードは以下のGitHub Actionsを手動実行した場合だけ行い、ページの公開設定・価格は変更しません。

## レビュー用ビルド

```sh
npm ci
npm run build:itch
npm run test:itch
```

`artifacts/stillveil-itch-preview.zip`は`index.html`がルートにあるHTML5用ZIPです。現在のゲーム・原画・音楽・動画・フォントを含み、Cloudflare用の`dist-release/`やルート起動ページを同梱しません。相対パスとファイル数・展開サイズを検査します。`artifacts/itch-build.json`にサイズ・ハッシュと未承認のレビュー版であることを記録します。

`npm run test:itch`は製品ビルドを`/nested/game/index.html`へ配置し、別ホスト名の親ページからiframeで開いて確認します。Chromiumが必要です。未導入なら`npx playwright install chromium`を実行します。実際のitch.ioやiPhone実機での確認を代替するものではありません。

## 日英とセーブ

タイトルと設定で日本語／Englishを切り替えられます。初期言語はブラウザー言語を使い、変更は端末のローカル設定に保持します。英訳は画面上で行い、キャラID・戦闘・抽選・保存済みイベント文字列を変更しません。`src/locales/en.json`が英訳辞書で、`npm run check:locales`が追加文言の訳漏れを検出します。

街では設定からバックアップを保存・読み込みできます。戦闘中は撤退の確認画面から、撤退せずにバックアップだけ保存できます。復元前に日時・所持数・進行を確認し、明示的に復元します。異なる版、壊れたデータ、大きすぎるファイルは拒否し、別タブの更新とは保存の比較・交換で競合検出します。サーバー同期・アカウントは追加していません。Cloudflare版とitch.io版の保存領域は別なので、移行時はバックアップファイルを使います。

## 紹介ページ素材

`release/itch-listing.json`に日英の短文・本文・操作・注意書き・クレジットと設定案を置きます。これは外部ページへ書き込まれた設定ではありません。

```sh
npm run capture:itch
```

ビルド済みのゲームを実際に開き、`artifacts/itch-media/`へ表紙・英語のホーム／戦闘／SSR結果のスクリーンショットを保存します。元の原画ファイルやユーザーのセーブは変更しません。新しいブラウザープロファイルのデモ用セーブを使います。紹介文を含む`artifacts/stillveil-itch-store.zip`も作成します。

itch.io側ではHTML Game、まずDraft、No paymentsを設定案とし、ZIPをアップロードして起動を確認します。Mobile Friendlyは実機で確認した対応範囲だけ有効にします。生成AIの使用はAI Disclosureで正確に申告し、表紙と本編を確認して適切なコンテンツ分類を設定します。

公開前には既存の`npm run build`と視聴確認・`npm run check:release`の手順を維持します。この準備作業は視聴承認を捏造せず、既存の公開用チェックも解除しません。

公式資料：

- [HTML5のアップロードと相対パス・サイズ制限](https://itch.io/docs/creators/html5)
- [分類・生成AI申告などの品質ガイド](https://itch.io/docs/creators/quality-guidelines)


## GitHub Actionsでビルドとアップロード

`.github/workflows/itch.yml`の「itch.io HTML5」はmainへのpushごとにテスト・itch用ビルド・入れ子iframeのブラウザーテストを実行し、コミットSHA付きのArtifactへZIPとレビューフィンガープリントを保存します。自動実行ではアップロードしません。

初回設定：

1. 手元にbutlerを入れ、`butler login`でitch.ioへログインする。
2. [itch.ioのAPI keys](https://itch.io/user/settings/api-keys)で、butlerの認証に対応するsourceが`wharf`のキーを確認する（[公式認証手順](https://itch.io/docs/butler/login.html)）。
3. [GitHubのActions secrets](https://github.com/ffuwa564-gif/Finit-battle-no-more/settings/secrets/actions)で、Repository secretとして`BUTLER_API_KEY`を登録する。キーをソースやチャットへ貼らない。

アップロード：

1. mainの対象コミットをビルドしたZIP、または同じコミットのローカルビルドで、見た目と音を確認する。Actions画面で40文字のコミットSHAを控える。
2. Actions → **itch.io HTML5** → **Run workflow**を開き、Branchは`main`、`upload`をオン、`reviewed_sha`へ確認したSHAを入力、視聴確認のチェックをオンにして実行する。SHAが今のmainと違う場合は停止する。
3. 同じソースを再ビルド・テスト後、実行者による明示的な視聴確認をSHA付きで記録し、既存の`check:release`を通してからbutlerで送信する。確認なしに承認を作ったり、チェックを解除したりしない。
4. 初回アップロード後だけ、itch.ioのEdit gameでKindをHTMLにし、送ったhtmlチャンネルのファイルを「This file will be played in the browser」に設定する。Draftで実際の起動を確認してから、ページの公開範囲を決める。

チャンネル名`html`だけではブラウザープレイ指定になりません。ページ本文・表紙・価格・公開範囲の変更もbutlerでは行いません。配信先をCloudflareと切り替えず、itch用の`dist-itch`だけを送ります。
