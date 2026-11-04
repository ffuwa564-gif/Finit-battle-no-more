from pathlib import Path
import json,gzip,hashlib
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/this-girl-03';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();proof=O/'proofs/tikka.json.gz';d=json.loads(gzip.decompress(proof.read_bytes()));prev={};traces=[];mp=O/'capture/tikka.json';meta=json.load(open(mp))if mp.exists()else{};frames={e['event']['id']:e['sourceFrame']for e in meta.get('battleEvents',[])}
for e in d['events']:
 if e.get('actorId')=='party:tikka'and e.get('skillId')=='jam-14':
  units={u['uid']:u for u in e.get('unitsAfter',[])};actor=units['party:tikka'];old=prev.get('party:tikka',{})
  for uid in e.get('targetIds',[]):
   b=prev.get(uid,{});a=units[uid];changed={k:{'before':b.get('cooldowns',{}).get(k,0),'after':v}for k,v in a['cooldowns'].items()if v>b.get('cooldowns',{}).get(k,0)}
   if changed:traces.append({'eventId':e['id'],'targetId':uid,'targetCharacterId':a['characterId'],'cooldowns':changed,'chargeBefore':old.get('ultimateCharge',0),'chargeAfter':actor.get('ultimateCharge',0),'diagnosisShown':'故障診断'in e['text'],'gaugeExtraMechanic':8,'gaugeNote':'Observed total gauge change may include the ordinary action charge and extra8. It is NOT all attributed to diagnosis.','sourceFrame':frames.get(e['id']),'eventText':e['text']})
 if e.get('unitsAfter'):prev={u['uid']:u for u in e['unitsAfter']}
assert traces,'No actual ordinary-jam cooldown extension; do not fabricate'
target=traces[0]['targetId'];idx=next(i for i,e in enumerate(d['events'])if e['id']==traces[0]['eventId']);attack=next((e for e in d['events'][idx+1:]if e.get('actorId')==target and e.get('kind')=='attack'and not e.get('skillId')),None)
r={'passed':True,'selected':traces[0],'traces':traces,'proofSha256':sha(proof),'scope':'First actual ordinary-jam cooldown extension. Boss windup/bit effects are separate systems; no claim that jam stops them. Full jam-removal control does NOT isolate diagnosis8.'}
if attack:r['ordinaryAttackAfterSeal']={'eventId':attack['id'],'amount':attack.get('amount',0),'absorbed':attack.get('absorbed',0),'eventText':attack['text'],'sourceFrame':frames.get(attack['id'])}
if mp.exists():r.update(sourceSha256=sha(O/'capture/tikka.mov'),metadataSha256=sha(mp))
(O/'research/mechanism-tikka.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r['selected'],ensure_ascii=False,indent=2))
