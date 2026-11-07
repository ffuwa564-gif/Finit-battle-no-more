# 研究独白02・改訂版 — 消える盾を、命に縫う。

[完成動画・配布資料](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/this-girl-02-v2) / [MP4](https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/refs/heads/downloads/this-girl-02-v2/ThisGirl-02-v2.mp4) / [サムネイル](https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/refs/heads/downloads/this-girl-02-v2/Thumbnail-ThisGirl-02-v2.png)

8分27秒。静かなつむぎの一人語り。旧パート2を保持した改訂版です。

## 今回は、技能を実装してから再検証

ミエットの「余り糸の修繕」を研究版へ実装。期限切れ障壁を有限の糸として残し、通常の一行動で回復へ変換します。他人の有効な障壁は使いません。3ラウンドの期限、保有上限、再使用待ち、死亡/波切替時の消去を設定。

GitHub mainの[制作方針](../../PRODUCTION-POLICY.md)は96d2e00で修正。実際の改修、固定した確認条件での再検証、採用判断を終えるまで最終台本・本収録へ進まないことを明記しました。ゲーム差分は[draft PR144](https://github.com/ffuwa564-gif/Finit-battle-no-more/pull/144)。mainのゲームやitch.ioには未導入です。

2戦場×2編成×3装備帯、開発/選抜と分離した512共通入力。主条件は同じ構成・同じ操作で、薬平均2.830→2.539。悪化条件も開示し、限定範囲で改修採用、全キャラ所持の最終盤での固有価値は未認定。40,960実行は共通512入力に基づく反復で、40,960個の独立標本ではありません。

新規収録は改修前後とも14ラウンド・4人生還、薬3→1の一例。4停止解説で実キャラ枠を囲み、HP・糸・通常行動のコストを拡大。研究版・未公開仕様を表示し、一戦を勝率の証明にしません。次回はティッカの改修研究（未検証）。

## 検証資料

[実装完了記録](episode-implementation.json) / [解析](analysis.json) / [研究報告](ResearchReport.md) / [採用・見送り](Design-Decisions.md) / [全体への影響・未検証範囲](Roster-Audit.md) / [台本](Script.md) / [再現手順](Reproduce.md)

動画の完了判定はepisode-completion.json、完成MP4と同じSHAの同期・全編デコード・Chromium/WebKit再生・停止像/発話・目視検査を参照してください。完成配布ZIPには生の実測、query、編集/研究コード、正規化実録と独立グラフ参照を含みます。旧研究、失敗案、同期基準を超えて棄却した録画も区別して保存しました。

VOICEVOX:春日部つむぎ / 音楽：甘茶の音楽工房「夢」（作曲：甘茶）。本映像は本人や運営の監修・出演ではありません。
