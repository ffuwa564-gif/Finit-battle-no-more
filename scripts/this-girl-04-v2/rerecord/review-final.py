from pathlib import Path
import json,subprocess,math
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04-v2';T=json.load(open(O/'render/timeline.json'));ids=[p['id']for p in T['pages']];pics=[]
for id in ids:
 p=next(p for p in T['pages']if p['id']==id);f=p['startFrame']+min(75,p['durationFrames']//2);path=O/f'rerecord/final-frame-{id}.jpg';subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-ss',str(f/30),'-i',str(O/'render/ThisGirl-04-v2.mp4'),'-frames:v','1',str(path)],check=True);pics.append((path,f,id))
sheet=Image.new('RGB',(1920,math.ceil(len(pics)/3)*380),'#fffaf2');d=ImageDraw.Draw(sheet)
for i,(p,f,id)in enumerate(pics):
 x=i%3*640;y=i//3*380;sheet.paste(Image.open(p).resize((640,360)),(x,y));d.text((x+8,y+362),f'{f/30:.2f}s {id}',fill='#594638')
sheet.save(O/'delivery/Preview.jpg',quality=90);sheet=Image.new('RGB',(1920,1080),'white');pauses=[p for p in T['pages']if p['spec']['kind']=='battle-pause']
for i,p in enumerate(pauses):sheet.paste(Image.open(O/f'rerecord/final-frame-{p["id"]}.jpg').resize((960,540)),(i%2*960,i//2*540))
sheet.save(O/'delivery/Pause-Preview.jpg',quality=93);print('Final frames exported')
