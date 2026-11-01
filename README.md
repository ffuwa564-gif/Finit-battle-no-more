# アテナ依存対策会議 — 中国うさぎ、お怒りです。

**28分05秒／1080p／ずんだもん・四国めたん・中国うさぎ。**

「その強化を、アテナの横に置いたら？」。前作でも残ったアテナ依存を、三人が現行仕様から洗い直す設計会議です。低い指揮費用だけでは覚醒セリスと差別化できない点、発令Rに現行の追加リーダー効果が止まる点まで、うさぎが指摘し、案を修正します。

**6案は未実装です。ゲーム本体・公開版・itch.ioは変更していません。動画でアテナ依存が解消したと結論づけてはいません。**

- [完成動画 MP4](https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/refs/heads/downloads/athena-council/STILLVEIL-Athena-Council-1080p.mp4)
- [サムネイル](Thumbnail.png) ／ [画面プレビュー](Preview.jpg) ／ [YouTube用説明文](YouTube-Description.txt)
- [台本](Script.md) ／ [字幕](Subtitles-ja.srt) ／ [章一覧](Chapters.txt)
- [6案の仕様・採用条件](Decision-Spec.md) ／ [現行比較CSV](Current-Rule-Comparison.csv)
- [現行400戦のnativeコマンド一致](Native-Application-Verification.json) ／ [現行の確認事項](Source-Facts.json)
- [未実装の処理模型](Mechanism-Model.json) ／ [模型の検査](Mechanism-Checks.json)
- [完成動画・音声同期の検査](Validation.json) ／ [図解54枚の収まり検査](Visual-Check.json)
- [制作入力一式](Production-Inputs.zip) ／ [制作コード](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/video/athena-council/scripts/athena-council) ／ [根拠と範囲](Sources.md) ／ [クレジット](Credits.md)

## 議論する案

- ノエルの選択式LS「星図の分担」：指揮の追従で札を補充し、致命的な単体攻撃を四人へ配分。四人生存・指揮成立が必要。全体・連撃に弱い。
- ウズメの通常技「鈴の合図」：普通の低威力攻撃に加え、実際に追従した本人の記録を次Rまで残し、一拍遅れた別の仲間につなぐ。
- 石「軍議の栞」：一行動を使い、次Rだけ指揮容量+1、上限5。費用は覚醒系統の継承を含む実表示で計算。
- ヘカテの選択式LS「未明の猶予」：単体の予定HPダメージの半分を後払いに。借りは消えず、回復と支払いが必要。
- フローラの通常技「朝露の二度咲き」：回復と、次R開始時の残債減額。
- 石「未明の領収石」：一行動で残債を即時に減らす。装備枠と手数を使う。

新LSは既存の固有効果との選択式。基礎補正は現行のまま。新方式は全員のかばうを使わず、キャラ名によるアテナ禁止にはしません。アテナの全体障壁等を使う余地は残しますが、全ての良い案にアテナが必須なら再設計します。

## 数値の範囲

ゲームv1.10.0 / dec20ebbfb8d139713ffe847ebc48eefe8ff54ca。前作と同じ宣言済み所持条件・装備と固定合法操作方針による比較です。白花以外T4（威力125・特性125）、白花は固定T3。

今回の初期乱数90001–90100では、基準の巻戻し51/100、白花71/100、リオラ交代＋リーダー交代は10/100・28/100。主要4条件400戦でapplication commandの結果一致も検査。前回の別範囲70001–70100の61/76勝とは分けています。現実のプレイヤーの勝率、全キャラの最適解ではありません。

効果を止める感度分析は公開版で選べる条件ではなく、差を足せません。架空のHPとダメージによる分担・猶予の模型は、敵AIや行動順を再現せず、**塔の勝率ではありません**。

素材の単体再配布を避け、公式立ち絵・BGMは制作ZIPに含めずbootstrapと固定ゲームtreeから取得します。音声はロスレスFLACで保存し、restore_audio.pyでPCMハッシュを検査して復元できます。

制作コード固定版： https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/6792b826f4e381d7634df4466ad46e6ada65861a/scripts/athena-council
