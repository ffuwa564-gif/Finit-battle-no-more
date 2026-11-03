"""Tsumugi's research notebook: semantic diagrams, original-art contain, safe heads."""
from pathlib import Path
from functools import lru_cache
import json,math,re
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-05';A=O/'assets'
W,H=1920,1080;INK='#54394e';PLUM='#71435f';PINK='#b45a87';MINT='#568e83';LAV='#9b82bb';GOLD='#bb8739';CREAM='#fffaf3';EDGE='#d9bfce';MUTED='#8a7182'
COL={'t':'#986110','z':'#3e7543','m':'#8b3f74'};NAMES={'t':'春日部つむぎ','z':'ずんだもん','m':'四国めたん'}
@lru_cache(None)
def episode():
 p=O/'render-plan.json';return json.loads(p.read_text())if p.exists()else{}
@lru_cache(None)
def font(n,b=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if b else'Regular')+'.ttc',n)
# Decimal numbers, fractions, ranges, IDs and their units remain whole.
ASCII_TOKEN=re.compile(r"[A-Za-z0-9]+(?:[._:'’][A-Za-z0-9]+)*(?:\s*[/×+−–~〜-]\s*[A-Za-z0-9]+(?:[._:'’][A-Za-z0-9]+)*)*(?:[%％]|個|人|件|回|倍|秒|層|ラウンド)?|\n|.")
CAPACITY='#588ba4'
CUE_Y=765;CUE_BAND=(848,738,744,52);FOOTER_TOP=800
assert CUE_Y+30<FOOTER_TOP

def wrap(s,n,w):
 out=[];line=''
 for token in ASCII_TOKEN.findall(str(s)):
  if token=='\n':out.append(line.rstrip());line='';continue
  if font(n).getlength(token)>w:raise ValueError(f'Unbreakable token exceeds width {w}: {token!r}')
  if line and font(n).getlength(line+token)>w:out.append(line.rstrip());line=token.lstrip()
  else:line+=token
 if line:out.append(line.rstrip())
 return out or['']

def text(d,x,y,t,n=36,color=INK,b=True,width=None,anchor=None):
 lines=wrap(t,n,width)if width else str(t).split('\n')
 for i,line in enumerate(lines):d.text((x,y+i*round(n*1.36)),line,font=font(n,b),fill=color,anchor=anchor)
 return y+len(lines)*round(n*1.36)
def fit_text(d,x,y,t,n,w,color=INK,b=True,minimum=20):
 while font(n,b).getlength(t)>w and n>minimum:n-=1
 assert font(n,b).getlength(t)<=w,('Shorten the approved display phrase before rendering',t,n,w)
 return text(d,x,y,t,n,color,b)
@lru_cache(None)
def sprite(id):
 im=Image.open(A/(id+'.png')).convert('RGBA');box=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();assert box;x,y,r,b=box;return im.crop((max(0,x-24),max(0,y-24),min(im.width,r+24),min(im.height,b+24)))
def contained(base,im,box,pad=16):
 x,y,w,h=map(round,box);im=im.copy();im.thumbnail((max(1,w-2*pad),max(1,h-2*pad)),Image.Resampling.LANCZOS);px=x+(w-im.width)//2;py=y+(h-im.height)//2;base.alpha_composite(im,(px,py));return(px,py,im.width,im.height)
def avatar(id,path):
 im=Image.new('RGBA',(320,440));contained(im,sprite(id),(0,0,320,410),32);im.save(path);a=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();assert a and a[0]>=30 and a[1]>=30 and a[2]<=290 and a[3]<=410,(id,a);return a
@lru_cache(None)
def registry():
 r=json.loads((O/'registry.json').read_text());return r,{v['characterId']:v for v in r['entries']}
@lru_cache(None)
def art(id):
 _,by=registry();return Image.open(ROOT/'public'/by[id]['artPath']).convert('RGBA')
def c_name(id):
 _,by=registry();name=by[id].get('displayName',by[id]['name']);return {'seris-awakened':'覚醒セリス','liora-awakened':'覚醒リオラ','elaine-awakened':'覚醒エレイン','lunette-awakened':'覚醒ルネット'}.get(id,name)
