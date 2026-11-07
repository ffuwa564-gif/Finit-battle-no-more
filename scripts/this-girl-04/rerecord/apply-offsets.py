from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04';p=O/'research/used-audio-offset-plan.json';report=json.loads(p.read_text());assert report['passed'];digest=hashlib.sha256(p.read_bytes()).hexdigest();plans={x['id']:x for x in report['shots']};ep=O/'editorial.json';e=json.loads(ep.read_text())
for page in e['pages']:
 if page.get('gameCut'):
  c=page['gameCut'];r=plans[page['id']];assert (c['file'],c['sourceStartFrame'],c['sourceEndFrame'])==(r['file'],r['sourceStartFrame'],r['sourceEndFrame']);c.update(audioSourceOffsetSamples=r['audioSourceOffsetSamples'],audioCalibrationEvidence={'file':str(p.relative_to(ROOT)),'sha256':digest})
e['finalized']=True;ep.write_text(json.dumps(e,ensure_ascii=False,indent=2));print([(r['id'],r['audioSourceOffsetSamples'],r['maximumResidualSeconds'])for r in report['shots']])
