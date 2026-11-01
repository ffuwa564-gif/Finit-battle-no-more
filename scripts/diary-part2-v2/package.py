"""Publish only after the exact finished movie passes all delivery gates."""
import pathlib,json,hashlib,zipfile,shutil,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2-v2';OLD=ROOT/'artifacts/diary-part2';D=O/'delivery';MOV=D/'STILLVEIL-TowerDiary-Part2-v2.mp4'
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def stamp(t):
 n=round(t);return f'{n//60:02d}:{n%60:02d}'
def srt(t):
 n=round(t*1000);return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}'
def pack():
 finished=sha(MOV);sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
 for name in['Finished-Movie-Sync.json','Decode-Validation.json','Validation.json','Visual-QC.json']:
  r=json.loads((D/name).read_text());assert r['passed']and r['finishedSha256']==finished,name
 assert MOV.stat().st_size<100*1024*1024,'GitHub delivery limit'
 n=json.loads((O/'timeline-narration.json').read_text());chapters=n['chapters'];lines=[l for c in chapters for l in c['lines']]
 (D/'Script.md').write_text('# 白亜の塔攻略日記 Part2 改良版\n\n'+'\n\n'.join('## '+c['title']+'\n\n'+'\n\n'.join({'z':'ずんだもん','m':'四国めたん','t':'春日部つむぎ'}[l['speaker']]+'：'+l['text']for l in c['lines'])for c in chapters))
 sub=[{'start':18,'end':20.35,'text':'白亜の塔、攻略日記！'},{'start':20.8,'end':22.5,'text':'なのだ！'}]+lines
 (D/'Subtitles-ja.srt').write_text('\n\n'.join(f"{i+1}\n{srt(l['start'])} --> {srt(l['end'])}\n{l['text']}"for i,l in enumerate(sub))+'\n')
 ct='\n'.join(stamp(c['start'])+' '+c['title']for c in chapters)+'\n';(D/'Chapters.txt').write_text(ct)
 for source,dest in [('timeline-narration.json','Narration-Timeline.json'),('edit-timeline.json','Edit-Timeline.json'),('mix-manifest.json','Mix-Manifest.json'),('head-safety.json','Head-Safety.json'),('ultimate-cues.json','Ultimate-Cues.json')]:shutil.copy2(O/source,D/dest)
 shutil.copy2(O/'research/Thumbnail-Update.json',D/'Thumbnail-Update.json');shutil.copy2(O/'research/Research.md',D/'Research.md');shutil.copy2(O/'research/Processing-Validation.json',D/'Processing-Validation.json');shutil.copy2(OLD/'delivery/Native-Verification.json',D/'Native-Verification.json');shutil.copy2(OLD/'delivery/Media-Sync-Regressions.json',D/'Media-Sync-Regressions.json')
 (D/'Credits.md').write_text('''# 制作・クレジット

音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん／VOICEVOX:春日部つむぎ（0.26.0、ノーマル3/2/8）。

本編のちびキャラ・表情差分・挿絵は今回生成AIで制作した二次創作イラスト。既存の可愛いサムネイルを配色・造形の参考に使用。
ずんだもん・四国めたん：東北ずん子・ずんだもんプロジェクト。
https://zunko.jp/guideline.html
https://zunko.jp/con_ongen_kiyaku.html
春日部つむぎ：春日部つくし。
https://tsumugi-official.studio.site/rule
https://booth.pm/ja/items/3474402

共通OP v4：ユーザー提供版23秒を冒頭に収録。OPの既存キャラクター素材・書体クレジットも継承。
OP BGM：Twinkle Soda / FUJINEQo
https://booth.pm/ja/items/3292009
https://www.youtube.com/c/FUJINEQoMusic
OP書体：Noto Serif CJK / LINE Seed JP / Barlow Condensed（SIL Open Font License）。

本編BGM：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」。
https://amachamusic.chagasi.com/music_fjordnosundakaze.html
ゲーム・ゲーム効果音：STILLVEIL v1.10.0の実機録画。原画・文章・プログラミング補助に生成AI、一部原画アニメーションにRunwayを使用。

創作の攻略日記であり、キャラクター権利者によるゲームの推薦・公式コラボを意味しません。他者の実況映像・楽曲・公式立ち絵の単体素材はこの制作ZIPへ転載していません。
''')
 methods=(OLD/'delivery/Methods.md').read_text();body=methods[methods.index('Part1.1.1の'):];body=body.replace('公開録画は450×800、30fps、48kHz PCM MOV。','元の公開録画は450×800。今回の編集用カットは486×864、30fps、48kHz PCM MOV。');(D/'Methods.md').write_text('# 改良版の編集と検証\n\n共通OP23秒を先頭に保ち、同じ実戦を約19分20秒へ再編集。配色をサムネに合わせ、表情6種・挿絵2種・会話に沿う図解と実戦HPグラフを追加。画像はcontainで配置し、頭・耳・帽子の余白と字幕2行の上限を検査。妖精と必殺は再掲を明記し、実際の登場・着弾にセリフを合わせています。\n\n最終音源はOPを含めサンプル0から48kHzで一度にミックス。ゲームSEは会話中にダッキングし、マスターのピークを制限。可逆FLACを保持し、配布MP4でのみAACへ変換します。全体デコード、Chromium/WebKitの開始・中間・終了再生とシーク、配布ファイル自体の実戦映像・SE・3話者の照合を別々に検査。波形照合では同じサンプル時計の他音源を減算し、声とSEを個別に検査します。許容ズレ80ms。\n\n'+body)
 source='1f4e970117c95a11ef38c8f1e12fe232e5a7b964';(D/'Source-Version.txt').write_text('Game v1.10.0\nGame source: '+source+'\nOriginal Part2 production: 7af2e4571f96c23866610cda8c12ffce27ba2321\nNative footage: same verified run as original Part2\nRe-edit source branch: video/tower-diary-part2-v2\nRe-edit source commit: '+sourceCommit+'\nGame code changes: none\n')
 (D/'Opening-Source.json').write_text(json.dumps({'sourceCommit':'017a0ccca241d1ec6a72b8a73f63188fc1043875','duration':23,'frames':690,'referenceSha256':sha(OLD/'render/common-op.mov'),'finishedSha256':finished},indent=2))
 (D/'Runtime.json').write_text(json.dumps({'durationSeconds':n['duration'],'chapters':len(chapters),'lines':len(lines),'speakers':['ずんだもん','四国めたん','春日部つむぎ'],'resolution':'1920x1080','fps':30,'audioHz':48000,'finishedSha256':finished},ensure_ascii=False,indent=2))
 (D/'YouTube-Description.txt').write_text('白亜の塔攻略日記 Part2｜守りは厚いのに時間切れ!? ギャルと編成会議【STILLVEIL】\n\nずんだもん・四国めたん・春日部つむぎで第二層へ。かわいい図解・作戦会議とルネットの必殺技！\n無料ブラウザゲーム：https://fluffy3546.itch.io/stillveil\n\n'+ct+'\n比較用の前回所持条件からの継続で、新規プレイではありません。勝利戦は薬3個・妖精4回・花11回を使用。先頭への行動予約あり。\n\n音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん／VOICEVOX:春日部つむぎ\nOP BGM：Twinkle Soda / FUJINEQo\nhttps://booth.pm/ja/items/3292009\nhttps://www.youtube.com/c/FUJINEQoMusic\n本編BGM：甘茶の音楽工房「フィヨルドの澄んだ風」\nhttps://amachamusic.chagasi.com/\nキャラクターと制作の詳細は同梱Credits.md。\n')
 thumb=ROOT/'artifacts/diary-thumbnails/delivery/TowerDiary-Part2-Cute';shutil.copy2(thumb.with_suffix('.png'),D/'Thumbnail.png');shutil.copy2(thumb.with_suffix('.jpg'),D/'Thumbnail.jpg')
 # Reuse the separately published native recording archive; never duplicate large recording blobs.
 (D/'Recording-Sources.txt').write_text('同じ実戦録画を使用。SHA256 '+sha(OLD/'delivery/Recording-Sources.zip')+'\nhttps://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/21e02698d863391716664fc1145366f44d81e526/Recording-Sources.zip\n全9戦の元の入力・証拠・制作コード：\nhttps://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/21e02698d863391716664fc1145366f44d81e526/Production-Inputs.zip\n')
 paths=list((ROOT/'scripts/diary-part2-v2').glob('*.txt'))+list((ROOT/'scripts/diary-part2-v2').glob('*.py'))+list((ROOT/'scripts/diary-part2-v2').glob('*.mjs'))+[ROOT/'scripts/diary-part2-v2/README.txt',ROOT/'tools/media-sync/media_sync.py']
 paths+=list((O/'assets').glob('*.png'))+[O/'asset-generation.json',O/'research/Research.md',O/'research/Processing-Validation.json',O/'research/Thumbnail-Update.json']
 paths+=[O/x for x in['narration.json','timeline-narration.json','edit-timeline.json','mix-manifest.json','ultimate-cues.json','head-safety.json']]
 paths+=[OLD/'narration.json',OLD/'content.json',OLD/'proofs/tower-1.json',OLD/'ultimate-cues.json',OLD/'delivery/Methods.md',OLD/'delivery/Native-Verification.json',OLD/'delivery/Media-Sync-Regressions.json',thumb.with_suffix('.png'),thumb.with_suffix('.jpg'),D/'Preview.jpg']
 paths+=[ROOT/l['wav']for l in lines]
 paths+=list((O/'speech').glob('*.key'))+list((O/'render').glob('*-visual.json'))+list((O/'render').glob('*.ass'))
 with zipfile.ZipFile(D/'Production-Inputs.zip','w',zipfile.ZIP_DEFLATED,6)as z:
  for p in sorted(set(paths)):
   assert p.exists(),p
   z.write(p,p.relative_to(ROOT))
 url='https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/refs/heads/downloads/tower-diary-part2-v2/'
 (D/'README.md').write_text('# 白亜の塔攻略日記 Part2 改良版\n\n**19分19秒・1080p30・日本語／ずんだもん／四国めたん／春日部つむぎ**\n\n[▶ 改良版をダウンロード]('+url+MOV.name+') ｜ [サムネイル]('+url+'Thumbnail.jpg)\n\n![改良版の画面](Preview.jpg)\n\n可愛いピンクの本編、会話ごとの表情、編成・敵役割・素材・実戦HPの図解、作戦会議とお買い物の挿絵。OP直後に失敗ダイジェストを入れ、重複説明を整理しました。元の第二層実戦を再編集した版で、ゲーム本体と戦闘結果は変えていません。\n\n[字幕](Subtitles-ja.srt)／[チャプター](Chapters.txt)／[台本](Script.md)／[YouTube説明文](YouTube-Description.txt)／[制作素材ZIP](Production-Inputs.zip)／[録画素材](Recording-Sources.txt)／[制作コード](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/'+sourceCommit+'/scripts/diary-part2-v2)\n\n[開始条件・検証](Methods.md)／[クレジット](Credits.md)／[参照した動画と調査範囲](Research.md)。外部YouTube本編は接続制限で視聴できず、公開情報と実際に確認できたPart1.1のレイアウトを区別しています。\n\n配布MP4自体の映像・実SE・全3話者、必殺着弾同期を照合。全体デコードとChromium/WebKitの開始・中間・終了再生／シークを確認。頭の安全域・字幕2行・話者の表情切替も検査。各JSONは完成SHA256に紐づきます。\n\n完成SHA256: `'+finished+'`\n')
 files=sorted(p for p in D.iterdir()if p.is_file()and p.name!='Checksums.sha256');(D/'Checksums.sha256').write_text(''.join(sha(p)+'  '+p.name+'\n'for p in files));print('PACKAGE COMPLETE',finished)
if __name__=='__main__':pack()
