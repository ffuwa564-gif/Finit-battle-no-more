import csv,gzip,hashlib,json,pathlib,subprocess,sys
from render import OUT,ROOT,RENDER,CHARS,GEMS,TRAITS,duration
TARGET=OUT/'delivery';TARGET.mkdir(exist_ok=True)
proofs=[json.loads(p.read_text())for p in (OUT/'proofs').glob('*.json')]
order=[r['id']for r in json.loads((OUT/'search.json').read_text())if r.get('representative')];proofs.sort(key=lambda p:order.index(p['id']))
assert len(proofs)==19 and all(p['nativeVerified']for p in proofs)
with (TARGET/'Builds.csv').open('w',encoding='utf-8-sig',newline='')as f:
 writer=csv.writer(f,lineterminator="\n");writer.writerow(['番号','編成','別乱数の成功数','試行数','撮影seed（出発前）','撮影ラウンド数','生存数','薬使用数','編成順','キャラクターID','仲間名','リーダー','石ID','石名','変種','威力roll','基礎威力倍率','追加効果','追加効果roll','装備T'])
 for i,p in enumerate(proofs):
  for slot,cid in enumerate(p['config']['party']):
   g=p['config']['gems'][slot];writer.writerow([i+1,p['title'],p['holdoutWins'],p['holdoutCount'],p['seed'],p['rounds'],p['survivors'],p['potions'],slot+1,cid,CHARS[cid]['name'],'はい'if cid==p['config']['leader']else'',g['defId'],GEMS[g['defId']],g['variant'],g['roll']['power'],f"{1+g['roll']['power']*.015:.3f}x",TRAITS[g['roll']['trait']],g['roll']['value'],p['tier']])
summary=[]
for p in proofs:
 mechanism={}
 for e in p['events']:
  if not e:continue
  key=e.get('skillId','')
  if key.startswith('memory:'):key='memory:'+key.split(':')[1]
  elif e.get('statusAction'):key=e.get('ailment','')+':'+e['statusAction']
  elif e.get('ultimate'):key='ultimate:'+e.get('actorId','')
  elif key:key='skill:'+key
  else:continue
  mechanism[key]=mechanism.get(key,0)+1
 summary.append({k:p[k]for k in ['id','title','config','tier','seed','rounds','survivors','potions','holdoutWins','holdoutCount','nativeVerified']}|{'eventCounts':mechanism})
(TARGET/'Results.json').write_text(json.dumps({'sourceCommit':'616a0747c4118a991770226d37347f34b31e2ec6','dungeonId':'ivory-tower-001','searchSeeds':[1001,1012],'heldOutSeeds':[70001,70060],'note':'Fixed automated native-legal policy, prepared ownership and tier-range-end equipment. Representative win footage is selected; held-out count includes all losses. These are not population win probabilities or equipment-acquisition runs. Builds overlap in supports and equipment. No optimality claim.','builds':summary},ensure_ascii=False,indent=2))
with gzip.open(TARGET/'Native-Proofs.json.gz','wt',encoding='utf-8',compresslevel=9)as f:json.dump(proofs,f,ensure_ascii=False,separators=(',',':'))
manifest=OUT/'narration.json'
if manifest.exists()and all((RENDER/(ident+'.mp4')).exists()for ident in ['intro',*order,'outro']):
 data=json.loads(manifest.read_text());srt=[];chapters=[];timeline=[];clock=0;index=1
 def stamp(t):
  ms=round(t*1000);s,ms=divmod(ms,1000);m,s=divmod(s,60);h,m=divmod(m,60);return f'{h:02}:{m:02}:{s:02},{ms:03}'
 for chapter in data['chapters']:
  chapters.append(f'{int(clock//60):02}:{int(clock%60):02} {chapter["title"]}')
  for line in chapter['lines']:
   start=clock+line['start']-chapter['start'];end=clock+line['end']-chapter['start'];name='ずんだもん'if line['speaker']=='z'else'四国めたん'
   srt.append(f'{index}\n{stamp(start)} --> {stamp(end)}\n{name}：{line["text"]}\n');index+=1
  actual=duration(RENDER/(chapter['id']+'.mp4'));timeline.append({'id':chapter['id'],'title':chapter['title'],'start':clock,'duration':actual});clock+=actual
 (TARGET/'Subtitles-ja.srt').write_text('\n'.join(srt));(TARGET/'Chapters.txt').write_text('\n'.join(chapters)+'\n');(TARGET/'Timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
print('Delivery records',len(proofs),'builds',flush=True)
