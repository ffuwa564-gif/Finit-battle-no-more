from pathlib import Path
import json,hashlib,sys
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04';sys.path.insert(0,str(ROOT/'scripts/this-girl-04/art'));import visuals as v
from PIL import ImageDraw
sha=v.sha
def render_scene(spec,path):
 p=ROOT/spec['evidence'];assert sha(p)==spec['evidenceSha256'];a=json.loads(p.read_text());assert a['passedDataValidation'];cases={c['id']:c for c in a['cases']};c=cases[spec['caseId']];s=c['summaries'];mode=spec['mode'];out=v.sheet(spec['title'],'実測 · 確認用256シード / 公開版能力');d=ImageDraw.Draw(out)
 def table(headers,rows,xs=None):
  xs=xs or ([175,640,920,1190,1470]if len(headers)==5 else[175,740,1060,1400])
  for x,t in zip(xs,headers):v.text(d,(x,280),t,32,v.MUTED,True,width=(430 if len(headers)==5 and x==175 else 240 if len(headers)==5 else 530 if x==175 else 310),max_lines=1)
  step=min(140,330/max(1,len(rows)-1));size=43 if len(rows)<=3 else 35
  for i,row in enumerate(rows):
   y=375+i*step;d.line((165,y-20,1760,y-20),fill=v.EDGE,width=2)
   for j,(x,t)in enumerate(zip(xs,row)):v.text(d,(x,y),str(t),size,v.ROSE if i==0 else v.INK,True,width=(430 if len(headers)==5 and j==0 else 240 if len(headers)==5 else 530 if j==0 else 310),max_lines=1)
 if mode in ['main','frugal','ablation']:
  arms={'main':[('M','ティッカ'),('A','アストライア')],'frugal':[('MF','ティッカ・節約'),('AF','アストライア・節約')],'ablation':[('M','ティッカ'),('E','同じ編成・封印なし')]}[mode]
  rows=[[label,f"{s[arm]['wins']} / 256",f"{s[arm]['meanPotions']:.2f}",f"{s[arm]['fourAliveWins']} / 256"]for arm,label in arms]
  
  if mode=='main':
   rows=[[label,f"{s[arm]['wins']} / 256",f"{s[arm]['meanCappedRounds']:.2f}",f"{s[arm]['meanPotions']:.2f}",f"{s[arm]['fourAliveWins']} / 256"]for arm,label in arms];table(['編成','勝利','平均R','平均の薬','4人生還'],rows)
  elif mode=='ablation':
   rows=[[label,f"{s[arm]['wins']} / 256",f"{s[arm]['meanPotions']:.2f}",f"{s[arm]['fourAliveWins']} / 256"]for arm,label in [('E','ティッカ・封印なし'),('M','ティッカ'),('A','アストライア')]];table(['編成2 / 固定方針','勝利','平均の薬','4人生還'],rows)
  else:table(['編成','勝利','平均の薬','4人生還'],rows)
  note={'main':'塔10層 T6・編成1。勝利数の差を、優越性の証明にはしません。','frugal':'節約候補も、確認用乱数を見る前に選定。勝利以外の差も比較。','ablation':'研究用対照は封印と故障診断の連鎖を除去。追加8だけを測った実験ではありません。'}[mode]
 elif mode=='panel':
  rows=[]
  for label,stage,core in [('塔・編成1','ivory-tower-010','F1'),('塔・編成2','ivory-tower-010','F2'),('ルネット・編成1','lunette-awakening','F1'),('ルネット・編成2','lunette-awakening','F2')]:
   row=[label]
   for tier in [3,4,6]:
    ss=cases[f'{stage}-T{tier}-{core}']['summaries'];row.append(f"{ss['M']['wins']} / {ss['A']['wins']}")
   rows.append(row)
  table(['ティッカ / 最良既知','T3','T4','T6'],rows);note='各セル256シード。塔10層とルネット覚醒級。同じ条件のTと最良既知の比較。'
 elif mode=='growth':
  rows=[]
  for tier in [3,4,6]:
   ss=cases[f'ivory-tower-010-T{tier}-F1']['summaries']['M'];rows.append([f'Tier {tier}',f"{ss['wins']} / 256",f"{ss['meanPotions']:.2f}",f"{ss['fourAliveWins']} / 256"])
  table(['石と操作の組合せ','勝利','平均の薬','4人生還'],rows);note='Tierごとに装備・リーダー・操作を再探索。石だけを変えた因果比較ではありません。'
 elif mode=='example':
  p=O/'research/recording-selection.json';r=json.loads(p.read_text());rows=[]
  for key,label in [('rowA','アストライア'),('rowM','ティッカ')]:
   z=r[key];rows.append([label,f"{z['rounds']} R",f"{z['pots']} 個",f"{z['survivors']} 人"])
  table(['映像の一戦','ラウンド','薬','生還'],rows);note='同じ出発シードの実例。次は、1戦ではなく確認用256シードを見ます。'
 else:raise ValueError(mode)
 v.text(d,(175,795),note,30,v.MUTED,width=1540,max_lines=2);path=Path(path);out.convert('RGB').save(path)
 path.with_suffix('.png.json').write_text(json.dumps({'spec':spec,'sha256':sha(path),'evidenceSha256':sha(ROOT/spec['evidence']),'codeSha256':sha(__file__),'actualDataRows':rows,'scope':'Computed directly from frozen native-engine results. Finite observed search; no global-optimality or certification implied.'},ensure_ascii=False,indent=2));return path
