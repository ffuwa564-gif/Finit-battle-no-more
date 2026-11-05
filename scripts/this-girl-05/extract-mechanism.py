from pathlib import Path
import json,gzip,hashlib
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/this-girl-05';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();out={'passed':True,'scope':'Actual application events and actual frame bindings, not an invented damage or victory proof.'}
for id in ['reference','lisette']:
 p=json.load(gzip.open(O/f'proofs/{id}.json.gz'));m=json.load(open(O/f'capture/{id}.json'));frames={x['event']['id']:x['sourceFrame']for x in m['battleEvents']};events=p['events']
 def bind(i):
  e=events[i];assert e['id']in frames
  return{'eventIndex':i,'eventId':e['id'],'sourceFrame':frames[e['id']],'event':e,'beforeUnits':events[i-1].get('unitsAfter',[])if i else p['fixture']['battle']['units']}
 removes=[i for i,e in enumerate(events)if e.get('actorId')=='party:lisette' and e.get('actionSelection') and e.get('skillId')=='dispel-18'];hits=[i for i,e in enumerate(events)if '返し刃・斬撃'in e.get('text','')];out[id]={'firstRemoval':bind(removes[0]),'firstStrike':bind(hits[0])if hits else None,'lastStrike':bind(hits[-1])if hits else None,'firstPostStrike':bind(hits[0]+1)if hits else None,'totals':{'strikes':len(hits),'damage':sum(events[i].get('amount',0)for i in hits)},'proofSha256':sha(O/f'proofs/{id}.json.gz'),'metadataSha256':sha(O/f'capture/{id}.json'),'sourceSha256':sha(O/f'capture/{id}.mov')}
assert out['lisette']['totals']=={'strikes':2,'damage':73};p=out['lisette'];before=next(u for u in p['firstStrike']['event']['unitsAfter']if u['characterId']=='lisette');after=next(u for u in p['firstPostStrike']['event']['unitsAfter']if u['characterId']=='lisette');assert(before['ultimateCharge'],after['ultimateCharge'])==(25,50)
(O/'research/mechanism-lisette.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print({id:{k:v['sourceFrame']for k,v in out[id].items()if isinstance(v,dict)and'sourceFrame'in v}for id in ['reference','lisette']})
