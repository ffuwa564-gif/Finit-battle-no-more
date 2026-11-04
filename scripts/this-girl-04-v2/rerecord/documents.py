from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04-v2';D=O/'delivery';T=json.load(open(O/'render/timeline.json'));D.mkdir(exist_ok=True)
def tm(s):return f'{int(s)//60:02}:{int(s)%60:02}'
chap='\n'.join(tm(p['startFrame']/30)+' '+p['chapter']for p in T['pages']if p.get('chapter'));(D/'Chapters.txt').write_text(chap+'\n')
(D/'README.md').write_text(f'''# その一手を、失わないために。 — 研究独白04・改訂版

[完成MP4](ThisGirl-04-v2.mp4) / [サムネイル](Thumbnail-ThisGirl-04-v2.png) / [画面例](Preview.jpg)

{tm(T['durationFrames']/30)}・1920×1080・30fps。リケジョつむぎとRノエル。今回は「資源を守る号令」を研究版へ実装し、新しい256入力で再検証してから制作しました。新規の改修前後実戦、4停止解説、リゼットの次回予告付き。

[台本](Script.md) / [字幕](Subtitles-ja.srt) / [投稿文](YouTube-Description.txt) / [チャプター](Chapters.txt) / [研究報告](ResearchReport.md) / [クレジット](Credits.md) / [再現手順](Reproduce.md)

研究版・未公開仕様。mainとitch.ioは未更新。全所持/最高級の4石/薬5を仮定した比較で、通常進行の案内ではありません。2戦場×2編成×T3/T4/T6、各256の対応比較。C-BとC-XをHolm96補正し、3条件で安全策を限定採用。Bは「号令を使う方針内」の改修前であり、無制約最強ではありません。号令なしNは薬がさらに少なく、ノエルの固有の最終盤価値は研究中。映像の一戦も改修前が良い結果。そのまま残し、平均の改善と分けて説明します。

完成MP4自体の全編decode、主要実戦各カット始中末の映像/SE、全38発話、4停止像/実拡大、Chromium/WebKit各3点の再生/seekを照合し、同じSHAへ束縛。配布ZIPのpartは番号順に連結して展開。元曲/音声モデル/生合成音声は単体配布せず、採用OS録画はローカルに保持。新たな録音検査不合格テイクはログ/SHAを保存して不使用。旧04は上書きしていません。
''')
(D/'Credits.md').write_text('''# クレジット

音声：VOICEVOX:春日部つむぎ（Core0.17.1、style8）。 https://tsumugi-official.studio.site/ 。本人・運営の出演/監修ではありません。実query/モデルSHA/利用条件はnarration.json、rights/voice-engine.json、speech/*.query.json。モデルと生音声は単体配布しません。

音楽：甘茶の音楽工房「夢」（作曲：甘茶）。 https://amachamusic.chagasi.com/music_yume.html 。公式版を完成動画へ使用。原曲は単体配布しません。

ゲーム：STILLVEIL https://fluffy3546.itch.io/stillveil 。原画・机・研究者素材の一部に生成AIを使用。承認済みの旧04のPOV机と原画を再利用し、新規画像/Runway生成なし。Artwork-Provenance.jsonに出典/SHA。旧認定記録と今回の保護策採用を区別し、新たな最終盤認定は付けません。

書体：Noto Sans CJK / Noto Serif CJK（SIL Open Font License）。著作権文を同梱。
''')
for name in ['ResearchReport.md','Design-Decisions.md','Roster-Audit.md','judgment.json']:shutil.copyfile(O/'research/reports'/name,D/('Character-Judgment.json'if name=='judgment.json'else name))
for name in ['Font-Copyright.txt','Artwork-Provenance.json']:shutil.copyfile(O/'assets'/name,D/name)
routes=json.load(open(O/'research/stone-routes.json'));texts=['# 次に探す石\n','改修後の主構成は、4人ともT6・澄明の残響石。ノエル/アテナはbulwark、覚醒セリス/弁財天はmercy。研究用の各帯上限入力を使用し、自然入手済みとは扱わない。改修前はノエルに奪灯石を選抜。\n','G3/G4/T6は同じ構成/操作で全4石のpower/trait帯を変更。保護策自体はTierで大きくならない。必要周回数/完成特性の確率は未推定。以下は機巧系統のT6抽選がある実入手先で、毎回確定ではありません。\n']
texts+=['- '+r['name']+' (`'+r['id']+'`)\n'for r in routes['rows']];(D/'Stone-Goals.md').write_text(''.join(texts))
(D/'Reproduce.md').write_text('''# 再現手順

ソース：research/noelle-this-girl-04-v2。ゲームのみ：research/noelle-resource-safety / draft PR146、前回研究ブランチがbase。mainへマージしない。npm ci、Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKit、VOICEVOX Core0.17.1 style8の公式モデル/辞書/runtime、甘茶「夢」を記録SHAで用意。

1. PRODUCTION-POLICY.mdとprotocol.md。実装568c57f、比較717308e、未使用256パネル98273ae。16開発/32選抜/256確認を分離。C-Bは号令運用という制約内、N/L/Aは別の機会費用。凍結済み構成を結果から選び直さない。lockの最終選抜の説明語順と旧終了ログ512ラベルは記録訂正を参照し、実コード/固定構成/実256行を優先する。
2. SAKUYA/MIETTE/TIKKAの研究フラグは0。改修前VITE_NOELLE_RESEARCH=0、後は1。775unit（新12）、両版build、型/content/UI/locales、Chromium/WebKit実予約・見送り・通常一手、旧04の72結果一致、保存と乱数再現を確認。
3. prepare-recording.mts→prepare-proof.mtsでnativeとapplicationの全HP/RNG/薬/宝箱一致。episode-implementation.jsonとverify-implementation.pyが本台本/収録の前提。recording-selectionは事前優先条件と昇順入力、実見送り→同R本人通常行動を要求し、同条件内で実発令ありを優先。良い一戦だけには変えない。
4. services.sh start --foreground、native環境をsource。公開Vite4480/研究4481。record-native.mjs reference 1 / noelle 1、日本語・通常描画・×1。重い処理を並行しない。最初の独立PCM連続性エラーのテイクは不使用。継ぎ足しや波形修理せず再収録。native-clean→normalize_capture→native-buffer-qa。元OSと独立グラフPCM/時刻マーカーを照合。
5. extract-command.mtsで実イベントを実録frameへ束縛。story.py→synth-core→voice_qa。editorial→plan --pending-calibration→setup-intervals→source-motion→measure-used-shots→plan_audio_offsets→apply-offsets→plan。区間は測定前固定、各カット一つの48k固定差だけ許可。
6. preflight-platesで枠/原画/字幕を確認。mixerで共通48k音源を一度ミックス、renderで30fps/H264baseline/yuv420p/AAC/faststart。全入力を凍結。art/thumbnail.py --root <repository-root>で手とペンの見える1280x720サムネイル。
7. 完成ファイルへfinished-qa/extra-qa/browser/review-final。全編decode、全使用実戦カット始中末、全38発話、4停止像、両ブラウザ各3点。同期80ms/相関不足は配布停止。ブラウザは初期待ち最大5sを別記し、その後2sの速度0.85–1.15倍・400msごとの停止を検査。再encode後は全再検査。同じSHAでfinalize→package→publish、公開全ファイルの匿名全量SHA照合。
''')
(D/'YouTube-Description.txt').write_text('''その一手を、失わないために。｜STILLVEIL 研究独白 #04【改訂版】

今回は、Rノエルの号令を実際に改修しました。
予約相手の石や必殺が準備済みなら、発令を見送り、ノエルは本来の一手へ戻る。「資源を守る号令」の研究です。

つむぎの静かな一人語り。要所で実戦を止め、枠と拡大で「何が起きたか」を説明します。
保護策は限定条件で採用。一方で、号令なしの方が薬が少ない結果も残りました。新しい最強キャラの認定ではありません。

※研究版・未公開仕様。main/itch.ioには未導入。
※全所持/高級石を仮定した研究セーブで、通常の入手案内ではありません。
※比較の改修前Bは号令運用の制約内。号令なし/別リーダーも別に検証。

無料ブラウザRPG： https://fluffy3546.itch.io/stillveil
資料・台本・字幕： https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/this-girl-04-v2

'''+chap+'''\n
音声：VOICEVOX:春日部つむぎ
音楽：甘茶の音楽工房「夢」（作曲：甘茶） https://amachamusic.chagasi.com/music_yume.html
画像・制作補助に生成AIを使用。本人による監修ではありません。
#STILLVEIL #VOICEVOX #春日部つむぎ #ゲーム開発
''');print('Delivery documents prepared')
