from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-05';sys.path.insert(0,str(ROOT/'scripts/this-girl-05/art'));import visuals as v
from PIL import ImageDraw
sha=v.sha
def render_scene(spec,path):
 p=ROOT/spec['evidence'];assert sha(p)==spec['evidenceSha256'];a=json.load(open(p));assert a['passedDataValidation'] and a['adoption']['passed'];cases={c['id']:c for c in a['cases']};c=cases[spec['caseId']];s=c['summaries'];n=a['nPerCondition'];mode=spec['mode'];im=v.sheet(spec['title'],f'実測 · {n}入力 / 同じ予算 / 失敗は120R換算');d=ImageDraw.Draw(im)
 def table(headers,rows):
  xs=[175,640,920,1190,1470]if len(headers)==5 else[175,740,1060,1400]
  for i,(x,t)in enumerate(zip(xs,headers)):v.text(d,(x,280),t,29,v.MUTED,True,width=430 if i==0 else 240,max_lines=1)
  step=min(140,330/max(1,len(rows)-1));size=38 if len(rows)<=3 else 30
  for i,row in enumerate(rows):
   y=375+i*step;d.line((165,y-20,1760,y-20),fill=v.EDGE,width=2)
   for j,(x,t)in enumerate(zip(xs,row)):v.text(d,(x,y),str(t),size,v.ROSE if i==0 else v.INK,True,width=430 if j==0 else 240,max_lines=1)
 def standard(keys):return[[label,f"{s[k]['wins']} / {n}",f"{s[k]['meanCappedRounds']:.2f}",f"{s[k]['meanPotions']:.2f}",f"{s[k]['fourAliveWins']} / {n}"]for k,label in keys]
 if mode=='main':table(['主条件・塔4T4F1','勝利','平均R','平均薬','4人生還'],standard([('C','返し刃あり'),('B','改修前') ]));note='速度の差 -0.3477R、Holm144補正p=.01440。薬・生還は別に認定しない。'
 elif mode=='ablation':table(['同じ構成・操作','勝利','平均R','平均薬','4人生還'],standard([('C','返し刃あり'),('X','返し刃を無効'),('E','機構なし対照')]));note='主条件は独立選抜B/Cが同構成。X/Eも全256行でBと一致。'
 elif mode=='opportunity':table(['同じ3人コアへ差替','勝利','平均R','平均薬','4人生還'],standard([('C','リゼット'),('A','アストライア'),('L','本人リーダー')]));note='Aは有限探索の代替。主Cはアテナリーダー。速さ・薬・生還を混ぜて順位付けしない。'
 elif mode=='growth':table(['T6の固定構成から','勝利','平均R','平均薬','4人生還'],standard([('G3','四人の石をT3へ'),('G4','四人の石をT4へ'),('C','四人の石をT6へ')]));note='塔4T6F1の凍結構成。全4石のpower/trait帯を変更。主証人T4とは別の固定比較。'
 elif mode=='example':
  r=json.load(open(O/'research/recording-selection.json'));rows=[[label,f"{r[k]['rounds']} R",f"{r[k]['pots']} 個",f"{r[k]['survivors']} 人"]for k,label in [('rowM','返し刃あり'),('rowA','改修前')]];table(['映像の一戦','ラウンド','薬','生還'],rows);note='同じ入力1000001。Cは斬撃2回・実HP損失73。一戦の同点を隠さず、平均と区別。'
 elif mode=='panel':
  rows=[]
  for label,stage,F in [('塔4・編成1','ivory-tower-004','F1'),('塔4・編成2','ivory-tower-004','F2'),('塔10・編成1','ivory-tower-010','F1'),('塔10・編成2','ivory-tower-010','F2'),('葛葉・編成1','kuzuha-awakening','F1'),('葛葉・編成2','kuzuha-awakening','F2')]:rows.append([label,*[f"{cases[f'{stage}-T{t}-{F}']['summaries']['C']['wins']} / {cases[f'{stage}-T{t}-{F}']['summaries']['B']['wins']}"for t in [3,4,6]]])
  table(['全18条件：勝利 C/B','T3','T4','T6'],rows);note='各256入力。悪化・不発も残す。全指標と対応差は研究資料に保存。'
 elif mode=='no-gems':table(['主構成の装備対照','勝利','平均R','平均薬','4人生還'],standard([('C','T4石を四人へ'),('K0','石をすべて外す')]));note='全石を外す別対照。返し刃だけで十分な強さとは言えない。'
 else:raise ValueError(mode)
 v.text(d,(175,785),note,27,v.MUTED,width=1550,max_lines=2);im.convert('RGB').save(path)
def render_flow(spec,path,game):raise ValueError('No fabricated overlay flow; use actual freezes.')
