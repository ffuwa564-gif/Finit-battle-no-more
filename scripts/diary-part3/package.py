"""Ship checked Part3, reproducible production inputs and separate lossless recording sources."""
from pathlib import Path
import json,hashlib,zipfile,shutil,subprocess,csv
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part3';D=O/'delivery';MOV=D/'STILLVEIL-TowerDiary-Part3.mp4'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def stamp(t):
 n=int(t);return f'{n//60:02d}:{n%60:02d}'
def srt(t):
 n=round(t*1000);return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}'
def pack():
 finished=sha(MOV)
 for name in['Finished-Movie-Sync.json','Decode-Validation.json','Validation.json','Visual-QC.json']:
  r=json.loads((D/name).read_text());assert r['passed']and r['finishedSha256']==finished,name
 assert MOV.stat().st_size<100*1024*1024
 n=json.loads((O/'timeline-narration.json').read_text());chapters=n['chapters'];lines=[l for c in chapters for l in c['lines']];ct='\n'.join(stamp(c['start'])+' '+c['title']for c in chapters)+'\n';names={'z':'ずんだもん','m':'四国めたん','t':'春日部つむぎ','u':'中国うさぎ'}
 (D/'Script.md').write_text('# 白亜の塔攻略日記 Part3：アテナ禁止、怒りの中国うさぎ\n\n'+'\n\n'.join('## '+c['title']+'\n\n'+'\n\n'.join(names[l['speaker']]+'：'+l['text']for l in c['lines'])for c in chapters))
 sub=[{'start':18,'end':20.35,'text':'白亜の塔、攻略日記！'},{'start':20.8,'end':22.5,'text':'なのだ！'}]+lines;(D/'Subtitles-ja.srt').write_text('\n\n'.join(f"{i+1}\n{srt(l['start'])} --> {srt(l['end'])}\n{l['text']}"for i,l in enumerate(sub))+'\n');(D/'Chapters.txt').write_text(ct)
 for src,dst in[('artwork-provenance.json','Artwork-Provenance.json'),('timeline-narration.json','Narration-Timeline.json'),('edit-timeline.json','Edit-Timeline.json'),('mix-manifest.json','Mix-Manifest.json'),('head-safety.json','Head-Safety.json'),('event-cues.json','Event-Cues.json'),('evidence.json','Evidence-Review.json'),('approved-cuts.json','Approved-Cuts.json')]:shutil.copy2(O/src,D/dst)
 shutil.copy2(O/'research/Native-Verification.json',D/'Native-Verification.json');shutil.copy2(O/'research/Narration-Coverage.json',D/'Narration-Coverage.json')
 (D/'Credits.md').write_text('''# 制作・クレジット

音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん／VOICEVOX:春日部つむぎ／VOICEVOX:中国うさぎ。
VOICEVOX engine0.26.0。スタイル3/2/8/61（ノーマル）、中国うさぎの一部の強い反応に62（おどろき）。「怒り」は演出上の役割で、公式の怒り音源を名乗るものではありません。

本編BGM：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」。
https://amachamusic.chagasi.com/music_fjordnosundakaze.html
https://amachamusic.chagasi.com/
音源単体や音楽のみのミックスは制作ZIPに含めません。再編集時は公式配布元から取得してください。

共通OP v4（23秒）：ユーザー提供版。
OP BGM：Twinkle Soda / FUJINEQo
https://booth.pm/ja/items/3292009
https://www.youtube.com/c/FUJINEQoMusic
OP書体：Noto Serif CJK / LINE Seed JP / Barlow Condensed（SIL Open Font License）。

ちびキャラ・挿絵・サムネ：生成AIによる二次創作イラスト。承認済みPart2の6表情を継承、中国うさぎの2表情・四人の会議挿絵・専用サムネを新作。
ずんだもん・四国めたん・中国うさぎ：東北ずん子・ずんだもんプロジェクト。
https://zunko.jp/guideline.html
https://zunko.jp/con_ongen_kiyaku.html
春日部つむぎ：春日部つくし。
https://tsumugi-official.studio.site/rule
https://booth.pm/ja/items/3474402
ゲーム画面・実効果音：STILLVEIL v1.10.0の新規録画。原画・文章・プログラミング支援に生成AI、一部原画アニメーションにRunway。
各キャラクター権利者の公式推薦・公式コラボを意味しません。
''')
 (D/'Methods.md').write_text('''# 攻略条件と制作方法

Part2の第2層報酬受取後セーブを継続。もともとの比較用所持キャラ、3個のT4石等を継承しており、新規アカウントや低予算の攻略例ではありません。所持品の中にアテナがいても、全10回の第3層挑戦と準備7戦で、パーティ・リーダー・活動ユニットにアテナ系を使いません。

ゲームの正規コマンドを自動操作で実行した記録をもとに、後から四人の掛け合いを制作。人間の初見生配信とは扱いません。負けたセーブと進んだ乱数をそのまま次へ継続。能力・石・所持金の注入、成功までの乱数巻き戻しは行いません。素材はアテナ抜きの虚ろの門7回で記憶42個、覚醒に40個使用、残り2個。必要な回復薬は正規の購入コマンドを使用。

第1〜3戦4R敗北、覚醒後の第4戦9R敗北（支援役撃破・狼3808/4063HP）、第5戦7R、第6戦9R、第7・8戦6R、第9戦7R敗北。第10戦19R突破・4人生存。薬5個をR2/4/5/6/7でリオラへ使用、R8以降は薬なし。妖精1回・花9回の助けを含みます。序盤のリオラは37/371HP、終了時は回復しており、最後までHP1で耐えたような演出はしません。

最終編成：先頭弁財天＝白灯石・威力125/堅牢125、ノクス＝残響石・威力125/慈悲125、リーダー覚醒リオラ＝速唱の残響石・威力9/堅牢100、覚醒ルネット＝双潮石・威力125/堅牢125。T6石は途中で試しましたが勝利戦では不使用。リオラの石は巻戻しではなく残響石。低威力でも特性はT4であり、低予算の再現保証として語りません。

第9戦と第10戦では薬の判断を早めましたが乱数も進んでおり、薬だけの因果効果や汎用的な勝率を主張しません。アテナなしの成功例一件で、アテナ一強が解消したとは結論しません。ゲーム本体の機能・バランスは変更しません。

## 音声・映像

承認済みピンク版テンプレートを継承。OP v4を先頭に23秒。ゲーム録画はアプリ速度2、編集速度1。失敗1/9戦と最終戦は実際の順序で、第4戦は序盤と終盤の抜粋、準備7戦目は終盤抜粋。最後の戦闘は3章に分けますが元録画を連続する時刻で切り、順序変更・音だけの速度変更は行いません。

録画は開始・途中・終了の16kHz診断パルスで同期を測り、30fps/48kHz PCMへ校正。診断帯と画面下の検査帯は公開映像から除去。最後の録画では強い後続パルスを選ぶ広帯域検出の曖昧さを記録し、20ms以上持続する狭帯域パルスの最初の立上りで独立確認。探索窓・80msの許容値は狭めず、完成配布版の実SEと変化する実フレームを別途照合します。

全ゲーム音・4人の音声・BGM・OPを共通48kHzのサンプル0へ一度だけミックス。AACは配布MP4で一度のみ。完成MP4を各主要カットの序盤・途中・終盤で元の実フレーム・実SEへ、4人の声を各3点で元音声へ照合。全長のデコードとChromium/WebKitの再生・シーク検査も別に実施。検査は最終SHA256へ結び付けます。

頭・耳・髪・帽子はcontainで余白を保ち、話者ごとに正しい立ち絵を表示。中国うさぎ本人には動物耳を付けず、白いうさぎのぬいぐるみと区別します。
''')
 (D/'YouTube-Description.txt').write_text('白亜の塔攻略日記 Part3｜アテナ禁止で第3層！怒りの中国うさぎ、乱入【STILLVEIL】\n\n4R全滅から、立て直せ！\nずんだもん・四国めたん・春日部つむぎに中国うさぎも参加。10回の挑戦とリオラ覚醒を追い、第3層をアテナ抜きで攻略します。\n無料ブラウザゲーム：https://fluffy3546.itch.io/stillveil\n\n'+ct+'\n比較用の引継ぎ所持条件からの継続。成功戦は19R・4人生存、薬5個・妖精1回・花9回。正規コマンドの記録へ後から実況を付けた動画です。\n\n音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん／VOICEVOX:春日部つむぎ／VOICEVOX:中国うさぎ\nOP BGM：Twinkle Soda / FUJINEQo\nhttps://booth.pm/ja/items/3292009\nhttps://www.youtube.com/c/FUJINEQoMusic\n本編BGM：甘茶の音楽工房「フィヨルドの澄んだ風」\nhttps://amachamusic.chagasi.com/\n詳細クレジット・条件は同梱Credits.md、Methods.md。\n')
 from PIL import Image
 Image.open(O/'assets/thumbnail-original.png').convert('RGB').resize((1920,1080),Image.Resampling.LANCZOS).save(D/'Thumbnail-Part3.jpg',quality=95)
 # Lossless audio container copies preserve all five calibrated native recordings.
 sources={}
 for id in['attempt-1','farm-7','attempt-4','attempt-9','attempt-10']:
  src=O/'capture'/(id+'.mov');dst=O/'render'/(id+'-source.mkv');subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-c:v','copy','-c:a','flac','-threads','1',str(dst)],check=True);sources[id]={'originalPcmMovSha256':sha(src),'losslessFlacMkvSha256':sha(dst),'videoCopied':True,'audioLossless':True}
 (D/'Recording-Sources.json').write_text(json.dumps(sources,indent=2))
 with zipfile.ZipFile(D/'Recording-Sources.zip','w',zipfile.ZIP_DEFLATED,compresslevel=3)as z:
  for id in sources:z.write(O/'render'/(id+'-source.mkv'),'artifacts/diary-part3/capture/'+id+'.mkv');z.write(O/'capture'/(id+'.json'),'artifacts/diary-part3/capture/'+id+'.json')
  z.write(D/'Recording-Sources.json','Recording-Sources.json')
 with zipfile.ZipFile(D/'Production-Materials.zip','w',zipfile.ZIP_DEFLATED,compresslevel=3)as z:
  files=[*Path(ROOT/'scripts/diary-part3').glob('*.py'),*Path(ROOT/'scripts/diary-part3').glob('*.ts'),*Path(ROOT/'scripts/diary-part3').glob('*.mjs'),*Path(ROOT/'scripts/diary-part3').glob('*.txt'),ROOT/'scripts/diary-part3/.gitignore',ROOT/'artifacts/diary-part2/content.json',*O.glob('*.json'),*Path(O/'speech').glob('*.flac'),*Path(O/'speech').glob('*.key'),*Path(O/'assets').glob('*.png'),*Path(O/'proofs').glob('*'),*Path(ROOT/'tools/media-sync').glob('*.py'),*Path(ROOT/'artifacts/video-template/payload/docs/media/templates/tower-diary').glob('*')]
  for p in files:
   if p.is_file()and p.name!='usagi-official-portrait.png':z.write(p,str(p.relative_to(ROOT)))
  for p in D.glob('*'):
   if p.suffix in ['.json','.md','.txt','.srt']and p.name!='SHA256SUMS.txt':z.write(p,'delivery/'+p.name)
 for name in ['Production-Materials.zip','Recording-Sources.zip']:assert(D/name).stat().st_size<100*1024*1024,(name,(D/name).stat().st_size)
 (D/'README.md').write_text('# 白亜の塔攻略日記 Part3 — アテナ禁止・怒りの中国うさぎ\n\n[▶ 完成動画](STILLVEIL-TowerDiary-Part3.mp4) ／ [サムネ](Thumbnail-Part3.jpg)\n\n長さ：'+stamp(n['duration'])+'。1920×1080、30fps、48kHz。\n\n第3層へ全10回挑戦し、最後は19R・4人生存で突破。アテナは準備7戦も含めて使用禁止。中国うさぎが怒りのツッコミ役で参加します。\n\n[制作素材・台本・音声・全操作証拠](Production-Materials.zip) ／ [校正済み実戦5本](Recording-Sources.zip)\n\n[章立て](Chapters.txt) ／ [字幕](Subtitles-ja.srt) ／ [攻略条件と制作方法](Methods.md) ／ [クレジット](Credits.md)\n\n[完成版の同期検査](Finished-Movie-Sync.json) ／ [再生・シーク検査](Validation.json) ／ [全17戦の正規コマンド検証](Native-Verification.json) ／ [SHA256](SHA256SUMS.txt)\n\n校正済み実戦は映像をコピー、音声を可逆FLACへ変換したMKV。編集スクリプトは元のPCM MOVを参照するため、再構築時はMKVから映像copy・音声pcm_s16leで同名MOVを復元するか、元録画の拡張子を指定し直してください。ゲーム本体はソースcommit 1f4e970117c95a11ef38c8f1e12fe232e5a7b964、共通OP v4は017a0ccca241d1ec6a72b8a73f63188fc1043875を参照。本編BGMは公式配布元から取得します。\n')
 (D/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.name+'\n'for p in sorted(D.iterdir())if p.is_file()and p.name!='SHA256SUMS.txt'))
 print('PACKAGED',stamp(n['duration']),[(p.name,round(p.stat().st_size/1048576,2))for p in D.iterdir()if p.suffix in['.mp4','.zip']])
if __name__=='__main__':pack()
