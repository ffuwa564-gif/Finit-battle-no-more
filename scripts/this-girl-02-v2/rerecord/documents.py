from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-v2';D=O/'delivery';T=json.load(open(O/'render/timeline.json'));D.mkdir(exist_ok=True);repo='https://github.com/ffuwa564-gif/Finit-battle-no-more';branch='downloads/this-girl-02-v2'
def tm(s):return f'{int(s)//60:02}:{int(s)%60:02}'
rows=[]
for p in T['pages']:
 if p.get('chapter'):rows.append((p['startFrame']/30,p['chapter']))
 if p['spec']['kind']=='battle-pause':rows.append((p['startFrame']/30,'停止解説：'+p['spec']['title']))
chap='\n'.join(tm(s)+' '+t for s,t in sorted(rows));(D/'Chapters.txt').write_text(chap+'\n')
(D/'README.md').write_text(f'''# 消える盾を、命に縫う。 — 研究独白02・改訂版

[完成MP4](ThisGirl-02-v2.mp4) / [サムネイル](Thumbnail-ThisGirl-02-v2.png) / [画面例](Preview.jpg)

{tm(T['durationFrames']/30)}・1920×1080・30fps。リケジョつむぎとSRミエットの研究。今回は技能を実際に改修し、確認用512シードで再検証してから台本と映像を作りました。改修前後の実戦を新規収録。4か所で止め、枠と拡大で説明します。次回はティッカの改修研究。

[台本](Script.md) / [字幕](Subtitles-ja.srt) / [投稿文](YouTube-Description.txt) / [チャプター](Chapters.txt) / [研究報告](ResearchReport.md) / [クレジット](Credits.md) / [再現手順](Reproduce.md)

改修「余り糸の修繕」は研究版・未公開仕様です。mainのゲームやitch.ioには未導入。公開版1.12を対照とし、全所持想定・T6装備の研究用セーブで検証。通常の入手案内ではありません。2戦場×2編成×3装備帯、共通512入力。主条件では薬の平均2.83→2.54。4人生還が大きく悪化した別条件も明示。有限探索であり、全キャラ全石の大域最適は未証明。改修は限定条件で採用、最終盤の固有価値は研究中です。

完成MP4そのものの全編decode、実戦各カットの始中末の映像/SE、全48発話、4停止像/拡大、Chromium/WebKit各3点の再生/seekを検査し、同じSHAへ束縛します。

制作ZIPのpartを番号順に連結して展開。正規化PCM MOV、独立グラフ参照、実測データ、コード、台本/query/出典を同梱。原曲・モデル・生合成音声は単体配布しません。巨大OS rawはローカル保持。SHA256SUMS.txtで照合できます。旧パート2は上書きしていません。
''')
(D/'Credits.md').write_text('''# クレジット

音声：VOICEVOX:春日部つむぎ（Core0.17.1、style8）。 https://tsumugi-official.studio.site/ 。本人・運営の出演/監修ではありません。実query、モデルSHA、条件はnarration.json / rights/voice-engine.jsonとspeech/*.query.json。モデルと生音声は単体配布しません。

音楽：甘茶の音楽工房「夢」（作曲：甘茶）。 https://amachamusic.chagasi.com/music_yume.html 。公式配布版を完成映像に使用。原曲の単体配布は行いません。

ゲーム：STILLVEIL https://fluffy3546.itch.io/stillveil 。原画・机・研究者の小画像に生成AI素材を使用。机は承認済みの旧パート2のPOV素材を再利用。新規の画像/Runway生成はありません。出典とSHAはArtwork-Provenance.json。過去シリーズの認定記録を維持し、今回の改修採用を最終盤認定と混同しません。

書体：Noto Sans CJK / Noto Serif CJK（SIL Open Font License）。著作権文を同梱。
''')
for name in ['ResearchReport.md','Design-Decisions.md','Roster-Audit.md','judgment.json']:shutil.copyfile(O/'research/reports'/name,D/('Character-Judgment.json'if name=='judgment.json'else name))
shutil.copyfile(O/'assets/Font-Copyright.txt',D/'Font-Copyright.txt')
routes=json.load(open(O/'research/stone-routes.json'));texts=['# 石の目標と、実際の入手先\n','今回の4石は、ミエット/覚醒セリス/アストレアが残響石、アテナが白灯石。すべてT6・澄明。固定ビルドの成長比較では4石のpower/trait帯をT3/T4/T6へ変え、同じ操作・リーダーを使いました。白灯石1個だけの因果効果ではありません。\n','T3で入口、T4/T6で安定性を検討。必要周回数や理想特性の完成確率は推定していません。下記は公開済みコンテンツから抽出した対応系統の実入手先であり、毎回確定入手を意味しません。\n']
for stone in routes['stones']:
 texts.append('## '+stone['name']+'\n');texts.extend('- '+r['name']+' (`'+r['id']+'`)'+(' / T6の抽選あり'if(r['profile'].get('tier6Chance')or 0)>0 else'')+'\n'for r in stone['routes']);texts.append('\n')
