import pathlib,json
P=pathlib.Path('artifacts/diary-111');D=P/'delivery';m=json.loads((P/'narration.json').read_text());sec=round(m['duration']);length=f'{sec//60}分{sec%60:02}秒'
repo='ffuwa564-gif/Finit-battle-no-more';branch='downloads/tower-diary-1-1-1';root=f'https://github.com/{repo}/tree/{branch}';raw=f'https://raw.githubusercontent.com/{repo}/refs/heads/{branch}/';source=f'https://github.com/{repo}/tree/video/tower-diary-1-1-1'
text=f'''# 白亜の塔攻略日記 Part1.1.1

**{length}・ずんだもん × 四国めたん・日本語解説。** Part1.1の章立てを踏襲し、敵の分析、キャラを選んだ理由、装備、失敗、本走、振り返りをまとめました。

- [完成動画 MP4]({raw}STILLVEIL-TowerDiary-Part1.1.1.mp4)
- [YouTube用説明文・チャプター](YouTube-Description.txt) ／ [字幕](Subtitles-ja.srt) ／ [台本](Script.md) ／ [サムネイル](Thumbnail.png)
- [制作入力一式](Production-Inputs.zip) ／ [収録ソース](Recording-Sources.zip) ／ [制作コード]({source}/scripts/diary-111) ／ [条件と再現方法](Methods.md)
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
'''
(D/'README.md').write_text(text)
(D/'YouTube-Description.txt').write_text(f'''白亜の塔攻略日記 Part1.1.1｜低レアに仕事を。白花を実戦へ。

ずんだもんと四国めたんが第一層を別ビルドで攻略。なぜ他のキャラではなく、その子を選んだのか。新技能が実際にどれだけ働いたのか。失敗した指揮案まで振り返ります。

ゲーム：https://fluffy3546.itch.io/stillveil
動画・字幕・装備・操作・比較資料：{root}
制作コード：{source}

今回は宣言した所持キャラ・装備による比較条件で、前作終了セーブの連続攻略ではありません。T4等の装備取得を本編で行ったことにはしていません。別乱数100通りの61勝・76勝は固定条件・固定操作での成績で、実プレイヤー全体の勝率ではありません。
ゲームv1.10.0、動画Part1.1.1。戦闘は実アプリ収録、SEも実音声。本編の早送りは映像とSEで同じ倍率。全戦闘版も資料にあります。

'''+(D/'Chapters.txt').read_text()+'''\n音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん
立ち絵：東北ずん子・ずんだもんプロジェクト公式
音楽：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」
https://amachamusic.chagasi.com/music_fjordnosundakaze.html
ゲーム制作で生成AIを使用。詳細と各素材規約はGitHubのCredits.mdをご覧ください。
''')
print(length)
