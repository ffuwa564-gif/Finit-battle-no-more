import pathlib,subprocess,hashlib,json,concurrent.futures,shutil
ROOT=pathlib.Path(__file__).resolve().parents[2];D=ROOT/'artifacts/diary-111/delivery'
def run(name):subprocess.run(['python','scripts/diary-111/'+name],cwd=ROOT,check=True)
for ident in ['rewind','flower']:
 report=json.loads((ROOT/f'artifacts/diary-111/capture/{ident}-sync-check.json').read_text());assert report['passed']
run('validate_data.py')
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 jobs=[pool.submit(run,name)for name in ['render.py','package.py']]
 for job in jobs:job.result()
for p in (ROOT/'artifacts/diary-111/render').glob('*-edit.json'):shutil.copy2(p,D/p.name)
run('describe.py');run('validate_video.py')
(D/'Checksums.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n'for p in sorted(D.iterdir())if p.is_file()and p.name!='Checksums.sha256'))
print('COMPLETE',D,flush=True)
