"""Render reviewed chapters as speech becomes available, then assemble the film."""
import copy,hashlib,json,pathlib,time,subprocess
from render import OUT,RENDER,render_chapter,concatenate,complete_render
HERE=pathlib.Path(__file__).resolve().parent
def fingerprint(ch):
 ch=copy.deepcopy(ch);zero=ch.pop('start',0)
 for line in ch['lines']:
  for k in ['start','end']:line[k]=round(line[k]-zero,4)
 payload=json.dumps(ch,ensure_ascii=False,sort_keys=True).encode()
 return hashlib.sha256(payload+(HERE/'render.py').read_bytes()+(HERE/'visuals.py').read_bytes()).hexdigest()
while True:
 try:
  final=(OUT/'narration.json').exists();path=OUT/('narration.json'if final else'narration-partial.json');data=json.loads(path.read_text())
 except (FileNotFoundError,json.JSONDecodeError):time.sleep(2);continue
 changed=False
 for ch in data['chapters']:
  stamp=RENDER/(ch['id']+'-source.sha256');wanted=fingerprint(ch);movie=RENDER/(ch['id']+'.mp4')
  if stamp.exists()and stamp.read_text()==wanted and complete_render(movie,ch['duration']):continue
  render_chapter(ch,force=True);stamp.write_text(wanted);changed=True
 if final and all((RENDER/(ch['id']+'-source.sha256')).exists()and(RENDER/(ch['id']+'-source.sha256')).read_text()==fingerprint(ch)and complete_render(RENDER/(ch['id']+'.mp4'),ch['duration'])for ch in data['chapters']):
  concatenate(data['chapters']);print('WORKER COMPLETE',flush=True);break
 if not changed:time.sleep(3)
