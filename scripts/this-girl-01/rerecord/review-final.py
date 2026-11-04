from pathlib import Path
import json,subprocess
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';R=O/'rerecord';D=O/'delivery';T=json.loads((O/'render/timeline.json').read_text());ids=['opening','subject','baseline','shield','leaders','stones','battle-reference','pause-reference','pause-target','pause-absorb','pause-payout','preview'];pictures=[]
for i,id in enumerate(ids):
 p=next(p for p in T['pages']if p['id']==id);frame=p['startFrame']+min(75,p['durationFrames']//2);path=R/f'final-frame-{id}.jpg';subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-ss',str(frame/30),'-i',str(O/'render/ThisGirl-01.mp4'),'-frames:v','1',str(path)],check=True);pictures.append((path,frame,id))
sheet=Image.new('RGB',(1920,1520),'#fffaf2');d=ImageDraw.Draw(sheet)
for i,(path,f,id)in enumerate(pictures):
 x=i%3*640;y=i//3*380;sheet.paste(Image.open(path).resize((640,360)),(x,y));d.text((x+8,y+362),f'{f/30:.2f}s {id}',fill='#594638')
sheet.save(D/'Preview.jpg',quality=92)
# A second large sheet for the requested freeze treatment, from the finished movie.
pauses=[p for p in T['pages']if p['spec']['kind']=='battle-pause'];sheet=Image.new('RGB',(1920,1080),'white')
for i,p in enumerate(pauses):sheet.paste(Image.open(R/f'final-frame-{p["id"]}.jpg').resize((960,540)),(i%2*960,i//2*540))
sheet.save(D/'Pause-Preview.jpg',quality=93)
print('Finished-file visual sheets exported',flush=True)
