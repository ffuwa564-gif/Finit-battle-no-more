from pathlib import Path
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04';D=O/'delivery';T=json.load(open(O/'render/timeline.json'));D.mkdir(exist_ok=True);repo='https://github.com/ffuwa564-gif/Finit-battle-no-more';branch='downloads/this-girl-04'
def tm(s):return f'{int(s)//60:02}:{int(s)%60:02}'
rows=[]
for p in T['pages']:
 if p.get('chapter'):rows.append((p['startFrame']/30,p['chapter']))
 if p['spec']['kind']=='battle-pause'and p['id']!='pause-target':rows.append((p['startFrame']/30,'停止解説：'+p['spec']['title']))
chap='\n'.join(tm(s)+' '+t for s,t in sorted(rows));(D/'Chapters.txt').write_text(chap+'\n')
(D/'README.md').write_text(f'''# その一拍で、救えるかな。 — 研究独白03

[完成動画MP4](ThisGirl-04.mp4) / [サムネイル](Thumbnail-ThisGirl-04.png) / [画面例](Preview.jpg)

{tm(T['durationFrames']/30)}・1920×1080・30fps。リケジョつむぎとRティッカの研究です。秒針ジャミングと故障診断を実際のイベント・再使用待ち・必殺ゲージで追います。4か所で停止、枠囲み、実画面拡大。直前の場面の再掲は明示しています。最後にノエルの次回予告を追加しました。

[台本](Script.md) / [字幕](Subtitles-ja.srt) / [投稿文](YouTube-Description.txt) / [チャプター](Chapters.txt) / [研究報告](ResearchReport.md) / [クレジット](Credits.md) / [再現](Reproduce.md)

公開版1.12の既存能力を使った研究用全所持セーブ。XRを通常入手できるという意味ではありません。ゲーム能力の改修、mainマージ、itch配信はしていません。16形態を対称な予算で有限探索し、12条件・各256共通シード・5群で比較。全キャラ・全石の大域最適は未証明で、判定は研究中です。

元録画のOS時刻とグラフ音源、使用区間の全対象音・境界tailを照合。完成MP4自体の映像/SE、全48発話、4停止像、全編デコード、Chromium/WebKit各3点の再生/シークを別々に検査しました。各報告は同じ完成SHAに束縛しています。

制作ZIPのpartを番号順に連結して展開します。正規化PCM MOV、独立グラフ参照、実測生データ、台本/実query/コード/出典を同梱。原曲、生合成音声、音声モデル、巨大OS rawは同梱しません。原OS rawは作業環境のtmpfsへバイト一致検査のうえ保管しています。SHA256SUMS.txtで照合してください。
''')
(D/'Credits.md').write_text('''# クレジット

音声：VOICEVOX:春日部つむぎ（Core0.17.1、style8）。公式 https://tsumugi-official.studio.site/ 。本人・運営の出演や監修を意味しません。実query、モデルSHA、合成条件はnarration.json / rights/voice-engine.jsonとspeech/*.query.json。音声/キャラクター利用条件はrightsの記録を参照。モデルと生音声は単体配布しません。

音楽：甘茶の音楽工房「夢」（作曲：甘茶）。 https://amachamusic.chagasi.com/music_yume.html 。公式配布版を完成映像のBGMとして使用。原曲の単体配布は行いません。

ゲーム：STILLVEIL https://fluffy3546.itch.io/stillveil 。キャラクター原画・研究室・研究者の小画像に生成AIを使用。今回の机は元のPOV机とティッカの原画を参照し、時計モチーフで新規生成。元画像とSHAはArtwork-Provenance.jsonを参照。小画像・旧LAB登録簿は過去シリーズを継承。新しいRunway映像は生成していません。

書体：Noto Sans CJK / Noto Serif CJK（SIL Open Font License）。著作権文を同梱。
''')
for name in ['ResearchReport.md','Design-Decisions.md','Roster-Audit.md','judgment.json']:shutil.copyfile(O/'research/reports'/name,D/('Character-Judgment.json'if name=='judgment.json'else name))
shutil.copyfile(O/'assets/Font-Copyright.txt',D/'Font-Copyright.txt')
(D/'Stone-Goals.md').write_text('''# 記憶石の目標

映像例の本人：奪灯石 hollow-lantern / 澄明変種 / T6力239・庇護239。敵の攻撃強化と再生を解除して味方へ移す。障壁は奪わない。他の3人は残響石T6、セリス/弁財天は庇護、アテナは慈雨。基礎能力値の加算ではない。今回これを全石の最適解と認定したわけではない。

奪灯石は機巧clock系。実コンテンツ由来のT6候補をresearch/stone-routes.jsonに列挙。ルネット覚醒級、塔41/44/47/50層などが機巧T6の対象。塔44層では奪灯石が注目。profileのtier6Chanceは最終ウェーブの石ドロップに条件づけた各roll属性の抽選設定で、1周でこの石/変種/特性/239がそろう確率ではない。指定ロールは確定しない。必要周回時間やドロップ率を捏造しない。

T3/T4/T6の比較は装備・リーダー・操作を再探索したパッケージ比較。Tierのみの因果効果や、個々の石との相乗効果の認定ではない。
''')
(D/'Reproduce.md').write_text('''# 再現手順

research/tikka-this-girl-04のコードと制作ZIPをrepoへ展開。npm ci。Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKitを用意する。大きな録画はtmpfsへsymlinkしても、同じファイルSHA/時刻/画素を保つ。環境固有のパスは調整する。

1. VITE_SAKUYA_RESEARCH=0。公開版1.12の既存技能。srcの全SHAとprotocol.mdを照合。run-search.py→select-diverse.mts→lock.mts。確認用シード開封前に条件をGit cf7593eへ固定。confirm.mts --development-preflightの後、run-confirmation.py→analyze.py→reports.py。元の固定データを上書きする再検証は別出力先へ。
2. prepare-recording.mtsは事前ルールに従い最初の両勝利/実jamシードを選ぶ。prepare-proof.mtsでnativeと実アプリの全HP/乱数/薬/宝箱を一致検査。capture/record-native.mjs reference 1 / tikka 1をX11/Pulse同時収録。通常表示、日本語、ゲーム設定×1。接続を維持しCPUを過負荷にしない。
3. native-clean.py→native-buffer-qa.py。マーカーと実音を検査し、80ms超/相関不足を隠さない。extract-jam.pyが最初の実jam、0→33、封印後の通常攻撃を録画frameへ束縛。33の内訳は通常25と固有8。
4. story.pyの台本をrerecord/synth-core.pyでVOICEVOX Core0.17.1から合成。モデル/辞書/ONNX Runtimeは別途用意し環境パスを調整。実queryを保持。原曲「夢」はeditor/fetch_music.pyで公式から取得し保存SHAと照合。単体配布しない。
5. rerecord/editorial.py→editor/plan.py --pending-calibration→setup-intervals.py→capture/measure-used-shots.py→media/plan_audio_offsets.py→apply-offsets.py→editor/plan.py。全対象音と境界tailを含めて測定し、各カット一つの固定sample差だけを使う。
6. preflight-plates.pyで字幕/図/枠を見直す。editor/mixer.py→editor/render.py。silent pagesと元48kHz FLACから、字幕/最後1秒のfade付きMP4を一度エンコード。後から音だけ動かさない。新しい次回予告はNoelleで、研究結果の先取り認定をしない。
7. capture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjsを配布MP4そのものへ実行。各nativeカットの始中末の連続9framesと独立実音、全48発話、全4停止像、全編decode、両browser各3点を照合。rerecord/review-final.pyで頭/文字/図も目視。再エンコードしたら全て再検査。

今回はゲーム本体の能力変更をしていない。有限研究・今回の実戦・動画QAを混同せず、研究中のまま記録する。
''')
(D/'YouTube-Description.txt').write_text('【この子で、勝ちたい。#03】その一拍で、救えるかな。｜ティッカ研究独白\n\n好きな子を、最後まで選べるRPGを。\nRの機巧斥候ティッカと、秒針ジャミングを研究します。\n大切な所で実戦を止め、必殺0→33の内訳、封印しても来る通常攻撃を、枠と拡大で追います。\n役立ったことと、最後まで選ぶ理由は別の問い。勝利だけでなく速さ・薬・生還も比較しました。\n\n最後に、ノエルの次回予告付き。\n公開版1.12の既存能力を使った研究用全所持セーブで、XRの入手案内ではありません。有限探索で、大域最適や全キャラ救済を証明したものではありません。判定は研究中です。\n\nゲーム：https://fluffy3546.itch.io/stillveil\n動画・資料：'+repo+'/tree/'+branch+'\n\n【チャプター】\n'+chap+'\n\nVOICEVOX:春日部つむぎ\nBGM：甘茶の音楽工房「夢」（作曲：甘茶）\nhttps://amachamusic.chagasi.com/music_yume.html\nイラスト等に生成AI素材を使用。詳しい出典と実測データはGitHubへ。\n#STILLVEIL #春日部つむぎ #この子で勝ちたい\n')
print('Documents',T['durationFrames']/30)
