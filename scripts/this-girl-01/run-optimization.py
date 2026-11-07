from pathlib import Path
import subprocess,concurrent.futures,sys
ROOT=Path(__file__).resolve().parents[2]
mode=sys.argv[1]if len(sys.argv)>1 else'before'
jobs=[(stage,tier,mode,core)for tier in [6,3,4]for stage in ['ivory-tower-010','kuzuha-awakening']for core in ['F1','F4']]
def job(args):
 p=subprocess.run([str(ROOT/'node_modules/.bin/tsx'),'scripts/this-girl-01/optimize.mts',*map(str,args)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if p.returncode:raise RuntimeError(str(args)+'\n'+p.stdout)
 print('DONE',*args,flush=True);return p.stdout
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 for _ in pool.map(job,jobs):pass
