from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04-v2';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();t=json.loads((O/'render/timeline.json').read_text());sources={}
for id in ['reference','noelle']:
 movie=O/f'capture/{id}.mov';mp=O/f'capture/{id}.json';m=json.loads(mp.read_text());assert not m['geometry']['mediaReducedMotion']and m['applicationSpeed']==1 and m['audioCapture']['continuous']and m['cleanSha256']==sha(movie)
 sources[id]={'movie':str(movie.relative_to(ROOT)),'metadata':str(mp.relative_to(ROOT)),'graphPcm':f'artifacts/this-girl-04-v2/capture/{id}.pcm','rawMovie':f'artifacts/this-girl-04-v2/capture/{id}-os-raw.mkv','actualCaptureId':id,'hashes':{'movie':sha(movie),'metadata':sha(mp)},'fullSourcePassed':m['calibration']['passed']}
shots=[]
for c in t['gameCuts']:
 s=sources['reference'if c['id']=='battle-reference'else'noelle'];shots.append({**c,'sourceSha256':s['hashes']['movie'],'metadata':s['metadata'],'metadataSha256':s['hashes']['metadata'],'durationFrames':c['sourceEndFrame']-c['sourceStartFrame'],'sampleRate':48000,'editorialPlaybackRate':1})
(O/'research/source-catalog.json').write_text(json.dumps({'episode':'THIS-GIRL-004-V2','schemaVersion':1,'sources':sources,'sourceOfStatistics':'New frozen 256-seed study per condition, seed panels shared across cases and arms.','captureGameCommit':json.loads((O/'proofs/spec-noelle.json').read_text())['sourceGameCommit']},indent=2))
(O/'capture/used-intervals.json').write_text(json.dumps({'episode':'THIS-GIRL-004-V2','selectionFinalized':True,'sampleRate':48000,'fps':30,'shots':shots,'sourceSelectionPolicy':'Same predeclared native/application seed and actual resource-aware withholding and same-round normal commander action. Source frames fixed for legibility before audio-offset measurements.'},indent=2))
print([(x['id'],x['sourceStartFrame'],x['sourceEndFrame'])for x in shots])
