"""Freeze transitive render inputs, including source evidence and provenance.

Hashing actual files precedes rendering; a fresh hash after rendering may only
verify the old set, never silently update it. Final QA is a separate later gate.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01'
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
 add(timeline_path);add(O/'narration.json');add(O/'research/audio-mix.json');add(O/'render/master.flac')
 for p in [ROOT/'scripts/this-girl-01',ROOT/'src',O/'baseline/src',O/'assets',O/'capture']:
  if p.exists():tree(p)
 add(ROOT/'scripts/this-girl-01/editor/story.json');add(O/'editorial.json')
 for folder in ['confirmation','analysis','reports','rights']:
  p=O/'research'/folder
  if p.exists():tree(p)
 for p in (O/'research').glob('*'):
  if p.is_file()and any(token in p.name for token in ['proof','invariance','baseline-source','recording-candidates','art-qa']):add(p)
 for name in ['combat-portfolio-research.md','portfolio-optimization-v02.md','endgame-invariance-v03.md']:
  add(ROOT/'docs'/name)
 for family in ['NotoSansCJK','NotoSerifCJK']:
  for weight in ['Regular','Bold']:add(Path('/usr/share/fonts/opentype/noto')/(family+'-'+weight+'.ttc'))
 art=json.loads((O/'assets/art-map.json').read_text())
 for record in art.values():add(ROOT/'public'/record['path'])
 narration=json.loads((O/'narration.json').read_text())
 for chapter in narration['chapters']:
  for line in chapter['lines']:
   add(line['file']);add(line['queryFile'])
 for cut in timeline['gameCuts']:add(cut['file'])
 add(timeline['music']['file'])
 for page in timeline['pages']:
  for name in ['evidence','judgment']:
   if page['spec'].get(name):add(page['spec'][name])
 return {str(p.relative_to(ROOT))if p.is_relative_to(ROOT)else str(p):sha(p)for p in sorted(files)}
def verify_and_save(inputs,movie):
 changes=[]
 for name,expected in inputs.items():
  p=Path(name);p=p if p.is_absolute()else ROOT/p
  if not p.is_file()or sha(p)!=expected:changes.append(name)
 record={'passed':not changes,'episode':'THIS-GIRL-001','finishedSha256':sha(movie),'inputs':inputs,'changedInputs':changes,'scope':'Render input immutability only; completed-file sync/browser/visual QA remains separately required.'}
 (O/'research/render-input-freeze.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
 assert not changes,('Inputs changed during rendering',changes)
 return record
