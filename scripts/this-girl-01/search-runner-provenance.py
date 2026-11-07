"""Record infrastructure identity; never run a battle or choose a candidate."""
from pathlib import Path
import hashlib, json, os, platform, subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/this-girl-01/research/runner-provenance.json'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def command(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


files = [ROOT / 'package.json', ROOT / 'package-lock.json']
for area in ['src', 'artifacts/this-girl-01/baseline/src', 'scripts/this-girl-01']:
    files += [p for p in (ROOT / area).rglob('*') if p.is_file() and p.suffix in ['.ts', '.tsx', '.mts', '.json', '.py']]
sources = {str(p.relative_to(ROOT)): sha(p) for p in sorted(set(files)) if '__pycache__' not in p.parts}
report = {'kind': 'development-selection-only', 'node': command('node', '--version'),
          'v8': command('node', '-p', 'process.versions.v8'), 'npm': command('npm', '--version'),
          'platform': platform.platform(), 'architecture': platform.machine(),
          'sourceCommit': command('git', 'rev-parse', 'HEAD'),
          'baselineCommit': 'f6595da6c5f4bd3950e412d92e3e08f3529e0706',
          'workflowRunId': os.environ.get('GITHUB_RUN_ID'), 'workflowJob': os.environ.get('GITHUB_JOB'),
          'case': {k: os.environ.get('STUDY_' + k.upper()) for k in ['stage', 'tier', 'core', 'mode']},
          'sourceHashes': sources,
          'importRule': 'All numeric source hashes must match. Compare every local-overlap config/seed row; ignore elapsed time and host identity only. Require the complete prospectively defined case set, not favorable jobs.'}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('Recorded runtime/source provenance; no held-out combat opened.')
