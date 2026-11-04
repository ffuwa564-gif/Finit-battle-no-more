from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04';D=O/'delivery';T=json.load(open(O/'render/timeline.json'));D.mkdir(exist_ok=True);repo='https://github.com/ffuwa564-gif/Finit-battle-no-more';branch='downloads/this-girl-04'
def tm(s):return f'{int(s)//60:02}:{int(s)%60:02}'
rows=[]
for p in T['pages']:
 if p.get('chapter'):rows.append((p['startFrame']/30,p['chapter']))
 if p['spec']['kind']=='battle-pause':rows.append((p['startFrame']/30,'停止解説：'+p['spec']['title']))
chap='\n'.join(tm(s)+' '+t for s,t in sorted(rows));(D/'Chapters.txt').write_text(chap+'\n')
(D/'README.md').write_text(f'''# その号令は、誰のため。 — 研究独白04

[完成MP4](ThisGirl-04.mp4) / [サムネイル](Thumbnail-ThisGirl-04.png) / [画面例](Preview.jpg)

{tm(T['durationFrames']/30)}・1920×1080・30fps。リケジョつむぎとRノエルの研究。号令の予約・適用・宛先変更を分け、自分の行動との交換を調べます。4停止解説、枠囲み、実画面拡大。再掲は明示。最後にリゼットの次回予告付き。

[台本](Script.md) / [字幕](Subtitles-ja.srt) / [投稿文](YouTube-Description.txt) / [チャプター](Chapters.txt) / [研究報告](ResearchReport.md) / [クレジット](Credits.md) / [再現](Reproduce.md)

公開版1.12の既存能力、研究用の全所持想定セーブ。XRの通常入手案内ではありません。main/itchを変更していません。主研究12条件×8群×256共通シード。有限探索、全キャラ全石の大域最適は未証明。追加の石研究は別の新256シードで先に条件を固定。判定は研究中です。

完成MP4自体について、全編decode、実戦の始中末の映像/SE、全48発話、4停止像/拡大、Chromium/WebKit各3点の再生/seekを検査。各報告を同じSHAに束縛します。

制作ZIPのpartを番号順に連結して展開。正規化PCM MOV、独立グラフ参照、実測生データ、台本/query/コード/出典を同梱。原曲、生合成音声、モデル、巨大OS rawは同梱しません。OS rawはローカルの作業領域に保持。SHA256SUMS.txtで照合できます。
''')
(D/'Credits.md').write_text('''# クレジット

音声：VOICEVOX:春日部つむぎ（Core0.17.1、style8）。 https://tsumugi-official.studio.site/ 。本人・運営の出演/監修ではありません。実query、モデルSHA、条件はnarration.json / rights/voice-engine.jsonとspeech/*.query.json。利用条件はrightsの記録を参照。モデルと生音声は単体配布しません。

音楽：甘茶の音楽工房「夢」（作曲：甘茶）。 https://amachamusic.chagasi.com/music_yume.html 。公式配布版を完成映像のBGMとして使用。原曲の単体配布は行いません。

ゲーム：STILLVEIL https://fluffy3546.itch.io/stillveil 。原画・机・研究者の小画像に生成AI素材を使用。今回のPOV机は元の机とノエルの原画を参照し、星図モチーフで新規生成。元画像とSHAはArtwork-Provenance.json。小画像/旧LAB登録簿は過去シリーズを継承。新Runway映像は生成していません。

書体：Noto Sans CJK / Noto Serif CJK（SIL Open Font License）。著作権文を同梱。
''')
for name in ['ResearchReport.md','Design-Decisions.md','Roster-Audit.md','judgment.json']:shutil.copyfile(O/'research/reports'/name,D/('Character-Judgment.json'if name=='judgment.json'else name))
shutil.copyfile(O/'assets/Font-Copyright.txt',D/'Font-Copyright.txt')
(D/'Stone-Goals.md').write_text('''# 石と号令

映像は全員が澄明の残響石 echo-shard T6、power239。ノエル/覚醒リゼットは庇護239、覚醒セリス/サクヤヒメは慈雨239。石の行動は号令で上書きされない。主研究でMの4枠が埋まったため、G=M/GE=Eは石効果の検証にならなかった。

追加検証は二人の石を外したH/HE。葛葉T6F2では号令による変更が増えても勝利は低下した。石を外すことを推奨する結果ではない。新たな特定の厳選目標は認定していない。過去回の奪灯石の入手案内を本回の推奨として流用しない。

T3/T4/T6は各帯で作戦と石を再選抜。Tier単独効果ではない。ドロップ率/必要周回を推定する研究は実施していない。
''')
(D/'Reproduce.md').write_text('''# 再現手順

research/noelle-this-girl-04のコードと制作ZIPをrepoへ展開。npm ci。Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKit。VOICEVOX Core0.17.1、style8のモデル/辞書/ONNX Runtimeは別途用意し、環境固有パスを調整。原曲「夢」は公式から取得しmusic-source.jsonのSHAと照合。

1. VITE_SAKUYA_RESEARCH=0。protocol.md、src全SHAを照合。run-search.py→lock.mts。Git6a3f7afで確認条件を固定した後、run-confirmation.py→analyze.py→reports.py。元データを上書きせず別出力先で再検証する。追加石研究はstone-extension.mts、別の256入力をGit8a3139fに先に固定。主仮説へすり替えない。
2. prepare-recording.mts→prepare-proof.mts。native/実アプリの全HP/乱数/薬/宝箱を一致検査。X11/Pulseをstartし、record-native.mjs reference 1 / noelle 1。日本語、通常表示、ゲーム設定×1。新規録画。録画中は接続を維持しCPU過負荷を避ける。
3. native-clean.py→native-buffer-qa.py。全体マーカー差80ms以内と独立グラフPCMの実音を検査。extract-command.pyで最初の実宛先変更を元frameへ束縛。50は通常攻撃の実ダメージで追加ダメージではない。
4. story.py→rerecord/synth-core.pyで全48発話を新規合成。実queryを保管。reports.py→rerecord/editorial.py→editor/plan.py --pending-calibration→setup-intervals.py→capture/measure-used-shots.py→media/plan_audio_offsets.py→apply-offsets.py→editor/plan.py。原区間は測定前に固定、境界tailも全対象音も測定し、カットごとに一つの固定sample差だけを用いる。
5. preflight-plates.pyで文字/枠/図を確認。editor/mixer.py→editor/render.py。30fps/48kHz、一度の最終AAC encode、最後1秒fade。後から音だけ動かさない。
6. 完成MP4そのものへcapture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjs。実戦の始中末9連続frameとSE、全発話、4停止像、全編decode、両ブラウザ各3点を検査。review-final.pyで目視。再encodeしたら全検査を再実行。

公開ゲーム能力の変更はない。次回リゼットは未検証、旧認定/研究中の意味を変えない。新たな最終盤認定は0。
''')
(D/'YouTube-Description.txt').write_text('【この子で、勝ちたい。#04】その号令は、誰のため。｜ノエル研究独白\n\n好きな子を、最後まで選べるRPGを。\n星図を読むRノエルと、号令の一手を研究します。\n予約した人数、適用された行動、本当に宛先が変わった行動。実戦を4か所で止め、枠と拡大で追いかけます。\n命令が増えることと、仲間が強くなることは、同じでしょうか。\n\n公開版1.12の既存能力を使った全所持想定の研究用セーブ。有限探索で、全キャラ全石の大域最適ではありません。結論は研究中。次回はリゼット。\n\nゲーム：https://fluffy3546.itch.io/stillveil\n動画・資料：'+repo+'/tree/'+branch+'\n\n【チャプター】\n'+chap+'\n\nVOICEVOX:春日部つむぎ\nBGM：甘茶の音楽工房「夢」（作曲：甘茶）\nhttps://amachamusic.chagasi.com/music_yume.html\n生成AI素材を使用。出典・実測データはGitHubへ。\n#STILLVEIL #春日部つむぎ #この子で勝ちたい\n')
print('Documents',T['durationFrames']/30)
