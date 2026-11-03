"""Explicit stages. No held-out combat is run by default or by 'search'."""
import argparse, subprocess, concurrent.futures, pathlib, json
p=argparse.ArgumentParser();p.add_argument('phase',choices=['search','lock','confirm']);p.add_argument('--reviewed-lock-sha');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[2]
def node(path,*args):
    subprocess.run(['node','--import','tsx',f'scripts/this-girl-01/{path}',*map(str,args)],cwd=root,check=True)
def run(job): node(*job)
if a.phase=='search':
    # The immutable baseline must already be restored from f6595da6...; CI uses git archive.
    if not (root/'artifacts/this-girl-01/baseline/src/domain/engine.ts').exists(): raise SystemExit('Restore pinned baseline first')
    for mode in ['before','after']:
        subprocess.run(['python3','scripts/this-girl-01/run-optimization.py',mode],cwd=root,check=True)
    jobs=[('global-search.mts',s,t) for t in [6,3,4] for s in ['ivory-tower-010','kuzuha-awakening']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:list(pool.map(run,jobs))
    with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:list(pool.map(run,[('optimize.mts',s,6,'after','F5')for s in ['ivory-tower-010','kuzuha-awakening']]))
elif a.phase=='lock':node('lock-study.mts')
else:
    if not a.reviewed_lock_sha:raise SystemExit('Commit/review lock and pass its SHA explicitly; no automatic confirmation')
    lock=json.loads((root/'artifacts/this-girl-01/research/confirmation-lock.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:list(pool.map(run,[('confirm.mts',a.reviewed_lock_sha,c['id'])for c in lock['cases']]))
