# BGMクレジット・利用記録

作曲・著作権：**甘茶（Amacha）** ／ 提供：[甘茶の音楽工房](https://amachamusic.chagasi.com/)

2026-10-24に、ユーザー指定の[疾走感カテゴリ](https://amachamusic.chagasi.com/image_shissoukan.html)と[利用規約](https://amachamusic.chagasi.com/terms.html)を確認し、各曲の正式ダウンロードページから取得しました。音源は加工せずゲームのBGMとして同梱し、外部サイトへの実行時直リンクは使いません。設定画面から提供元・曲ページを開けます。

| 用途 | 曲名・ダウンロードページ | 同梱ファイル | 演奏時間 | SHA-256 |
| --- | --- | --- | --- | --- |
| ホーム・街 | [悲しみの曖昧な対象](https://amachamusic.chagasi.com/music_kanashiminoaimainataishou.html) | `public/audio/kanashiminoaimainataishou.mp3` | 約2分27秒 | `8289efae7d54cd003134c98655a6dfb96e78e0543a312981b62806afb3702326` |
| 通常Waveの戦闘 | [渦巻き](https://amachamusic.chagasi.com/music_uzumaki.html) | `public/audio/uzumaki.mp3` | 約1分37秒 | `2e95d870ffe319c30c944e0b2bf27646ed5039d465355396543444e702f8f18e` |
| ボスWaveの戦闘 | [騎兵戦](https://amachamusic.chagasi.com/music_kiheisen.html) | `public/audio/kiheisen.mp3` | 約1分49秒 | `0bf9f4bc9897a2a452cc14cdfb3c369f30bcf2ca9978df3f1b4785f488a507b0` |
| クリア・報酬確認 | [楽しい冒険](https://amachamusic.chagasi.com/music_tanoshiibouken.html) | `public/audio/tanoshiibouken.mp3` | 約1分48秒 | `c0b1cf90dfc73f49957172357fa901056cf1b9fe500e812e57bf3b13b34b43ba` |
| 和風ボスWave | [打ち上げ花火](https://amachamusic.chagasi.com/music_uchiagehanabi.html) | `public/audio/uchiagehanabi.mp3` | 約1分56秒 | `20cd1e505f60915b8317e0fe75caedd861d6385d097aac2f57d28f4a05083d25` |

2026-10-25：上記ボス戦・クリア曲を公式ページから追加取得し、利用規約を再確認。ボスを含むWaveの開始時に標準曲「騎兵戦」（和風指定のダンジョンでは下記専用曲）、戦闘演出を終えて報酬確認画面に入ると「楽しい冒険」、報酬受取後・探索失敗時はホーム曲へ切り替えます。各曲はループし、BGM音量・ミュート・バックグラウンド停止は共通設定を使います。

確認した規約の要点：商用・個人のWeb・ゲーム等のBGMとして利用可能。著作権は甘茶氏に帰属し、音楽だけの販売・二次配布、作者を偽る行為、JASRAC等の著作権管理団体やYouTube Content IDへの登録は禁止。直リンク再生は禁止で、正式ページからダウンロードして使用します。クレジットは任意ですが、本ゲームでは設定画面と本書に表記します。

これらの音源はプロジェクト独自の制作物ではなく、プロジェクトのソースコードや独自素材に付されるライセンスには含まれません。音源だけを取り出して再配布しないでください。将来の使用変更時には公式の最新規約を確認してください。

2026-10-25：和風ボス用「打ち上げ花火」を公式ページから取得。尺八・琴・和打楽器とオーケストラの楽曲。ダンジョン定義の `bossMusic: japanese` で選択し、宵宮に咲く九尾の全5難易度に適用。道中は通常戦闘曲、ボスWaveのみ和風曲、クリア時は共通の報酬曲を使用。音源原本を同梱し、実行時の直リンクは使用しません。

2026-10-27：ノベル専用曲として「月明かりの庭園」を公式の[楽曲ページ](https://amachamusic.chagasi.com/music_tsukiakarinoteien.html)からダウンロード。[利用規約](https://amachamusic.chagasi.com/terms.html)を再確認した。公式分類は幻想的／ファンタジー、使用楽器はストリングス／木管。原本を `public/audio/tsukiakarinoteien.mp3` に同梱（2,793,685 bytes、約2分54秒、SHA-256: `aab02d533c5c19f361b41ed8b7be211f0ea25318c00a16e921a0e08efade1092`）。

OP・章末・設定からの再読で同じノベル曲をループし、台詞送りでは再起動しない。物語を閉じると通常の場面選択へ戻る。音量・ミュート・バックグラウンド停止は既存の共通BGM設定を使い、SEに影響しない。配信時はローカル同梱ファイルを再生し、提供元MP3へ直リンクしない。クレジットと公式ページのリンクを設定にも追加した。
