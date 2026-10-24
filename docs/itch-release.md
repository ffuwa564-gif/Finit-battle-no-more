# itch.io公開準備

この作業は公開前のレビュー用です。itch.ioへのアップロードや公開、外部アカウントの設定変更は行いません。

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
