from pathlib import Path
import json,subprocess,hashlib,urllib.request,urllib.parse
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-05';D=O/'delivery';branch='downloads/this-girl-05';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*args,input=None):return subprocess.check_output(['git',*args],cwd=ROOT,input=input).decode().strip()
placeholder=(O/'rerecord/download-placeholder.txt').read_text().strip();assert git('ls-remote','--heads','origin',branch).split()[0]==placeholder,'Unexpected remote branch change'
m=json.loads((D/'Packaging-Manifest.json').read_text());assert m['passed']and m['finishedSha256']==sha(D/'ThisGirl-05.mp4')
for name in ['Final-Media-QA.json','Freeze-Voice-QA.json','Browser-QA.json','Visual-QC.json']:
 j=json.loads((D/name).read_text());assert j['passed']and j['movieSha256']==m['finishedSha256']
entries=[];expected={}
for p in sorted(D.iterdir()):
 if not p.is_file():continue
 assert p.stat().st_size<100*1024*1024
 blob=git('hash-object','-w',str(p));entries.append('100644 blob '+blob+'\t'+p.name+'\n');expected[p.name]=sha(p)
tree=git('mktree',input=''.join(entries).encode());commit=git('commit-tree',tree,'-p',placeholder,'-m','Publish research monologue 05: Lisette implementation, independent retest and actual footage');git('push','origin',commit+':refs/heads/'+branch);(O/'rerecord/download-commit.txt').write_text(commit+'\n');print('PUSHED',commit,flush=True)
results=[]
for name,digest in expected.items():
 url='https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/'+commit+'/'+urllib.parse.quote(name);h=hashlib.sha256();size=0
 with urllib.request.urlopen(url,timeout=120)as r:
  while data:=r.read(1048576):h.update(data);size+=len(data)
 assert h.hexdigest()==digest,('Remote mismatch',name);results.append({'file':name,'sha256':digest,'bytes':size,'passed':True});print('READBACK',name,size,flush=True)
(O/'rerecord/Publication-Verification.json').write_text(json.dumps({'passed':True,'commit':commit,'fullPublicReadback':results},indent=2));print('PUBLISHED AND VERIFIED',commit,len(results),flush=True)
