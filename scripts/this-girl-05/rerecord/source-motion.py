"""Check prospective source cuts before audio offsets and render are frozen."""
from pathlib import Path
import json,subprocess,hashlib
import numpy as np
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-05';T=json.load(open(O/'render/timeline.json'));checks=[]
for c in T['gameCuts']:
 a=c['sourceStartFrame'];n=c['sourceEndFrame']-a;raw=subprocess.check_output(['ffmpeg','-v','error','-threads','1','-ss',str(a/30),'-i',str(ROOT/c['file']),'-vf','scale=90:160,format=gray','-frames:v',str(n),'-f','rawvideo','-']);x=np.frombuffer(raw,np.uint8).reshape(n,160,90).astype(np.float32)
 for k in range(3):
  lo=k*n//3;hi=(k+1)*n//3-9;off=max(range(lo,hi+1),key=lambda i:float(np.mean(abs(np.diff(x[i:i+9],axis=0)))));activity=float(np.mean(abs(np.diff(x[off:off+9],axis=0))));checks.append({'cut':c['id'],'third':k,'sourceFrame':a+off,'nineFrameActivity':activity,'passed':activity>.4})
r={'passed':all(c['passed']for c in checks),'timelineSha256':hashlib.sha256((O/'render/timeline.json').read_bytes()).hexdigest(),'scope':'Prospective source-only motion readability before offset fitting; not a finished video QA pass.','checks':checks};(O/'research/prospective-motion-qa.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2));assert r['passed']
