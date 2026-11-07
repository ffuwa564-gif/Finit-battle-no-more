from pathlib import Path
import json,hashlib,sys,gzip
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04';sys.path.insert(0,str(ROOT/'scripts/this-girl-04/art'));import visuals as v
from PIL import ImageDraw
sha=v.sha
def render_scene(spec,path):
 p=ROOT/spec['evidence'];assert sha(p)==spec['evidenceSha256'];a=json.loads(p.read_text());assert a['passedDataValidation'];cases={c['id']:c for c in a['cases']};c=cases[spec['caseId']];s=c['summaries'];mode=spec['mode'];out=v.sheet(spec['title'],'実測 · 確認用256シード / 公開版1.12');d=ImageDraw.Draw(out)
 def table(headers,rows):
  xs=[175,640,920,1190,1470]if len(headers)==5 else[175,740,1060,1400]
  for i,(x,t)in enumerate(zip(xs,headers)):v.text(d,(x,280),t,30,v.MUTED,True,width=(430 if len(headers)==5 and i==0 else 240 if len(headers)==5 else 530 if i==0 else 310),max_lines=1)
  step=min(140,330/max(1,len(rows)-1));size=40 if len(rows)<=3 else 34
  for i,row in enumerate(rows):
   y=375+i*step;d.line((165,y-20,1760,y-20),fill=v.EDGE,width=2)
   for j,(x,t)in enumerate(zip(xs,row)):v.text(d,(x,y),str(t),size,v.ROSE if i==0 else v.INK,True,width=(430 if len(headers)==5 and j==0 else 240 if len(headers)==5 else 530 if j==0 else 310),max_lines=1)
 if mode=='main':
  rows=[[label,f"{s[k]['wins']} / 256",f"{s[k]['meanCappedRounds']:.2f}",f"{s[k]['meanPotions']:.2f}",f"{s[k]['fourAliveWins']} / 256"]for k,label in [('M','号令あり'),('E','同じ方針・号令なし')]];table(['同じ四人','勝利','平均R','平均の薬','4人生還'],rows);note='葛葉覚醒級 T6・編成2。全勝だけで採用価値を認定しない。'
 elif mode=='counts':
  rows=[[label,f"{s[k]['meanIssued']:.2f}",f"{s[k]['meanApplied']:.2f}",f"{s[k]['meanRedirects']:.2f}"]for k,label in [('M','条件つき号令'),('W','使える時は毎回')]];table(['平均 / 1戦','号令の回数','適用行動','宛先の変更'],rows);note='適用されても、元と同じ宛先なら変更0。追加攻撃数ではありません。'
 elif mode=='alternatives':
  rows=[[label,f"{s[k]['wins']} / 256",f"{s[k]['meanCappedRounds']:.2f}",f"{s[k]['meanPotions']:.2f}"]for k,label in [('E','固定方針・号令なし'),('N','号令なしを再選抜'),('L','別リーダーを選抜'),('A','差替え：アストライア')]];table(['条件つき比較','勝利','平均R','平均の薬'],rows);note='役割に応じた有限探索。全キャラ・全装備の大域最適ではありません。'
 elif mode=='panel':
  rows=[]
  for label,stage,core in [('塔・編成1','ivory-tower-010','F1'),('塔・編成2','ivory-tower-010','F2'),('葛葉・編成1','kuzuha-awakening','F1'),('葛葉・編成2','kuzuha-awakening','F2')]:
   rows.append([label,*[f"{cases[f'{stage}-T{t}-{core}']['summaries']['M']['wins']} / {cases[f'{stage}-T{t}-{core}']['summaries']['E']['wins']}"for t in [3,4,6]]])
  table(['号令あり / 固定対照','T3','T4','T6'],rows);note='各セル256シード。同じ256入力を共有した対応比較。'
 elif mode=='growth':
  rows=[]
  for t in [3,4,6]:
   ss=cases[f'kuzuha-awakening-T{t}-F2']['summaries']['M'];rows.append([f'Tier {t}',f"{ss['wins']} / 256",f"{ss['meanPotions']:.2f}",f"{ss['fourAliveWins']} / 256"])
  table(['装備・作戦の組合せ','勝利','平均の薬','4人生還'],rows);note='各Tierで石と操作を再選抜。Tierだけの因果効果ではありません。'
 elif mode=='example':
  r=json.loads((O/'research/recording-selection.json').read_text());rows=[[label,f"{r[k]['rounds']} R",f"{r[k]['pots']} 個",f"{r[k]['survivors']} 人"]for k,label in [('rowM','号令あり'),('rowA','同じ方針・号令なし')]];table(['映像の一戦','ラウンド','薬','生還'],rows);note='号令7回、実際の宛先変更1回。1戦だけで勝率や最終盤の価値を証明しない。'
 elif mode=='stones':
  raw=json.loads(gzip.decompress((O/'research/stone-extension.json.gz').read_bytes()));z=next(x for x in raw['results']if x['id']=='kuzuha-awakening-T6-F2');ss={k:{'wins':sum(r['win']for r in v['rows']),'meanIssued':sum(r['issued']for r in v['rows'])/len(v['rows']),'meanRedirects':sum(r['redirects']for r in v['rows'])/len(v['rows'])}for k,v in z['arms'].items()};rows=[[label,f"{ss[k]['wins']} / 256",f"{ss[k]['meanIssued']:.2f}",f"{ss[k]['meanRedirects']:.2f}"]for k,label in [('M','石あり・号令あり'),('H','二人の石なし・号令あり'),('HE','二人の石なし・号令なし')]];table(['追加検証 / 別の256入力','勝利','号令回数','宛先の変更'],rows);note='主結果を見てから新しい条件を先に凍結。石を外す推奨ではありません。'
 else:raise ValueError(mode)
 v.text(d,(175,795),note,30,v.MUTED,width=1540,max_lines=2);path=Path(path);out.convert('RGB').save(path);path.with_suffix('.png.json').write_text(json.dumps({'spec':spec,'sha256':sha(path),'evidenceSha256':sha(ROOT/spec['evidence']),'codeSha256':sha(__file__),'actualDataRows':rows,'scope':'Actual finite native-engine measurements; no global-optimality or certification claim.'},ensure_ascii=False,indent=2));return path
