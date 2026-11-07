from pathlib import Path
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-preview';D=O/'delivery';D.mkdir(exist_ok=True);t=json.loads((O/'render/timeline.json').read_text());repo='https://github.com/ffuwa564-gif/Finit-battle-no-more';branch='downloads/this-girl-02-preview';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
rows=[]
for p in t['pages']:
 if p.get('chapter'):rows.append((p['startFrame']/30,p['chapter']))
 if p['spec']['kind']=='battle-pause'and p['id']!='pause-target':rows.append((p['startFrame']/30,'停止解説：'+p['spec']['title']))
def tm(s):return f'{int(s)//60:02}:{int(s)%60:02}'
chap='\n'.join(tm(s)+' '+label for s,label in sorted(rows));(D/'Chapters.txt').write_text(chap+'\n')
(D/'README.md').write_text(f'''# その盾を、ほどいてもいいのかな。 #02

研究独白「この子で、勝ちたい。」第2回。リケジョつむぎと、ミエットの装甲リサイクルを研究します。{tm(t['durationFrames']/30)}・1920×1080・30fps。

[完成動画](ThisGirl-02-Preview.mp4) / [サムネイル](Thumbnail-ThisGirl-02-Preview.png) / [画面例](Preview.jpg)

[台本](Script.md) / [字幕](Subtitles-ja.srt) / [チャプター](Chapters.txt) / [投稿文](YouTube-Description.txt) / [研究報告](ResearchReport.md) / [クレジット](Credits.md) / [再現](Reproduce.md)

公開版1.12の能力を使った、研究用セーブの実戦。未入手XRまで所持した仮定であり、通常の入手進行案内ではありません。ゲームの能力改修・mainのマージ・itch.io配信は行っていません。

各条件256シード、12条件×5群の比較。256の独立入力を共通利用した15,360実行であり、15,360の独立標本とは扱いません。17回復形態を同予算で有限探索し、全キャラ・全石の大域最適解を証明したものではありません。判定は「研究中」。

4か所で実戦を停止し、枠と拡大像で説明。完成MP4の全発話・映像SEの同期、停止像、全編デコード、Chromium/WebKitでの再生・シークを別々に検査しました。報告は同じ完成SHAに束縛しています。

制作ZIPのpartは番号順に連結してから展開してください。原曲・生合成音声・音声モデルは同梱しません。独立グラフ参照・PCM付き正規化MOV・研究生データ・コード・query・出典を同梱。SHA256SUMS.txtで照合できます。
''')
credits='''# クレジット

音声：VOICEVOX:春日部つむぎ（Core0.17.1 / style8）。春日部つむぎ公式 https://tsumugi-official.studio.site/ 。音声モデルSHAと実queryは制作資料のrights/voice-engine.json、narration.json、speech/*.query.jsonを参照。出演本人・運営の監修を意味しません。VOICEVOXとキャラクターの規約はrightsの記録を参照。生音声・モデルの再配布は行いません。

音楽：甘茶の音楽工房「夢」（作曲：甘茶）。 https://amachamusic.chagasi.com/music_yume.html / https://amachamusic.chagasi.com/ 。公式配布版を完成映像のBGMとして使用。原曲を単体では再配布しません。

ゲーム：STILLVEIL https://fluffy3546.itch.io/stillveil 。キャラクター原画・研究室・研究者の小画像には生成AIを利用。今回の机はミエットの原画を参照して新規生成し、出典と元画像SHAはArtwork-Provenance.jsonに保存。小画像と既存研究記録の素材は過去シリーズから継承。新しいRunway動画の生成は行っていません。

書体：Noto Sans CJK / Noto Serif CJK（SIL Open Font License）。著作権文を同梱。
''';(D/'Credits.md').write_text(credits)
for name in ['ResearchReport.md','Design-Decisions.md','Roster-Audit.md','judgment.json']:
 shutil.copyfile(O/'research/reports'/name,D/('Character-Judgment.json'if name=='judgment.json'else name))
