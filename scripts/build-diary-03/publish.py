"""Read-only publication gate. Git commits, branches and pushes are managed by the root agent."""
import argparse,json
from pathlib import Path
from package import ROOT,O,D,MOV,LIMIT,GAME,FINAL_CHECKS,sha,path,read

def check():
 manifest=read(D/'Packaging-Manifest.json')
 assert manifest['passed']and manifest['sourceGameCommit']==GAME
 assert manifest['sourceBranch']=='video/build-research-diary-03'
 assert manifest['mediaBranch']=='downloads/build-research-diary-03'
 finished=sha(MOV);assert finished==manifest['finishedSha256']
 for name in FINAL_CHECKS:
  report=read(D/name);assert report['passed']and report['finishedSha256']==finished,name
 for name,info in manifest['inputs'].items():
  p=path(name);assert p.is_file()and p.stat().st_size==info['bytes']and sha(p)==info['sha256'],'Changed production input: '+name
 public=manifest['publicFiles'];assert len(public)==len(set(public))
 actual={p.name for p in D.iterdir()if p.is_file()and not p.name.endswith('.partial')}
 assert actual==set(public),('Unrecorded or missing public files',actual^set(public))
 sums={}
 for line in(D/'SHA256SUMS.txt').read_text().splitlines():
  digest,name=line.split('  ',1);assert name not in sums;sums[name]=digest
 assert set(sums)==set(public)-{'SHA256SUMS.txt'}
 for name in public:
  assert Path(name).name==name,'Unexpected public path';p=D/name
  assert p.is_file()and p.stat().st_size<LIMIT,'Missing or oversized public file: '+name
  if name!='SHA256SUMS.txt':assert sha(p)==sums[name],'Public SHA mismatch: '+name
 for archive in manifest['archives']:assert sha(D/archive['file'])==archive['sha256']
 print('PUBLICATION INPUTS VERIFIED',finished)
 print('Source branch:',manifest['sourceBranch'])
 print('Media branch:',manifest['mediaBranch'])
 print('Read-only check: no git mutation, upload or itch.io update performed.')
 return manifest
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check-only',action='store_true',required=True);parser.parse_args();check()