def card(base,id,box,role='',active=False,small=False):
 d=ImageDraw.Draw(base);x,y,w,h=map(round,box);d.rounded_rectangle((x,y,x+w,y+h),22,fill=CREAM,outline=GOLD if active else EDGE,width=4 if active else 2);foot=92 if small else 116;contained(base,art(id),(x+10,y+10,w-20,h-foot-10),12);_,by=registry();text(d,x+14,y+h-foot+1,by[id]['seriesId'],17 if small else 20,MINT);fit_text(d,x+14,y+h-foot+27,c_name(id),24 if small else 28,w-28,PLUM);fit_text(d,x+14,y+h-35,role,19 if small else 23,w-28,GOLD if active else PINK)
def arrow(d,a,b,color=MINT,width=8):
 d.line((*a,*b),fill=color,width=width);ang=math.atan2(b[1]-a[1],b[0]-a[0]);r=18;d.polygon([b,(b[0]-r*math.cos(ang-.45),b[1]-r*math.sin(ang-.45)),(b[0]-r*math.cos(ang+.45),b[1]-r*math.sin(ang+.45))],fill=color)
def gem(d,x,y,r=24,color=GOLD,filled=False,cross=False):
 points=[(x,y-r),(x+r*.88,y-r*.30),(x+r*.52,y+r*.60),(x,y+r),(x-r*.52,y+r*.60),(x-r*.88,y-r*.30)];d.polygon(points,fill='#f1d692'if filled else CREAM,outline=color,width=3);d.line((x-r*.88,y-r*.30,x+r*.88,y-r*.30),fill=color,width=2);d.line((x,y-r,x-r*.33,y-r*.30,x,y+r,x+r*.33,y-r*.30,x,y-r),fill=color,width=2)
 if cross:d.line((x-r*1.2,y+r*1.1,x+r*1.2,y-r*1.1),fill='#9c7d91',width=5)
def shield(d,x,y,r,color=MINT,fill='#e2f0e6'):
 d.polygon([(x-r*.75,y-r),(x+r*.75,y-r),(x+r*.65,y+r*.3),(x,y+r),(x-r*.65,y+r*.3)],fill=fill,outline=color,width=4)
def clock(d,x,y,r,color=PINK):
 d.ellipse((x-r,y-r,x+r,y+r),fill=CREAM,outline=color,width=5);d.line((x,y-r*.65,x,y,x+r*.45,y+r*.12),fill=color,width=5)
def pill(d,box,label,color=MINT,fill='#eaf2e9',size=29):
 d.rounded_rectangle(box,17,fill=fill,outline=color,width=2);fit_text(d,box[0]+17,box[1]+10,label,size,box[2]-box[0]-32,color)
def title(d,x,y,t,w=1200,n=44):fit_text(d,x,y,t,n,w,PLUM)
def note(d,x,y,t,w,n=28):text(d,x,y,t,n,MUTED,width=w)
@lru_cache(None)
def backdrop():
 im=Image.new('RGBA',(W,H),'#f8edf1');d=ImageDraw.Draw(im)
 for x in range(0,W,48):d.line((x,0,x,H),fill='#eee3ec',width=1)
 for y in range(0,936,48):d.line((0,y,W,y),fill='#eee3ec',width=1)
 d.polygon([(0,0),(280,0),(0,936)],fill='#eaf2e8');d.polygon([(1650,0),(1920,0),(1920,936)],fill='#eee7f7');d.rectangle((0,935,W,H),fill='#fff9f1');d.line((24,933,1896,933),fill=EDGE,width=2);return im