(D/'Stone-Goals.md').write_text(''.join(texts))
(D/'Reproduce.md').write_text('''# 再現手順

ソースは research/miette-this-girl-02-v2。ゲーム差分は research/miette-spare-thread / draft PR144。公開版へマージしない。npm ci、Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKit。VOICEVOX Core0.17.1 style8のモデル/辞書/Runtimeと、甘茶「夢」は別途公式から取得し記録SHAを照合。

1. PRODUCTION-POLICY.md、protocol.md、confirmation-lock.jsonを読む。ゲーム変更386ac8c、探索条件752ac25、未開封512確認パネルを0554a83で固定。失敗した4試作も研究資料へ残した。研究/選抜/確認乱数を分離。rawデータを上書きせず、別出力先で再検証する。
2. VITE_SAKUYA_RESEARCH=0、改修前はVITE_MIETTE_RESEARCH=0、改修後は1。セーブ/既存戦闘/乱数再生/750ユニットテスト/Chromium・WebKit実アプリ/ビルドを検証。verify-implementation.pyを実行。episode-implementation.jsonと凍結証拠のSHAが一致しなければ動画を作らない。
3. prepare-recording.mtsとcapture/prepare-proof.mts。native計算と実アプリの全HP/乱数/薬/宝箱を一致検査。X11/Pulseを開始しrecord-native.mjs reference 1 / miette 1で新規収録。日本語・通常描画・ゲーム×1。収録中の重い処理を避ける。
4. native-clean.py→native-buffer-qa.py。共通マーカー80ms以内と独立グラフPCMを検証。extract-miette.mtsで真の回復イベントを実frameへ束縛。キャプチャ自体に数値を描き足さない。
5. story.py→rerecord/synth-core.py。全48発話を新規合成しqueryを保存。rerecord/editorial.py→editor/plan.py --pending-calibration→setup-intervals.py→capture/measure-used-shots.py→media/plan_audio_offsets.py→apply-offsets.py→editor/plan.py。使用区間は測定前に固定。一カット一つの固定sample差のみ許可し、音ごとの変形はしない。
6. preflight-plates.pyで文字と実画面の枠を確認。editor/mixer.py→editor/render.py。30fps/48kHz、一度の最終AAC encode、最後1秒fade。render-input-freeze.jsonに全入力を凍結。
7. 最終MP4そのものへcapture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjs。全カット始中末9連続frameとSE、全発話、4停止像、全編decode、両ブラウザ各3点の再生/seek。review-final.pyで目視。再encode時は全検査を再実行。同一SHAに完成判定を束縛。

改修は採用しましたが最終盤認定ではありません。悪化条件、最良代替、全体監査の未検証範囲を残します。次回ティッカ改修は未検証。旧パート2は保持します。
''')
(D/'YouTube-Description.txt').write_text('【この子で、勝ちたい。#02 改訂版】消える盾を、命に縫う。｜ミエット研究独白\n\n好きな子を、最後まで選べるRPGを。\n今回は測るだけで終わらず、ミエットの技能を実装・再検証しました。\n期限の切れた障壁を、有限の「糸」として残す。\nその糸で仲間を守れるのか。改修前後の実戦を4か所で止めて説明します。\n\n研究版・未公開仕様。改修は限定条件で採用、最終盤の固有価値は研究中です。512シードの改善だけでなく悪化した条件も収録。全所持想定の研究用セーブであり通常の入手案内ではありません。次回はティッカの改修研究。\n\nゲーム：https://fluffy3546.itch.io/stillveil\n動画・資料：'+repo+'/tree/'+branch+'\nゲーム改修（未マージ）：'+repo+'/pull/144\n\n【チャプター】\n'+chap+'\n\nVOICEVOX:春日部つむぎ\nBGM：甘茶の音楽工房「夢」（作曲：甘茶）\nhttps://amachamusic.chagasi.com/music_yume.html\n生成AI素材を使用。出典・実測データはGitHubへ。\n#STILLVEIL #春日部つむぎ #この子で勝ちたい\n')
print('Documents',T['durationFrames']/30)
