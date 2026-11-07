"""Short tables derived directly from the frozen native analysis, never hand-entered rates."""
from pathlib import Path
import hashlib,json,sys,gzip
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01'
sys.path.insert(0,str(ROOT/'scripts/this-girl-01/art'));import visuals as v
from PIL import Image,ImageDraw
def sha(p):return v.sha(p)
def render_scene(spec,path):
 evidence=ROOT/spec['evidence'];assert sha(evidence)==spec['evidenceSha256']
 raw=evidence.read_bytes();analysis=json.loads(gzip.decompress(raw)if evidence.suffix=='.gz'else raw);comparisons={c['id']:c for c in analysis.get('comparisons',[])}
 out=v.sheet(spec['title'],spec.get('section','確認用256シード・観測値'));draw=ImageDraw.Draw(out)
 if spec['mode']=='packages':
  prefix=spec['caseId'];old=comparisons[prefix+':C-B'];control=comparisons[prefix+':C-E']
  rows=[('現行 B',old['rightSummary']),('研究版 C',old['leftSummary']),('追加分なし E',control['rightSummary'])]
  xs=[175,660,920,1190,1480];headers=['構成','勝利','ラウンド','薬','全員生還']
  for x,label in zip(xs,headers):v.text(draw,(x,285),label,35,v.MUTED,True)
  for i,(name,row)in enumerate(rows):
   y=375+i*125;draw.line((165,y-22,1750,y-22),fill=v.EDGE,width=2)
   values=[name,f"{row['wins']}/{row['n']}",f"{row['meanCappedRounds']:.2f}",f"{row['meanPotions']:.2f}",f"{row['allSurviveWins']}/{row['n']}"]
   for x,value in zip(xs,values):v.text(draw,(x,y),value,42,v.ROSE if i==1 else v.INK,bold=i==1,width=440 if x==175 else 245,max_lines=1)
  note='BとCは装備・操作を再探索。EはCの花びら追加分だけ0。'
 elif spec['mode']=='panel':
  xs=[175,710,1080,1450]
  for x,label in zip(xs,['勝利数：サクヤ / 最良既知','Tier 3','Tier 4','Tier 6']):v.text(draw,(x,280),label,32,v.MUTED,True,width=520 if x==175 else 300,max_lines=1)
  rows=[('塔・アテナ組','ivory-tower-010','F1'),('塔・リオラ組','ivory-tower-010','F4'),('葛葉・アテナ組','kuzuha-awakening','F1'),('葛葉・リオラ組','kuzuha-awakening','F4')]
  for i,(label,stage,core)in enumerate(rows):
   y=365+i*95;draw.line((165,y-17,1750,y-17),fill=v.EDGE,width=2);v.text(draw,(175,y),label,41,v.INK,True)
   for x,tier in zip(xs[1:],[3,4,6]):
    row=comparisons[f'{stage}-T{tier}-{core}:C-A'];a,b=row['leftSummary'],row['rightSummary'];assert a['n']==b['n']==256
    v.text(draw,(x,y),f"{a['wins']} / {b['wins']}",43,v.ROSE if a['wins']<b['wins']else v.INK,True,width=300,max_lines=1)
  note='各条件256シード。塔は第10層、葛葉は覚醒級。全所持の仮定。'
 elif spec['mode']=='example':
  xs=[185,780,1130,1470]
  for x,label in zip(xs,['この映像の編成','合計ラウンド','薬','生還']):v.text(draw,(x,290),label,37,v.MUTED,True)
  for i,(arm,label)in enumerate([('A','弁財天入り'),('C','サクヤ入り')]):
   row=next(r for r in analysis['arms'][arm]['rows']if r['seed']==spec['logicalSeed']);assert row['win']
   y=425+i*175;draw.line((175,y-30,1740,y-30),fill=v.EDGE,width=2)
   for x,value in zip(xs,[label,str(row['rounds'])+' R',str(row['potionsUsed'])+' 個',str(row['survivors'])+' 人']):v.text(draw,(x,y),value,52,v.ROSE if i else v.INK,True)
  note='同じ出発シードの一例。この1戦を含む確認用256シード全体を、次に示します。'
 else:raise ValueError(spec['mode'])
 v.text(draw,(175,790),spec.get('note',note),30,v.MUTED,width=1550,max_lines=2)
 path=Path(path);out.convert('RGB').save(path)
 record={'spec':spec,'codeSha256':sha(__file__),'visualCodeSha256':sha(v.__file__),'evidenceSha256':sha(evidence),'sha256':sha(path),'dataPolicy':'Cells are computed from identified native-analysis comparisons; no rates are supplied by the editorial plan.'}
 path.with_suffix('.png.json').write_text(json.dumps(record,ensure_ascii=False,indent=2));return path

