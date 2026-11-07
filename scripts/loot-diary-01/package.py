"""Package the preview; preserve failed/inconclusive QA, never relabel it as a final pass."""
from pathlib import Path
import json,hashlib,shutil,zipfile,subprocess
O=Path('artifacts/loot-diary-01');D=Path('docs/media/loot-diary/01');P=Path('/tmp/stillveil-loot-delivery');P.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
q=json.loads((O/'Final-QA.json').read_text());movie=O/'STILLVEIL-LootDiary-01.mp4';assert q['finishedSha256']==sha(movie)
b=json.loads((O/'Browser-QA.json').read_text());assert len(b)==6 and all(x['passed']for x in b)
for name in ['STILLVEIL-LootDiary-01.mp4','Thumbnail.png','Preview.jpg','Subtitles.srt','timeline.json','Final-QA.json','Browser-QA.json','Native-Calibration.json','session-summary.json','artwork-provenance.json']:
 shutil.copy2(O/name,P/name)
for p in D.iterdir():
 if p.is_file():shutil.copy2(p,P/p.name)
raws=[{'file':str(p),'bytes':p.stat().st_size,'sha256':sha(p),'retainedLocally':True}for p in sorted((O/'capture').glob('*-raw.mkv'))]
(P/'Native-Source-Hashes.json').write_text(json.dumps(raws,indent=2))
with zipfile.ZipFile(P/'Recording-Sources.zip','w',zipfile.ZIP_DEFLATED,compresslevel=3)as z:
 for p in sorted((O/'render').glob('*-piece-sync.mov')):z.write(p,str(p))
 for pattern in ['*.clock.json','*.ffmpeg-debug.log','*.json']:
  for p in sorted((O/'capture').glob(pattern)):z.write(p,str(p))if str(p)not in z.namelist()else None
with zipfile.ZipFile(P/'Production-Materials.zip','w',zipfile.ZIP_DEFLATED,compresslevel=3)as z:
 for p in sorted(Path('scripts/loot-diary-01').iterdir()):
  if p.is_file():z.write(p,str(p))
 for p in D.iterdir():
  if p.is_file():z.write(p,str(p))
 for pattern in ['*.json','speech/*.wav','speech/*.query.json','development-white-ward/*.json']:
  for p in sorted(O.glob(pattern)):
   if p.is_file():z.write(p,str(p))
 # Exclude standalone music, OP and character artwork; Input-Hashes.json links to approved original sources.
status={'status':'preview','sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'gameCommit':'56775d6d57f868137dc41a41d8398e66fdead6ea','movieSha256':sha(movie),'finalTechnicalQaPassed':q['passed'],'browserPassed':True,'sourceInteriorIndependentSyncCertified':False,'note':'Do not treat fitted diagnostic anchors as independent source-interior validation. See Review.md and Final-QA.json.'}
(P/'Status.json').write_text(json.dumps(status,indent=2));manifest={p.name:{'sha256':sha(p),'bytes':p.stat().st_size}for p in P.iterdir()if p.is_file()and p.name!='SHA256.json'};(P/'SHA256.json').write_text(json.dumps(manifest,indent=2));print('packaged',sum(x['bytes']for x in manifest.values()),'bytes',status)
