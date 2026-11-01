"""Delivery transcript and SRT follow actual encoded chapter durations."""
import json,pathlib,shutil,subprocess
from render import ROOT,OUT,RENDER,duration
D=OUT/'delivery';D.mkdir(exist_ok=True)
def stamp(t):
 ms=round(t*1000);s,ms=divmod(ms,1000);m,s=divmod(s,60);h,m=divmod(m,60);return f'{h:02}:{m:02}:{s:02},{ms:03}'
def finish():
 data=json.loads((OUT/'narration.json').read_text());assert len(data['chapters'])==14
 clock=0;index=1;srt=[];chapters=[];timeline=[];text=['# 名将と低レア軍：対象選択を乗っ取る指揮システム会議','','全案未実装。架空の配分模型は、実機の戦闘勝率や現行AIの再現ではありません。','']
 for ch in data['chapters']:
  actual=duration(RENDER/(ch['id']+'.mp4'));assert abs(actual-ch['duration'])<.15
  chapters.append(f'{int(clock//60):02}:{int(clock%60):02} {ch["title"]}')
  text+=['',f'## {ch["title"]}','',('出典ID: '+', '.join(ch.get('source_ids',[]))).rstrip(),'']
  for line in ch['lines']:
   start=clock+line['start']-ch['start'];end=clock+line['end']-ch['start'];name='ずんだもん'if line['speaker']=='z'else'四国めたん'
   srt.append(f'{index}\n{stamp(start)} --> {stamp(end)}\n{name}：{line["text"]}\n');index+=1;text.append(f'**{name}**　{line["text"]}\n')
  timeline.append({'id':ch['id'],'title':ch['title'],'start':round(clock,4),'duration':actual});clock+=actual
 (D/'Subtitles-ja.srt').write_text('\n'.join(srt));(D/'Script.md').write_text('\n'.join(text).rstrip()+'\n');(D/'Chapters.txt').write_text('\n'.join(chapters)+'\n');(D/'Timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
 credits='''# 制作・クレジット

- 音声：VOICEVOX:ずんだもん（ノーマル3）、VOICEVOX:四国めたん（ノーマル2／ツンツン6）。エンジン0.26.0。
- VOICEVOX利用規約：https://voicevox.hiroshiba.jp/term/
- 立ち絵：東北ずん子・ずんだもんプロジェクト公式素材。https://zunko.jp/sozai/zundamon/zunmon003.png ／ https://zunko.jp/sozai/methane/met012.png
- キャラクター規約：https://zunko.jp/guideline.html ／ 音源規約：https://zunko.jp/con_ongen_kiyaku.html
- 音楽：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」。https://amachamusic.chagasi.com/music_fjordnosundakaze.html
- 効果音：STILLVEILのUI選択・防御音を前作の実アプリ収録から抽出し、説明画面の切替に小さく使用。新技能の実装音ではありません。
- 原作とゲーム画像：STILLVEIL — 静謐の残響。ゲームはイラスト・文章・プログラミング支援に生成AIを使用。今回の動画は既存素材と自作図解を編集したもので、新しい生成動画モデルは使用していません。
- 外部資料は Sources.md。BAR・Zero-Kの公式資料、UK MODの教範、戦争論の指定英訳を日本語で要約。資料全文・図版は再配布しません。
- 調査・批評は Production-Inputs.zip 内の artifacts/command-lab/research/。

全案未実装。研究動画であり、実装・追加時期・最終性能を告知するものではありません。R40／SSR55等は架空の単体出力で、実在キャラクターの攻撃力ではありません。A／B／Cの意図は外から与える模型で、現行通常攻撃AIを再現せず、敵一体の停止を戦闘勝率へ一般化しません。
'''
 (D/'Credits.md').write_text(credits)
 desc='''名将と低レア軍は、強者の集団を破れるか？
ずんだもんと四国めたんが、味方の選んだ攻撃対象を指揮官が上書きするシステムを研究。
レア別のランダム服従と、見える指揮枠を比較。弱軍だけ賢くせず、高レア軍にも同じ権限を与え、逆転とその限界を検討します。

【全案未実装】モデルは実機の戦闘・勝率・既存AIの再現ではありません。数値は仮定です。
ゲームはこちら：https://fluffy3546.itch.io/stillveil

'''+ '\n'.join(chapters)+'\n\n'+credits
 (D/'YouTube-Description.txt').write_text(desc)
 (D/'Runtime.json').write_text(json.dumps({'python':subprocess.check_output(['python','--version'],text=True).strip(),'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0],'voicevox':'0.26.0','cpu':4,'memoryGiB':16,'sourceGameCommit':data['sourceGameCommit'],'duration':clock,'chapters':len(timeline),'utterances':index-1,'newSystemImplemented':False},ensure_ascii=False,indent=2))
 for p in pathlib.Path('/workspace/shared/command-video').glob('*'):
  if p.is_file():shutil.copy2(p,OUT/'research'/p.name)
 print('Delivery:',clock,'seconds',index-1,'utterances')
if __name__=='__main__':finish()