def render_flow(config,path,game,static=False):
 """One source-bound same-mark example, shown only after its actual payout."""
 evidence=ROOT/config['evidence'];assert sha(evidence)==config['evidenceSha256']
 data=json.loads(evidence.read_text());assert data['passed']and data['sourceSha256']==sha(ROOT/game['file'])
 trace=data['selectedBossTrace'];assert trace and trace['returnActualHpDamage']>0
 assert trace['incomingSourceFrame']<=trace['captureSourceFrame']<=trace['outgoingSourceFrame']<=trace['consumeSourceFrame']
 fmt=lambda n:f'{float(n):.1f}'.rstrip('0').rstrip('.')
 out=Image.new('RGBA',(1920,1080),(0,0,0,0));draw=ImageDraw.Draw(out)
 draw.rounded_rectangle((675,260,1825,745),18,fill=v.PAPER)
 v.text(draw,(705,275),'同じ印の、一例。',37,v.INK,True)
 values=[('実際の吸収',fmt(trace['absorbedActual'])+' HP'),('蓄えの前 → 後',fmt(trace['reserveBeforePercent'])+' → '+fmt(trace['reserveAfterPercent'])+' %'),('実際の返礼',fmt(trace['returnActualHpDamage'])+' HP')]
 for i,(label,value)in enumerate(values):
  x=705+i*365;draw.rounded_rectangle((x,365,x+315,640),16,fill='#fffdf8',outline=v.EDGE,width=2)
  v.text(draw,(x+22,390),label,29,v.MUTED,True,width=275,max_lines=1)
  v.text(draw,(x+22,485),value,42 if i==1 else 47,v.ROSE,True,width=275,max_lines=1)
  if i<2:v.arrow(draw,(x+325,500),(x+355,500))
 v.text(draw,(705,670),'蓄えは百分率。返礼HPは、画面の合計ダメージに含みます。',26,v.MUTED,width=1080,max_lines=1)
 v.text(draw,(705,709),'表示は小数1桁まで。',22,v.MUTED,width=1080,max_lines=1)
 path=Path(path);out.save(path)
 path.with_suffix('.png.json').write_text(json.dumps({'evidenceSha256':sha(evidence),'codeSha256':sha(__file__),'sourceSha256':data['sourceSha256'],'selectedBossTrace':trace,'sha256':sha(path)},ensure_ascii=False,indent=2))
 if static:return {'evidenceSha256':sha(evidence),'trace':trace}
 start=trace['outgoingSourceFrame']-game['sourceStartFrame']+6
 end=min(game['sourceEndFrame']-game['sourceStartFrame']-14,start+240)
 assert start>=14 and end-start>=180,'Choose a source interval that leaves six seconds to read the actual payout'
 return {'startFrame':start,'endFrame':end,'evidenceSha256':sha(evidence),'trace':trace}

def render_mechanism_note(spec,path):
 """A six-second diagram after the original shot, not a replay or frozen game."""
 path=Path(path);glyph=path.with_name(path.stem+'-flow.png')
 binding=render_flow(spec,glyph,{'file':spec['sourceFile']},static=True)
 trace=binding['trace'];assert trace['returnDamageIncludedInDisplayedTotal']is True
 note=f"直前の主攻撃：画面合計{trace['displayedTotalDamage']}ダメージ。トドメではありません。"
 out=v.scene({'kind':'battle','title':spec['title'],'section':'直前の実例を図解 · 同じ印の流れ','body':[],'note':note,'unreleased':True})
 v.character(out,'mireille',v.GAME,36);out.alpha_composite(Image.open(glyph).convert('RGBA'))
 out.convert('RGB').save(path)
 path.with_suffix('.png.json').write_text(json.dumps({'spec':spec,'codeSha256':sha(__file__),'visualCodeSha256':sha(v.__file__),'evidenceSha256':binding['evidenceSha256'],'trace':trace,'sha256':sha(path),'scope':'A static illustration after the original excerpt; not reenacted or time-warped battle footage.'},ensure_ascii=False,indent=2));return path
