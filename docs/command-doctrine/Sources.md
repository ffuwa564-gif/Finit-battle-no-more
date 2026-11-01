# 出典・調査資料

公式ゲーム資料2系統・軍学2系統と、STILLVEILの固定版コード／物語を参照。資料の要約と、動画での新ルール案を区別しています。外部資料は効果実証の論文ではなく、レア別の服従値を導くものではありません。

## E01 — Official command pages: Attack; Target Set; Fight

https://www.beyondallreason.info/commands/set-target

明示的対象指定、移動中の優先対象、自律的遭遇攻撃を別の命令として説明する。

RTSの射程・移動・同時行動に依存。希少度別服従や必ず命中する強制対象を裏付けない。複数ページは1系統。

各ページのコマンド本文。Target Set: preferred target even while moving; Attack: target and queued order; Fight: movement plus autonomous engagement.

## E02 — Keep Target / Target Priority, official source code

https://github.com/ZeroK-RTS/Zero-K/blob/3029db77433ed5fee197a6d41546dd5104870794/LuaUI/Widgets/cmd_keep_target.lua

移動命令に上書きされた攻撃対象への意図保持、解除する命令、通常の対象評価を別層として持つ。

ソースの記述は効果を測った実験ではない。BARと同系RTS技術。コメントをエンジンの一般事実として扱わず、コードの無断流用をしない。

cmd_keep_target.lua options.keepTarget, options.removeTarget; unit_target_priority.lua GetNormalWeaponPriorityModifier等

## E03 — JDP 0-01 UK Defence Doctrine, Sixth Edition

https://www.gov.uk/government/publications/uk-defence-doctrine-jdp-0-01

明確な意図、裁量、相互信頼、主体性を任務型指揮の柱とし、集中には他所の節約が伴うと説明。

現代英国ドクトリンはゲーム数式でも歴史上の全勝因の証明でもない。PDF図版・長文は転載せず要約する。

2.16–2.17 Mission command; 2.30–2.33 Concentration of effect / Economy of effort

## E04 — On War

https://www.gutenberg.org/files/1946/1946-h/1946-h.htm#chap22

数的優勢と決定的地点への集中を重視し、他の条件や投入時点を区別する。大きい数的差を才能のみで簡単に覆せるとは述べない。

19世紀理論と当時の事例評価。兵数・文化観や2対1の記述を現在の史学の確定事実やゲーム倍率にしない。

Book III, VIII Superiority of Numbers (chap22); XI Assembly of Forces in Space (chap25); XII Assembly of Forces in Time (chap26)

## G01 — 現行の対象選択・行動処理

https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/616a0747c4118a991770226d37347f34b31e2ec6/src/domain/engine.ts#L185

通常攻撃の作戦、先頭の指定、技能別対象、協撃限定の保存、かばう、通常25充填と役割速度。指揮・服従は未実装。





## S01 — ノエルの覚醒後の物語

https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/616a0747c4118a991770226d37347f34b31e2ec6/src/content/seris-story.ts#L20

四人の役目と退避の合図を星図へ書く。指揮枠という新能力は創作。





## S02 — ノクスの人物像

https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/616a0747c4118a991770226d37347f34b31e2ec6/src/content/index.ts#L154

命令完遂を存在理由とするSSR。SSRが一律に命令嫌いという解釈の反例。





## S03 — ザクロの統率描写

https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/616a0747c4118a991770226d37347f34b31e2ec6/src/content/zakuro.ts#L13

少女たちを従える庭園管理者。庭園の女とは別人。新しい軍制の実装とは別。





## S04 — セリスの覚醒後の物語

https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/616a0747c4118a991770226d37347f34b31e2ec6/src/content/seris-story.ts#L17

仲間へ道を教えてほしいと頼む。技能選択と指揮を分ける翻案の起点。





## S05 — 低レアの技能とノエルの役割

https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/616a0747c4118a991770226d37347f34b31e2ec6/src/content/index.ts#L76

ティッカのjam、ニケのshatter、ノエルはarea_attacker。速度はengineの役割値11。





## G02 — 限定的な協撃試練

https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/616a0747c4118a991770226d37347f34b31e2ec6/src/content/trials.ts#L59

誓鎖の稽古のcoordination35。一般的なレア別指揮や全戦闘への恒常効果ではない。
