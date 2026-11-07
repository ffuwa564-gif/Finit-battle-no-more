from pathlib import Path
import json,sys,math
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03';sys.path[:0]=[str(ROOT/'scripts/this-girl-03/editor'),str(ROOT/'scripts/this-girl-03/art'),str(ROOT/'scripts/this-girl-03/rerecord')];import visuals,roster,pause,data_plates
T=json.load(open(O/'render/timeline.json'));plate=O/'render/plates';plate.mkdir(exist_ok=True);sheet=Image.new('RGB',(1920,math.ceil(len(T['pages'])/3)*380),'#fffaf2');d=ImageDraw.Draw(sheet)
for i,p in enumerate(T['pages']):
 f=plate/(p['id']+'.png');spec=p['spec'];kind=spec['kind']
 if kind=='battle-pause':pause.render(spec,f)
 elif kind=='data-table':data_plates.render_scene(spec,f)
 elif kind=='roster':roster.frame(17.5,35,ROOT/spec['judgment']).convert('RGB').save(f)
 else:visuals.render_scene(spec,f)
 sheet.paste(Image.open(f).resize((640,360)),(i%3*640,i//3*380));d.text((i%3*640+6,i//3*380+363),p['id'],fill='#594638')
sheet.save(O/'previews/plates-contact.jpg',quality=90);print('Preflight plates',len(T['pages']))
