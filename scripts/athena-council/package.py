"""Public episode, clearly separated evidence and lossless production inputs."""
import json,pathlib,subprocess,csv,zipfile,hashlib,wave,shutil
from render import _caption_pages,_two_lines
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/athena-council';D=O/'delivery';D.mkdir(exist_ok=True)
NAMES={'z':'ずんだもん','m':'四国めたん','u':'中国うさぎ'}
def stamp(t):return f'{int(t//3600):02}:{int(t//60)%60:02}:{int(t)%60:02}'
def srttime(t):return stamp(t)+f',{int(t%1*1000):03}'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def checksums():(D/'Checksums.sha256').write_text(''.join(sha(p)+'  '+p.name+'\n'for p in sorted(D.iterdir())if p.is_file()and p.name!='Checksums.sha256'))
def package():
 m=json.loads((O/'narration.json').read_text());lines=[l for c in m['chapters']for l in c['lines']];(D/'Chapters.txt').write_text('\n'.join(stamp(c['start'])+' '+c['title']for c in m['chapters'])+'\n')
 srt=[];clock=0
 for l in lines:
  pages=_caption_pages(l['text']);weight=sum(map(len,pages));t=l['start']
  for page in pages:
   dur=(l['end']-l['start'])*len(page)/weight;srt.append(f'{len(srt)+1}\n{srttime(t)} --> {srttime(t+dur)}\n'+NAMES[l['speaker']]+'：'+_two_lines(page).replace(r'\N','\n'));t+=dur
 (D/'Subtitles-ja.srt').write_text('\n\n'.join(srt)+'\n')
 (D/'Script.md').write_text('# アテナ依存対策会議\n\n全6案は未実装。現行の記録、感度分析、架空の処理模型は区別しています。\n\n'+''.join('## '+c['title']+'\n\n'+''.join(NAMES[l['speaker']]+'：'+l['text']+'\n\n'for l in c['lines'])for c in m['chapters']))
 (D/'Timeline.json').write_text(json.dumps({'duration':m['duration'],'chapters':[{k:c[k]for k in ['id','title','start','duration','phases']}for c in m['chapters']]},ensure_ascii=False,indent=2))
 shutil.copy2(ROOT/'docs/athena-council.md',D/'Decision-Spec.md')
 rows=json.loads((O/'research/native-study.json').read_text())
 with (D/'Current-Rule-Comparison.csv').open('w',newline='')as f:
  w=csv.writer(f);w.writerow(['build','condition','classification','wins','total','initialSeeds','meanRoundsAmongWinsOnly','meanPotionsAmongWinsOnly','party','leader'])
  for r in rows:w.writerow([r['build'],r['id'],r['kind'],r['wins'],r['total'],'90001..90100',r['averageWinningRounds'],r['averageWinningPotions'],'/'.join(r['config']['party']),r['config']['leader']])
 for old,new in [('source-facts.json','Source-Facts.json'),('plate-check.json','Visual-Check.json'),('native-verification.json','Native-Application-Verification.json'),('mechanism-model.json','Mechanism-Model.json')]:shutil.copy2(O/'research'/old,D/new)
 (D/'Mechanism-Checks.json').write_text(json.dumps(json.loads((O/'research/mechanism-model.json').read_text())['validation'],indent=2))
 (D/'Runtime.json').write_text(json.dumps({'durationSeconds':m['duration'],'resolution':[1920,1080],'fps':30,'gameVersion':'1.10.0','gameCommit':'dec20ebbfb8d139713ffe847ebc48eefe8ff54ca','proposalStatus':'All six proposed skills/leader skills/gems are unimplemented','voicevoxVersion':'0.26.0','voiceRoles':{'z':{'name':'ずんだもん','id':3},'m':{'name':'四国めたん','id':2},'u':{'name':'中国うさぎ','id':61}},'gameModified':False},ensure_ascii=False,indent=2))
 credits='''# 制作・素材クレジット

- 音声：VOICEVOX:ずんだもん（ノーマル3）、VOICEVOX:四国めたん（ノーマル2）、VOICEVOX:中国うさぎ（ノーマル61）。Engine0.26.0。https://voicevox.hiroshiba.jp/term/
- 立ち絵：東北ずん子・ずんだもんプロジェクト公式。ずんだもんzunmon003、四国めたんmet002_cr、中国うさぎusagi_s001 / usagi_s004 / usagi_s005。https://zunko.jp/con_illust.html
- 素材URL：https://zunko.jp/sozai/zundamon/zunmon003.png ／ https://zunko.jp/sozai/methane/met002_cr.png ／ https://zunko.jp/sozai/usagi/usagi_s001.png ／ https://zunko.jp/sozai/usagi/usagi_s004.png ／ https://zunko.jp/sozai/usagi/usagi_s005.png
- キャラクター規約：https://zunko.jp/guideline.html ／ 音源規約：https://zunko.jp/con_ongen_kiyaku.html
- 音楽：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」。https://amachamusic.chagasi.com/music_fjordnosundakaze.html
- 効果音：STILLVEIL v1.10.0の実アプリの校正済み収録から抽出した、小さな編集用の選択・防御合図。新技能が実装された音ではありません。
- 原作と背景画像：STILLVEIL — 静謐の残響。ゲーム制作ではイラスト・文章・プログラミング支援に生成AIを使用。一部原画アニメーションにRunway使用。今回の動画は既存素材・自作図解・VOICEVOXの編集で、新たな生成動画モデルは使っていません。
- 公開版・itchへの実装変更はありません。単体の公式立ち絵とBGMは再配布せず、bootstrapと固定ゲームtreeから取得する構成です。
'''
 (D/'Credits.md').write_text(credits)
 (D/'Sources.md').write_text('''# 根拠と範囲

ゲーム固定版：[v1.10.0 / dec20ebbfb8d139713ffe847ebc48eefe8ff54ca](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/dec20ebbfb8d139713ffe847ebc48eefe8ff54ca)

- src/domain/engine.ts：leaderBonus、chooseDefaultAction、damage、かばう・軽減・ゲージの処理。
- src/domain/ultimates.ts：タンク役共通の全体障壁。アテナ専用の効果と混同しない。
- src/domain/scout-skills.ts：ネリの灯のisBossStrike条件とフィオの余り布の適用範囲。
- src/domain/command-doctrine.ts：指揮容量、覚醒前の費用の継承、対象外の行動と検証。engine.tsのleaderEffectは現行で発令Rに追加効果を抑止する。新しい札を発令中にも使うのは、未実装案の新しい契約。
- src/domain/memory-gems.ts / white-flower.ts：石のT4条件、固定白花、実行した通常防御による回復。
- src/application/game.ts：native application commandの再生検証。
- content.json：アテナ・ノエル・ヘカテ・ウズメ・フローラの現行フレーバーと能力、第一層の定義、ノエル覚醒条件。固定ゲームの生成済み内容をProduction-Inputsへ収録。
- 前作Part1.1.1：制作cece05e04fb7b6a26926d05640f872bcbc5b6c68／公開downloads/tower-diary-1-1-1。白花の実回復125・余り布の追加障壁5は前作の成功本走一例。
- 今回の現行比較は90001..90100。前作の70001..70100の61/76勝とは別。新しい基準51/71勝とリオラ10/28勝は合計400戦、native commandでも一致を検査。
- counterfactual行は不使用化などの感度分析。公開版で選べる編成条件ではない。同じ初期乱数でも消費順は変わるため、以後の状態異常等が完全一致する比較ではない。
- Mechanism-Modelは架空の体力による処理模型。敵AI・行動順・状態異常・DPSを再現せず、塔の勝率ではない。
- ヘカテ等の背景はゲーム内フレーバーを機構へ創作したもの。神話に数値付きの同じ技能が存在する、とは説明していない。

公式素材の規約と音楽はCredits.md。外部サイト本文・単体素材は制作ZIPへ再配布しません。
''')
 paths=sorted({ROOT/l['wav']for l in lines});manifest=[]
 with zipfile.ZipFile(D/'Production-Inputs.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6)as z:
  for p in paths:
   flac=p.with_suffix('.flac')
   if not flac.exists():subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-i',str(p),'-c:a','flac','-compression_level','8',str(flac)],check=True)
   with wave.open(str(p))as stream:pcm=hashlib.sha256(stream.readframes(stream.getnframes())).hexdigest()
   manifest.append({'wav':str(p.relative_to(ROOT)),'pcmFramesSha256':pcm});z.write(flac,str(flac.relative_to(ROOT)))
  for name in ['narration.json','content.json']:z.write(O/name,'artifacts/athena-council/'+name)
  for name in ['source-facts.json','plate-check.json','native-study.json','native-verification.json','mechanism-model.json']:z.write(O/'research'/name,'artifacts/athena-council/research/'+name)
  for name in ['ui-native.wav','guard-native.wav','editorial-se.json']:z.write(O/'assets'/name,'artifacts/athena-council/assets/'+name)
  for p in (ROOT/'scripts/athena-council').iterdir():
   if p.is_file():z.write(p,str(p.relative_to(ROOT)))
  z.write(ROOT/'docs/athena-council.md','docs/athena-council.md');z.writestr('Speech-Manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2));z.writestr('RESTORE.txt','Extract at fixed game repository root. Run python scripts/athena-council/restore_audio.py and bootstrap.py. See docs/athena-council.md. Proposed mechanics remain unimplemented.\n')
 for p in D.iterdir():
  if p.is_file():assert p.stat().st_size<100*1024**2,(p.name,p.stat().st_size)
 checksums();print('PACKAGED',len(lines),'lines',m['duration']/60,'minutes',flush=True)
if __name__=='__main__':package()
