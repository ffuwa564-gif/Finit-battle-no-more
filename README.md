# 白亜の塔攻略日記 Part1.1.1

**19分28秒・ずんだもん × 四国めたん・日本語解説。** Part1.1の章立てを踏襲し、敵の分析、キャラを選んだ理由、装備、失敗、本走、振り返りをまとめました。

- [完成動画 MP4](https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/refs/heads/downloads/tower-diary-1-1-1/STILLVEIL-TowerDiary-Part1.1.1.mp4)
- [YouTube用説明文・チャプター](YouTube-Description.txt) ／ [字幕](Subtitles-ja.srt) ／ [台本](Script.md) ／ [サムネイル](Thumbnail.png)
- [制作入力一式](Production-Inputs.zip) ／ [収録ソース](Recording-Sources.zip) ／ [制作コード](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/video/tower-diary-1-1-1/scripts/diary-111) ／ [条件と再現方法](Methods.md)
- [巻戻しの全戦闘](FullReplay-rewind.mp4) ／ [白花の全戦闘](FullReplay-flower.mp4)
- 検証用の開始セーブ：[巻戻し](ComparisonFixture-rewind.json) ／ [白花](ComparisonFixture-flower.json)。比較条件の直接付与を含む専用データです。読み込む場合は普段のセーブを先にバックアップしてください。
- [比較CSV](Comparison.csv) ／ [数値・native操作検証](Data-Validation.json) ／ [最終動画検証](Validation.json)
- 音画の独立検査：[巻戻し](AV-Sync-rewind.json) ／ [白花](AV-Sync-flower.json)。収録ファイルを変換後に再デコードして両端を検査。校正音は本編・全戦闘版から除外。

## 内容と条件

ゲーム **v1.10.0 / dec20ebbfb8d139713ffe847ebc48eefe8ff54ca**。Part1.1.1は動画番号で、アプリの更新ではありません。

前回終了セーブからの連続プレイではなく、所持キャラ・進行・装備を宣言した比較用条件です。通常開放済み、白花以外の石はT4・威力125・特性125。白花は固定T3・威力80・特性なし。これらの入手周回や抽選を実施したふりはしません。準備の白花製作も、素材6個を宣言した条件からnative commandで確認しています。

- 低レア巻戻し：覚醒セリス／アメノウズメ／アテナ（長）／弁財天。撮影例22R・3人生存。ウズメは戦闘不能。
- 白花と余り布：フィオ（先頭）／ノクス／アテナ（長）／弁財天。撮影例27R・4人生存・薬2個。白花の実回復125、余り布の追加障壁5。
- 確定後の別乱数100通り：巻戻し61勝、白花76勝。固定所持品・合法操作方針の結果であり、実プレイヤー全体の勝率や石単体の優劣ではありません。
- 指揮案は今回の候補では成功せず、代表19R敗北。対象外の行動とリーダー変更の代償を検討しました。別条件へ一般化しません。

実アプリ表示とゲームSEを収録。本編の戦闘はAV共通の早送りで、倍率とアプリ速度を表示しています。全戦闘版は編集の早送りなし（アプリ速度は収録メタデータ参照）。

[制作・素材クレジット](Credits.md)。音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん。音楽：甘茶の音楽工房「フィヨルドの澄んだ風」。

制作コード固定版： https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/cece05e04fb7b6a26926d05640f872bcbc5b6c68/scripts/diary-111
