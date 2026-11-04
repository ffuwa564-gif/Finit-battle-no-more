from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03-v2';D=O/'delivery';T=json.load(open(O/'render/timeline.json'));D.mkdir(exist_ok=True)
def tm(s):return f'{int(s)//60:02}:{int(s)%60:02}'
chap='\n'.join(tm(p['startFrame']/30)+' '+p['chapter']for p in T['pages']if p.get('chapter'));(D/'Chapters.txt').write_text(chap+'\n')
(D/'README.md').write_text(f'''# その一拍で、仲間を守る。 — 研究独白03・改訂版

[完成MP4](ThisGirl-03-v2.mp4) / [サムネイル](Thumbnail-ThisGirl-03-v2.png) / [画面例](Preview.jpg)

{tm(T['durationFrames']/30)}・1920×1080・30fps。リケジョつむぎとRティッカの研究。技能「秒針の余白」を実装し、新しい512シードで再検証してから制作しました。新規の改修前後実戦、4か所の停止解説、次回ノエルの予告付き。

[台本](Script.md) / [字幕](Subtitles-ja.srt) / [投稿文](YouTube-Description.txt) / [チャプター](Chapters.txt) / [研究報告](ResearchReport.md) / [クレジット](Credits.md) / [再現手順](Reproduce.md)

研究版・未公開仕様。mainゲームとitch.ioには未導入。全所持/最高級の4石/薬5を仮定した研究セーブで、通常進行の案内ではありません。2戦場×2編成×T3/T4/T6、各512の対応比較。C-Bと同構成C-Xの96比較を補正し、5条件で限定採用。全キャラの最終盤認定は研究中です。映像の一戦は改修前の方が良い結果でした。その結果も隠さず、一戦と全体を分けて説明します。

完成MP4自体を全編decodeし、主要実戦各カットの始中末の映像/実SE、全45発話、4停止像/実拡大、両ブラウザの再生/seekを照合。同じSHAへ束縛します。再現ZIPはpartを番号順に連結して展開。原曲/音声モデル/生合成音声は単体配布せず、元OS録画はローカルに保持。旧03は上書きしていません。
''')
(D/'Credits.md').write_text('''# クレジット

音声：VOICEVOX:春日部つむぎ（Core0.17.1、style8）。 https://tsumugi-official.studio.site/ 。本人や運営の出演・監修ではありません。実query/モデルSHA/条件はnarration.json、rights/voice-engine.json、speech/*.query.json。モデル・生合成音声は単体配布しません。

音楽：甘茶の音楽工房「夢」（作曲：甘茶）。 https://amachamusic.chagasi.com/music_yume.html 。公式配布版を完成動画へ使用し、原曲は単体配布しません。

ゲーム：STILLVEIL https://fluffy3546.itch.io/stillveil 。原画/机/研究者素材の一部に生成AIを使用。旧03の承認済みPOV机と原画を再利用し、新規画像/Runway生成なし。Artwork-Provenance.jsonに出典/SHA。旧シリーズの宝石は過去の限定認定として表示し、新しい全体認定と混同しません。

書体：Noto Sans CJK / Noto Serif CJK（SIL Open Font License）。著作権文を同梱。
''')
for name in ['ResearchReport.md','Design-Decisions.md','Roster-Audit.md','judgment.json']:shutil.copyfile(O/'research/reports'/name,D/('Character-Judgment.json'if name=='judgment.json'else name))
for name in ['Font-Copyright.txt','Artwork-Provenance.json']:shutil.copyfile(O/'assets'/name,D/name)
routes=json.load(open(O/'research/stone-routes.json'));texts=['# 次に探す石\n','ティッカは奪灯石（hollow-lantern）、ほか3人は残響石。T6・澄明を仮定した研究用装備です。T3/T4/T6比較は全4石のpower/trait帯を変更し、リーダー/構成/操作を固定。緩衝の50%はTierで増えません。必要周回数や完成特性の確率は未推定です。\n','## 機巧系統の実入手先（T6抽選あり）\n']
texts+=['- '+r['name']+' (`'+r['id']+'`)\n'for r in routes['rows']];(D/'Stone-Goals.md').write_text(''.join(texts))
(D/'Reproduce.md').write_text('''# 再現手順

ソース：research/tikka-this-girl-03-v2。ゲームのみ：research/tikka-signal / draft PR145（前の研究ブランチがbase）。mainへマージしない。npm ci、Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKit、VOICEVOX Core0.17.1 style8公式モデル/辞書/runtime、甘茶「夢」を用意し記録SHAを照合。

1. PRODUCTION-POLICY.mdとprotocol.md。コードde639b1、研究条件281d71f、未開封512パネル2894940。失敗4案はattemptフォルダ。未使用確認を調整に使ったら別パネルが必要。既存rawは上書きしない。
2. VITE_MIETTE_RESEARCH=0/VITE_SAKUYA_RESEARCH=0。改修前はVITE_TIKKA_RESEARCH=0、後は1。763unit/型/content/UI/locales/両版build/Chromium・WebKit/旧公開72結果一致/セーブ/乱数再現を確認。
3. prepare-recording.mts→prepare-proof.mtsでnativeと実applicationの全HP/RNG/薬/宝箱が一致。episode-implementation.jsonとverify-implementation.pyが本収録/最終台本の前提。実戦例は事前条件の昇順入力。結果の良い戦いだけを選ばない。
4. services.sh start --foreground、native環境をsource。公開Vite4460/研究4461。record-native.mjs reference 1 / tikka 1。日本語・通常描画・ゲーム×1、収録中に重い処理を行わない。native-clean.py→normalize_capture.py→native-buffer-qa.py。独立グラフPCM/共通マーカー/実OS録画を照合。
5. extract-jam.mtsで実イベントを録画frameへ束縛。story.py→synth-core.py→voice_qa.py。editorial.py→plan.py --pending-calibration→setup-intervals.py→source-motion.py→measure-used-shots.py→plan_audio_offsets.py→apply-offsets.py→plan.py。区間は測定前に固定し、各カット一つの48k固定差だけを許可。
6. preflight-plates.pyで停止枠/実拡大/短い字幕/原画頭部を確認。mixer.pyで1度の共通48kミックス、render.pyで整数frame編集/30fps/H264baseline/yuv420p/AAC/faststart。入力を凍結。
7. 完成ファイルへfinished-qa.py、extra-qa.py、browser.mjs、review-final.py。主要カット始中末の実frame+実SE、全発話、4停止ページ、全編decode、両ブラウザ各3点。最大80ms/相関不足は配布停止。再encode後は全再検査。finalize.py→package.py→publish.py。匿名全ファイルSHA照合まで完了としない。
''')
(D/'YouTube-Description.txt').write_text('''その一拍で、仲間を守る。｜STILLVEIL 研究独白 #03【改訂版】

Rティッカの「一手」を、実際に改修しました。
封印のあとも飛んでくる通常攻撃。その一撃を弱める「秒針の余白」を実装し、新しい512シードで比較します。

つむぎの静かな研究ノート。要所で実戦を一時停止し、枠と拡大で「何が起きたか」を説明します。映像の一戦は改修前の方が良い結果。そのことも残して、複数戦の改善と区別しました。

※研究版・未公開仕様です。公開ゲームには未導入。
※全キャラ所持/高級記憶石を仮定した研究セーブ。通常の入手進行ではありません。
※限定的な改修採用と、全キャラの最終盤認定は別です。

無料ブラウザRPG STILLVEIL： https://fluffy3546.itch.io/stillveil
資料・台本・字幕： https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/this-girl-03-v2

'''+chap+'''\n
音声：VOICEVOX:春日部つむぎ
音楽：甘茶の音楽工房「夢」（作曲：甘茶） https://amachamusic.chagasi.com/music_yume.html
画像・制作補助に生成AIを使用。出演者本人の監修ではありません。
#STILLVEIL #VOICEVOX #春日部つむぎ #ゲーム開発
''')
print('Delivery text, credits, chapters and reproduction instructions written')
