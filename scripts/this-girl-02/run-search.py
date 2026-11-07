from pathlib import Path
import subprocess,concurrent.futures,os,json
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/this-girl-02/research'
def job(i):
 p=O/f'search-case-{i}.log'
 with p.open('w')as f:r=subprocess.run(['npx','tsx','scripts/this-girl-02/search.mts',str(i)],cwd=ROOT,env={**os.environ,'VITE_SAKUYA_RESEARCH':'0','GAME_COMMIT':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()},stdout=f,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(p.read_text())
 print(p.read_text(),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:list(pool.map(job,range(12)))
print('ALL DEVELOPMENT/SELECTION CASES COMPLETE',flush=True)
