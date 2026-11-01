"""Finish only after the worker atomically validates and publishes the final MP4."""
import pathlib,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/command-lab';HERE=pathlib.Path(__file__).resolve().parent
while not(OUT/'STILLVEIL-Command-Doctrine-1080p.mp4').exists():time.sleep(10)
for name in ['model.py','finish.py','thumbnail.py','validate.py','package.py']:
 print('DELIVERY',name,flush=True);subprocess.run([sys.executable,str(HERE/name)],check=True,cwd=ROOT)
print('DELIVERY COMPLETE',flush=True)
