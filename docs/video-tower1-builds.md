# 白亜の塔・第1層を19編成で攻略する実況動画

ずんだもんと四国めたんが、白亜の塔第1層を異なる編成で攻略し、仕組み・操作・弱点を解説する24分1秒の動画。

[動画・字幕・サムネイル・制作データ](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/tower1-19-builds)

[編成と装備の比較表](video-tower1-builds/Builds.csv) / [検証結果](video-tower1-builds/Results.json) / [チャプター](video-tower1-builds/Chapters.txt) / [出力チェック](video-tower1-builds/Validation.json)

ゲーム映像の基準は `616a0747c4118a991770226d37347f34b31e2ec6`。制作スクリプトは `scripts/tower-builds/`、生成物は `artifacts/tower-builds/` に置く。ゲーム本体・配信版・実際のプレイヤーのセーブとは独立した制作環境で収録した。

## 構成

1. 覚醒した初期の四人
2. 残響と連鎖
3. 障壁を砲弾に
4. 吸収で殴り続ける
5. 弱体から暁冠
6. 全体攻撃で取り巻き処理
7. 睡眠
8. 混乱
9. 麻痺
10. 魅了
11. 解除と立て直し
12. 再生で粘る
13. 巻戻しで通常スキル回転
14. 星炉から覚醒ルネットの必殺
15. 号令で攻撃を底上げ
16. 加速の両刃
17. 障壁を回復へ変える
18. 処刑で終盤を刈り取る
19. T6夢織で必殺加速

共通の支援役や石を使う編成も含む。各構成は育成後の遊び方の例で、仲間・装備を用意した検証用データを使用する。ティアごとのrollは範囲の上端を使う。編成にはT3〜T6の石が必要で、特にT6は希少な条件として説明する。

## 検証と収録

- 各編成を乱数 `1001..1012` で探索し、別の `70001..70060` でも60通り検証。障壁の再利用と解除は、狙った効果の発動を条件に探索範囲を広げた。
- 表示する「成功数 / 60」は、その装備と固定の操作方針による結果。プレイヤー全体の勝率や最適な操作の確率を表すものではない。
- 回復薬は最大5個。体力に応じて使い、花・妖精・役割結晶・必殺予約も通常のルール内で使う。
- `prove.ts` が出発から終了まで `applyCommand` を通し、探索時と最終HP・必殺ゲージ・勝敗の一致を検証する。
- 撮影には実際の `App` とUIを使用する。完全検証済みの同じ戦闘のラウンド境界を復元し、序盤・効果の発動・最終ラウンドを収録。各抜粋でも通常コマンドを実行し、検証記録との一致を確認する。冒頭・まとめは残響編成の映像も使う。
- 映像には「戦闘は2倍速・抜粋」と表示する。操作待ちと報酬画面を保持しながら解説する場面もある。
- ゲームSEは実アプリのAudioContextの出力から録音。映像のフレーム時刻と同じ時計で合わせ、切り出し時にも一緒に編集する。
- ずんだもんとめたんの音声の間隔は短く取り、字幕はゲーム画面の下に独立して表示する。

出力する比較表 `Builds.csv` には、編成順・リーダー・各石の種類・変種・威力roll・追加効果rollを収録する。基礎威力倍率の適用には、それぞれの石に固有の上限・待ち時間・特殊効果がある。`Native-Proofs.json.gz` には、出発条件、全コマンド、ラウンド境界、戦闘イベント、最終状態を含める。`Results.json` の技の集計はイベント数で、1回の使用から複数イベントが出る場合がある。

## 再制作

必要なもの：プロジェクトのNode依存、Chromium、Python（numpy / Pillow）、Noto Sans CJK、FFmpeg、VOICEVOX ENGINE 0.26.0。VOICEVOXは `127.0.0.1:50021` で動かす。

```sh
python scripts/tower-builds/bootstrap.py
npx tsx scripts/tower-builds/search.ts
npx tsx scripts/tower-builds/recycle.ts
npx tsx scripts/tower-builds/cleanse.ts
npx tsx scripts/tower-builds/prove.ts
npx tsx -e "import{content}from'./src/content';import fs from'node:fs';fs.writeFileSync('artifacts/tower-builds/content.json',JSON.stringify({characters:content.characters,skills:content.skills,assets:content.assets}));"
```

Viteを `http://127.0.0.1:4192` で起動して、次を実行する。撮影には新規ブラウザコンテキストを使用する。

```sh
python scripts/tower-builds/synth.py
node scripts/tower-builds/capture-checkpoints.mjs
python scripts/tower-builds/render_worker.py
python scripts/tower-builds/finish.py
```

`synth.py` は音声をハッシュ付きでキャッシュする。`capture-checkpoints.mjs` は完了済みの撮影を再利用し、`render_worker.py` は音声と映像がそろった章から書き出す。完全なアプリ操作による長めの収録には `capture.mjs` も使える。

## クレジット

- 音声：**VOICEVOX:ずんだもん / VOICEVOX:四国めたん**。ノーマル、speaker ID 3 / 2。
- VOICEVOX利用規約：<https://voicevox.hiroshiba.jp/term/>
- 音源利用規約：<https://zunko.jp/con_ongen_kiyaku.html>
- 立ち絵：**東北ずん子・ずんだもんプロジェクト** 公式配布素材 `zunmon003` / `met012`。
- 素材：<https://zunko.jp/con_illust.html>、利用ガイドライン：<https://zunko.jp/guideline.html>
- 音楽：**甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」**。
- <https://amachamusic.chagasi.com/music_fjordnosundakaze.html>
- ゲーム映像・SE：STILLVEIL。ゲームの一部のイラスト・文章・プログラミングには生成AIを使用し、一部キャラクターのアニメーションにはRunwayを使用している。

参照した既存動画・検証資料は `downloads/tower-diary-part1` のコミット `1675a545fa9ef0f1d71956784dab85eb3e196ad1`。新作の検索コアも、このブランチの `Tower-Maximum-Search-core.ts` をもとに、出発時の乱数・通常コマンドによる検証・各編成の操作方針を追加した。

完成動画の公開先への投稿は、動画ファイルと説明文を確認してから行える。
