"""Write delivery text from the actual rendered timeline, never an estimated clock."""
import hashlib,json,pathlib,shutil,subprocess
from render import ROOT,OUT,RENDER,duration
D=OUT/'delivery';D.mkdir(exist_ok=True)
def stamp(t):
 ms=round(t*1000);s,ms=divmod(ms,1000);m,s=divmod(s,60);h,m=divmod(m,60)
 return f'{h:02}:{m:02}:{s:02},{ms:03}'
def finish():
 shutil.copy2(OUT/'Worked-Examples.json',D/'Worked-Examples.json')
 data=json.loads((OUT/'narration.json').read_text());clock=0;srt=[];chapters=[];timeline=[];script=['# STILLVEIL 神話と物語から考える、次のスキル会議','', '全案未実装。数字は比較用の仮定で、実装・追加時期・性能を保証しません。',''];index=1
 assert len(data['chapters'])==22
 for ch in data['chapters']:
  actual=duration(RENDER/(ch['id']+'.mp4'));assert abs(actual-ch['duration'])<.15
  chapters.append(f'{int(clock//60):02}:{int(clock%60):02} {ch["title"]}')
  script+=['',f'## {ch["title"]}','',f'出典ID: {", ".join(ch.get("source_ids",[]))}'.rstrip(),'']
  for line in ch['lines']:
   start=clock+line['start']-ch['start'];end=clock+line['end']-ch['start'];name='ずんだもん'if line['speaker']=='z'else'四国めたん'
   srt.append(f'{index}\n{stamp(start)} --> {stamp(end)}\n{name}：{line["text"]}\n');index+=1;script.append(f'**{name}**　{line["text"]}\n')
  timeline.append({'id':ch['id'],'title':ch['title'],'start':round(clock,4),'duration':actual});clock+=actual
 (D/'Subtitles-ja.srt').write_text('\n'.join(srt));(D/'Chapters.txt').write_text('\n'.join(chapters)+'\n');(D/'Script.md').write_text('\n'.join(script));(D/'Timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
 credits='''# 制作・出典・利用素材

- VOICEVOX利用規約：https://voicevox.hiroshiba.jp/term/
- 音声：VOICEVOX:ずんだもん（ノーマル / 3）、VOICEVOX:四国めたん（ノーマル / 2、ツンツン / 6）。VOICEVOX Engine 0.26.0。
- 立ち絵：東北ずん子・ずんだもんプロジェクト公式素材。https://zunko.jp/sozai/zundamon/zunmon003.png ／ https://zunko.jp/sozai/methane/met012.png
- キャラクター利用規約：https://zunko.jp/guideline.html ／ 音声利用規約：https://zunko.jp/con_ongen_kiyaku.html
- 音楽：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」。https://amachamusic.chagasi.com/music_fjordnosundakaze.html
- 効果音：STILLVEIL本体のUI・防御音を録画音声から抽出し、説明画面の切替に小さく使用。提案技能の実装音ではありません。
- ゲーム原作・イラスト：STILLVEIL — 静謐の残響。イラスト・文章・プログラミング支援に生成AIを使用した作品。今回は既存素材を編集し、新規の動画生成モデルは使用していません。
- ゲーム資料の固定版：616a0747c4118a991770226d37347f34b31e2ec6。
- 神話資料は Sources.md と、Production-Inputs.zip内の artifacts/myth-lab/research/ を参照。日本神話は國學院大學の学術DBの要約、ギリシア・北欧は記載した翻訳／梗概／再話の範囲を参照。原典の内容とゲーム用の翻案を区別しています。

全ての新技能・リーダー効果・記憶石は未実装の企画案です。既存ゲームで使用できる効果の紹介ではなく、次期版の実装告知でもありません。図の数値・抽象模型は比較例であり、実機の勝率や最適性を示しません。
'''
 (D/'Credits.md').write_text(credits)
 description='''STILLVEILの次のスキルを、ずんだもんと四国めたんが本気で考える企画会議。
神話やキャラクターの物語を、倍率以外の遊び方へ翻案します。反論して、条件を直して、保留にするところまで。

【全案未実装】追加予定や性能を約束する動画ではありません。図の数字は仮定です。
ゲームはこちら（無料・ブラウザ）：https://fluffy3546.itch.io/stillveil

'''+ '\n'.join(chapters)+'\n\n'+credits.replace('# 制作・出典・利用素材','制作・出典・利用素材')
 (D/'YouTube-Description.txt').write_text(description)
 for p in pathlib.Path('/workspace/shared/myth-video').glob('*'):
  if p.is_file()and(p.suffix=='.md'or p.name.startswith('sources')or p.name.startswith('gauge-loop')):
   (OUT/'research').mkdir(exist_ok=True);shutil.copy2(p,OUT/'research'/p.name)
 (D/'Runtime.json').write_text(json.dumps({'python':subprocess.check_output(['python','--version'],text=True).strip(),'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0],'voicevox':'0.26.0','duration':clock,'chapters':len(timeline),'utterances':index-1,'gameCommit':data['sourceGameCommit'],'unimplemented':True},ensure_ascii=False,indent=2))
 print(json.dumps({'seconds':clock,'chapters':len(timeline),'utterances':index-1}))
if __name__=='__main__':finish()
