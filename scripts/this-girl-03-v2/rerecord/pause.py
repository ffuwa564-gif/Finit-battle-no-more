"""Evidence-bound freeze frames. Annotations never invent pixels in the native crop."""
from pathlib import Path
import json,hashlib,subprocess,sys
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03-v2';sys.path.insert(0,str(ROOT/'scripts/this-girl-03-v2/art'));import visuals
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def render(spec,path):
 source=ROOT/spec['freeze']['file'];f=spec['freeze']['sourceFrame'];assert sha(source)==spec['freeze']['sha256'];image=O/'rerecord'/f'freeze-{spec["pauseId"]}.png'
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(f/30),'-i',str(source),'-frames:v','1',str(image)],check=True)
 original=Image.open(image).convert('RGBA');assert original.size==(450,800)
 im=visuals.scene({'kind':'battle','title':spec['title'],'section':('白亜の塔10層 / 全所持を仮定した研究'if spec.get('researchMode','after')=='after'else'公開版1.12 / 改修前'),'body':[],'unreleased':spec.get('researchMode','after')=='after'});im.alpha_composite(original.resize((576,1024),Image.Resampling.LANCZOS),(40,28));d=ImageDraw.Draw(im)
 d.rounded_rectangle((690,250,940,300),14,fill='#b97c88');visuals.text(d,(710,255),spec.get('pauseLabel','一時停止 · 解説'),30,'#fffaf2',True)
 for i,(x,y,w,h)in enumerate(spec['focus']):
  x=40+round(x*1.28);y=28+round(y*1.28);w=round(w*1.28);h=round(h*1.28);d.rounded_rectangle((x-5,y-5,x+w+5,y+h+5),10,outline='#f8e2c0',width=12);d.rounded_rectangle((x-5,y-5,x+w+5,y+h+5),10,outline='#b45c78',width=6)
 x,y,w,h=spec['inset'];inset=original.crop((x,y,x+w,y+h));factor=min(455/inset.width,380/inset.height);inset=inset.resize((round(inset.width*factor),round(inset.height*factor)),Image.Resampling.LANCZOS);xx=705+(455-inset.width)//2;yy=330+(380-inset.height)//2;im.alpha_composite(inset,(xx,yy));d.rounded_rectangle((xx-5,yy-5,xx+inset.width+5,yy+inset.height+5),10,outline='#b97c88',width=4);visuals.text(d,(705,730),'枠の部分を、そのまま拡大',27,visuals.MUTED,width=490)
 current=335
 for row in spec['explain']:
  current+=visuals.text(d,(1220,current),row,40,visuals.INK,True,width=560,max_lines=3)+28
 assert current<800,('Pause text overflow',current)
 visuals.text(d,(700,810),spec.get('footnote','数値は、この戦闘の実イベント記録です。'),27,visuals.MUTED,width=1050,max_lines=2)
 avatar=O/'assets/tsumugi-explain.png'
 if avatar.exists():visuals.contain(im,avatar,(1740,725,120,150),7)
 im.convert('RGB').save(path)
 Path(str(path)+'.json').write_text(json.dumps({'source':str(source.relative_to(ROOT)),'sourceSha256':sha(source),'sourceFrame':f,'nativeCropSize':[450,800],'gameBox':[40,28,576,1024],'annotationRectangles':spec['focus'],'inset':spec['inset'],'insetOutput':[xx,yy,inset.width,inset.height],'pauseId':spec['pauseId'],'plateSha256':sha(path),'codeSha256':sha(__file__),'scope':'Frozen actual recording plus clearly external explanatory annotations; no native HUD values painted over.'},ensure_ascii=False,indent=2))
