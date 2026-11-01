# 根拠と範囲

ゲーム固定版：[v1.10.0 / dec20ebbfb8d139713ffe847ebc48eefe8ff54ca](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/dec20ebbfb8d139713ffe847ebc48eefe8ff54ca)

- src/domain/engine.ts：leaderBonus、chooseDefaultAction、damage、かばう・軽減・ゲージの処理。
- src/domain/ultimates.ts：タンク役共通の全体障壁。アテナ専用の効果と混同しない。
- src/domain/scout-skills.ts：ネリの灯のisBossStrike条件とフィオの余り布の適用範囲。
- src/domain/command-doctrine.ts：指揮容量、覚醒前の費用の継承、対象外の行動と検証。engine.tsのleaderEffectは現行で発令Rに追加効果を抑止する。新しい札を発令中にも使うのは、未実装案の新しい契約。
- src/domain/memory-gems.ts / white-flower.ts：石のT4条件、固定白花、実行した通常防御による回復。
- src/application/game.ts：native application commandの再生検証。
- content.json：アテナ・ノエル・ヘカテ・ウズメ・フローラの現行フレーバーと能力、第一層の定義、ノエル覚醒条件。固定ゲームの生成済み内容をProduction-Inputsへ収録。
- 前作Part1.1.1：制作cece05e04fb7b6a26926d05640f872bcbc5b6c68／公開downloads/tower-diary-1-1-1。白花の実回復125・余り布の追加障壁5は前作の成功本走一例。
- 今回の現行比較は90001..90100。前作の70001..70100の61/76勝とは別。新しい基準51/71勝とリオラ10/28勝は合計400戦、native commandでも一致を検査。
- counterfactual行は不使用化などの感度分析。公開版で選べる編成条件ではない。同じ初期乱数でも消費順は変わるため、以後の状態異常等が完全一致する比較ではない。
- Mechanism-Modelは架空の体力による処理模型。敵AI・行動順・状態異常・DPSを再現せず、塔の勝率ではない。
- ヘカテ等の背景はゲーム内フレーバーを機構へ創作したもの。神話に数値付きの同じ技能が存在する、とは説明していない。

公式素材の規約と音楽はCredits.md。外部サイト本文・単体素材は制作ZIPへ再配布しません。
