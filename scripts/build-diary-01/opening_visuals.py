"""Pastel laboratory opening: contained artwork and procedural branching animation.

Only layout/compositing of original artwork is performed here. Characters are
never reconstructed or edited programmatically; generation belongs to the art task.
"""
from pathlib import Path
from functools import lru_cache
import json,math
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[2]
O=ROOT/'artifacts/build-diary-01';A=O/'assets';W,H=1920,1080
INK='#583751';PINK='#bd5c91';MINT='#63a9a0';GOLD='#dfa83e';LAV='#ac91cb';CREAM='#fffaf3'
@lru_cache(None)
def font(n,bold=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if bold else'Regular')+'.ttc',n)
def ease(x):x=max(0.,min(1.,x));return x*x*(3-2*x)
def alpha(im,a):
 if a>=.999:return im
 if a<=0:return Image.new('RGBA',im.size)
 im=im.copy();im.putalpha(im.getchannel('A').point(lambda v:round(v*a)));return im

def contain(base,im,box,pad=0,a=1):
 x,y,w,h=map(round,box);p=round(pad);im=im.copy();im.thumbnail((max(1,w-2*p),max(1,h-2*p)),Image.Resampling.LANCZOS);pos=(x+(w-im.width)//2,y+(h-im.height)//2);base.alpha_composite(alpha(im,a),pos);return[*pos,*im.size]
def label(d,xy,s,n=34,color=INK,bold=True,anchor=None,stroke=0):d.text(xy,s,font=font(n,bold),fill=color,anchor=anchor,stroke_width=stroke,stroke_fill=CREAM)
def star(d,x,y,r,color='#e7b657',rotate=0):
 pts=[]
 for i in range(8):
  ang=rotate+i*math.pi/4;rr=r if i%2==0 else r*.24;pts.append((x+math.cos(ang)*rr,y+math.sin(ang)*rr))
 d.polygon(pts,fill=color)
def heart(d,x,y,r,color):
 pts=[]
 for i in range(65):
  t=2*math.pi*i/64;pts.append((x+r*math.sin(t)**3,y-r*(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))/16))
 d.polygon(pts,fill=color)
@lru_cache(None)
def paper():
 im=Image.new('RGBA',(W,H),'#f9edf4');d=ImageDraw.Draw(im)
 for x in range(0,W,48):d.line((x,0,x,H),fill='#f0e2ee',width=1)
 for y in range(0,H,48):d.line((0,y,W,y),fill='#f0e2ee',width=1)
 for x,y,r,col in[(144,138,280,'#e6f3e8'),(1730,920,420,'#eee6f6'),(1830,70,300,'#ffefd2')]:d.ellipse((x-r,y-r,x+r,y+r),fill=col)
 d.rounded_rectangle((30,30,1890,1050),36,outline='#d7b6ce',width=3)
 for x in range(75,1850,90):d.ellipse((x,47,x+8,55),fill='#d8b5cd')
 return im

def asset_file(name,draft=False):
 p=A/(name+'.png')
 if p.exists():return p
 if draft:
  fallback={'t-research-happy':'t-happy','t-research-think':'t-think','t-research-determined':'t-think','research-lab':'clubroom'}.get(name,name);p=ROOT/'artifacts/diary-part3/assets'/(fallback+'.png')
  if p.exists():return p
 raise FileNotFoundError('Opening awaits original artwork: '+str(p))
@lru_cache(None)
def art(path):return Image.open(path).convert('RGBA')
def sprite(name,draft=False):
 im=art(str(asset_file(name,draft)));box=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
 if box:
  x,y,r,b=box;return im.crop((max(0,x-24),max(0,y-24),min(im.width,r+24),min(im.height,b+24)))
 return im

def registry_rows(draft=False):
 p=O/'registry.json'
 if p.exists():
  r=json.loads(p.read_text());rows=r if isinstance(r,list)else r.get('girls',r.get('entries',r.get('characters',[])))
  good=[]
  for v in rows:
   if v.get('eligible')is False or v.get('isGirl')is False or v.get('category')in['creature','non-girl']:continue
   path=v.get('artPath')or v.get('artworkPath')or v.get('art',{}).get('path')
   if path:
    file=Path(path);file=file if file.is_absolute()else ROOT/path if (ROOT/path).exists()else ROOT/'public'/path
    if not file.exists():raise FileNotFoundError(file)
    good.append({**v,'artFile':str(file),'name':v.get('name',v.get('characterId','')),'seriesId':v.get('seriesId',v.get('serialId',''))})
  if good:return good
 if not draft:raise FileNotFoundError('Opening awaits reviewed character registry: '+str(p))
 r=json.loads((ROOT/'artifacts/diary-part2/content.json').read_text());assets={v['id']:v for v in r['assets']};ids=['seris','noelle','elaine','liora','fio','nox','ruka','ione','neri','lunette-awakened','benzaiten','selene']
 return[{'characterId':id,'name':next(v['name']for v in r['characters']if v['id']==id),'seriesId':'DRAFT','artFile':str(ROOT/'public'/assets[next(v['artId']for v in r['characters']if v['id']==id)]['path'])}for id in ids]