def base_plate(ch,phase=0,full=True):
 im=backdrop().copy();d=ImageDraw.Draw(im);text(d,27,14,'ビルド研究日誌',28,PLUM);text(d,575,17,'みんなが輝くRPGを！',24,PINK);text(d,1284,17,episode().get('header','#05 また、咲ける場所を。'),25,GOLD);d.line((27,57,1893,57),fill=EDGE,width=2);d.rounded_rectangle((296,73,1624,923),28,fill=CREAM,outline=EDGE,width=2)
 if ch['id']!='next-episode':fit_text(d,320,85,ch.get('title',''),24,1210,MUTED)
 if ch.get('clip')and not full:d.rounded_rectangle((304,60,802,936),18,fill='#28252e',outline=MINT,width=3)
 research_scope=ch['lab']if 'lab'in ch else ch['id']not in ['roster','elaine-now','future','next-episode'];scope=ch.get('scopeLabel')or('LAB ／ 研究用の試作'if research_scope else None)
 if scope:pill(d,(1212,79,1596,125),scope,GOLD,'#fff0d0',23)
 disclosure=ch.get('clipDisclosure')
 if disclosure:note(d,850,218,disclosure,738,23)
 return im

def block(d,box,head,body='',col=MINT,size=32):
 x,y,w,h=box;d.rounded_rectangle((x,y,x+w,y+h),22,fill='#eaf4ef'if col==MINT else'#fff2d7'if col==GOLD else'#f8edf3',outline=col,width=3);fit_text(d,x+23,y+13,head,30 if h<160 else 38,w-46,col)
 if body:text(d,x+23,y+(64 if h<160 else 91),body,size,PLUM,width=w-46)
def round_row(d,x,y,n=6,rest=None,w=1110,small=False):
 cw=(w-20*(n-1))/n
 for i in range(n):
  color=MINT if i+1==rest else PINK if i==n-1 else LAV
  d.rounded_rectangle((x+i*(cw+20),y,x+i*(cw+20)+cw,y+103),15,fill='#e2f2e9'if i+1==rest else CREAM,outline=color,width=3);text(d,x+i*(cw+20)+14,y+12,f'R{i+1}',27,color);text(d,x+i*(cw+20)+14,y+54,'休息'if i+1==rest else'離脱'if i==n-1 and rest is None else'当番',26,PLUM)
def next_episode_plate(base,ch):
 d=ImageDraw.Draw(base);reviewed,by=registry();registered=reviewed.get('nextEpisodePreview',{})
 assert registered.get('newCertificationGranted')is False,'Next build must remain unverified'
 cid=registered['characterId'];entry=by[cid];series_id=registered['seriesId'];assert entry['seriesId']==series_id
 assert registered['artPath']==entry['artPath']and registered['artSha256']==entry['artSha256'],'Preview and original registry art disagree'
 question=ch.get('previewQuestion')or registered['question'];assert question.strip()
 title(d,347,171,'NEXT EPISODE',335,38);raw=art(cid);art_rect=contained(base,raw,(650,142,620,748),32)
 text(d,1300,260,series_id,34,MINT);name=c_name(cid);name_size=48
 while font(name_size,True).getlength(name)>281 and name_size>20:name_size-=1
 assert font(name_size,True).getlength(name)<=281,'Preview name must remain legible without clipping'
 text(d,1300,329,name,name_size,PLUM);scope='次回の新ビルドは未検証・認定前';pill(d,(1210,808,1604,858),scope,MUTED,'#f5f0f2',24)
 question_layout='\n'.join(ch['previewQuestionLines'])if ch.get('previewQuestionLines')else question.replace('、','、\n',1)
 assert question_layout.replace('\n','')==question,'Preview line breaks may not change the approved question'
 text(d,350,351,question_layout,37,PLUM,width=271);text(d,355,787,'次の頁を、\n一緒に開こう。',28,MINT,width=279)
 ax,ay,aw,ah=art_rect;assert ax>=682 and ay>=174 and ax+aw<=1238 and ay+ah<=858
 source=ROOT/'public'/entry['artPath'];digest=__import__('hashlib').sha256(source.read_bytes()).hexdigest();assert digest==entry['artSha256']
 return {'chapter':ch['id'],'characterId':cid,'seriesId':series_id,'name':name,'artPath':entry['artPath'],'artSha256':digest,'presentation':'contain','fullHeadVisible':True,'nameAndIdVisible':True,'unverifiedLabelVisible':True,'noNewGemClaim':True,'newCertification':False,'artSlot':[650,142,620,748],'artRect':list(art_rect),'originalSize':list(raw.size),'scaledSize':[aw,ah],'minimumInnerPadding':32,'nameRect':list(d.textbbox((1300,329),name,font=font(name_size,True))),'nameFontSize':name_size,'idRect':list(d.textbbox((1300,260),series_id,font=font(34,True))),'unverifiedLabel':scope,'scopeRect':[1210,808,394,50],'question':question,'questionLines':wrap(question_layout,37,271),'actorsOutsideMainArt':True,'method':'Whole unchanged original image contained with padding. Final visibility and lack of new-gem claim require independent final-frame review.'}

