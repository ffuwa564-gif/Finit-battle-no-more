"""Restore fixed art inputs, verify original illustrations, export the exact thumbnail size.

Packaged originals plus Artwork-Provenance.json are sufficient to repeat the
layout. Missing previous generation prompts are never reconstructed as facts.
"""
from pathlib import Path
import json,hashlib,shutil,subprocess
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';A=O/'assets'
ROSTER_COMMIT='a5573e67d9ceb29de8de6c9166a6524ad41548b5'
ROSTER_PATH='docs/media/build-research-diary/episodes/05/registry.json'
ROSTER_SHA='4fd1c99e1866b5c1e3e6554c2d806e624247967a220b1ec07972110fe76a00ee'
INPUTS=[
 ('thumbnail-original.png','/workspace/generated_images/exec-1a577164-736c-4a1a-9624-d4378889fbbf.png'),
 ('research-desk-original.png','/workspace/generated_images/exec-cedfb000-c025-441b-b20c-cf2995cd4cd7.png'),
 ('reference-roster-05.json','/workspace/stillveil-diary-111/'+ROSTER_PATH),
]
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def main():
 A.mkdir(parents=True,exist_ok=True);(O/'delivery').mkdir(exist_ok=True)
 old_manifest=json.loads((A/'Artwork-Provenance.json').read_text())if(A/'Artwork-Provenance.json').exists()else None
 known={Path(x['destination']).name:x['sha256']for x in old_manifest['images']}if old_manifest else{}
 for name,source in INPUTS:
  source=Path(source);destination=A/name
  if source.exists():
   if name in known:assert sha(source)==known[name],('Input original changed',name)
   shutil.copy2(source,destination)
  else:
   assert destination.exists()and name in known and sha(destination)==known[name],('Supply the packaged fixed original and provenance manifest',name)
 assert sha(A/'reference-roster-05.json')==ROSTER_SHA
 old=json.loads((A/'reference-roster-05.json').read_text())
 assert len(old['entries'])==72 and old['summary']['canonicalGirls']==49
 art={}
 for e in old['entries']:
  p=ROOT/'public'/e['artPath'];assert sha(p)==e['artSha256'],('Original art changed',e['characterId'])
  art[e['characterId']]={'name':e['name'],'displayName':e.get('displayName',e['name']),
   'formLabel':e.get('shortFormLabel','登録形態'),'role':e['role'],'rarity':e['rarity'],'seriesId':e['seriesId'],'path':e['artPath'],
   'sha256':sha(p),'width':e['artWidth'],'height':e['artHeight']}
 (A/'art-map.json').write_text(json.dumps(art,ensure_ascii=False,indent=2))
 thumbnail=O/'delivery/Thumbnail-ThisGirl-01.png'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(A/'thumbnail-original.png'),'-vf',
  'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xfffaf2',
  '-frames:v','1',str(thumbnail)],check=True)
 fonts=[]
 for family in ['NotoSansCJK','NotoSerifCJK']:
  for weight in ['Regular','Bold']:
   path=Path('/usr/share/fonts/opentype/noto')/(family+'-'+weight+'.ttc')
   fonts.append({'name':path.name,'sha256':sha(path),'license':'SIL Open Font License1.1'})
 report={'episode':'THIS-GIRL-001','title':'この子で、勝ちたい。',
  'images':[{'destination':str((A/name).relative_to(ROOT)),'source':src,'sha256':sha(A/name),
   'origin':'Existing image_gen output for this same request, preserved as a fixed reproduction input.'}for name,src in INPUTS],
  'thumbnail':{'path':str(thumbnail.relative_to(ROOT)),'width':1280,'height':720,'sha256':sha(thumbnail),
   'transform':'Contain scaling with pale paper pad; no creative modification or crop.',
   'composition':'First-person Tsumugi desk POV: hair at the edges, hand with pen, notebook, small Sakuya illustration.'},
  'rosterSource':{'sourceCommit':ROSTER_COMMIT,'path':ROSTER_PATH,'sha256':ROSTER_SHA,
   'forms':72,'canonicalGirls':49,'meaning':'Historical LAB recognition is not current endgame recognition.'},
  'fonts':fonts,
  'limitations':['The title image contains decorative fictional notebook writing, not measured research data. It is never used as a video evidence/math slide.',
   'The exact previous generation prompts were lost with temporary storage. No invented original prompt is supplied; the fixed delivered originals reproduce the edit.'],
  'checks':{'allOriginalArtHashesMatch':True,'thumbnailExportSize':[1280,720]}}
 (A/'Artwork-Provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('72 original-art hashes verified; fixed originals and1280x720 thumbnail preserved.')
if __name__=='__main__':main()

