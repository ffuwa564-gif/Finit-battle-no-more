"""Quiet notebook plates for THIS-GIRL-003.

render_scene(spec,path) writes a1920x1080 PNG and a hash-bound sidecar.
Native game footage and all subtitles are composed by the editor, not here.
"""
from pathlib import Path
from functools import lru_cache
import json,math,re,hashlib
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03';A=O/'assets'
W,H=1920,1080
INK='#594638';MUTED='#89776a';ROSE='#9a7caa';SAGE='#687e74'
GOLD='#ae8b4d';PAPER='#fffaf2';EDGE='#dfd2c0'
GAME=(40,28,576,1024);BATTLE_PANEL=(650,85,1190,785);BATTLE_CAPTION=(650,910,1190,150)

def sha(path):
 h=hashlib.sha256()
 with open(path,'rb')as stream:
  for block in iter(lambda:stream.read(1048576),b''):h.update(block)
 return h.hexdigest()

@lru_cache(None)
def font(size,bold=False,serif=False):
 return ImageFont.truetype('/usr/share/fonts/opentype/noto/Noto'+('Serif'if serif else'Sans')+
  'CJK-'+('Bold'if bold else'Regular')+'.ttc',size)

def wrap(value,size,width,bold=False,serif=False):
 out=[];line='';face=font(size,bold,serif)
 tokens=re.findall(r'[A-Za-z0-9]+(?:[._/+%−–-][A-Za-z0-9]+)*(?:%|秒|人|回|層|ラウンド)?|\n|.',str(value))
 for token in tokens:
  if token=='\n':out.append(line);line='';continue
  if face.getlength(token)>width:raise ValueError(('Unbreakable text too wide',token,width,size))
  if line and face.getlength(line+token)>width:out.append(line.rstrip());line=token.lstrip()
  else:line+=token
 if line:out.append(line.rstrip())
 return out or['']

def text(draw,xy,value,size=42,color=INK,bold=False,width=None,serif=False,max_lines=None):
 lines=wrap(value,size,width,bold,serif)if width else str(value).split('\n')
 if max_lines:assert len(lines)<=max_lines,('Shorten the display phrase',value,len(lines),max_lines)
 for i,line in enumerate(lines):
  draw.text((xy[0],xy[1]+i*round(size*1.4)),line,font=font(size,bold,serif),fill=color)
 return len(lines)*round(size*1.4)

def contain(base,path,box,pad=20):
 x,y,w,h=map(round,box);im=Image.open(path).convert('RGBA')
 im.thumbnail((max(1,w-2*pad),max(1,h-2*pad)),Image.Resampling.LANCZOS)
 px=x+(w-im.width)//2;py=y+(h-im.height)//2;base.alpha_composite(im,(px,py))
 assert py>=y+pad and py+im.height<=y+h-pad
 return[px,py,im.width,im.height]

@lru_cache(None)
def art_map():return json.loads((A/'art-map.json').read_text())

def character(base,id,box,pad=24):
 return contain(base,ROOT/'public'/art_map()[id]['path'],box,pad)

