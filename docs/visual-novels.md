# 全画面ノベルとOP

## 再生する場面

- 初めて作るセーブでは、タイトルの開始操作の後にOP「序章 ― 欲望の扉、その向こう」を再生する。
- 通常ダンジョン第1〜3章の最終ステージを初踏破し、報酬を確定した後に各章のエピローグを再生する。既存の章の文章をそのまま利用し、第二章の恋と喪失の物語などを上書きしない。
- 既存セーブを更新しただけでOPや過去の章を強制再生しない。設定の「物語の記録」からOPと踏破済みの章を読める。

## OPの構成

いただいたプロットを15ページに起こした。救い主の正式な名前は未指定のため「庭園の女」と表記する。新しいプレイアブルキャラや排出枠は追加していない。

1. 死にたがりの世界で苦しむ主人公。
2. ひとつの「欲望の扉」に向かう数多の少女。願いが願いを押しのけ、傷つけ合う。
3. 皮肉にも、何も望まなかった主人公だけが生還する。
4. 暗転して、見知らぬ庭園で目覚める。
5. 「あら、やっとお目覚め？ お寝坊さんね」
6. 救い主は世界の可能性を探る存在だと語る。
7. 「あなた、なかなか珍しいわね。気に入ったわ」「仕方ないから、こき使ってあげるわね」
8. 助けてくれた相手に振り回される日々の始まり。

本文の正本は `src/content/novels.ts`。世界の扉に関する話は主人公が聞いた伝承として書き、救い主の固有名・正体・主人公の性別などの未指定設定は確定していない。

## 表示と操作

`VisualNovel`はゲームの表示領域全体を覆い、開始時に約650msでフェードイン、終了時に約550msでフェードアウトする。背景はクロスフェードし、暗転ページにも対応する。背景の表示位置は共通アセットのanchorを使い、庭園の女性の顔がスマホでも収まるよう設定した。

台詞欄のタップまたは次の台詞ボタンで進む。前の台詞・会話ログ・確認付きスキップを提供する。Enter／Spaceで会話送り、Escapeでスキップ確認。動き軽減ではアニメーションを停止する。日英・狭い画面・itch相当の入れ子iframeに対応する。ブラウザーの強制フルスクリーン要求は行わず、ゲームの表示領域を覆う方式。

再生中は背面のゲームUIをinertにし、妖精ガイドと背景動画を停止する。ガイドの初回案内済み記録はOPの背面で消費しない。OP後に通常のホームと任意の妖精案内へ進む。

## 保存と安全な進行

`GameSave.novels`は省略可能。`seen`に終了・スキップ済みのID、`active`にシーンIDとページ位置を保存する。台詞の移動を既存の保存トランザクションで記録し、再起動やバックアップ復元から続きへ戻れる。ローカル設定だけを消してもOPを再表示しない。

UIの新規作成は`createInitialSave(content, seed, { opening: true })`を使う。既存セーブには初期再生なしの空の記録を1回だけ追加する。内部の非対話シミュレーションは従来どおりOPなしで初期化できる。

章クリアでは、素材・石・ゴールド・踏破記録・次の物語を同じセーブに確定する。物語の終了や再読では報酬を付け直さない。物語を読んでいる間、探索出発や祈願などのゲーム操作をコマンド側でも拒否する。戦闘中の物語開始や、未踏破の章の再生も拒否する。

## 続きの台本を追加する

`NovelSceneDef`に安定したID、タイトル、`trigger: { kind: 'dungeon-clear', dungeonId }`、`pages`を定義して`content.novels`へ登録する。通常ダンジョンの任意の節目を指定できる。1つの節目は1シーンとし、複数の台詞はpagesへ並べる。

各ページは`text`、`backgroundId`、任意の`speaker`と`shade: 'dark' | 'black'`。画像は共通レジストリへ背景またはイラストとして登録する。検証で画像参照、重複ID・トリガー、ページ、通常ステージとの対応を調べる。保存済みIDを安易に改名・削除しない。

## OP原画

Runway、GPT Image 2.5 Flare、16:9、各1枚。1600×900のWebPへ同じ比率で書き出して保存した。動画・音声は生成していない。

- 扉：タスク `1cc09d59-c4a1-427e-855e-0083abf5a583`、`public/art/novel-desire-gate.webp`。
- 庭園：タスク `fea524ed-a70c-409a-8e0b-c8b37a0b782a`、`public/art/novel-awakening-garden.webp`。

```text
Original cinematic anime dark fantasy visual novel background, wide 16:9. The Gate of Desire in a ruined world: one enormous sealed obsidian double door framed with tarnished gold stands at the end of a shattered white marble causeway, storm-dark red-gray sky, falling ash, broken standards and discarded swords, faint ghostly silhouettes of adult women in long torn battle dresses far in the distance. Suggest aftermath of a tragic struggle through empty space and abandoned weapons, no visible wounds, no gore, no explicit violence, no bodies in foreground. First-person viewpoint from a lone surviving wanderer. Somber despair, irony of an unwanted survival, subtle muted crimson light seeping through the door, exquisite anime game background painting, detailed cinematic lighting, atmospheric depth. Lower third comparatively calm and dark for dialogue UI. No text, no letters, no logo, no watermark.
```

```text
Original cinematic anime fantasy visual novel key background, wide 16:9. A mysterious enclosed moonlit garden after a long sleep: flowering white roses, overgrown old stone paths, a small fountain and wrought-iron greenhouse arches, soft early dawn light and fine floating motes. On the right third stands one elegant clearly adult woman with long dark wine-brown hair, amber eyes, refined ivory and charcoal gothic dress, opaque layered skirt, a small black rose hair ornament, no wings, no crown, calm self-assured teasing smile, one hand resting on a stone garden table, looking toward the viewer like she has just rescued and awakened them. A worldly observer of the world's possibilities, charming slightly imperious benefactor, original character not resembling an existing franchise. Waist-up framing, left half reserved for garden atmosphere, lower third low-detail for dialogue overlay. Premium painterly anime RPG illustration with a soft dreamlike palette of sage green, ivory and muted rose gold. No text, no lettering, no UI, no watermark.
```

## 確認

`tests/novels.test.ts`は初期化・台詞移動・既読の重複防止・旧セーブ・章報酬との一括確定・未解放の拒否・不正参照を確認する。`e2e/novels.spec.ts`はOP、途中再開、会話ログ、庭園への切替、再読、章の自動再生、英語・動き軽減・狭幅を確認する。`itch-e2e/novels.spec.ts`は埋め込み内の全画面・ホスト再読込からの再開・初回限定を確認する。

物語以外の既存の画面テストは、共通の`skipStory`で実際のスキップ確認を押してから、そのテスト対象へ進む。

実装時の検証では、単体テスト241件、関連ブラウザーテスト19件（ノベル3・通常章5・妖精ガイド9・タイトル2）、itch相当の埋め込みテスト12件が通過した。単体テストは音声の計算時間を考慮し、`--maxWorkers=1 --testTimeout=15000`で実行した。ブラウザーテストは修正対象のケースを個別に再実行した結果を含む。