def selected_rows(rows):
 ids=['seris','noelle','elaine','liora','fio','nox','ruka','ione','neri','lunette-awakened','benzaiten','selene'];by={v.get('characterId',v.get('id')):v for v in rows};chosen=[by[id]for id in ids if id in by]
 for v in rows:
  if v not in chosen and len(chosen)<12:chosen.append(v)
 return chosen[:12]
@lru_cache(None)
def card_strip(serialized):
 rows=json.loads(serialized);cw=286;gap=34;im=Image.new('RGBA',(len(rows)*(cw+gap)+gap,724));d=ImageDraw.Draw(im)
 for i,v in enumerate(rows):
  x=gap+i*(cw+gap);d.rounded_rectangle((x+7,13,x+cw+7,706),24,fill='#d8bbcf');d.rounded_rectangle((x,5,x+cw,698),24,fill=CREAM,outline='#d4b2cb',width=3);d.rounded_rectangle((x+12,17,x+cw-12,590),17,fill=['#f8e6ef','#e9f3ec','#eee7f7','#fff0d8'][i%4]);contain(im,art(v['artFile']),(x+16,20,cw-32,562),12)
  label(d,(x+22,602),v['seriesId'],21,MINT);name=v['name'];n=29
  while font(n,True).getlength(name)>cw-35 and n>18:n-=1
  label(d,(x+18,638),name,n,INK)
 return im

@lru_cache(None)
def gem_texture(color):
 im=Image.new('RGBA',(230,230));g=Image.new('RGBA',im.size);d=ImageDraw.Draw(g);d.ellipse((24,24,206,206),fill=color);g=g.filter(ImageFilter.GaussianBlur(25));im.alpha_composite(g);d=ImageDraw.Draw(im);cx=115;cy=115;pts=[(cx,cy-58),(cx+55,cy-17),(cx+30,cy+46),(cx,cy+67),(cx-30,cy+46),(cx-55,cy-17)];d.polygon(pts,fill='#fff8cd',outline='#dbad4f',width=3);d.line((cx-55,cy-17,cx+55,cy-17),fill='#d4a546',width=3);d.line((cx,cy-58,cx-20,cy-17,cx,cy+67,cx+20,cy-17,cx,cy-58),fill='#d4a546',width=3);return im

