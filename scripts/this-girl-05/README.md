# 研究独白05 — 祓った、その先へ。

SRリゼット（BD036）の弔鐘の返し刃。静かなリケジョつむぎ、実録4カット、実イベントに結び付けた4停止解説。原画はcontain配置し、字幕は2行、机とピアノを再利用。

研究の先行条件は `protocol.md`、制作完了条件はリポジトリの `docs/media/this-girl/PRODUCTION-POLICY.md`。単独の私的仕様（VITE_LISETTE_RESEARCH=1）。公開版へのマージ/itch送信は別の指示がない限り行わない。

`search.mts` → `lock.mts` → `run-confirmation.py` → `analyze.py` → `prepare-recording.mts` → `reports.py` → `finish-research.py` → `verify-implementation.py`。凍結済み研究の改修/構成/合格基準を、確認結果から選び直さない。全18条件は資料に残す。

`capture/record-native.mjs` は原OS画面、独立PCM、時刻マーカーを収録し、共通校正とCFR化を行う。取得異常時は再収録。区間を固定後、使用カットの各三分点で独立音声差を測り、カット一つに一定サンプル差を一つだけ適用。

最終再現手順・台本・字幕・実測は配布ブランチ downloads/this-girl-05 の Reproduce.md/ResearchReport.md/制作ZIP参照。デコード可能なだけで同期合格にせず、完成MP4を元素材へ照合し、両ブラウザ再生/seekと公開全量読み戻しを行う。今回の局所改修採用と、全キャラ最終盤認定は別。
