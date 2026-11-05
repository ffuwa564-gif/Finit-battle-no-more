from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-05';D=O/'delivery';T=json.load(open(O/'render/timeline.json'));D.mkdir(exist_ok=True)
def tm(s):return f'{int(s)//60:02}:{int(s)%60:02}'
chap='\n'.join(tm(p['startFrame']/30)+' '+p['chapter']for p in T['pages']if p.get('chapter'));(D/'Chapters.txt').write_text(chap+'\n')
(D/'README.md').write_text(f'''# 祓った、その先へ。 — 研究独白05 リゼット

[完成MP4](ThisGirl-05.mp4) / [サムネイル](Thumbnail-ThisGirl-05.png) / [画面例](Preview.jpg)

{tm(T['durationFrames']/30)}・1920×1080・30fps。静かなリケジョつむぎの一人語り。リゼットの解除技能へ「弔鐘の返し刃」を実装し、別の256入力で18条件を再検証してから収録。4停止解説で解除と被弾の違い・かばう・行動費用を説明。エレインの次回予告付き。

[台本](Script.md) / [字幕](Subtitles-ja.srt) / [投稿文](YouTube-Description.txt) / [チャプター](Chapters.txt) / [研究報告](ResearchReport.md) / [クレジット](Credits.md) / [再現](Reproduce.md)

研究版・未公開仕様。main/itch未更新。全所持/高級4石/薬5を仮定した比較で通常進行の案内ではない。18条件のうち塔4T4F1で平均-.3477R、補正p=.01440の限定採用。薬・生還改善や最終盤の恒久価値の認定は行わない。不発や悪化、速い代替、実録一戦が21R/薬3/4人生還で同点だった結果も残す。

完成MP4自体の全編decode、4実戦カットの始中末、全38発話、4停止像と実拡大、Chromium/WebKit各3点再生/seekを同じSHAへ束縛して検査。ZIP.partは番号順に連結して展開。音楽・音声モデル・生合成音声は単体配布しない。
''')
(D/'Credits.md').write_text('''# クレジット

音声：VOICEVOX:春日部つむぎ（Core0.17.1/style8）。 https://tsumugi-official.studio.site/ 。本人・運営の出演や監修ではありません。実query/モデルSHA/利用条件はnarration.json、rights/voice-engine.json、speech/*.query.json。モデルと生音声の単体配布なし。

音楽：甘茶の音楽工房「夢」（作曲：甘茶）。 https://amachamusic.chagasi.com/music_yume.html 。公式配布版を完成動画へ使用。原曲の単体配布なし。

ゲーム：STILLVEIL https://fluffy3546.itch.io/stillveil 。原画・机・研究者素材の一部に生成AIを使用。承認済みの旧04のPOV机を背景として再利用し、本人の実ゲーム原画を紙面カードに配置。新規画像/Runway生成なし。旧研究認定と今回の局所改修採用を区別し、新たな最終盤認定なし。

書体：Noto Sans CJK / Noto Serif CJK（SIL Open Font License）、著作権文同梱。
''')
for name in ['ResearchReport.md','Design-Decisions.md','Roster-Audit.md','judgment.json']:shutil.copyfile(O/'research/reports'/name,D/('Character-Judgment.json'if name=='judgment.json'else name))
for name in ['Font-Copyright.txt','Artwork-Provenance.json']:shutil.copyfile(O/'assets'/name,D/name)
routes=json.load(open(O/'research/stone-routes.json'));text=['# 次に探す石\n','主証人は4人ともT4澄明の残響石、本人/アテナbulwark、覚醒セリス/弁財天mercy。研究帯の上限値を使用し、自然入手済みとは扱わない。T6固定構成のG3/G4/Cは別の比較。高Tierで全指標が単調に良くなるとは限らず、今回4人生還はG4>C。\n','新石・特性の追加なし。機巧系統のT6抽選がある既存入手先（確定入手ではない）を下に示す。完成特性確率・必要周回数は未推定。\n'];text+=['- '+r['name']+' (`'+r['id']+'`)\n'for r in routes['rows']];(D/'Stone-Goals.md').write_text(''.join(text))
(D/'Reproduce.md').write_text('''# 再現手順

ソースresearch/lisette-this-girl-05。ゲームのみresearch/lisette-counterblade / draft PR148（前研究ブランチbase）。mainへマージしない。npm ci、Pillow/NumPy/SciPy、ffmpeg/ffprobe、Chromium/WebKit、VOICEVOX Core0.17.1 style8公式モデル/辞書/runtime、甘茶「夢」を記録SHAで用意。

1. PRODUCTION-POLICY.mdとprotocol.md。d80aafd実装、d45214f凍結。16開発/32選抜/未使用256確認。元12条件の不発を確認後、開発プローブから既存塔4を追加して全18条件を確認前固定。確認を見た後の構成/閾値変更なし。同じ18候補/キャラ、各代替も再探索、全体最適とは扱わない。
2. SAKUYA/MIETTE/TIKKA/NOELLEフラグは0。前LISETTE=0、後VITE_LISETTE_RESEARCH=1。786unit（新11）、型/content/UI/locales/両build、実ブラウザ2、旧公開04の72結果一致、セーブ/乱数を確認。
3. analysis採用→prepare-recording→prepare-proofのnative/application全HP/RNG/薬/宝箱一致→reports→finish-research→verify-implementation。最初の採用証人内の昇順入力1000001、結果はB/C同点。成功を示す一戦に差し替えない。
4. native-runtime/prepare、services start --foreground。前Vite4480/後4481。record-native reference / lisette ×1。通常描画450×800、実SE100/BGM0、重い処理を並行しない。native-clean→normalize_capture→native-buffer-qa。取得異常は継ぎ足しや波形修理せず再収録。元OS/独立PCM/時刻マーカーを別々に照合。
5. extract-mechanism.pyで実解除・実被弾・実ゲージを実録frameへ束縛。measure-layout.mjsで実DOM測定し、その回の枠座標を使う。story→synth-core→voice_qa。editorial→plan --pending-calibration→setup-intervals→source-motion→measure-used-shots→plan_audio_offsets→apply-offsets→plan。区間を先に固定し、各カット1つの48k固定差だけを許可。密な補正/音ハメ修理なし。
6. preflight-plates→mixer共通48k一度ミックス→render1080p30H264baseline/yuv420p/AAC/faststart。全入力を凍結。original desk/game artは不変、紙面配置だけを編集。thumbnail.py --root <repository-root>。
7. finished-qa / extra-qa / browser / review-final。全編decode、全実戦カット始中末、全38発話、4停止像、両ブラウザ各3点。80ms超/相関不足/不足検査は配布停止。ブラウザは最初の待ち最大5sを別記、続く2s速度.85–1.15と400msごとの停止を検査。同一SHAでfinalize→package→publish、公開全ファイル匿名全量SHA照合。
''')
(D/'YouTube-Description.txt').write_text('''祓った、その先へ。｜STILLVEIL 研究独白 #05【リゼット】

敵の強化をほどく、その先に。
今回はリゼットの解除技能へ「弔鐘の返し刃」を実装しました。
有効な強化・再生を解除したときだけ、一度斬り返す。かばうも障壁も無視しません。

静かなリケジョつむぎの独白。実戦を4か所で止め、解除と被弾の相手が違う場面や、一手の費用を枠・拡大で説明します。
18条件×未使用256入力。塔4T4の一条件で平均約0.35R短縮し限定採用。不発や悪化、強い代替、同点だった実録も含めた研究です。

※研究版・未公開仕様。main/itch.ioには未導入。
※全所持/高級石を仮定した研究セーブ。通常の入手攻略ではありません。
※改修の局所採用と、最終盤の固有価値の認定は分けています。

無料ブラウザRPG： https://fluffy3546.itch.io/stillveil
台本・字幕・研究資料： https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/this-girl-05

'''+chap+'''\n
音声：VOICEVOX:春日部つむぎ
音楽：甘茶の音楽工房「夢」（作曲：甘茶） https://amachamusic.chagasi.com/music_yume.html
原画・制作補助に生成AIを使用。本人による監修ではありません。
#STILLVEIL #VOICEVOX #春日部つむぎ #ゲーム開発
''');print('Delivery documents prepared')
