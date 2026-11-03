from pathlib import Path
import json,subprocess
from PIL import Image,ImageDraw
B=Path(__file__).resolve().parent;T=json.loads((B/'timeline.json').read_text());shots=[]
for ch in T['chapters'][:9]:
 v=next(v for v in T['voices']if v['chapter']==ch['id']);shots.append((ch['title'],v['at']+min(2,v['duration']/2)))
shots +=[('キャラクター資料',560),('記憶石資料',1555),('指揮資料',1905)]
canvas=Image.new('RGB',(1920,1560),'#e9e3de');d=ImageDraw.Draw(canvas)
for i,(label,at)in enumerate(shots):
 p=B/f'qc-stable-{i:02}.jpg';subprocess.run(['ffmpeg','-v','error','-ss',str(at),'-i',str(B/'STILLVEIL-BuildResearchDiary-00-1080p.mp4'),'-frames:v','1','-y',str(p)],check=True)
 im=Image.open(p).resize((640,360));x=i%3*640;y=i//3*390;canvas.paste(im,(x,y));d.text((x+8,y+365),f'{i+1}  {at:.2f}s',fill='black')
canvas.save(B/'Preview.jpg',quality=91)
