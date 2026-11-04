from pathlib import Path
import json,subprocess,hashlib,urllib.request,os
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';D=O/'delivery';R=O/'rerecord';branch='downloads/this-girl-01-v112';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*args,input=None):return subprocess.check_output(['git',*args],cwd=ROOT,input=input).decode().strip()
assert not git('ls-remote','--heads','origin',branch),'Never overwrite an unrelated published branch'
manifest=json.loads((D/'Packaging-Manifest.json').read_text());assert manifest['passed']and manifest['finishedSha256']==sha(D/'ThisGirl-01-v112.mp4')
for p in ['Final-Media-QA.json','Freeze-Voice-QA.json','Browser-QA.json','Visual-QC.json']:
 j=json.loads((D/p).read_text());assert j['passed']and j['movieSha256']==manifest['finishedSha256']
entries=[];expected={}
for p in sorted(D.iterdir()):
 if not p.is_file()or p.name=='ThisGirl-01.mp4':continue
 assert p.stat().st_size<100*1024*1024
 blob=git('hash-object','-w',str(p));entries.append('100644 blob '+blob+'\t'+p.name+'\n');expected[p.name]=sha(p)
tree=git('mktree',input=''.join(entries).encode());commit=git('commit-tree',tree,'-m','Publish episode 1 v1.12 recapture with four freeze explanations');git('push','origin',commit+':refs/heads/'+branch);(R/'download-commit.txt').write_text(commit+'\n')
results=[]
for name,digest in expected.items():
 url='https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/'+commit+'/'+name;h=hashlib.sha256();size=0
 with urllib.request.urlopen(url,timeout=120)as r:
  while data:=r.read(1048576):h.update(data);size+=len(data)
 assert h.hexdigest()==digest,(name,'Remote mismatch');results.append({'file':name,'sha256':digest,'bytes':size,'passed':True})
(R/'Publication-Verification.json').write_text(json.dumps({'passed':True,'commit':commit,'fullPublicReadback':results},indent=2));print('PUBLISHED AND READ BACK',commit,len(results),'files',flush=True)
