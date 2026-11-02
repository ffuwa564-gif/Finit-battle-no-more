"""Bundle the reviewed episode; exclude the licensed recorder source and isolated mixes."""
from pathlib import Path
import json,hashlib,zipfile,shutil,subprocess,csv
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-retrospective';D=O/'delivery';MOV=D/'STILLVEIL-TowerDiary-Retrospective.mp4'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def stamp(t):
 n=round(t);return f'{n//60:02d}:{n%60:02d}'
def srt(t):
 n=round(t*1000);return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}'
def pack():
 finished=sha(MOV);sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True,cwd=ROOT).strip()
 for name in['Finished-Movie-Sync.json','Decode-Validation.json','Validation.json','Visual-QC.json']:
  r=json.loads((D/name).read_text());assert r['passed']and r['finishedSha256']==finished,name
 assert MOV.stat().st_size<100*1024*1024
 shutil.copy2(O/'research/portable-cut-validation.json',D/'Portable-Cut-Validation.json');n=json.loads((O/'timeline-narration.json').read_text());chapters=n['chapters'];lines=[l for c in chapters for l in c['lines']];ct='\n'.join(stamp(c['start'])+' '+c['title']for c in chapters)+'\n'
 (D/'Script.md').write_text('# 白亜の塔攻略日記 Part2までの反省会\n\n'+'\n\n'.join('## '+c['title']+'\n\n'+'\n\n'.join({'z':'ずんだもん','m':'四国めたん','t':'春日部つむぎ'}[l['speaker']]+'：'+l['text']for l in c['lines'])for c in chapters))
 sub=[{'start':18,'end':20.35,'text':'白亜の塔、攻略日記！'},{'start':20.8,'end':22.5,'text':'なのだ！'}]+lines
 (D/'Subtitles-ja.srt').write_text('\n\n'.join(f"{i+1}\n{srt(l['start'])} --> {srt(l['end'])}\n{l['text']}"for i,l in enumerate(sub))+'\n');(D/'Chapters.txt').write_text(ct)
 for src,dst in[('timeline-narration.json','Narration-Timeline.json'),('edit-timeline.json','Edit-Timeline.json'),('mix-manifest.json','Mix-Manifest.json'),('head-safety.json','Head-Safety.json'),('ultimate-cues.json','Ultimate-Cues.json'),('music-source.json','Music-Source.json'),('evidence.json','Evidence-Review.json'),('approved-cuts.json','Approved-Cuts.json'),('artwork-prompts.json','Artwork-Provenance.json')]:shutil.copy2(O/src,D/dst)
 (D/'Credits.md').write_text('''# 制作・クレジット

音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん／VOICEVOX:春日部つむぎ（engine0.26.0、ノーマル3/2/8）。

本編BGM：**KK「なんでしょう？」Track2（へたっぴリコーダー版）**
https://opentracks.com/bgm/detail/710/track/2
https://dova-s.jp/bgm/play710.html
OpenTracks（旧DOVA-SYNDROME）音源利用ライセンスに基づき、会話動画の背景として使用。
https://opentracks.com/help/articles/license/
https://opentracks.com/creator/detail/19
楽曲の紹介ページURLを上記に記載。楽曲ファイルと、音楽のみのミックスは制作ZIPに含めていません。再編集時は公式配布元から該当Track2を取得してください。

共通OP v4（23秒）：ユーザー提供版。
OP BGM：Twinkle Soda / FUJINEQo
https://booth.pm/ja/items/3292009
https://www.youtube.com/c/FUJINEQoMusic
OP書体：Noto Serif CJK / LINE Seed JP / Barlow Condensed（SIL Open Font License）。

ちびキャラ・挿絵・サムネ：生成AIによる二次創作イラスト。承認済みPart2の6表情と挿絵を継承し、反省会の挿絵と専用サムネを新作。
ずんだもん・四国めたん：東北ずん子・ずんだもんプロジェクト。
https://zunko.jp/guideline.html
https://zunko.jp/con_ongen_kiyaku.html
春日部つむぎ：春日部つくし。
https://tsumugi-official.studio.site/rule
https://booth.pm/ja/items/3474402

ゲーム画面・ゲーム効果音：STILLVEIL v1.10.0、過去の実機録画を再掲。原画・文章・プログラミング補助に生成AI、一部原画アニメーションにRunway。
キャラクター権利者による公式推薦やコラボを意味するものではありません。
''')
 (D/'Methods.md').write_text('''# 内容と検証範囲

ユーザー承認済みのピンク版テンプレートを用いた反省会。ずんだもん・四国めたん・春日部つむぎが、ビルドの魅力、難易度、実プレイの手触り、準備編と攻略編の分け方を話す。20秒のルネット必殺図鑑と、素材から作る入口の短いコーナーを実際に挿入。

映像はPart1.1.1とPart2の既存実戦の再掲。初見の生配信や、新たに人間が操作した収録だとは扱わない。未実装の改修を実装・検証済みとして見せない。既存の予告大技・防御・溜め中のHP削りで大技を弱める仕組みをソースで確認し、新たな調整案と区別した。

第一層の61/100勝・76/100勝は、既に公開したT4中心の比較用所持条件・固定操作・乱数70001–70100による結果。プレイヤー全体の勝率、初心者向け装備条件、石だけの因果効果ではない。第二層40R失敗と25R成功は、覚醒・編成・操作が変わった記録。成功には薬3個・妖精4回・花11回の助けも含む。塔の入口の映像だけで100層全体の難易度は結論しない。

白花の33＋92＝125は一つの成功例の実回復。毎回125回復する固定効果ではない。巻戻しの再使用待ち、通常スキルCDが短縮対象であることを図でも補足。素材20・3・6は既存の開放条件と装備を含む追加獲得の記録で、新規プレイの所要時間は未測定。

## 映像・音声

共通OPは元素材のフレーム数から23秒を確認。ゲームとSEを同じカットで編集し、中間素材は30fps／48kHz PCM。Part1.1.1の元FullReplayは圧縮済み配布録画からの再利用であり、無圧縮の新規収録とは呼ばない。Part2の元録画は既存の校正済みMKV。各切り出しで新しいAAC中間素材は作らない。

本編はKK「なんでしょう？」へたっぴリコーダー版を使用。公式サイトのTrack2を標準ブラウザのダウンロード操作で取得し、ID3の作品名・作曲者も確認。曲は背景として小さくループ・フェード・会話中ダッキングを適用。楽曲と音楽だけのミックスを公開ZIPへ入れない。

OP、BGM、実SE、ナレーションを共通48kHzのサンプル0へ一度に配置し、可逆FLACを中間音源にする。AACは最終配布MP4で一度だけ変換。背景と透過立ち絵は30fpsの連続入力へ変換してから合成。入力・条件・コードハッシュでキャッシュを再利用する。

## 完成ファイルの検査

配布MP4そのものを元素材へ照合する。主要4カットの開始・中間・終了と必殺カット、OPの3点、3話者の開始・中間・終了、必殺の反応、リコーダーBGMの3点を対象にする。音の背景は元音源から独立に再構成する。実映像は9枚連続を照合し、静止や似たフレームの誤一致を避ける。許容ズレ80ms以内、相関不足・検査点不足も公開停止の条件。

全体デコード、Chromium／WebKitの各3点の再生・シーク、頭の安全域・字幕2行・話者と立ち絵の対応は別検査。原画と完成動画の主要フレームも目視。報告は完成SHA256に紐づけ、再書き出し時は再検査する。
''')
 (D/'Source-Version.txt').write_text('Video: Part2までの反省会 / source commit '+sourceCommit+'\nApproved template: 745c2d099d3c0a99f6a2eb1cd3a93a87147c27e6\nPart1.1.1 game: dec20ebbfb8d139713ffe847ebc48eefe8ff54ca\nPart2 game: 1f4e970117c95a11ef38c8f1e12fe232e5a7b964\nGame changes / new gameplay trials in this episode: none\n')
 (D/'Runtime.json').write_text(json.dumps({'durationSeconds':n['duration'],'chapters':len(chapters),'lines':len(lines),'resolution':'1920x1080','fps':30,'audioHz':48000,'speakers':['ずんだもん','四国めたん','春日部つむぎ'],'ultimateCornerSeconds':next(c['duration']for c in chapters if c['id']=='ultimate'),'finishedSha256':finished},ensure_ascii=False,indent=2))
 (D/'YouTube-Description.txt').write_text('勝てた。でも、このビルド作りたくなった？｜白亜の塔攻略日記 Part2までの反省会【STILLVEIL】\n\nずんだもん・四国めたん・春日部つむぎが、ビルドの魅力、難しさ、実プレイの手触り、準備編の分け方を反省。20秒のルネット必殺図鑑も！\n\n無料ブラウザゲーム：https://fluffy3546.itch.io/stillveil\n\n'+ct+'\n過去実戦の再掲と既存仕様の確認です。新しい初見プレイや、改修案を実装・検証した動画ではありません。100通りの結果は比較用条件に限定されます。\n\n本編BGM：なんでしょう？（Track2・へたっぴリコーダー版）／KK\nhttps://opentracks.com/bgm/detail/710/track/2\nhttps://dova-s.jp/bgm/play710.html\nOP BGM：Twinkle Soda / FUJINEQo\nhttps://booth.pm/ja/items/3292009\nhttps://www.youtube.com/c/FUJINEQoMusic\n音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん／VOICEVOX:春日部つむぎ\nキャラクター・制作の詳細は同梱Credits.md。\n')
 shutil.copy2(O/'assets/thumbnail.png',D/'Thumbnail.png')
 from PIL import Image
 Image.open(O/'assets/thumbnail.png').convert('RGB').save(D/'Thumbnail.jpg',quality=90);assert(D/'Thumbnail.jpg').stat().st_size<2*1024*1024
 helper=ROOT/'tools/media-sync';(D/'Media-Sync-Regressions.json').write_text(json.dumps({'command':'python tools/media-sync/test_media_sync.py','tests':6,'passed':True,'codeSha256':sha(helper/'media_sync.py')},indent=2))
 paths=list((ROOT/'scripts/diary-retrospective').glob('*.py'))+list((ROOT/'scripts/diary-retrospective').glob('*.mjs'))+list((ROOT/'scripts/diary-retrospective').glob('*.txt'))+[helper/'media_sync.py',helper/'test_media_sync.py']
 paths+=[O/'research/portable-cut-validation.json'];paths+=list((O/'assets').glob('*.png'))+list((O/'template').glob('*'))+[O/p for p in['narration.json','timeline-narration.json','edit-timeline.json','approved-cuts.json','mix-manifest.json','head-safety.json','ultimate-cues.json','music-source.json','evidence.json','artwork-prompts.json']]
 paths+=[ROOT/l['wav']for l in lines]+list((O/'render').glob('*-game.mov'))+list((O/'render').glob('*-visual.json'))+list((O/'render').glob('*.ass'))
 paths+=[ROOT/'artifacts/diary-part2/content.json',ROOT/'artifacts/diary-part2/ultimate-cues.json',ROOT/'artifacts/diary-part2/capture/tower-1.json',ROOT/'artifacts/diary-part2/capture/first-try.json',ROOT/'artifacts/diary-111/search/confirmatory.json']
 # No music MP3, FLAC mix, original official cutout assets, HTML pages or download-session data.
 with zipfile.ZipFile(D/'Production-Inputs.zip','w',zipfile.ZIP_DEFLATED,6)as z:
  for p in sorted(set(paths)):
   assert p.exists(),p;assert not p.suffix in['.mp3','.html'];z.write(p,p.relative_to(ROOT))
 (D/'README.md').write_text('# 白亜の塔攻略日記・Part2までの反省会\n\n**約13分54秒／1080p30／ずんだもん・四国めたん・春日部つむぎ**\n\n[▶ 動画](https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/refs/heads/downloads/tower-diary-retrospective/'+MOV.name+') ｜ [サムネ](Thumbnail.jpg)\n\n![本編プレビュー](Preview.jpg)\n\nビルドを作りたくなる瞬間、ゲームと動画それぞれの課題、難易度の伝え方、実際に遊んでいる手触り、準備編と攻略編の役割を議論します。20秒のルネット必殺図鑑と、素材から作る入口の短いコーナーも入れました。\n\n承認済みの可愛いピンク版テンプレートを使用。本編BGMは**KK「なんでしょう？」へたっぴリコーダー版**。既存の予告・防御・溜め削りと、今後の提案を区別しています。\n\n[台本](Script.md)／[字幕](Subtitles-ja.srt)／[チャプター](Chapters.txt)／[YouTube説明](YouTube-Description.txt)／[制作ZIP](Production-Inputs.zip)／[制作コード](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/'+sourceCommit+'/scripts/diary-retrospective)\n\n[条件・検証](Methods.md)／[クレジット](Credits.md)／[確認した根拠](Evidence-Review.json)。過去の実戦の再掲であり、新しい初見プレイではありません。提案の実装・新しいバランス検証は行っていません。\n\n制作ZIPには音声、挿絵、図解、5つのAV同期済み実戦カット、企画メモ・絵コンテを収録。リコーダー楽曲と音楽だけのミックスは同梱していません。再編集時は公式配布元のTrack2を取得してください。\n\n全体デコード、Chromium/WebKitの再生・シーク、実映像・実SE・全3話者・BGM・着弾の同期、頭の安全域と字幕・話者の検査に合格。完成SHA256：`'+finished+'`\n')
 files=sorted(p for p in D.iterdir()if p.is_file()and p.name!='Checksums.sha256');(D/'Checksums.sha256').write_text(''.join(sha(p)+'  '+p.name+'\n'for p in files));print('PACKAGE COMPLETE',finished)
if __name__=='__main__':pack()
