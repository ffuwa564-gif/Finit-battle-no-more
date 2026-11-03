from pathlib import Path
from PIL import Image,ImageDraw
import json
B=Path(__file__).resolve().parent;T=json.loads((B/'timeline.json').read_text());ids=['line-00-00','line-00-03','line-01-01','line-02-03','line-03-06','line-04-06','line-05-07','line-07-02','line-07-12','mireille','ruka','gem-rewind-thread-pure','traits','command-boundaries','gems-title','credits']
out=Image.new('RGB',(1600,225*4));d=ImageDraw.Draw(out)
for i,key in enumerate(ids):
 p=B/'plates'/f'{key}.jpg'
 if not p.exists():continue
 im=Image.open(p).convert('RGB').resize((400,225));out.paste(im,(i%4*400,i//4*225));d.rectangle((i%4*400,i//4*225,i%4*400+220,i//4*225+17),fill='#eee');d.text((i%4*400+5,i//4*225+2),key,fill='#111')
out.save(B/'Storyboard-Contact.jpg',quality=95)
print('duration',T['duration'],'body',T['bodyEnd'])
