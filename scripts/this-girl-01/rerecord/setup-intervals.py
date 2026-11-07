from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();t=json.loads((O/'render/timeline.json').read_text());sources={}
for logical in ['reference','sakuya']:
 id=logical+'-full';movie=O/f'capture/{id}.mov';meta=O/f'capture/{id}.json';m=json.loads(meta.read_text());assert m['geometry']['mediaReducedMotion']is False and m['applicationSpeed']==1 and m['audioCapture']['continuous']
 assert m['cleanSha256']==sha(movie)
 sources[logical]={'movie':str(movie.relative_to(ROOT)),'metadata':str(meta.relative_to(ROOT)),'graphPcm':f'artifacts/this-girl-01/capture/{id}.pcm','rawMovie':f'artifacts/this-girl-01/capture/{id}-os-raw.mkv','actualCaptureId':id,'hashes':{'movie':sha(movie),'metadata':sha(meta)},'fullSourcePassed':bool(m['calibration']['passed']),'approvalScope':'All final used intervals require independent graph-reference measurements and exact finished-file checks; raw global failures retained.'}
shots=[]
for c in t['gameCuts']:
 logical='reference'if c['id']=='battle-reference'else'sakuya';s=sources[logical]
 shots.append({**c,'sourceSha256':s['hashes']['movie'],'metadata':s['metadata'],'metadataSha256':s['hashes']['metadata'],'durationFrames':c['sourceEndFrame']-c['sourceStartFrame'],'sampleRate':48000,'editorialPlaybackRate':1})
(O/'research/source-catalog.json').write_text(json.dumps({'episode':'THIS-GIRL-001','schemaVersion':1,'sources':sources,'sourceOfStatistics':'Historical original 256-seed study; no new certification','captureGameCommit':json.loads((O/'rerecord/engine-invariance.json').read_text())['gameCommit']},indent=2))
(O/'capture/used-intervals.json').write_text(json.dumps({'episode':'THIS-GIRL-001','selectionFinalized':True,'sampleRate':48000,'fps':30,'shots':shots,'sourceSelectionPolicy':'Same original study case/seed and predeclared mechanism events. Frames fixed for legibility before audio-offset measurement.'},indent=2));print('Frozen used source intervals',[(s['id'],s['sourceStartFrame'],s['sourceEndFrame'])for s in shots])
