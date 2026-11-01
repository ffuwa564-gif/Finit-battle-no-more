"""Run final deliverable generation after the rendering worker completes."""
import json,pathlib,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/myth-lab';HERE=pathlib.Path(__file__).resolve().parent
movie=OUT/'STILLVEIL-Myth-Skill-Conference-1080p.mp4'
while not movie.exists():
 time.sleep(10)
for name in ['worked_examples.py','catalog.py','finish.py','thumbnail.py','validate.py','package.py']:
 print('DELIVERY',name,flush=True);subprocess.run([sys.executable,str(HERE/name)],check=True,cwd=ROOT)
print('DELIVERY COMPLETE',flush=True)