def scene_for(ch,phase):
 scenes=episode().get('visualScenes',{}).get(ch['id'],[])
 assert scenes,('Await reviewed, voice-aligned Part5 diagram scenes',ch['id'])
 if phase==99:return scenes[-1]
 assert 0<=phase<len(scenes),(ch['id'],phase,len(scenes))
 return scenes[phase]

def scene_animation(ch,phase):
 if ch['id']in ['roster','next-episode']:return False
 return bool(scene_for(ch,phase).get('animateFrom'))

def capacity_figure(base,d,scene,x,w,progress):
 """Capacity and contents use independent geometry; restoring capacity never adds HP."""
 values=scene['state'];initial=scene.get('animateFrom',values);e=progress*progress*(3-2*progress)
 values={k:initial.get(k,v)+(v-initial.get(k,v))*e for k,v in values.items()}
 original=values['baseMax'];maximum=values['max'];hp=values['hp'];assert 0<=hp<=maximum<=original and original>0
 y=409;bh=142;bx=x+34;bw=w-68
 # Stable original frame makes lost capacity visible, independently of the HP fill.
 d.rounded_rectangle((bx,y,bx+bw,y+bh),25,fill='#ece5ec',outline=EDGE,width=3)
 capacity=bw*maximum/original;fill=bw*hp/original
 if capacity>1:d.rounded_rectangle((bx,y,bx+capacity,y+bh),25,fill='#fffdf7',outline=CAPACITY,width=6)
 if fill>1:d.rounded_rectangle((bx+7,y+7,bx+max(8,fill-7),y+bh-7),18,fill=MINT)
 if capacity<bw-2:
  for px in range(round(bx+capacity+14),round(bx+bw),24):d.line((px,y+19,px,y+bh-19),fill='#cbb9c9',width=4)
 labels=scene.get('labels',{})
 text(d,bx,y-84,labels.get('capacity','HPの器'),31,CAPACITY)
 text(d,bx,y+bh+28,labels.get('contents','いまのHP'),31,MINT)
 if scene.get('showNumbers',True):
  text(d,bx+bw,y-92,f"{round(maximum)} / {round(original)}",43,CAPACITY,anchor='ra')
  text(d,bx+bw,y+bh+18,str(round(hp)),43,MINT,anchor='ra')
 if scene.get('choice'):pill(d,(x+28,654,x+w-28,733),scene['choice'],PLUM,'#f3eaf3',31)