(D/'Stone-Goals.md').write_text('''# 石の目標と入手の範囲

映像のミエット編成：4人とも澄明の残響石（echo-shard）、澄明変種、T6・力239/特性239。セリス/アストライアは障壁（bulwark）、アテナ/ミエットは慈雨（mercy）特性。これらは研究用に固定した合法ロールで、簡単にそろうと保証するものではありません。石による基礎能力値の加算はありません。

入手規則はsrc/content/gem-loot.tsとsrc/domain/memory-gems.tsが出典。澄明の残響石は機巧（clock）の石。対象ルートの宝箱抽選で入手候補となり、機巧のfeaturedに当たる場合は対象石の比重が増えます。必ず排出される意味ではありません。

T6候補：塔41層以降（41〜60層のtier6Chance=.005）、イベント覚醒級（.01）、第3章ラスト（.005）。これらは最終ウェーブの石ドロップに条件づけた各roll属性の抽選設定であり、1周の特定T6石ドロップ率ではありません。属性ごとに判定されるため、指定の石・変種・特性・力239/特性239がそろう確率や周回時間をこの数字から断定しません。

今回のT3/T4/T6比較では装備と操作を再探索しています。石Tierだけの因果比較ではありません。現時点でより高い石が全状況を改善したという認定もしません。
''')
(D/'Reproduce.md').write_text('''# 再現手順

制作ブランチresearch/miette-this-girl-02-previewのコードと、同梱のartifacts/this-girl-02-preview以下の制作証拠を組み合わせる。npm ci。Python Pillow/NumPy/SciPy、ffmpeg/ffprobe、Playwright Chromium/WebKitを用意する。

1. 公開版1.12のsrcでVITE_SAKUYA_RESEARCH=0。既存サクヤ研究のopt-inコードは使用しない。confirmation-lock.jsonのsrc全SHAとprotocol.mdを確認。search.mts→select-diverse.mts→lock.mts→confirm.mts→analyze.py→reports.py。lockは確認用シード開封前にGit保存。再測定時は元ロックを上書きせず別の出力先を使う。
2. prepare-recording.mtsで記録用シードと対照/Mietteの合法操作を再生しproofを生成。record-native.mjs reference 1 / miette 1をX11/Pulse同時収録。ゲーム×1、通常表示、日本語。captureのREADMEに従い接続を維持。native-clean.py→native-buffer-qa.py。公的mainのゲーム規則と同じだが研究用全所持セーブである。
3. extract-miette.pyでnative実イベントの障壁/HPと録画frameを束縛する。今回の最初の発動は障壁216→168 / HP218→314。後付けのHUD数字は描いていない。
4. synth-core.pyはローカルVOICEVOX Coreとモデル/辞書の場所を環境に合わせる。queryと読み替えを保持。元曲「夢」は公式から取得しmusic-source.jsonのSHAを照合。原曲/モデル/生音声を配布しない。
5. rerecord/editorial.py→editor/plan.py --pending-calibration→setup-intervals.py→capture/measure-used-shots.py→media/plan_audio_offsets.py→apply-offsets.py→editor/plan.py。実録画の全対象音と境界tailを含め、各カット一つの固定sample差で整える。音程・テンポ・cue順序を変えない。
6. editor/mixer.py→editor/render.py。30fps/48kHzの共通sample0で混合、最終AACは一度だけ。元映像/音声・原画・コード/フォント/権利記録のSHAをrender-input-freeze.jsonへ固定。
7. 配布するThisGirl-02-Preview.mp4そのものへcapture/finished-qa.py、rerecord/extra-qa.py、rerecord/browser.mjsを実行。全編デコード、実映像の連続9frame×各カット始中末、独立音源由来の波形、全発話、全停止像を検査。再エンコードしたら全報告を作り直す。目視も別途保存。

計算/録画/編集のための環境別パスは適宜置換する。研究能力の改修はなく、main/itchを更新しない。
''')
(D/'YouTube-Description.txt').write_text('【この子で、勝ちたい。#02】その盾を、ほどいてもいいのかな。｜ミエット研究独白\n\n好きな子を、最後まで選べるRPGを。\n今回はミエットの「装甲リサイクル」。守りを回復に変える一手を、リケジョつむぎがゆっくり追います。\n大切な所では実戦を止め、枠と拡大で説明。256シードの比較では、勝利だけでなく薬と生還も見ました。\n\n公開版1.12の能力を用いた研究用セーブ。未入手XRまで所持した最終盤の仮定で、通常の入手案内ではありません。今回は新能力を追加していません。有限の探索結果であり、最強・全キャラ救済の証明ではありません。判定は「研究中」です。\n\nゲーム：https://fluffy3546.itch.io/stillveil\n動画・台本・生データ：'+repo+'/tree/'+branch+'\n\n【チャプター】\n'+chap+'\n\nVOICEVOX:春日部つむぎ\nBGM：甘茶の音楽工房「夢」（作曲：甘茶）\nhttps://amachamusic.chagasi.com/music_yume.html\nイラスト・研究室に生成AI素材を使用。詳しい出典と再現手順はGitHubへ。\n\n#STILLVEIL #春日部つむぎ #この子で勝ちたい\n')
print('Documents',t['durationFrames']/30)
