"""Publish only this episode's new source/media branches; independently verify public bytes."""
from pathlib import Path
import subprocess,os,json,hashlib,urllib.request
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part3';D=O/'delivery'
def run(*args,env=None,input=None):return subprocess.check_output(list(args),cwd=ROOT,env=env,input=input).decode().strip()
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb')as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()
def main():
 movie=D/'STILLVEIL-TowerDiary-Part3.mp4';finished=sha(movie)
 for name in ['Finished-Movie-Sync.json','Validation.json','Visual-QC.json']:
  r=json.loads((D/name).read_text());assert r['passed']and r['finishedSha256']==finished
 assert run('git','branch','--show-current')=='video/tower-diary-part3'
 run('git','add','scripts/diary-part3');run('git','commit','-m','Create tower diary Part3: Athena-free third-floor challenge with Chinese Usagi')
 source=run('git','rev-parse','HEAD');run('git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/video/tower-diary-part3')
 branch='downloads/tower-diary-part3';assert not run('git','ls-remote','--heads','origin',branch),'Media branch already exists; do not overwrite'
 env=os.environ.copy();env.update(GIT_DIR=run('git','rev-parse','--absolute-git-dir'),GIT_WORK_TREE=str(D),GIT_INDEX_FILE='/tmp/stillveil-diary-part3/publish.index');run('git','read-tree','--empty',env=env);run('git','add','--all',env=env);tree=run('git','write-tree',env=env);commit=run('git','commit-tree',tree,env=env,input=('STILLVEIL tower diary Part3; checked MP4, four-voice production inputs, native sources\n\nSource: '+source+'\n').encode());run('git','update-ref','refs/heads/'+branch,commit,'0'*40);run('git','-c','credential.helper=!gh auth git-credential','push','--force-with-lease=refs/heads/'+branch+':','origin',commit+':refs/heads/'+branch)
 checks=[]
 for name in ['STILLVEIL-TowerDiary-Part3.mp4','Production-Materials.zip','Recording-Sources.zip','Thumbnail-Part3.jpg','README.md','SHA256SUMS.txt']:
  url=f'https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/{commit}/{name}';h=hashlib.sha256();size=0
  with urllib.request.urlopen(url,timeout=180)as response:
   while True:
    data=response.read(1048576)
    if not data:break
    h.update(data);size+=len(data)
  expected=sha(D/name);assert h.hexdigest()==expected,(name,h.hexdigest(),expected);checks.append({'file':name,'sha256':expected,'bytes':size,'passed':True});print('PUBLIC BYTES VERIFIED',name,size,flush=True)
 report={'passed':True,'sourceCommit':source,'mediaCommit':commit,'sourceBranch':'video/tower-diary-part3','mediaBranch':branch,'checks':checks};(O/'research/Publication.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