def diagram(base,ch,phase,full=False,progress=1):
 cid=ch['id'];d=ImageDraw.Draw(base);side=bool(ch.get('clip'))and not full;x=848 if side else 346;w=744 if side else 1228
 if cid=='roster':return
 if cid=='next-episode':return next_episode_plate(base,ch)
 s=scene_for(ch,phase);heading=s['heading'];assert font(30,True).getlength(heading)<=w,('Use one short heading',heading)
 fit_text(d,x,159,heading,40,w,PLUM)
 kind=s['kind']
 if kind=='capacity':capacity_figure(base,d,s,x,w,progress)
 elif kind=='character':
  card(base,s['characterId'],(x+(w-374)/2,278,374,477),s.get('role',''),True)
 elif kind=='choice':
  # Exactly one choice at a time. Context remains fixed; the selected action is revealed.
  text(d,x+32,309,s['before'],38,MUTED,width=w-64)
  arrow(d,(x+w/2,408),(x+w/2,472),MINT,7)
  pill(d,(x+24,489,x+w-24,579),s['choice'],GOLD,'#fff2d7',36)
  if progress>=.5:
   assert len(wrap(s['after'],40,w-64))<=2,'Keep the result above the dedicated event-cue band'
   text(d,x+32,643,s['after'],40,MINT,width=w-64)
 elif kind=='metric':
  # One metric / at most two values; full comparison matrices remain in research material.
  rows=s['values'];assert 1<=len(rows)<=2
  for i,row in enumerate(rows):
   yy=295+i*218;col=MINT if row.get('positive',False)else LAV
   text(d,x+22,yy,row['label'],32,col,width=w-44)
   text(d,x+22,yy+58,row['value'],69,col,width=w-44)
 elif kind=='party':
  ids=s['characters'];assert len(ids)<=4;cw=min(285,(w-18*(len(ids)-1))/len(ids));left=x+(w-(cw+18)*len(ids)+18)/2
  for i,entry in enumerate(ids):card(base,entry['id'],(left+i*(cw+18),291,cw,445),entry['role'],entry.get('active',False),side)
 elif kind=='statement':
  # No table/footnote dump: one central conclusion plus an optional simple symbol.
  if s.get('symbol')=='gem':
   filled=False
   if s.get('certificationFromRegistry'):
    reviewed,by=registry();filled=bool(reviewed.get('finalized')and by[s['certificationFromRegistry']]['gems']['badge']=='solid-amber')
   gem(d,x+w/2,346,58,GOLD,filled)
  elif s.get('symbol')=='shield':shield(d,x+w/2,346,58)
  text(d,x+38,461,s['message'],46,PLUM,width=w-76)
 else:raise NotImplementedError(('Unknown reviewed diagram kind',kind))
 caption=s.get('caption')
 if caption:
  assert len(wrap(caption,25,w-24))<=1,('Move long qualifications to research documents',caption)
  text(d,x+12,817,caption,25,MUTED,width=w-24)

def plate(ch,phase,output,full=False,illustration=None,progress=1):
 im=base_plate(ch,phase,full or not bool(ch.get('clip')));metadata=None
 if illustration:contained(im,Image.open(A/(illustration+'.png')).convert('RGBA'),(320,131,1280,770),25)
 else:metadata=diagram(im,ch,phase,full,progress)
 im.convert('RGB').save(output)
 if metadata:
  metadata['processingSha256']=__import__('hashlib').sha256(Path(__file__).read_bytes()).hexdigest();metadata['plate']=str(Path(output).relative_to(ROOT));metadata['plateSha256']=__import__('hashlib').sha256(Path(output).read_bytes()).hexdigest();(Path(output).parent/'next-episode-preview.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))

def phase_for(ch,line,index):
 if ch['id']in ['roster','next-episode']:return 0
 scenes=episode().get('visualScenes',{}).get(ch['id'],[])
 assert scenes,('Await reviewed scenes',ch['id'])
 phases=[i for i,s in enumerate(scenes)if s.get('lineStart',0)<=index]
 assert phases and all(s.get('lineStart',0)<len(ch['lines'])for s in scenes)
 return phases[-1]

def illustration_for(ch,line,index):
 if ch['id']in ['roster','next-episode']:return None
 scene=scene_for(ch,phase_for(ch,line,index));return scene.get('illustration')

def poses(ch,line,index):
 t=line['text'];who=line['speaker']
 if any(word in t for word in ['寂し','諦め','消え','大切','取り残','消さない','好きだから']):left='t-research-care'
 elif any(word in t for word in ['比べ','検証','考え','研究','数字','必要','未確認','試作']):left='t-research-think'
 else:left='t-research-determined'if index%3==0 else't-research-happy'
 if who=='z':right='z-panic'if any(word in t for word in ['なくな','寂し','駄目','負け','ゼロ'])else'z-happy'
 elif who=='m':right='m-deadpan'if index%3==1 else'm-happy'
 else:right='m-happy'if index%2==0 else'z-happy'
 return left,right
