"""Ship reproducible dialogue/proofs and lossless capture audio, never isolated cast art."""
import pathlib,json,subprocess,zipfile,hashlib,shutil,gzip
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2';D=O/'delivery'
def stamp(t):
 n=round(t);return f'{n//3600:02d}:{n//60%60:02d}:{n%60:02d}'if n>=3600 else f'{n//60:02d}:{n%60:02d}'
def srt(t):
 n=round(t*1000);return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}'
def pack():
 n=json.loads((O/'timeline-narration.json').read_text());chapters=n['chapters'];lines=[l for c in chapters for l in c['lines']]
 (D/'Script.md').write_text('# 白亜の塔攻略日記 Part2\n\n'+'\n\n'.join('## '+c['title']+'\n\n'+'\n\n'.join({'z':'ずんだもん','m':'四国めたん','t':'春日部つむぎ'}[l['speaker']]+'：'+l['text']for l in c['lines'])for c in chapters))
 opCaptions=[{'start':18.0,'end':20.35,'text':'白亜の塔、攻略日記！'},{'start':20.8,'end':22.5,'text':'なのだ！'}];subtitleLines=opCaptions+lines
 (D/'Subtitles-ja.srt').write_text('\n\n'.join(f"{i+1}\n{srt(l['start'])} --> {srt(l['end'])}\n{l['text']}"for i,l in enumerate(subtitleLines))+'\n')
 ct='\n'.join(stamp(c['start'])+' '+c['title']for c in chapters)+'\n';(D/'Chapters.txt').write_text(ct)
 shutil.copy2(O/'timeline-narration.json',D/'Narration-Timeline.json');shutil.copy2(O/'edit-timeline.json',D/'Edit-Timeline.json');shutil.copy2(O/'mix-manifest.json',D/'Mix-Manifest.json');shutil.copy2(O/'op-applied.json',D/'Opening-Source.json')
 (D/'Credits.md').write_text('''# 制作・クレジット\n\n音声：VOICEVOX:ずんだもん / VOICEVOX:四国めたん / VOICEVOX:春日部つむぎ（エンジン0.26.0、ノーマル3/2/8）\n\nずんだもん・四国めたん立ち絵：東北ずん子・ずんだもんプロジェクト公式素材。\nhttps://zunko.jp/guideline.html\nhttps://zunko.jp/con_ongen_kiyaku.html\n\n春日部つむぎ立ち絵：春日部つくし、VOICEVOX配布エンジンの話者ポートレート。動画内に合成して使用。\nhttps://tsumugi-official.studio.site/rule\nhttps://booth.pm/ja/items/3474402\n\n共通OP v4（23秒）：ユーザーがGitHubへ追加した版を冒頭にそのまま収録。\nhttps://github.com/ffuwa564-gif/Finit-battle-no-more/tree/017a0ccca241d1ec6a72b8a73f63188fc1043875\nOP BGM：Twinkle Soda / FUJINEQo\nhttps://booth.pm/ja/items/3292009\nhttps://www.youtube.com/c/FUJINEQoMusic\nOP書体：Noto Serif CJK / LINE Seed JP / Barlow Condensed（SIL Open Font License）。\n\n本編BGM：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」。\nhttps://amachamusic.chagasi.com/\n\nゲーム画面・ゲーム効果音：STILLVEIL v1.10.0、実機録画。イラスト・制作補助に生成AIを使用。一部原画のアニメーションはRunway。\n\n本動画はキャラクターによる創作の攻略日記です。音声・キャラクター権利者がゲームを推薦したことを示すものではありません。立ち絵・楽曲の単体ファイルは公開素材集に含めていません。\n''')
 source='1f4e970117c95a11ef38c8f1e12fe232e5a7b964';(D/'Source-Version.txt').write_text('Game v1.10.0\nGame source: '+source+'\nReference Part1.1: cd6854ccc870a6ec5c973d5be88ffc9bbf4f62cd / downloads/tower-diary-part1\nContinuation: Part1.1.1 declared-comparison flower victory\nNew gameplay mechanisms: none\n')
 (D/'Methods.md').write_text('''# 開始条件と検証\n\n冒頭23秒はGitHubの共通OP v4を全編収録。元24fpsを尺を変えず30fpsへ統一し、OP音楽・タイトルコールはそのまま使用。本編PCMへ連結し、配布版でAACに一度だけ変換。OPの開始・途中・終了も配布ファイルで元映像・音源へ照合。サムネはOPと同じ濃紺・星空・軌道線・金とアイボリーの明朝文字を使用。\n\nPart1.1.1の白花編成・勝利データを継続。これは比較用の所持・装備・開放条件を整えたデータで、新規プレイではありません。Part1.1そのものの実終了セーブを再発見したものではありません。前回のT4装備3個とT3白花を引き継ぎ、追加の素材や覚醒品は通常のゲームコマンドで得ています。\n\n超級4勝（10/11/13/13R、薬0）→歯車24個→20個で通常加入→通常形態で第二層40R時間切れ・薬5個→元の編成で覚醒級3勝（16/14/15R、薬計1）→心臓3個で覚醒→時計素材6でT1巻戻し（出力20、特性なし）を製作→第二層25R勝利・薬3個・4人生存→報酬確定、第三層開放。必要な回復薬は通常購入。戦闘9件すべての入力を再実行して検証しました。\n\n成功戦は妖精4回・戦場の花11回を使用。睡眠・魅了などの確率要素、所持装備、行動予約も結果に含まれます。覚醒・攻撃役追加・先頭操作を同時に変更しており、覚醒単独の因果効果や最適編成を証明するものではありません。アテナは継続採用しており、アテナ依存解消の証明でもありません。\n\nルネットの必殺は基礎190％の全体攻撃、かばう対象外。演出のうさぎは味方の常設ビット追加ではありません。今回のリーダーはアテナで、ルネットのリーダースキルは適用しません。巻戻しは通常スキルCDの支援で、必殺ゲージや石のCDの短縮ではありません。\n\n## 映像と音\n\nアプリ速度2で実機録画。場面の再掲や追加のAV同時倍速、静止中は画面に明記。メイン戦は同じ1戦の序盤・中盤・終盤を順に使用し、必殺紹介だけ場面を戻して再掲します。省略した準備戦や失敗戦も入力ログを保存。\n\n録画の開始・途中・終了に6点以上の診断用映像と16kHz音を入れ、48kHz音声を測定した区分時計に合わせます。音の診断帯域は元時計上で除去してから時刻補正し、映像の診断帯はクロップ。公開録画は450×800、30fps、48kHz PCM MOV。編集はフレームと1600サンプルの単位でAVを同時処理。中間キャッシュは入力・条件・コードSHA256一致時だけ再利用。\n\n最終音源は48kHzの共通サンプル0へ一度だけミックスし、配布MP4でAACに一度だけ変換。Finished-Movie-Sync.jsonでは配布ファイル自体の実戦変化フレーム・実SE波形・3話者の音声を編集元に照合し、80ms超／相関不足／検査点不足なら公開を停止します。ファイル全体デコードとChromium/WebKit再生は別チェックです。\n\nRecording-Sources.zipはH.264映像とFLAC音声のMKV。FLACは編集元PCMの可逆圧縮です。再編集時はMOV/PCMへ戻し、タイムラインは同梱JSONを参照してください。\n''')
 (D/'YouTube-Description.txt').write_text('白亜の塔 攻略日記 Part2｜ルネットの必殺で第二層へ！つむぎ参戦【STILLVEIL】\n\nずんだもん・四国めたんに春日部つむぎが合流。通常ルネットで時間切れになった編成を見直し、覚醒後の必殺技と二人の攻撃役で第二層へ。準備・失敗・結果まで実際のゲーム処理で追います。\n\n無料ブラウザゲーム：https://fluffy3546.itch.io/stillveil\n動画・字幕・記録：https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/tower-diary-part2\n\n'+ct+'\nOP BGM：Twinkle Soda / FUJINEQo\nhttps://booth.pm/ja/items/3292009\nhttps://www.youtube.com/c/FUJINEQoMusic\n\n比較用の前回所持条件からの継続で、新規プレイではありません。先頭への行動予約あり。勝利戦は薬3個・妖精4回・花11回を使用。改変案のスキルは未実装。\n\n音声：VOICEVOX:ずんだもん／VOICEVOX:四国めたん／VOICEVOX:春日部つむぎ\n立ち絵：東北ずん子・ずんだもんプロジェクト、春日部つくし（VOICEVOX話者ポートレート）\nhttps://zunko.jp/\nhttps://tsumugi-official.studio.site/rule\n本編BGM：甘茶の音楽工房「フィヨルドの澄んだ風」\n詳細は同梱Credits.md。\n')
 # Compress only production materials we can distribute independently.
 archive=D/'Production-Inputs.zip'
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,6)as z:
  for p in sorted((ROOT/'scripts/diary-part2').glob('*.py')):z.write(p,p.relative_to(ROOT))
  for p in sorted((ROOT/'scripts/diary-part2').glob('*.ts')):z.write(p,p.relative_to(ROOT))
  for p in sorted((ROOT/'scripts/diary-part2').glob('*.mjs')):z.write(p,p.relative_to(ROOT))
  for p in sorted((ROOT/'scripts/diary-part2').glob('*.txt')):z.write(p,p.relative_to(ROOT))
  for p in sorted((O/'proofs').glob('*.json')):z.write(p,p.relative_to(ROOT))
  for p in[O/'assets/TowerDiary-Opening-v4-README.txt',O/'assets/TowerDiary-Opening-v4-YouTube-description.txt']:z.write(p,p.relative_to(ROOT))
  for p in[O/'narration.json',O/'timeline-narration.json',O/'edit-timeline.json',O/'mix-manifest.json',O/'ultimate-cues.json',O/'op-applied.json']:z.write(p,p.relative_to(ROOT))
  for l in lines:
   p=ROOT/l['wav'];f=p.with_suffix('.flac')
   cacheKey=hashlib.sha256(p.read_bytes()+pathlib.Path(__file__).read_bytes()).hexdigest();cacheFile=f.with_suffix('.flac.key')
   if not(f.exists()and cacheFile.exists()and cacheFile.read_text()==cacheKey):subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-c:a','flac',str(f)],check=True)
   cacheFile.write_text(cacheKey)
   if str(f.relative_to(ROOT))not in z.namelist():z.write(f,f.relative_to(ROOT))
 with zipfile.ZipFile(D/'Recording-Sources.zip','w',zipfile.ZIP_STORED)as z:
  for ident in['tower-1','first-try','heart-3']:
   mov=O/f'capture/{ident}.mov';mkv=O/f'capture/{ident}.mkv';subprocess.run(['ffmpeg','-v','error','-y','-i',str(mov),'-map','0:v','-map','0:a','-c:v','copy','-c:a','flac',str(mkv)],check=True);z.write(mkv,mkv.relative_to(ROOT));z.writestr('artifacts/diary-part2/capture/'+ident+'.json.gz',gzip.compress((O/f'capture/{ident}.json').read_bytes()))
 (D/'Runtime.json').write_text(json.dumps({'durationSeconds':n['duration'],'chapters':len(chapters),'lines':len(lines),'speakers':['ずんだもん','四国めたん','春日部つむぎ'],'resolution':'1920x1080','fps':30,'audioHz':48000},ensure_ascii=False,indent=2))
 print('PACKAGED',n['duration'],flush=True)
if __name__=='__main__':pack()
