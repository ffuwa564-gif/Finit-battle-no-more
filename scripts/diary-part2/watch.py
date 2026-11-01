"""Overlap completed chapter encoding with synthesis; never run either during capture."""
import pathlib,os,subprocess,sys,time,json
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2'
if len(sys.argv)>1:
 while True:
  try:os.kill(int(sys.argv[1]),0)
  except ProcessLookupError:break
  time.sleep(5)
last=0
while not(O/'narration.json').exists():
 try:n=len(json.loads((O/'narration-partial.json').read_text())['chapters'])
 except (FileNotFoundError,json.JSONDecodeError):time.sleep(5);continue
 if n>last:
  print('ENCODE AVAILABLE',n,'chapters',flush=True);result=subprocess.run([sys.executable,'scripts/diary-part2/render.py','--partial'],cwd=ROOT)
  if result.returncode==0:last=n
 time.sleep(5)
for cmd in[[sys.executable,'scripts/diary-part2/render.py'],[sys.executable,'scripts/diary-part2/audit.py'],['node','scripts/diary-part2/validate.mjs'],[sys.executable,'scripts/diary-part2/finish.py']]:
 print('RUN',cmd,flush=True);subprocess.run(cmd,cwd=ROOT,check=True)
print('ALL DELIVERY GATES PASSED',flush=True)
