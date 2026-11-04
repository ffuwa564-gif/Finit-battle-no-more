from pathlib import Path
import json,hashlib,subprocess,sys
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';R=O/'rerecord';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();old=json.loads((R/'reference/editorial.json').read_text());e={**old,'pages':[]};M=json.loads((O/'research/mechanism-sakuya-full.json').read_text());trace=M['selectedBossTrace'];n=json.loads((O/'narration.json').read_text());lines={l['lineId']:l for c in n['chapters']for l in c['lines']};box=[40,28,576,1024]
def src(ident):return O/'capture'/(ident+'-full.mov')
def freeze(ident,f):return{'file':str(src(ident).relative_to(ROOT)),'sourceFrame':f,'sha256':sha(src(ident))}
def pause(id,title,ident,f,refs,focus,inset,explain):
 return{'id':id,'spec':{'kind':'battle-pause','title':title,'pauseId':id,'freeze':freeze(ident,f),'focus':focus,'inset':inset,'explain':explain},'lines':refs,'leadSeconds':.25,'tailSeconds':.5}
def cut(p,ident,a,b,refs):
 proof=O/'research'/('native-buffer-qa-reference-full.json' if ident=='reference' else 'native-buffer-raw-sakuya-full.json');data=json.loads(proof.read_text());assert data['passed'],'Fresh full-motion source audio must pass before editing'
 p={**p};p['lines']=refs;p.pop('flow',None);p.pop('allowVoiceCarry',None);p.pop('carryIntoPageId',None);p['durationFrames']=b-a;p['leadSeconds']=.25;p['tailSeconds']=.15
 p['spec']={**p['spec'],'note':'実戦の抜粋 · ゲーム設定×1 · 途中を省略','section':'ver1.12 描画版 · 塔第10層 T6/F1','unreleased':True}
 p['gameCut']={'file':str(src(ident).relative_to(ROOT)),'sourceStartFrame':a,'sourceEndFrame':b,'sourceApplicationSpeed':1,'audioSourceOffsetSamples':0,'audioCalibrationEvidence':{'file':str(proof.relative_to(ROOT)),'sha256':sha(proof)}}
 local=8
 for ref in refs:
  r={'lineId':ref}if isinstance(ref,str)else ref;local=max(local,r.get('offsetFrames',local)+round(lines[r['lineId']]['duration']*30)+6)
 assert local<=b-a+8,(p['id'],local,b-a)
 return p
for p in old['pages']:
 id=p['id']
 if id=='battle-reference':
  e['pages'].append({'id':'recapture-note','spec':{'kind':'summary','title':'実戦を、もう一度。','body':['ver1.12の描画最適化を取り込んで再収録。','実戦は等速。大切な所で止めて見ます。','研究データと結論は、前回の記録を継承。']},'lines':['recapture-00','recapture-01']})
  m=json.loads((O/'capture/reference-full.json').read_text());wave=next(x['sourceFrame']for x in m['battleEvents']if x['wave']==1);a=wave+120;b=a+750
  e['pages'].append(cut(p,'reference',a,b,p['lines']));e['pages'].append(pause('pause-reference','見るのは、回復役と薬。','reference',b-1,['recapture-02','recapture-03'],[[338,459,100,130],[275,600,60,110]],[338,459,100,130],['右端が、差替え枠。','生還と薬も見る。']))
 elif id=='battle-sakuya':
  a=trace['grantSourceFrame']-125;b=trace['captureSourceFrame']+13
  e['pages'].append(pause('pause-target','この味方を、追います。','sakuya',a,['recapture-04'],[[226,459,106,130]],[226,459,106,130],['左から三人目。','守られる側です。']))
  e['pages'].append(cut(p,'sakuya',a,b,[]));e['pages'].append(pause('pause-absorb','張っただけでは、増えない。','sakuya',b-1,['battle-sakuya-01','recapture-05','recapture-06','recapture-07'],[[226,459,106,130]],[226,459,106,130],['実際の吸収：70','花びら：0 → 82%','防いだ分を、蓄える。']))
 elif id=='battle-sakuya-return':
  # Readable floating-number frame, reviewed against the actual new recording.
  payout=trace['outgoingSourceFrame']+18;a=payout-264;b=payout+1
  e['pages'].append(cut(p,'sakuya',a,b,[]));e['pages'].append(pause('pause-payout','この数字は、合計です。','sakuya',payout,['battle-sakuya-02','recapture-08','recapture-09'],[[65,80,330,260]],[65,80,330,260],['主攻撃：793','返礼：650','合計：1,443']))
 elif id=='mechanism-note':
  p={**p,'spec':{**p['spec'],'evidence':'artifacts/this-girl-01/research/mechanism-sakuya-full.json','evidenceSha256':sha(O/'research/mechanism-sakuya-full.json'),'sourceFile':'artifacts/this-girl-01/capture/sakuya-full.mov'},'lines':['recapture-10']};p.pop('durationFrames',None);e['pages'].append(p)
 elif id=='battle-sakuya-finish':
  m=json.loads((O/'capture/sakuya-full.json').read_text());last=max(x['sourceFrame']for x in m['battleEvents']);a=last-300;b=last+25;assert b<m['duration']*30
  e['pages'].append(cut(p,'sakuya',a,b,[{'lineId':'battle-sakuya-03','offsetFrames':45}]))
 else:e['pages'].append(p)
# Statistics remain anchored to historical research. The capture is fresh.
for p in e['pages']:
 if p['spec']['kind']in ['metrics','data-table']:p['spec']['datasetScope']='前回の固定研究データ（新たな256シード試験ではない）'
# Every original line and new explanation occurs once. Freeze pages contain no game audio.
refs=[r if isinstance(r,str)else r['lineId']for p in e['pages']for r in p.get('lines',[])];assert len(refs)==len(set(refs)) and set(refs)==set(lines)
(O/'editorial.json').write_text(json.dumps(e,ensure_ascii=False,indent=2));print('Editorial pages',len(e['pages']),'freeze pages',sum(p['spec']['kind']=='battle-pause'for p in e['pages']))
