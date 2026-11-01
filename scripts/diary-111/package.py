"""Complete publishable episode, notes and lossless reproducible production inputs."""
import json,pathlib,subprocess,zipfile,hashlib,wave,gzip,csv,shutil,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-111';D=O/'delivery';D.mkdir(exist_ok=True)
def stamp(t):return f'{int(t//3600):02}:{int(t//60)%60:02}:{int(t)%60:02}'
def srtstamp(t):return stamp(t)+f',{int(t%1*1000):03}'
def package():
 m=json.loads((O/'narration.json').read_text());(D/'Runtime.json').write_text(json.dumps({'episode':'1.1.1','gameVersion':'1.10.0','gameCommit':'dec20ebbfb8d139713ffe847ebc48eefe8ff54ca','durationSeconds':m['duration'],'fps':30,'frameSize':[1600,900],'fixtureNotPreviousSave':True},ensure_ascii=False,indent=2));lines=[l for c in m['chapters']for l in c['lines']]
 (D/'Chapters.txt').write_text('\n'.join(stamp(c['start'])+' '+c['title']for c in m['chapters'])+'\n')
 (D/'Subtitles-ja.srt').write_text('\n\n'.join(f"{i+1}\n{srtstamp(l['start'])} --> {srtstamp(l['end'])}\n{'ずんだもん'if l['speaker']=='z'else'四国めたん'}：{l['text']}"for i,l in enumerate(lines))+'\n')
 (D/'Script.md').write_text('# 白亜の塔攻略日記 Part1.1.1\n\n'+''.join('## '+c['title']+'\n\n'+''.join(('ずんだもん'if l['speaker']=='z'else'めたん')+'：'+l['text']+'\n\n'for l in c['lines'])for c in m['chapters']))
 (D/'Timeline.json').write_text(json.dumps({'duration':m['duration'],'chapters':[{k:c[k]for k in ['id','title','start','duration','footage']}for c in m['chapters']]},ensure_ascii=False,indent=2))
 if '--notes' in sys.argv:return
 for ident in ['rewind','flower']:
  meta=json.loads((O/'capture'/f'{ident}.json').read_text());a,b=meta['gameplayWindow'];dest=D/f'FullReplay-{ident}.mp4'
  if not dest.exists():subprocess.run(['ffmpeg','-v','error','-y','-ss',str(a),'-i',str(O/'capture'/f'{ident}.mp4'),'-t',str(b-a),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','24','-c:a','aac','-b:a','128k','-movflags','+faststart',str(dest)],check=True)
  shutil.copy2(O/'capture'/f'{ident}-sync-check.json',D/f'AV-Sync-{ident}.json')
  # Metadata contains timestamps, not the isolated official source artwork/audio.
  (D/f'Capture-{ident}.json.gz').write_bytes(gzip.compress((O/'capture'/f'{ident}.json').read_bytes(),mtime=0))
  shutil.copy2(O/'capture'/f'{ident}-result.png',D/f'Result-{ident}.png')
 with zipfile.ZipFile(D/'Recording-Sources.zip','w',compression=zipfile.ZIP_STORED)as z:
  for ident in ['rewind','flower']:
   for name in [ident+'.mp4',ident+'.json',ident+'-result.png',ident+'-start.png',ident+'-sync-check.json']:z.write(O/'capture'/name,'artifacts/diary-111/capture/'+name)
  z.writestr('READ-ME.txt','Production-only calibrated recordings include isolated sync markers and tones outside gameplayWindow. Publish the finished episode or FullReplay movies, not these raw calibration recordings. Extract at repository root.\n')
 for file in (O/'render').glob('*-edit.json'):shutil.copy2(file,D/file.name)
 with (D/'Comparison.csv').open('w',newline='')as f:
  writer=csv.writer(f);writer.writerow(['experiment','candidate','wins','total','config'])
  for name in ['comparison','final-comparison','leader-comparison','confirmatory','flower-pilot','command']:
   data=json.loads((O/'search'/f'{name}.json').read_text())
   for row in data:
    writer.writerow([name,row.get('name',row.get('id','')),row.get('wins'),row.get('total',row.get('n',len(row.get('outcomes',[])))),json.dumps(row.get('config'),ensure_ascii=False)])
 credits='''# 制作・クレジット

- 音声：VOICEVOX:ずんだもん（3）／VOICEVOX:四国めたん（2）。Engine0.26.0。https://voicevox.hiroshiba.jp/term/
- 立ち絵：東北ずん子・ずんだもんプロジェクト公式。https://zunko.jp/sozai/zundamon/zunmon003.png ／ https://zunko.jp/sozai/methane/met002_cr.png
- キャラクター規約：https://zunko.jp/guideline.html ／ 音源規約：https://zunko.jp/con_ongen_kiyaku.html
- 音楽：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」。https://amachamusic.chagasi.com/music_fjordnosundakaze.html
- 戦闘効果音：STILLVEIL v1.10.0の実アプリから録音。架空の必殺音や効果音の追加はしていません。背景音楽のみ編集で別に付加。
- ゲーム画像：STILLVEIL — 静謐の残響。ゲーム制作ではイラスト・文章・プログラミング支援に生成AIを使用。一部の原画アニメーションにRunway使用。本動画に新規の生成動画モデルは使用していません。
- 前作構成参照：downloads/tower-diary-part1 / cd6854ccc870a6ec5c973d5be88ffc9bbf4f62cd のPart1.1。
- ゲーム・参照実装：dec20ebbfb8d139713ffe847ebc48eefe8ff54ca のsrc/domain/engine.ts、memory-gems.ts、white-flower.ts、scout-skills.ts、command-doctrine.ts、src/application/game.ts。

素材の単体再配布を避けるため、公式立ち絵・単体BGMはProduction-Inputs.zipに含めません。bootstrapと固定ゲームtreeから取得してください。
'''
 (D/'Credits.md').write_text(credits)
 shutil.copy2(ROOT/'docs/tower-diary-1-1-1.md',D/'Methods.md')
 manifest=[]
 with zipfile.ZipFile(D/'Production-Inputs.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6)as z:
  for path in sorted({ROOT/l['wav']for l in lines}):
   flac=path.with_suffix('.flac')
   if not flac.exists():subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-i',str(path),'-c:a','flac','-compression_level','8',str(flac)],check=True)
   with wave.open(str(path))as w:pcm=hashlib.sha256(w.readframes(w.getnframes())).hexdigest()
   z.write(flac,str(flac.relative_to(ROOT)));manifest.append({'wav':str(path.relative_to(ROOT)),'pcmFramesSha256':pcm})
  for folder in ['proofs','search']:
   for path in (O/folder).glob('*.json'):z.write(path,str(path.relative_to(ROOT)))
  for name in ['narration.json','content.json']:z.write(O/name,'artifacts/diary-111/'+name)
  for path in (ROOT/'scripts/diary-111').glob('*'):
   if path.is_file():z.write(path,str(path.relative_to(ROOT)))
  z.write(ROOT/'docs/tower-diary-1-1-1.md','docs/tower-diary-1-1-1.md')
  z.writestr('Speech-Manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
  z.writestr('RESTORE.txt','Extract at fixed game tree root, run python scripts/diary-111/restore_audio.py; then bootstrap.py. FullReplay movies preserve native SE; calibration markers are excluded. See Methods.md.\n')
 for p in D.iterdir():
  if p.is_file():assert p.stat().st_size<100*1024**2,(p.name,p.stat().st_size)
 (D/'Checksums.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n'for p in sorted(D.iterdir())if p.is_file()and p.name!='Checksums.sha256'))
 print('PACKAGED',len(lines),'lines',m['duration']/60,'minutes',flush=True)
if __name__=='__main__':package()