def bezier(a,b,n=64):
 c1=(a[0]+(b[0]-a[0])*.50,a[1]);c2=(a[0]+(b[0]-a[0])*.50,b[1]);out=[]
 for i in range(n+1):
  t=i/n;u=1-t;out.append((u**3*a[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t**3*b[0],u**3*a[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t**3*b[1]))
 return out
@lru_cache(None)
def graph_edges():
 root=(385,535);mids=[(820,250),(820,535),(820,820)];leaves=[(1350,y)for y in[135,300,465,630,795,960]];edges=[]
 for i,m in enumerate(mids):
  edges.append((bezier(root,m),.03+i*.055,.41+i*.03,i))
  for j,l in enumerate(leaves[i*2:i*2+2]):edges.append((bezier(m,l),.36+i*.045+j*.035,.76+i*.035+j*.035,i))
 return root,mids,leaves,edges

def scene_cards(t,rows,draft):
 im=paper().copy();d=ImageDraw.Draw(im);label(d,(88,89),'すべての少女に、まだ見つかっていない勝ち筋がある。',47,INK);label(d,(92,157),'Every girl deserves her own shining build.',26,PINK,False)
 strip=card_strip(json.dumps(selected_rows(rows),ensure_ascii=False,sort_keys=True));x=round(80-t*205);im.alpha_composite(strip,(x,240));d=ImageDraw.Draw(im)
 # Labels are actual registry IDs; twinkles are visual possibility, not awarded certificates.
 for i in range(13):
  x=(i*173+t*43)%1850+35;y=162+math.sin(t*1.8+i)*22;star(d,x,y,5+3*math.sin(t*3+i)**2,['#dcae50','#bd75a3','#7cbaad'][i%3],t*.2)
 return im

def scene_lab(t,rows,draft):
 im=paper().copy();contain(im,art(str(asset_file('research-lab',draft))),(80,200,1760,740),0);overlay=Image.new('RGBA',im.size);d=ImageDraw.Draw(overlay)
 d.rounded_rectangle((96,66,855,157),20,fill='#fffaf3ef',outline='#d9b8cf',width=2);label(d,(128,85),'「強い子」から、「この子だから」へ。',39,INK)
 # Handwritten-looking note overlays emerge progressively around the illustration.
 labels=[('仮説',95,951),('比較',360,951),('検証',625,951)]
 for i,(name,x,y)in enumerate(labels):
  a=ease((t-i*.75)/.55)
  if a>0:
   p=Image.new('RGBA',(230,90));pd=ImageDraw.Draw(p);pd.rounded_rectangle((4,4,224,84),16,fill='#fffaf3ef',outline=[PINK,MINT,LAV][i],width=3);label(pd,(114,20),name,32,[PINK,MINT,LAV][i],anchor='ma');im.alpha_composite(alpha(p,a),(x,y))
 path=bezier((1190,850),(1750,705));progress=ease((t-1.6)/2.3);ImageDraw.Draw(overlay).line(path[:max(2,round(len(path)*progress))],fill='#fff8e6',width=8)
 for k in range(4):
  a=ease((t-2.2-k*.38)/.4)
  if a>0:star(ImageDraw.Draw(overlay),1280+k*140,820-k*31,14*a,'#fff7c6',t*.25)
 im.alpha_composite(overlay);return im

def scene_graph(t,rows,draft):
 im=paper().copy();d=ImageDraw.Draw(im);label(d,(85,70),'いくつもの枝分かれの、その先へ。',53,INK);label(d,(89,145),'選び、試して、つなぎ直す。',32,MINT)
 by={v.get('characterId',v.get('id')):v for v in rows};ruka=by.get('ruka',rows[-1]);d.rounded_rectangle((65,304,360,826),24,fill=CREAM,outline='#d7b7d0',width=3);contain(im,art(ruka['artFile']),(82,320,260,432),16);label(d,(212,765),ruka['name'],28,INK,anchor='ma')
 p=min(1,t/6.3);root,mids,leaves,edges=graph_edges();d=ImageDraw.Draw(im)
 for pts,a,b,i in edges:
  d.line(pts,fill='#e1d1df',width=7);u=ease((p-a)/(b-a))
  if u>0:d.line(pts[:max(2,round(len(pts)*u))],fill=[MINT,PINK,LAV][i],width=8)
 for i,(x,y)in enumerate(mids):
  d.ellipse((x-39,y-39,x+39,y+39),fill=CREAM,outline=[MINT,PINK,LAV][i],width=5);label(d,(x,y-23),['守','攻','結'][i],31,[MINT,PINK,LAV][i],anchor='ma')
 for i,(x,y)in enumerate(leaves):
  glow=ease((p-(.62+i*.025))/.17);d.ellipse((x-15,y-15,x+15,y+15),fill=CREAM,outline='#ccb0cc',width=3)
  if glow>0:
   gm=alpha(gem_texture('#f5d779bb'),glow);gm=gm.resize((round(140+8*math.sin(t*4+i)),)*2,Image.Resampling.LANCZOS);im.alpha_composite(gm,(round(x-gm.width/2),round(y-gm.height/2)))
 # Researcher sees the possibilities; an overlay held well inside the frame avoids head crops.
 contain(im,sprite('t-research-determined',draft),(1474,210,365,765),42)
 d=ImageDraw.Draw(im);label(d,(1515,878),'きっと、見つける。',31,PINK)
 return im

def scene_title(t,rows,draft):
 im=paper().copy();d=ImageDraw.Draw(im)
 # A faint continuation of the same tree links the title to the preceding scene.
 _,_,_,edges=graph_edges()
 for pts,a,b,i in edges:d.line([(x,y+30)for x,y in pts],fill='#e2d9e3',width=3)
 rise=(1-ease(t/.8))*70;title=Image.new('RGBA',im.size);td=ImageDraw.Draw(title)
 label(td,(115,166+rise),'ビルド',138,INK,stroke=6);label(td,(110,335+rise),'研究日誌',160,INK,stroke=6);label(td,(125,574+rise),'みんなが輝くRPGを！',57,PINK,stroke=3);label(td,(132,683+rise),'STILLVEIL  /  BUILD RESEARCH DIARY',27,MINT,False)
 im.alpha_composite(alpha(title,ease(t/.75)))
 contain(im,sprite('t-research-happy',draft),(1130,116+math.sin(t*3)*3,660,918),48)
 for name,box in [('z-happy',(50,782,300,255)),('m-happy',(385,782,300,255))]:
  try:contain(im,sprite(name,draft),box,24)
  except FileNotFoundError:
   # The legacy approved Z/M originals are unchanged, and are explicit inputs.
   p=ROOT/'artifacts/diary-part3/assets'/(name+'.png');contain(im,art(str(p)),box,24)
 d=ImageDraw.Draw(im)
 for i,(x,y)in enumerate([(1010,192),(1018,675),(1730,160),(1790,880),(930,830)]):star(d,x,y,13+5*math.sin(t*3+i)**2,['#d9a73e','#9b8bc0','#77b5a5'][i%3],t*.2)
 return im

def frame(t,rows,draft=False,boundaries=None):
 funcs=[scene_cards,scene_lab,scene_graph,scene_title];bounds=boundaries or[0,6.4,12.8,20.8,25.6]
 i=max(0,min(3,next((k for k in range(4)if bounds[k]<=t<bounds[k+1]),3)));im=funcs[i](t-bounds[i],rows,draft)
 if i>0 and t<bounds[i]+.4:
  previous=funcs[i-1](bounds[i]-bounds[i-1],rows,draft);im=Image.blend(previous,im,ease((t-bounds[i])/.4))
 if draft:
  d=ImageDraw.Draw(im);d.rectangle((0,1013,1920,1080),fill='#7c263f');label(d,(960,1020),'DRAFT · 未承認素材の仮配置',29,'#ffffff',anchor='ma')
 return im.convert('RGB')
