from pathlib import Path
import json,sys,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03';ident=sys.argv[1];C=O/'capture'
a=Image.open(C/(ident+'-golden.png')).convert('RGB');b=Image.open(C/(ident+'-os-golden.png')).convert('RGB');assert a.size==b.size==(450,848)
x=np.asarray(a)[:800].astype(np.float32);y=np.asarray(b)[:800].astype(np.float32);rmse=float(np.sqrt(np.mean((x-y)**2)));passed=rmse<=12
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();r={'passed':passed,'rmse':rmse,'gameCrop':[0,0,450,800],'expectedViewport':[450,848],'goldenSha256':sha(C/(ident+'-golden.png')),'nativeOsSha256':sha(C/(ident+'-os-golden.png')),'scope':'Full native OS content origin/viewport matches actual browser viewport; diagnostic48rows excluded from pixel-error due live clock changes.'};(O/'research'/('golden-'+ident+'.json')).write_text(json.dumps(r,indent=2));print('NATIVE GOLDEN',r)
if not passed:raise SystemExit(1)
