import pathlib,time,subprocess,importlib
import render as render_module
from cached_timeline import timeline
from render import render,OUT,RENDER
from dialogue import CHAPTERS
while True:
 data=timeline();changed=False
 for ch in data['chapters']:
  ident=ch['id']
  if (RENDER/(ident+'.mp4')).exists():
   try:
    if abs(render_module.duration(RENDER/(ident+'.mp4'))-ch['duration'])<.15:continue
   except subprocess.CalledProcessError:pass
  required='echo' if ident in ['intro','outro'] else ident
  if not (OUT/'capture'/(required+'.json')).exists():continue
  importlib.reload(render_module);render_module.render(ch);changed=True
 if len(list(RENDER.glob('*.mp4')))>0 and all((RENDER/(ident+'.mp4')).exists()for ident,_,_ in CHAPTERS) and (OUT/'narration.json').exists():
  subprocess.run(['python',str(pathlib.Path(__file__).with_name('render.py'))],check=True);break
 if not changed:time.sleep(3)
