"""Materialize and verify a reviewed committed lock, before any native battle."""
from pathlib import Path
import hashlib, json, os, platform, shutil, subprocess

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/media/this-girl/episodes/01'
OUT = ROOT / 'artifacts/this-girl-01/research'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def command(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


approval = json.loads((DOC / 'confirmation-approval.json').read_text())
lock_path = DOC / 'confirmation-lock.json'
digest = sha(lock_path)
assert approval['approved'] is True and approval['lockSha256'] == digest
assert {'/root', '/root/sakuya_critic'} <= set(approval['reviewers'])
assert approval['confirmationPreviouslyRun'] is False
lock = json.loads(lock_path.read_text())
assert len(lock['cases']) == 12 and len(lock['seedMap']) == 768
assert (lock['mainHypotheses'], lock['growthHypotheses'], lock['simultaneousIntervals']) == (288, 48, 516)
for name, expected in lock['sources'].items():
    p = ROOT / name
    assert p.is_file() and sha(p) == expected, ('Locked source mismatch', name)
OUT.mkdir(parents=True, exist_ok=True)
shutil.copyfile(lock_path, OUT / 'confirmation-lock.json')
report = {'kind': 'reviewed-confirmation-only', 'sourceCommit': command('git', 'rev-parse', 'HEAD'),
          'lockSha256': digest, 'approvalSha256': sha(DOC / 'confirmation-approval.json'),
          'node': command('node', '--version'), 'v8': command('node', '-p', 'process.versions.v8'),
          'npm': command('npm', '--version'), 'platform': platform.platform(),
          'packageLockSha256': sha(ROOT / 'package-lock.json'),
          'workflowRunId': os.environ.get('GITHUB_RUN_ID'),
          'case': {k: os.environ.get('STUDY_' + k.upper()) for k in ['task', 'stage', 'tier', 'core']},
          'sourcesVerifiedBeforeCombat': lock['sources'], 'approved': True}
(OUT / 'confirmation-runner-provenance.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('EXACT COMMITTED LOCK APPROVED', digest)
