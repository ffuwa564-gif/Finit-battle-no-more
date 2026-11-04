from pathlib import Path
import json,hashlib,subprocess,os,concurrent.futures,datetime
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/this-girl-03-v2/research';p=O/'confirmation-lock.json';h=hashlib.sha256(p.read_bytes()).hexdigest();assert json.loads(p.read_text())['heldoutPreviouslyOpened']is False
(O/'confirmation-start.json').write_text(json.dumps({'lockSha256':h,'atUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'stage':'First opening of heldout seeds after frozen protocol and development-only smoke'},indent=2))
def job(i):
 log=O/f'confirmation-case-{i}.log'
 with log.open('w')as f:r=subprocess.run(['npx','tsx','scripts/this-girl-03-v2/confirm.mts',str(i)],cwd=ROOT,env={**os.environ,'VITE_SAKUYA_RESEARCH':'0','VITE_MIETTE_RESEARCH':'0','VITE_TIKKA_RESEARCH':'1','CONFIRM_LOCK_SHA':h},stdout=f,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(log.read_text())
 print('CONFIRMED CASE',i,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as ex:list(ex.map(job,range(12)))
print('ALL12 CASES512PAIRED SEEDS6PLUSGROWTHARMS COMPLETE',flush=True)
