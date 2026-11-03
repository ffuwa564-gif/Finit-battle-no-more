from pathlib import Path
import json,subprocess,os,hashlib
B=Path(__file__).resolve().parent;ROOT=B.parents[1]
def git(*args,input=None,env=None):return subprocess.check_output(['git',*args],cwd=ROOT,input=input,env=env).decode().strip()
def sha(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  while x:=f.read(1048576):h.update(x)
 return h.hexdigest()
def pushbranch(branch,files,base=None):
 existing=git('ls-remote','--heads','origin',branch)
 if existing:
  tracked=B/('production-commit.txt' if branch.startswith('video/') else 'download-commit.txt')
  assert tracked.exists() and existing.split()[0]==tracked.read_text().strip(),'Refusing unexpected branch update'
  base=existing.split()[0]
 idx=B/('index-'+branch.replace('/','-'));idx.unlink(missing_ok=True);env={**os.environ,'GIT_INDEX_FILE':str(idx)}
 git('read-tree',base or '--empty',env=env)
 for path,name in files:
  blob=git('hash-object','-w',str(path));git('update-index','--add','--cacheinfo',f'100644,{blob},{name}',env=env)
 tree=git('write-tree',env=env);args=['commit-tree',tree]
 if base:args +=['-p',base]
 commit=git(*args,'-m','Add STILLVEIL build research diary Part 0 video and reference materials')
 git('push','origin',commit+':refs/heads/'+branch);idx.unlink(missing_ok=True)
 return commit
if __name__=='__main__':
 import sys
 if sys.argv[1]=='source':
  files=[(p,'scripts/build-diary-00/'+p.name)for p in sorted(B.glob('*.py'))]+[(B/p,'scripts/build-diary-00/'+p)for p in ['export-data.ts','capture-ui.ts','verify.ts']]
  files +=[(B/p,'docs/media/build-research-diary/episodes/00/'+p)for p in ['Research-Direction.md','Reproduce.md','Credits.md']]
  commit=pushbranch('video/build-research-diary-00',files,git('rev-parse','origin/main'));(B/'production-commit.txt').write_text(commit+'\n');print(commit)
 elif sys.argv[1]=='download':
  names=['STILLVEIL-BuildResearchDiary-00-1080p.mp4','README.md','STILLVEIL-BuildResearchDiary-00-720p.mp4','Thumbnail-BuildResearchDiary-00.png','Preview.jpg','Script.md','Subtitles-ja.srt','Chapters.txt','YouTube-Description.txt','Complete-Catalogue.md','Catalogue-Index.csv','Research-Direction.md','Credits.md','Reproduce.md','catalogue.json','Assets.json','External-Game-Assets.json','Production-Materials.zip','Finished-Movie-Sync.json','Validation.json','Decode-Validation.json','Visual-QC.json','Size-Adjustment.json','render-inputs.json','soundtrack-manifest.json','narration.json','timeline.json','production-commit.txt']
  hashes={p.name:sha(p)for p in [B/n for n in names]};(B/'SHA256.json').write_text(json.dumps(hashes,indent=2));names+=['SHA256.json']
  commit=pushbranch('downloads/build-research-diary-00',[(B/n,n)for n in names]+[(B/'reference/source-contract.json','Source-Contract.json')]);(B/'download-commit.txt').write_text(commit+'\n');print(commit)
