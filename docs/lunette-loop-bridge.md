# ルネット：末尾から冒頭へ戻す補間動画

元の8秒動画の演技を残し、末尾の姿勢から冒頭の姿勢へ戻る約2秒の動画を追加する。元動画を逆再生したり、全体を生成し直したりせず、順方向の映像をつなぐ方式。

## 入力と生成条件

- 元動画：初回採用した8秒版。Runwayタスク `8359e9fb-8015-4c91-8232-8a937424eab2`。
- 元ファイルの保存先：[8秒版のGit履歴](https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/cf7da7a6347ab7c5858908e76655882c276da5cf/public/video/lunette-awakened.mp4)。
- 補間の開始フレーム：元動画の最終フレーム。鍵を持つ右腕が肩付近に下がった姿勢。
- 補間の終了フレーム：元動画の最初のフレーム。鍵を頭上へ掲げた姿勢。原画そのものではなく、実際の動画フレームを使う。
- RunwayモデルID：`wan3`。2秒生成と開始・終了の両フレーム指定に対応するモデルを使用。
- 指定：2秒・720p・3:4・無音。補間タスク：`d57d4e7d-52e7-4cd7-a54a-0b29ff7580b2`。
- 同じ補間映像を全身用・顔枠用の両方へ反映する。キャラクターIDや能力、通常ルネットは変更しない。

## 実際に送信したプロンプト

```text
A two-second connecting animation between the provided exact start and end frames of the same detailed 2D anime illustration. Continue naturally from the starting pose: the lavender-haired girl smoothly raises her right arm holding the small gold winding key from beside her shoulder to above her head, gently straightens her head and upper body, and settles into the precise pose in the ending image. Her fingers maintain the same firm grip on the same key throughout. Her left open hand, knees and feet return naturally to their exact positions in the ending frame with minimal movement. Preserve her cheerful face identity, eyes, costume, boots and all clockwork rabbit designs. Airborne rabbits gently settle to their ending positions, seated rabbits remain seated. Locked camera and unchanged observatory background, stable composition and lighting. Hair and ribbons follow the movement subtly and settle. This is a short return-to-start bridge for an existing animation loop, one continuous smooth motion with no cuts, no camera movement, no new objects or gestures, no transformation or dissolve. Match the opening and closing references accurately.
```

## 配信用の書き出し

`scripts/export-lunette-loop.mjs` に元8秒版と補間動画を渡す。両方を720×960・24fpsにそろえ、補間の先頭1フレームは元動画の末尾と重なるため除いて連結する。逆再生・ディゾルブは使用しない。

```sh
git show cf7da7a6347ab7c5858908e76655882c276da5cf:public/video/lunette-awakened.mp4 > /tmp/lunette-original-eight-seconds.mp4
node scripts/export-lunette-loop.mjs /tmp/lunette-original-eight-seconds.mp4 docs/references/lunette-awakened-return.mp4
```

全身用は `public/video/lunette-awakened-loop.mp4`、顔枠用は `public/video/lunette-awakened-portrait-loop.mp4`。H.264 Baseline・yuv420p・faststart、音声なし。顔枠版は同じ連結済み全身動画から320×480・18fpsで切り出す。新しいファイル名で旧動画のキャッシュとの混同を避ける。

開始と終了の姿勢だけでなく、8秒版から補間への接続、補間から次のループ冒頭への接続を両方確認する。完全な画素一致や動く速度の連続性はモデル指定だけでは保証されない。ゲームの静止画フォールバックと停止処理は共通プレイヤーを使う。


## 保存した映像と検証

- 生成した補間単体は[約2秒の復帰動画](references/lunette-awakened-return.mp4)として保存。実尺はフレーム刻みで約1.96秒。
- 連結後の全身版は約9.96秒・720×960・24fps。約2.2MB。顔枠版は320×480・18fps。
- 補間の連続フレームと、元8秒→補間、補間末尾→冒頭を比較。腕・鍵・首が元の姿勢へ戻り、旧版の大きな姿勢の飛びが軽減していることを確認。
- フレーム間のSSIMは、旧版の末尾対冒頭で約0.557、連結後の末尾対冒頭で約0.851。圧縮や細部の違いを含む画像の類似度であり、動きの自然さの保証や、完全一致を意味しない。細部や速度の差は残り得る。
- `npm run build` と `e2e/clockwork-event.spec.ts` の4ケースが成功。ホームで約10秒版が冒頭へ戻って再生を継続すること、イベント紹介・詳細・顔枠・戦闘で新しいファイルを使うこと、動き軽減・再生エラー時に原画を表示することを確認。
- 実機iPhoneの確認・本番公開・公開用の視聴承認記録は行っていない。

## 静止画と動画の構図をそろえる

元絵は1024×1536（2:3）、全身動画は720×960（3:4）、顔枠動画は中央を切り抜いた320×480（2:3）で、同じ元絵を全ての静止画に使うと表示倍率と構図がずれていた。

全身用の表示静止画は `art/event-lunette-awakened-loop-poster.png`、顔枠用は `art/event-lunette-awakened-portrait-loop-poster.png` とし、それぞれ対応動画の先頭フレームから書き出す。全身用アセットと戦闘背景は720×960、顔枠アセットは320×480として登録する。ホーム・詳細・イベント紹介・戦闘の全身表示と、編成・図鑑・戦闘の顔枠で、各動画と同じ静止画の構図を使う。動き軽減時や読み込みエラー時の表示も同じになる。

生成参照用の元絵 `art/event-lunette-awakened.png` は保持する。動画・動画の表示倍率・通常ルネットは変更しない。書き出しスクリプトにも両静止画の生成を追加し、次回の書き出しで構図がずれないようにする。

後続の再発防止では、全動画の専用 `posterId` と先頭フレームの完全一致検査を共通化した。現在のプレイヤーは `art/motion-posters/<動画ID>.png` を優先する。上記ルネット専用の静止画と同じ先頭フレーム由来で、元絵は引き続き制作資料として保持する。[制作手順と自動検査](animation-posters.md)
