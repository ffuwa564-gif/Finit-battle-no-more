# 白亜の塔攻略日記 Part1.1.1

前作Part1.1の「敵の分析→役割決定→装備確認→準備→失敗→本走→振り返り」を引き継ぐ、ずんだもん・四国めたんの実プレイ解説動画。低レア巻戻し編成と、白花・フィオ新技能を使う編成を比較する。

動画番号はPart1.1.1。ゲームのパッチ番号ではない。撮影対象はゲーム **v1.10.0 / dec20ebbfb8d139713ffe847ebc48eefe8ff54ca**。ゲーム本体は変更しない。

## 公開物

完成動画・字幕・台本・章時刻・装備・比較結果・操作記録・音ズレ確認結果：`downloads/tower-diary-1-1-1` ブランチ。制作コードはこのブランチの `scripts/diary-111/`。完成後のREADMEに固定コミットと再生リンクを記載する。

## 条件と限界

- 前作の終了セーブからの連続プレイではない。ユーザー了承済みの比較用条件。必要キャラ所持・通常ダンジョン開放・T4装備を宣言したfixture。獲得周回・抽選を撮影したふりはしない。
- 白花以外は威力125、特性値125のT4。白花だけは固定T3・威力80・特性なし。編成ごとの装備種類は各proofに記載。
- 持込薬最大5。妖精と花もnative commandで使用。ゲーム中のSEはアプリから収録、BGMのみ切って編集側で別に付加。
- 乱数1003の巻戻し成功例は22R・3人生存、ウズメ戦闘不能。乱数1018の白花成功例は27R・4人生存。成功映像を探すのに用いた範囲と、編成確定後の確認範囲70001–70100を分ける。
- 別乱数100通りで61勝／76勝は固定fixture・固定された合法操作方針の結果。実プレイヤーの母集団勝率ではなく、最適解や石単体の因果効果でもない。編成全体を変更した比較と、一人交代・リーダー交代の比較を区別する。
- 指揮あり各候補0/16は今回調べた候補・条件に限定。指揮全般を否定しない。代表19R敗北のnative proofも同梱。
- 白花の実回復は即時33＋開花92＝125。開花は50・0・42の3回。フィオの**余り布の回復技**4回中、追加障壁5が1回。通常の回復技すべてや、石・必殺の回復に変換能力が付くわけではない。
- アテナの今回のリーダー基礎補正はHP+18.4％と軽減10％。ヘカテのDEF補正と混同しない。先頭操作とリーダー指定は別。

## 再現

Node24、依存関係は固定ゲームtreeのlockfile。Python3.12 / numpy / Pillow、FFmpeg7.1、Noto Sans CJK JP、VOICEVOX engine0.26.0。公式立ち絵と甘茶の音楽工房の音源は各規約に従い取得する。単体素材をProduction-Inputsに再配布しない。

1. ゲームの固定コミットをcheckoutし、この制作コードを適用。`npm ci`。
2. 公開Production-Inputs.zipとRecording-Sources.zipをrepo rootへ展開。Recording-Sourcesは校正用の色・音を含む制作専用入力で、そのまま公開上映するファイルではない。FLAC音声は `restore_audio.py` でPCMを一致させてWAV復元。
3. `python scripts/diary-111/bootstrap.py` で公式立ち絵取得。音源はゲーム同梱の `public/audio/fjordnosundakaze.mp3`。
4. 必要なら探索を再実行：`npx tsx scripts/diary-111/search.ts`、`compare.ts`、`flower-pilot.ts`、`confirm.ts`。前段JSONの依存関係は同梱search/を参照。最終値検査は `python scripts/diary-111/validate_data.py`。
5. `npx tsx scripts/diary-111/prove.ts rewind` / `flower` / `command`。各engine controlをnative application commandで再生し、HP・ゲージ・終了phaseが一致することを確認する。
6. 新規収録時：Vite4328を起動し、`node scripts/diary-111/capture.mjs rewind 2` / `flower 1`。別プロファイルに比較fixtureを保存して実アプリを操作。ブラウザ表示とnative proofの最終HP・ゲージ・phaseも一致を確認。
7. 録音はMediaRecorder Opusのpacket PTSを `aresample=async=1:first_pts=0` で保ち、CDPフレームを時刻順に整列。開始・終了の専用マーカーで僅かなaudio clock差を二点補正。巻戻しの最終収録では、ほかの重い処理を止め、開始前に描画を暖機し、DOM描画後のrequestAnimationFrameを経て校正音を予約する。過負荷で開始マーカーが遅れた不採用収録は公開素材に使わない。**変換済みMP4を別に再デコードし、両端の色と音の立ち上がり差が75ms未満であることを検査してから**raw JPEGを削除する。
8. `python scripts/diary-111/render.py`。本編のトリム区間は校正マーカーの内側。戦闘を早送りするときは映像のsetptsとSEのatempoを同じ倍率にし、倍率を表示。全戦闘版は編集上の早送りなし。アプリ内の速度設定は巻戻し2／白花1で、Captureメタデータにも記載。字幕と章時計は実際の合成音声長から作る。
9. `python scripts/diary-111/package.py` / `validate_video.py`。全動画デコード、タイムラインと音量、音画両端、字幕長、データを検査する。

収録・編集の中間ファイル、パケット時刻、各chapterのAV編集倍率・対応区間は付属資料に残す。校正音やマーカーは公開動画に入れない。時間変更後の必殺表示は実イベント時刻から算出する。解説音声は編成全体の分析であり、任意の攻撃の瞬間を別の技だと言い換えない。

## 参照

- 前作 `downloads/tower-diary-part1` / cd6854ccc870a6ec5c973d5be88ffc9bbf4f62cd：Part1.1 movie / Guide / SRT。
- 固定ゲーム `src/domain/engine.ts`、`memory-gems.ts`、`white-flower.ts`、`scout-skills.ts`、`command-doctrine.ts`、`src/application/game.ts`。
- 公式立ち絵：東北ずん子・ずんだもんプロジェクト `zunmon003.png` / `met002_cr.png`。
- 音声：VOICEVOX:ずんだもん / VOICEVOX:四国めたん。
- 音楽：甘茶の音楽工房「フィヨルドの澄んだ風」。
