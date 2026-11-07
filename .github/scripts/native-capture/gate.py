"""DRAFT activation gate. Does not select configs or run combat."""
from pathlib import Path
import hashlib, json, os, shutil, subprocess, sys
ROOT = Path(__file__).resolve().parents[3]
DOC = ROOT / 'docs/media/this-girl/episodes/01'
OUT = ROOT / 'artifacts/this-girl-01'
EXPECTED = dict(caseId='ivory-tower-010-T6-F1', logicalSeed=930001,
                applicationSeed=3503471766, stageId='ivory-tower-010')
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def pinned_file(item):
    relative = Path(item['path'])
    assert not relative.is_absolute() and '..' not in relative.parts
    path = ROOT / relative
    assert path.is_file() and not path.is_symlink()
    assert path.resolve().is_relative_to(ROOT)
    assert sha(path) == item['sha256'], ('Capture input changed', str(relative))
    return path
approval_file = DOC / 'capture-approval.json'
a = json.loads(approval_file.read_text())
assert a['schemaVersion'] == 1 and a['approved'] is True
assert a['purpose'] == 'native-capture-only-no-deployment'
assert a['selection'] == EXPECTED and a['arms'] == {'A':'reference','C':'sakuya'}
assert a['applicationSpeed'] == 2
lock_file = DOC / 'confirmation-lock.json'
assert sha(lock_file) == a['lockSha256']
lock = json.loads(lock_file.read_text())
assert lock['sourceGameCommit'] == a['researchLockCommit']
for path, expected in lock['sources'].items():
    assert sha(ROOT / path) == expected, ('Exact-lock mismatch', path)
# Frozen source commit predates the approval-file commit; compare exact tree IDs.
frozen = a['sourceGameCommit']
assert len(frozen) == 40 and all(c in '0123456789abcdef' for c in frozen)
subprocess.run(['git','fetch','--filter=blob:none','--depth=1','origin',frozen],cwd=ROOT,check=True)
def tree(commit, path):
    return subprocess.check_output(['git','rev-parse',f'{commit}:{path}'],cwd=ROOT,text=True).strip()
assert tree('HEAD','src') == tree(frozen,'src')
assert tree('HEAD','public') == tree(frozen,'public')
required = {
 'scripts/this-girl-01/capture/record-native.mjs',
 'scripts/this-girl-01/capture/prepare-selected.mts',
 'scripts/this-girl-01/capture/prepare-proof.mts',
 'scripts/this-girl-01/capture/native-clean.py',
 'scripts/this-girl-01/capture/normalize_capture.py',
 'scripts/this-girl-01/capture/native-buffer-qa.py',
 'scripts/this-girl-01/capture/pcm-worklet.js',
 'scripts/this-girl-01/capture/golden-qa.py',
 'scripts/this-girl-01/verify/native-runtime/capture.mjs',
 'package-lock.json',
 '.github/scripts/native-capture/gate.py',
 '.github/scripts/native-capture/run.sh',
 '.github/scripts/native-capture/manifest.py',
}
assert required <= set(a['captureSourceSha256'])
for path, expected in a['captureSourceSha256'].items():
    pinned_file(dict(path=path,sha256=expected))
candidate_file = pinned_file(a['recordingCandidates'])
candidates = json.loads(candidate_file.read_text())
assert isinstance(candidates,list) and candidates
first = candidates[0]
assert all(first[k] == v for k,v in EXPECTED.items())
assert len(first['specs']) == 2
for arm, ident in a['arms'].items():
    spec = next(s for s in first['specs'] if s['arm'] == arm)
    assert spec['id'] == ident and all(spec[k] == v for k,v in EXPECTED.items())
runner = OUT / 'native-runner'
runner.mkdir(parents=True,exist_ok=True)
if '--proof' not in sys.argv:
    research = OUT / 'research'; research.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(candidate_file,research/'recording-candidates.json')
    shutil.copyfile(approval_file,runner/'capture-approval.original.json')
    shutil.copyfile(candidate_file,runner/'recording-candidates.original.json')
else:
    selection = json.loads((OUT/'research/recording-selection.json').read_text())
    assert all(selection[k] == v for k,v in EXPECTED.items())
    for arm, ident in a['arms'].items():
        proof = json.loads((OUT/f'research/proof-{ident}.json').read_text())
        assert proof['passed'] and all(proof['checks'].values())
        assert proof['spec']['arm'] == arm and proof['spec']['id'] == ident
        assert all(proof['spec'][k] == v for k,v in EXPECTED.items())
print('DRAFT capture approval gate passed', a['lockSha256'])
