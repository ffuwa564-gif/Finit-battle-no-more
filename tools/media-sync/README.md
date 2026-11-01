# 動画同期の検査ツール

攻略日記の音ズレ再発防止に使う。回帰試験の成功と、完成動画の同期検査の成功は別のものとして扱う。

## 準備

Python 3.12、NumPy、SciPyを使用する。完成動画の分析・音源生成には`ffmpeg`と`ffprobe`もPATHに必要。

```sh
python -m pip install -r tools/media-sync/requirements.txt
OPENBLAS_NUM_THREADS=1 python tools/media-sync/test_media_sync.py
```

GitHub Actionsの`Verify media synchronization tools`は、この回帰試験を自動実行する。未検査の動画を配布してよいという判定には使わない。

## 完成動画の照合

```sh
OPENBLAS_NUM_THREADS=1 python tools/media-sync/audit_movie.py \
  path/to/final.mp4 path/to/timeline.json path/to/narration.json path/to/audit.json
```

攻略日記1.1の配置（完成動画内のゲーム画面281×500、位置260,92）と、制作時のタイムライン・元音源を使う。別レイアウトでは、その配置と必要な検査点を合わせる。台詞のみの動画に、存在しないゲーム音の検査点を作らない。

元素材・途中のMOV・検査レポートは大容量のため`artifacts/`に置き、通常のソースへは含めない。配布ファイルのSHA-256と、照合数・誤差・相関・失敗結果を残す。

## 最終音源

```sh
OPENBLAS_NUM_THREADS=1 python tools/media-sync/build_soundtrack.py \
  path/to/game-reel.mov path/to/background.wav DURATION_SECONDS \
  path/to/soundtrack.wav path/to/soundtrack-manifest.json
```

映像と同じ時刻のゲーム音リールと、ナレーション・BGMを48kHzの共通サンプル0へ揃えてまとめる。書き出した後の完成動画で、あらためて同期を検査する。

詳しい運用は[動画の同期検査](../../docs/media-sync.md)と[制作ルール](../../AGENTS.md)を参照。
