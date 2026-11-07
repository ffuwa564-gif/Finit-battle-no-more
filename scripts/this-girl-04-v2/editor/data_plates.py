from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04-v2';sys.path.insert(0,str(ROOT/'scripts/this-girl-04-v2/art'));import visuals as v
from PIL import ImageDraw
sha=v.sha
def render_scene(spec,path):
 p=ROOT/spec['evidence'];assert sha(p)==spec['evidenceSha256'];a=json.load(open(p));assert a['passedDataValidation']and a['adoption']['passed'];cases={c['id']:c for c in a['cases']};c=cases[spec['caseId']];s=c['summaries'];n=a['seedCountPerCondition'];mode=spec['mode'];im=v.sheet(spec['title'],f'実測 · 確認用{n}入力 / 同じ予算で比較');d=ImageDraw.Draw(im)
 def table(headers,rows):
  xs=[175,640,920,1190,1470]if len(headers)==5 else[175,740,1060,1400]
  for i,(x,t)in enumerate(zip(xs,headers)):v.text(d,(x,280),t,29,v.MUTED,True,width=430 if i==0 and len(headers)==5 else 240 if len(headers)==5 else 530 if i==0 else 310,max_lines=1)
  step=min(140,330/max(1,len(rows)-1));size=38 if len(rows)<=3 else 32
  for i,row in enumerate(rows):
   y=375+i*step;d.line((165,y-20,1760,y-20),fill=v.EDGE,width=2)
   for j,(x,t)in enumerate(zip(xs,row)):v.text(d,(x,y),str(t),size,v.ROSE if i==0 else v.INK,True,width=430 if j==0 and len(headers)==5 else 240 if len(headers)==5 else 530 if j==0 else 310,max_lines=1)
 def standard(keys):return[[label,f"{s[k]['wins']} / {n}",f"{s[k]['meanCappedRounds']:.2f}",f"{s[k]['meanPotions']:.2f}",f"{s[k]['fourAliveWins']} / {n}"]for k,label in keys]
 if mode=='main':rows=standard([('C','保護策あり'),('B','改修前の運用')]);table(['号令運用を再選抜','勝利','平均R','平均薬','4人生還'],rows);note='Bは号令を使う方針内の比較相手。制約なしの最強ノエルではありません。'
 elif mode=='ablation':rows=standard([('C','保護策あり'),('X','同構成・旧ルール'),('E','保護策だけ無効')]);table(['同じ石・同じ操作','勝利','平均R','平均薬','4人生還'],rows);note='EとXは全256行で一致。C-Xは保護策そのものの効果を含む比較。'
 elif mode=='opportunity':rows=standard([('C','保護策あり'),('N','号令なし再選抜'),('L','別リーダー再選抜')]);table(['残っている機会費用','勝利','平均R','平均薬','4人生還'],rows);note='N/Lは薬がさらに少ない。保護策の採用を、号令を使う利益の認定と呼ばない。'
 elif mode=='growth':rows=standard([('G3','四人の石をT3へ'),('G4','四人の石をT4へ'),('C','四人の石をT6へ')]);table(['同じ構成・同じ操作','勝利','平均R','平均薬','4人生還'],rows);note='全4石のpower/trait帯だけ変更。保護策の条件がTierで強化されるわけではない。'
 elif mode=='example':
  r=json.load(open(O/'research/recording-selection.json'));rows=[[label,f"{r[k]['rounds']} R",f"{r[k]['pots']} 個",f"{r[k]['survivors']} 人"]for k,label in [('rowM','保護策あり'),('rowA','改修前')]];table(['映像の一戦','ラウンド','薬','生還'],rows);note='改修後：見送り5・発令1・宛先変更0。改修前：発令1・宛先変更1。一戦の結果。'
 elif mode=='panel':
  rows=[]
  for label,stage,core in [('塔・編成1','ivory-tower-010','F1'),('塔・編成2','ivory-tower-010','F2'),('葛葉・編成1','kuzuha-awakening','F1'),('葛葉・編成2','kuzuha-awakening','F2')]:rows.append([label,*[f"{cases[f'{stage}-T{t}-{core}']['summaries']['C']['wins']} / {cases[f'{stage}-T{t}-{core}']['summaries']['B']['wins']}"for t in [3,4,6]]])
  table(['勝利数 C / B','T3','T4','T6'],rows);note='各セル256入力。塔の編成2は、改修後も全て敗北。全指標は資料に残す。'
 elif mode=='alternative':rows=standard([('C','ノエルの保護策'),('A','最良既知の代替')]);table(['有限の合法候補内','勝利','平均R','平均薬','4人生還'],rows);note='代替の合法空間は役割別。全キャラ・全石の最適解を証明したものではない。'
 else:raise ValueError(mode)
 v.text(d,(175,795),note,29,v.MUTED,width=1540,max_lines=2);path=Path(path);im.convert('RGB').save(path);path.with_suffix('.png.json').write_text(json.dumps({'spec':spec,'sha256':sha(path),'evidenceSha256':sha(p),'codeSha256':sha(__file__),'actualDataRows':rows,'scope':'Actual256 paired inputs. Conditional command-operation baseline; unrestricted N/L shown separately.'},ensure_ascii=False,indent=2));return path
