from pathlib import Path
import subprocess,os,concurrent.futures
ROOT=Path(__file__).resolve().parents[2];R=ROOT/'artifacts/this-girl-03-v2/research';files=sorted(p.name for p in(R/'search').glob('*.json.gz')if not p.name.endswith('.diverse.json.gz'));assert len(files)==12

def job(name):
 p=R/('selection-'+name+'.log')
 with p.open('w')as f:r=subprocess.run(['npx','tsx','scripts/this-girl-03-v2/select-diverse.mts',name],cwd=ROOT,env={**os.environ,'VITE_TIKKA_RESEARCH':'1','VITE_MIETTE_RESEARCH':'0','VITE_SAKUYA_RESEARCH':'0'},stdout=f,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(p.read_text())
 print(p.read_text().strip(),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:list(pool.map(job,files))
print('All12 case selections complete; identical finite algorithm, independent files.',flush=True)
