"""Restore pinned existing artwork only when requested; verify exact episode inputs."""
import argparse,hashlib,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
D=ROOT/'artifacts/build-diary-04/delivery'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
 return h.hexdigest()
def target(name):
 p=ROOT/name
 assert p.resolve().is_relative_to(ROOT)or p.is_relative_to(ROOT/'artifacts/build-diary-04'),'Unsafe manifest path'
 assert '..'not in Path(name).parts and not Path(name).is_absolute(),'Unsafe relative path'
 return p

def main(fetch=False):
 external=json.loads((D/'External-Assets.json').read_text());missing=[]
 for row in external['artFiles']:
  p=target(row['path'])
  if not p.exists()and fetch:
   assert row['url'].startswith('https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/'+external['gameSourceCommit']+'/public/')
   p.parent.mkdir(parents=True,exist_ok=True);temp=p.with_suffix(p.suffix+'.download')
   try:
    with urllib.request.urlopen(row['url'],timeout=60)as response,temp.open('wb')as out:
     while data:=response.read(1048576):out.write(data)
    assert sha(temp)==row['sha256'],'Downloaded art SHA mismatch';temp.replace(p)
   finally:temp.unlink(missing_ok=True)
  if not p.exists():missing.append(row['path'])
  else:assert sha(p)==row['sha256'],'Art SHA mismatch: '+row['path']
 assert not missing,'Missing original art; use --fetch-art: '+str(missing)
 reuse=json.loads((ROOT/'artifacts/build-diary-04/asset-reuse.json').read_text())
 for name,item in reuse['inputs'].items():assert sha(target(name))==item['sha256'],'Reused asset differs: '+name
 provenance=json.loads((ROOT/'artifacts/build-diary-04/assets/artwork-provenance.json').read_text())
 assert provenance['schemaVersion']==2 and provenance['character']['id']=='fio'
 for item in provenance['active']:
  if item.get('accepted')and not item.get('supersededReason'):assert sha(target(item['output']))==item['outputSha256']==item['originalSha256'],'New illustration differs'
 for item in provenance['superseded']:
  assert item['accepted']is False and sha(target(item['retainedCopy']))==item['outputSha256']==item['originalSha256'],'Superseded original not preserved'
 recordings=json.loads((D/'Recording-Sources.json').read_text())
 for row in recordings['sources']:
  p=target(row['path']);assert p.is_file()and sha(p)==row['sha256'],'Exact recording is missing or changed: '+row['path']
 music=json.loads((D/'Music-Source.json').read_text());p=ROOT/'artifacts/build-diary-04/assets/opening-original.mp3';assert p.exists()and sha(p)==music['sha256'],'Original OP music missing or changed'
 body=external['bodyMusic'];p=target(body['path'])
 assert p.exists(),'Obtain body BGM manually: '+body['officialPage']+'; destination '+body['path']+'; SHA256 '+body['sha256']
 assert sha(p)==body['sha256'],'Body BGM differs from the pinned source'
 print('Exact artwork, calibrated recordings and music inputs verified. No movie was rendered or published.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--fetch-art',action='store_true');main(parser.parse_args().fetch_art)
