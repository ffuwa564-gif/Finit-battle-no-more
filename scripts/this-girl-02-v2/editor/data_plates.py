from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-v2';sys.path.insert(0,str(ROOT/'scripts/this-girl-02-v2/art'));import visuals as v
from PIL import ImageDraw
sha=v.sha
def render_scene(spec,path):
 p=ROOT/spec['evidence'];assert sha(p)==spec['evidenceSha256'];a=json.loads(p.read_text());assert a['passedDataValidation']and a['adoption']['passed'];cases={c['id']:c for c in a['cases']};c=cases[spec['caseId']];s=c['summaries'];n=a['seedCountPerCondition'];mode=spec['mode'];out=v.sheet(spec['title'],f'実測 · 確認用{n}シード / 改修前と隔離研究版');d=ImageDraw.Draw(out)
 def table(headers,rows):
  xs=[175,640,920,1190,1470]if len(headers)==5 else[175,740,1060,1400]
  for j,(x,t)in enumerate(zip(xs,headers)):v.text(d,(x,280),t,30,v.MUTED,True,width=(430 if len(headers)==5 and j==0 else 240 if len(headers)==5 else 530 if j==0 else 310),max_lines=1)
  step=min(140,330/max(1,len(rows)-1));size=40 if len(rows)<=3 else 34
  for i,row in enumerate(rows):
   y=375+i*step;d.line((165,y-20,1760,y-20),fill=v.EDGE,width=2)
   for j,(x,t)in enumerate(zip(xs,row)):v.text(d,(x,y),str(t),size,v.ROSE if i==0 else v.INK,True,width=(430 if len(headers)==5 and j==0 else 240 if len(headers)==5 else 530 if j==0 else 310),max_lines=1)
 if mode=='main':
  rows=[[label,f"{s[k]['wins']} / {n}",f"{s[k]['meanPotions']:.2f}",f"{s[k]['fourAliveWins']} / {n}"]for k,label in [('C','改修後'),('B','改修前')]];table(['同じ構成・同じ作戦','勝利','平均の薬','4人生還'],rows);note='塔10層 T6・編成1。平均Rは12.38→12.34でほぼ同じ。全体認定ではない。'
 elif mode=='ablation':
  rows=[[label,f"{s[k]['wins']} / {n}",f"{s[k]['meanPotions']:.2f}",f"{s[k]['fourAliveWins']} / {n}"]for k,label in [('C','改修後'),('E','他者の糸なし'),('X','同方針・改修なし')]];table(['同じ作戦の対照','勝利','平均の薬','4人生還'],rows);note='CとEの違いは他者の糸の利用。自分の糸・3倍変換・操作は維持。'
 elif mode=='example':
  r=json.load(open(O/'research/recording-selection.json'));rows=[[label,f"{r[k]['rounds']} R",f"{r[k]['pots']} 個",f"{r[k]['survivors']} 人"]for k,label in [('rowM','改修後'),('rowA','改修前')]];table(['映像の一戦','ラウンド','薬','生還'],rows);note='同じ出発シードの一例。1戦の結果を勝率の証明にはしません。'
 elif mode=='panel':
  rows=[]
  for label,stage,core in [('塔・編成1','ivory-tower-010','F1'),('塔・編成2','ivory-tower-010','F2'),('葛葉・編成1','kuzuha-awakening','F1'),('葛葉・編成2','kuzuha-awakening','F2')]:
   rows.append([label,*[f"{cases[f'{stage}-T{t}-{core}']['summaries']['C']['fourAliveWins']} / {cases[f'{stage}-T{t}-{core}']['summaries']['B']['fourAliveWins']}"for t in [3,4,6]]])
  table(['4人生還 C / B','T3','T4','T6'],rows);note='各セル512戦。改善も悪化も、同じ表に残します。全指標は研究資料へ。'
 elif mode=='negative':
  z=cases['ivory-tower-010-T6-F2']['summaries'];rows=[[label,f"{z[k]['wins']} / {n}",f"{z[k]['fourAliveWins']} / {n}",f"{z[k]['meanPotions']:.2f}"]for k,label in [('C','改修後の選抜'),('B','改修前の選抜')]];table(['塔10層 T6・編成2','勝利','4人生還','平均の薬'],rows);note='この選抜構成は推奨しません。局所改修の採用を、全編成の改善と呼ばない。'
 elif mode=='growth':
  rows=[[label,f"{s[k]['wins']} / {n}",f"{s[k]['meanPotions']:.2f}",f"{s[k]['fourAliveWins']} / {n}"]for k,label in [('G3','四人の石をT3へ'),('G4','四人の石をT4へ'),('C','四人の石をT6へ')]];table(['同じ操作・リーダー','勝利','平均の薬','4人生還'],rows);note='4石のpower/trait帯だけを変更。白灯石1個の効果や全石の最適性ではありません。'
 elif mode=='alternative':
  rows=[[label,f"{s[k]['wins']} / {n}",f"{s[k]['meanPotions']:.2f}",f"{s[k]['fourAliveWins']} / {n}"]for k,label in [('C','ミエット改修後'),('A','代替：弁財天')]];table(['有限探索の最良既知','勝利','平均の薬','4人生還'],rows);note='代替にも同じ探索予算。薬の差は残るため、最終盤の固有価値は未認定。'
 else:raise ValueError(mode)
 v.text(d,(175,795),note,30,v.MUTED,width=1540,max_lines=2);path=Path(path);out.convert('RGB').save(path);path.with_suffix('.png.json').write_text(json.dumps({'spec':spec,'sha256':sha(path),'evidenceSha256':sha(ROOT/spec['evidence']),'codeSha256':sha(__file__),'actualDataRows':rows,'scope':'Actual paired512-seed measurements; scoped adoption is not global endgame certification.'},ensure_ascii=False,indent=2));return path
