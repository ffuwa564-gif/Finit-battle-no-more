from pathlib import Path
import json,subprocess,math
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03';T=json.loads((O/'render/timeline.json').read_text());ids=['opening','subject','skill','methods','elements','battle-reference','pause-reference','pause-target','pause-conversion','pause-remainder','main-results','frugal-results','all-results','ablation','judgment','ledger'];pictures=[]
for id in ids:
 p=next(p for p in T['pages']if p['id']==id);frame=p['startFrame']+min(75,p['durationFrames']//2);path=O/f'rerecord/final-frame-{id}.jpg';subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-ss',str(frame/30),'-i',str(O/'render/ThisGirl-03.mp4'),'-frames:v','1',str(path)],check=True);pictures.append((path,frame,id))
sheet=Image.new('RGB',(1920,math.ceil(len(ids)/3)*380),'#fffaf2');d=ImageDraw.Draw(sheet)
for i,(path,f,id)in enumerate(pictures):
 x=i%3*640;y=i//3*380;sheet.paste(Image.open(path).resize((640,360)),(x,y));d.text((x+8,y+362),f'{f/30:.2f}s {id}',fill='#594638')
sheet.save(O/'delivery/Preview.jpg',quality=90)
pauses=[p for p in T['pages']if p['spec']['kind']=='battle-pause'];sheet=Image.new('RGB',(1920,1080),'white')
for i,p in enumerate(pauses):sheet.paste(Image.open(O/f'rerecord/final-frame-{p["id"]}.jpg').resize((960,540)),(i%2*960,i//2*540))
sheet.save(O/'delivery/Pause-Preview.jpg',quality=93)
print('Finished file review frames exported')
