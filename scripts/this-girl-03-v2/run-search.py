from pathlib import Path
import sys,subprocess,concurrent.futures,os,json
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/this-girl-03-v2/research'
def job(i):
 p=O/f'search-case-{i}.log'
 with p.open('w')as f:r=subprocess.run(['npx','tsx','scripts/this-girl-03-v2/search.mts',str(i)],cwd=ROOT,env={**os.environ,'VITE_SAKUYA_RESEARCH':'0','VITE_MIETTE_RESEARCH':'0','VITE_TIKKA_RESEARCH':'1','GAME_COMMIT':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()},stdout=f,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(p.read_text())
 print(p.read_text(),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:list(pool.map(job,range(int(sys.argv[1])if len(sys.argv)>1 else 0,12)))
print('ALL DEVELOPMENT/SELECTION CASES COMPLETE',flush=True)