@lru_cache(None)
def desk_original():
 im=Image.open(A/'research-desk-original.png').convert('RGBA')
 scale=min(W/im.width,H/im.height)
 im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);out=Image.new('RGBA',(W,H),PAPER)
 out.alpha_composite(im,((W-im.width)//2,(H-im.height)//2))
 return out

def desk(light=True):
 out=desk_original().copy()
 if light:out.alpha_composite(Image.new('RGBA',(W,H),(255,250,242,70)))
 return out

def sheet(title='',section='',battle=False):
 out=desk();draw=ImageDraw.Draw(out)
 x,y,w,h=BATTLE_PANEL if battle else(95,65,1730,830)
 draw.rounded_rectangle((x,y,x+w,y+h),24,fill=PAPER,outline=EDGE,width=2)
 if section:text(draw,(x+40,y+22),section,25,MUTED)
 if title:text(draw,(x+40,y+70),title,51 if battle else 54,INK,True,
  width=w-80,serif=True,max_lines=1)
 draw.line((x+40,y+160,x+w-40,y+160),fill=EDGE,width=2)
 return out

def arrow(draw,start,end,color=SAGE):
 draw.line((*start,*end),fill=color,width=5)
 angle=math.atan2(end[1]-start[1],end[0]-start[0]);r=17
 draw.line((end[0]-r*math.cos(angle-.5),end[1]-r*math.sin(angle-.5),*end,
  end[0]-r*math.cos(angle+.5),end[1]-r*math.sin(angle+.5)),fill=color,width=5)

def shield(draw,center,r=66):
 x,y=center;draw.polygon([(x-r,y-r),(x+r,y-r),(x+r*.85,y+r*.35),(x,y+r),
  (x-r*.85,y+r*.35)],fill='#e5ece4',outline=SAGE,width=4)

def flower(draw,center,r=59):
 x,y=center
 for k in range(5):
  angle=k*math.tau/5-math.pi/2;px=x+math.cos(angle)*r*.57;py=y+math.sin(angle)*r*.57
  draw.ellipse((px-r*.46,py-r*.46,px+r*.46,py+r*.46),fill='#edc8ce',outline=ROSE,width=3)
 draw.ellipse((x-8,y-8,x+8,y+8),fill=GOLD)

def sword(draw,center,r=66):
 x,y=center
 draw.polygon([(x-13,y+18),(x-13,y-r),(x,y-r-22),(x+13,y-r),(x+13,y+18)],
  fill='#e2e6e3',outline=SAGE,width=3)
 draw.line((x-35,y+18,x+35,y+18),fill=GOLD,width=7)
 draw.line((x,y+18,x,y+r),fill=INK,width=12)

def gem(draw,x,y,r=22,solid=False,color=GOLD):
 points=[(x,y-r),(x+r,y-r*.3),(x+r*.58,y+r*.64),(x,y+r),
  (x-r*.58,y+r*.64),(x-r,y-r*.3)]
 draw.polygon(points,fill='#edd6a4'if solid else PAPER,outline=color,width=3)
 draw.line((x-r,y-r*.3,x+r,y-r*.3),fill=color,width=2)
 draw.line((x,y-r,x-r*.32,y-r*.3,x,y+r,x+r*.32,y-r*.3,x,y-r),fill=color,width=2)

def body(draw,lines,x,y,width,size=40,gap=35,color=INK,bottom=875):
 for i,line in enumerate(lines):
  if i:y+=gap
  height=text(draw,(x,y),line,size,color,width=width,max_lines=2);y+=height
  assert y<=bottom,('Shorten the body instead of shrinking it',line,y,bottom)
 return y

def scene(spec):
 kind=spec.get('kind','desk');title=spec.get('title','');section=spec.get('section','研究ノート')
 if kind=='desk':
  out=desk(False)
  if title:
   draw=ImageDraw.Draw(out);draw.rounded_rectangle((100,65,1560,235),22,fill=(255,250,242,235))
   text(draw,(145,105),title,64,INK,True,serif=True,width=1360,max_lines=1)
  return out
 out=sheet(title,section,battle=kind=='battle');draw=ImageDraw.Draw(out)
 if kind in ['subject','preview']:
  cid=spec.get('characterId','tikka'if kind=='subject'else'noelle')
  character(out,cid,(160,245,500,635),30);x=750
  text(draw,(x,275),art_map()[cid]['name'],46,INK,True,width=970,max_lines=1)
  text(draw,(x,345),art_map()[cid]['seriesId'],27,SAGE)
  lines=spec.get('body',[])
  if kind=='preview':lines=[spec.get('status','次回の研究候補・未検証'),*lines]
  body(draw,lines,x,440,930,39 if kind=='preview'else 40,38)
 elif kind=='party':
  people=spec.get('characters',[]);assert 1<=len(people)<=4
  card_width=330;gap=45;left=(W-(card_width*len(people)+gap*(len(people)-1)))/2
  role_names={'tank':'守り','attacker':'単体攻撃','area_attacker':'全体攻撃','healer':'回復','supporter':'支援','debuffer':'弱体化'}
  for i,person in enumerate(people):
   cid=person.get('characterId',person.get('id'));assert cid,'A party member needs characterId or id'
   if person.get('characterId')and person.get('id'):assert person['characterId']==person['id'],'Conflicting character IDs'
   record=art_map()[cid];x=round(left+i*(card_width+gap));color=ROSE if person.get('subject')else EDGE
   draw.rounded_rectangle((x,285,x+card_width,830),20,fill='#fffdf8',outline=color,width=3 if person.get('subject')else 2)
   character(out,cid,(x+12,300,card_width-24,375),15)
   name=person.get('name',record.get('displayName',record['name']))
   text(draw,(x+20,680),name,30,INK,True,width=card_width-40,max_lines=1)
   text(draw,(x+20,726),record['seriesId']+' · '+record.get('rarity',''),22,MUTED)
   label=person.get('role',role_names.get(record.get('role'),'役割を比較'))
   text(draw,(x+20,773),label,29,SAGE,width=card_width-40,max_lines=1)
   if person.get('leader'):text(draw,(x+140,726),'リーダー',21,GOLD,True,width=165,max_lines=1)
  if spec.get('note'):text(draw,(170,850),spec['note'],29,MUTED,width=1570,max_lines=1)
 elif kind=='conditions':
  for i,(label,color)in enumerate([('勝てる',SAGE),('選ぶ理由がある',ROSE),('育てたくなる',GOLD)]):
   x=205+i*525;draw.rounded_rectangle((x,325,x+460,665),22,fill='#fffdf8',outline=EDGE,width=2)
   gem(draw,x+230,410,28,color=color);width=font(43,True).getlength(label)
   text(draw,(x+230-width/2,495),label,43,color,True)
  if spec.get('note'):text(draw,(205,765),spec['note'],34,MUTED,width=1500,max_lines=2)
 elif kind=='delta':
  text(draw,(255,360),'Δ = Pティッカ入り − P最強候補',68,INK,width=1450,max_lines=1)
  body(draw,spec.get('body',['同じ条件・同じ出発シードで比べる。']),255,590,1400,39)
 elif kind=='concept':
  labels=spec.get('labels',['障壁で防ぐ','花びらを蓄える','次の主攻撃へ'])
  phase=int(spec.get('phase',2));centers=[(465,420),(960,420),(1455,420)]
  assert 0<=phase<=2 and len(labels)==3
  for i,(function,center,label)in enumerate(zip([shield,flower,sword],centers,labels)):
   if i>phase:continue
   function(draw,center)
   for j,line in enumerate(wrap(label,43,380,True)):
    text(draw,(center[0]-font(43,True).getlength(line)/2,550+j*61),line,43,INK,True)
   if i:arrow(draw,(centers[i-1][0]+110,420),(center[0]-110,420))
  if spec.get('note'):text(draw,(205,765),spec['note'],35,MUTED,width=1500,max_lines=2)
 elif kind=='choice':
  cards=spec.get('cards',[]);assert 1<=len(cards)<=3
  x0=180;width=(1560-(len(cards)-1)*45)/len(cards)
  for i,card in enumerate(cards):
   x=x0+i*(width+45);draw.rounded_rectangle((x,290,x+width,795),20,fill='#fffdf8',outline=EDGE,width=2)
   text(draw,(x+26,325),card['title'],39,INK,True,width=width-52,max_lines=2)
   body(draw,card.get('body',[]),x+26,455,width-52,34,30,bottom=700 if card.get('status')else 765)
   if card.get('status'):text(draw,(x+26,727),card['status'],30,ROSE,True,width=width-52,max_lines=1)
 elif kind=='metrics':
  rows=spec.get('rows',[]);assert 1<=len(rows)<=3
  assert spec.get('evidence'),'A measured graph requires an evidence file'
  evidence=ROOT/spec['evidence'];assert evidence.is_file(),('Evidence unavailable',evidence)
  assert spec.get('evidenceSha256')==sha(evidence),'Graph evidence hash missing or changed; regenerate rows from frozen evidence'
  values=[float(row['value'])for row in rows]
  maximum=float(spec.get('maximum',max([1,*values,*[float(row['ci'][1])for row in rows if row.get('ci')]])))
  minimum=float(spec.get('minimum',0));assert maximum>minimum
  left=650;width=780
  def position(value):
   assert minimum<=float(value)<=maximum,('Fix the graph scale',value,minimum,maximum)
   return left+width*(float(value)-minimum)/(maximum-minimum)
  zero=position(0)if minimum<=0<=maximum else left
  for i,row in enumerate(rows):
   y=300+i*160;text(draw,(185,y),row['label'],37,INK,True,width=405,max_lines=2)
   draw.rounded_rectangle((left,y+8,left+width,y+70),12,fill='#eee7dd');end=position(row['value'])
   draw.rounded_rectangle((min(zero,end),y+8,max(min(zero,end)+3,max(zero,end)),y+70),12,fill=row.get('color',ROSE))
   text(draw,(1485,y+2),row.get('display',str(row['value'])),45,INK,True,width=280,max_lines=1)
   if row.get('ci'):
    a,b=[position(x)for x in row['ci']];draw.line((a,y+39,b,y+39),fill=INK,width=3)
    draw.line((a,y+22,a,y+56),fill=INK,width=3);draw.line((b,y+22,b,y+56),fill=INK,width=3)
  if spec.get('note'):text(draw,(185,795),spec['note'],30,MUTED,width=1520,max_lines=2)
 elif kind=='goal':
  gem(draw,340,405,75,color=SAGE)
  text(draw,(515,310),spec.get('stone','次に探したい石'),49,INK,True,width=1100,max_lines=1)
  body(draw,spec.get('body',[]),515,435,1100,40,35)
 elif kind=='battle':
  body(draw,spec.get('body',[]),695,315,1090,42,42,bottom=735)
  if spec.get('note'):text(draw,(695,775),spec['note'],30,MUTED,width=1080,max_lines=2)
  if spec.get('unreleased',True):
   draw.rounded_rectangle((665,25,1200,67),12,fill=(255,250,242,245))
   text(draw,(682,29),'公開版スキル・研究用セーブ',27,ROSE,True)
 elif kind=='summary':
  if spec.get('status'):
   gem(draw,255,370,43,solid=bool(spec.get('certified',False)),color=ROSE)
   text(draw,(345,315),spec['status'],53,ROSE,True,width=1320,max_lines=1)
  body(draw,spec.get('body',[]),220,450,1480,40,32)
 else:raise ValueError(('Unknown scene kind',kind))
 return out

def render_scene(spec,path):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 inputs={'code':sha(__file__),'desk':sha(A/'research-desk-original.png'),'artMap':sha(A/'art-map.json')}
 if spec.get('evidence'):
  inputs['evidence']=sha(ROOT/spec['evidence'])
  assert spec.get('evidenceSha256')==inputs['evidence'],'Evidence hash missing or changed; regenerate the frozen graph specification'
 for family in ['NotoSansCJK','NotoSerifCJK']:
  for weight in ['Regular','Bold']:
   name=family+'-'+weight+'.ttc';inputs[name]=sha(Path('/usr/share/fonts/opentype/noto')/name)
 key=hashlib.sha256(json.dumps({'spec':spec,'inputs':inputs},ensure_ascii=False,sort_keys=True).encode()).hexdigest()
 meta=path.with_suffix(path.suffix+'.json')
 if path.exists()and meta.exists():
  cached=json.loads(meta.read_text())
  if cached.get('key')==key and cached.get('sha256')==sha(path):return path
 scene(spec).convert('RGB').save(path)
 meta.write_text(json.dumps({'key':key,'spec':spec,'inputHashes':inputs,'sha256':sha(path),'size':[W,H],
  'gameRectangle':GAME if spec.get('kind')=='battle'else None,
  'captionContract':BATTLE_CAPTION if spec.get('kind')=='battle'else[115,930,1690,130]},ensure_ascii=False,indent=2))
 return path

if __name__=='__main__':
 samples=[
 ('subject',{'kind':'subject','title':'この子を、選び続けたい。','characterId':'mireille',
  'body':['回復と障壁を持つ、SRの女神。','勝てることと、選ぶ理由を分けて考える。']}),
 ('concept',{'kind':'concept','title':'守った力を、次の一撃へ。','section':'技能案 · 研究版で検証',
  'phase':2,'note':'何も防がなければ、花は咲かない。'}),
 ('preview',{'kind':'preview','title':'次の研究ノート','characterId':'miette',
  'body':['守りを、命に縫い直す子。']}),
 ]
 for name,spec in samples:render_scene(spec,O/f'previews/art-{name}.png')

