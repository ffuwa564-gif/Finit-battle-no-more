"""Freeze transitive render inputs, including source evidence and provenance.

Hashing actual files precedes rendering; a fresh hash after rendering may only
verify the old set, never silently update it. Final QA is a separate later gate.
"""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-v2'
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb')as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def freeze_inputs(timeline,timeline_path):
 files=set()
 def add(p):
  p=Path(p);p=p if p.is_absolute()else ROOT/p
  assert p.is_file(),('Missing frozen input',str(p));files.add(p)
 def tree(folder):
  for p in folder.rglob('*'):
   if p.is_file()and '__pycache__'not in p.parts and p.suffix not in ['.pyc']:add(p)
 add(O/'research/episode-implementation.json');add(timeline_path);add(O/'narration.json');add(O/'research/audio-mix.json');add(O/'render/master.flac')
 for name in ['source-catalog.json','used-audio-offset-plan.json','used-shot-audio-measurements.json']:
  add(O/'research'/name)
 add(O/'capture/used-intervals.json')
 for p in [ROOT/'scripts/this-girl-02-v2',ROOT/'src',O/'baseline/src',O/'assets',O/'capture',O/'proofs']:
  if p.exists():tree(p)
 add(ROOT/'scripts/this-girl-02-v2/editor/story.json');add(O/'editorial.json')
 for folder in ['optimization','global','confirmation','analysis','reports','rights']:
  p=O/'research'/folder
  if p.exists():tree(p)
 for p in (O/'research').glob('*'):
  if p.is_file()and p.suffix in ['.json','.md']and any(token in p.name for token in ['proof','invariance','source','native','recording','art-qa','roster','design','stone']):add(p)
 for name in ['combat-portfolio-research.md','portfolio-optimization-v02.md','endgame-invariance-v03.md']:
  add(ROOT/'docs'/name)
 for family in ['NotoSansCJK','NotoSerifCJK']:
  for weight in ['Regular','Bold']:add(Path('/usr/share/fonts/opentype/noto')/(family+'-'+weight+'.ttc'))
 art=json.loads((O/'assets/art-map.json').read_text())
 for record in art.values():
  original=ROOT/'public'/record['path'];assert sha(original)==record['sha256'],'Original differs from the verified art map'
  add(original)
 provenance=json.loads((O/'assets/Artwork-Provenance.json').read_text())
 for image in provenance['images']:
  assert sha(ROOT/image['destination'])==image['sha256'],'Fixed generated original or historical registry changed'
 narration=json.loads((O/'narration.json').read_text())
 for chapter in narration['chapters']:
  for line in chapter['lines']:
   add(line['file']);add(line['queryFile'])
 for cut in timeline['gameCuts']:
  add(cut['file'])
  if cut.get('audioCalibrationEvidence'):add(cut['audioCalibrationEvidence']['file'])
 add(timeline['music']['file'])
 for page in timeline['pages']:
  if page.get('flow'):add(page['flow']['evidence'])
  for name in ['evidence','judgment']:
   if page['spec'].get(name):add(page['spec'][name])
 roster_report=O/'research/roster-visibility.json'
 if roster_report.exists():
  r=json.loads(roster_report.read_text());source=Path(r['renderedFile'])
  if source.is_file():
   assert sha(source)==r['sha256']
   # Give the pre-rendered artist source an approved project logical path.
   supplied=O/'render/roster-input.mp4'
   if not supplied.exists()or sha(supplied)!=r['sha256']:shutil.copyfile(source,supplied)
   add(supplied)
 return {str(p.relative_to(ROOT))if p.is_relative_to(ROOT)else str(p):sha(p)for p in sorted(files)}
def verify_and_save(inputs,movie):
 changes=[]
 for name,expected in inputs.items():
  p=Path(name);p=p if p.is_absolute()else ROOT/p
  if not p.is_file()or sha(p)!=expected:changes.append(name)
 record={'passed':not changes,'episode':'THIS-GIRL-002-V2','finishedSha256':sha(movie),'inputs':inputs,'changedInputs':changes,'scope':'Render input immutability only; completed-file sync/browser/visual QA remains separately required.'}
 (O/'research/render-input-freeze.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
 assert not changes,('Inputs changed during rendering',changes)
 return record
