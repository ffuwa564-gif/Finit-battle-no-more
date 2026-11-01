"""Pink central-stage diagrams and safe full-head character composition for the re-edit."""
from pathlib import Path
from functools import lru_cache
import json,math
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2-v2';A=O/'assets'
W,H=1920,1080;PLUM='#642c4e';PINK='#b84b82';INK='#4e2942';CREAM='#fffaf4';EDGE='#dca9c0';MUTED='#886579'
COL={'z':'#3e7543','m':'#aa3c76','t':'#986110'};NAMES={'z':'ずんだもん','m':'四国めたん','t':'春日部つむぎ'}
@lru_cache(None)
def font(n,b=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if b else'Regular')+'.ttc',n)
def wrap(s,n,w):
 out=[];v=''
 for c in str(s):
  if c=='\n' or font(n).getlength(v+c)>w:out.append(v);v=''if c=='\n'else c
  else:v+=c
 if v:out.append(v)
 return out or['']
def text(d,x,y,t,n=36,color=INK,b=True,width=None):
 lines=wrap(t,n,width)if width else[t]
 for i,line in enumerate(lines):d.text((x,y+i*round(n*1.4)),line,font=font(n,b),fill=color)
 return y+len(lines)*round(n*1.4)
@lru_cache(None)
def sprite(id):
 im=Image.open(A/(id+'.png')).convert('RGBA');box=im.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox();assert box
 # Threshold rejects isolated low-alpha generation noise; padded bounds retain hair and clothing outlines.
 x,y,r,b=box;return im.crop((max(0,x-24),max(0,y-24),min(im.width,r+24),min(im.height,b+24)))
def contained(base,im,box,pad=16):
 x,y,w,h=box;im=im.copy();im.thumbnail((w-2*pad,h-2*pad),Image.Resampling.LANCZOS);px=x+(w-im.width)//2;py=y+(h-im.height)//2;base.alpha_composite(im,(px,py));return(px,py,im.width,im.height)
def avatar(id,path):
 im=Image.new('RGBA',(320,440));contained(im,sprite(id),(0,0,320,410),32);im.save(path)
 a=im.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox();assert a and a[0]>=30 and a[1]>=30 and a[2]<=290 and a[3]<=410,(id,a);return a
@lru_cache(None)
def content():
 c=json.loads((ROOT/'artifacts/diary-part2/content.json').read_text());return{v['id']:v for v in c['characters']},{v['id']:v for v in c['assets']}
@lru_cache(None)
def art(id):
 c,a=content();p=ROOT/'public'/a[c[id]['artId']]['path'];return Image.open(p).convert('RGBA')
def card(base,id,box,role='',active=False):
 d=ImageDraw.Draw(base);x,y,w,h=box;d.rounded_rectangle((x,y,x+w,y+h),22,fill=CREAM,outline=PINK if active else EDGE,width=4 if active else 2)
 contained(base,art(id),(x+14,y+14,w-28,h-104),10)
 c,_=content();name=c[id]['name'];name='覚醒ルネット'if id=='lunette-awakened'else name
 text(d,x+15,y+h-89,name,26,PLUM,width=w-28);text(d,x+15,y+h-46,role,25,COL['z']if role in['回復','守り']else PINK,width=w-28)
def arrow(d,a,b,color=PINK,width=8):
 d.line((*a,*b),fill=color,width=width);ang=math.atan2(b[1]-a[1],b[0]-a[0]);s=19;points=[b,(b[0]-s*math.cos(ang-.45),b[1]-s*math.sin(ang-.45)),(b[0]-s*math.cos(ang+.45),b[1]-s*math.sin(ang+.45))];d.polygon(points,fill=color)
def chip(d,box,label,color=PINK,fill='#f5d9e6',size=30):
 d.rounded_rectangle(box,18,fill=fill,outline=color,width=2);text(d,box[0]+17,box[1]+11,label,size,color)
@lru_cache(None)
def backdrop():
 im=Image.new('RGBA',(W,H),'#f9e8ef');d=ImageDraw.Draw(im)
 for x in range(-800,2300,240):d.polygon([(x,0),(x+135,0),(x+750,H),(x+615,H)],fill='#f4dfe9')
 for r in[370,450,530]:d.ellipse((1080-r,440-r,1080+r,440+r),outline='#e8c7d7',width=1)
 d.rectangle((0,935,W,H),fill='#fff8f2');d.line((24,933,1896,933),fill=EDGE,width=2);return im

def lineup(base,phase,before=False):
 d=ImageDraw.Draw(base);ids=['lunette','fio','athena','benzaiten']if before else['lunette-awakened','nox','athena','benzaiten'];roles=['攻撃','回復','守り','回復']if before else['全体攻撃','単体攻撃','守り','回復'];x0=346;y=242;ww=285
 for i,(id,role)in enumerate(zip(ids,roles)):card(base,id,(x0+i*309,y,ww,480),role,active=(phase%4==i))
 chip(d,(365,757,1335,829),'攻撃 1人 ／ 守り・回復 3人'if before else'攻撃 2人 ＋ 守り・回復の土台',size=35)
 text(d,365,850,'フィオの価値がなくなったのではなく、今回ほしい役割を選ぶ。',26,MUTED)

def gear(d,cx,cy,r,color=PINK):
 for i in range(10):
  a=i*math.tau/10;x=cx+math.cos(a)*r;y=cy+math.sin(a)*r;d.rounded_rectangle((x-10,y-10,x+10,y+10),4,fill=color)
 d.ellipse((cx-r+3,cy-r+3,cx+r-3,cy+r-3),fill=color);d.ellipse((cx-r*.38,cy-r*.38,cx+r*.38,cy+r*.38),fill=CREAM)
def heart(d,cx,cy,r,color='#dc77a0'):
 points=[]
 for i in range(101):
  t=i*math.tau/100;points.append((cx+r*math.sin(t)**3,cy-r*(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))/16))
 d.polygon(points,fill=color)

def diagram(base,ch,phase,full=False):
 d=ImageDraw.Draw(base);id=ch['id'];x=858 if ch.get('clip')and not full else 346;w=738 if ch.get('clip')and not full else 1228;y=150
 if id in['hook','first']:
  text(d,x,y,'守りは厚い。',51,PLUM);text(d,x,y+78,'締め切りが守れない。',47,PINK,width=w-25);chip(d,(x,y+186,x+w-15,y+266),'40 ROUND → 時間切れ',size=43);text(d,x,y+316,'蛾の残りHP',33,MUTED);text(d,x,y+365,'1,042',95,PINK);text(d,x,y+515,'攻撃を一人に任せすぎた？',36,PLUM,width=w-20)
 elif id=='carry':
  text(d,x,y,'今回のスタート地点',53,PLUM)
  for i,(title,detail)in enumerate([('前回の白花編成を継続','比較用の所持キャラ・T4装備・開放条件を引き継ぐ'),('今回の追加分','素材集め・加入・覚醒・T1巻戻しはゲーム内で獲得'),('この動画のゲーム版','v1.10.0 ／ 前回会議の新スキル案は未実装')]):
   yy=y+117+i*170;chip(d,(x,yy,x+345,yy+64),title,size=29);text(d,x+375,yy+3,detail,32,INK,width=790)
 elif id=='enemy':
  if phase==4:
   text(d,x,y,'生き残るだけでは、時間切れ。',51,PLUM);d.ellipse((x+110,y+145,x+510,y+545),fill='#f5d9e6',outline=PINK,width=7);text(d,x+166,y+215,'40R',110,PINK);text(d,x+575,y+202,'制限内に',64,PLUM);text(d,x+575,y+310,'敵全員を倒す。',57,PINK);text(d,x+147,y+620,'守りと回復に加えて、倒し切る手数が必要。',35,INK)
  elif phase<2:
   text(d,x,y,'敵の三役を見よう',49,PLUM)
   for i,(cid,role,hp)in enumerate([('moon-moth','全体・睡眠','3,368'),('thorn-witch','弱体・魅了','1,497'),('liora','かばう','2,794')]):
    xx=x+i*408;card(base,cid,(xx,y+103,380,430),role,phase%3==i);text(d,xx+31,y+552,'HP '+hp,37,PINK)
   text(d,x,y+639,'制限は40R。耐えるだけでは勝てない。',39,PLUM)
  else:
   text(d,x,y,'かばうを、どう越える？',50,PLUM);card(base,'liora',(x+55,y+143,260,365),'守る');card(base,'thorn-witch',(x+710,y+143,260,365),'守られる')
   arrow(d,(x+676,y+260),(x+336,y+260));text(d,x+384,y+194,'単体はリオラへ',29)
   arrow(d,(x+545,y+620),(x+185,y+514),COL['z'],7);arrow(d,(x+545,y+620),(x+840,y+514),COL['z'],7)
   text(d,x+275,y+674,'全体攻撃なら、かばうの外へ',35,COL['z'])
 elif id in['jobs','rebuild']:
  text(d,x,y,'仕事を分ける。相方を残す。'if id=='rebuild'else'誰を外すと、何が減る？',49,PLUM)
  if id=='rebuild'and phase>=3:
   card(base,'lunette-awakened',(430,260,450,455),'先頭：行動を予約',True);card(base,'athena',(1050,260,450,455),'リーダー：土台を支える',True);text(d,474,780,'先頭とリーダーは、別の担当。',43,PLUM)
  else:lineup(base,phase,before=id=='jobs'or phase==0)
 elif id=='farm':
  text(d,x,y,'うさぎの歯車を集めよう',51,PLUM);count=18 if phase==1 else 24 if phase>=2 else 0
  for i in range(4):
   xx=x+118+i*282;gear(d,xx,y+230,62,PINK if count>=(i+1)*6 else'#d9c2cf');text(d,xx-35,y+321,str((i+1)*6),58,PINK if count>=(i+1)*6 else MUTED)
  chip(d,(x+24,y+452,x+1150,y+535),'必要20個 → 3周18個では、あと2個！'if count!=24 else'4周24個 → 20個で加入 ／ 残り4個',size=41)
  text(d,x+28,y+590,'実記録：10R → 11R → 13R → 13R ／ 薬0',32,MUTED)
 elif id=='awake':
  text(d,x,y,'星時計の心臓 × 3',48,PLUM,width=w-20)
  for i in range(3):heart(d,x+105+i*(178 if w<800 else 330),y+242,68)
  text(d,x,y+368,'覚醒級を3回クリア',38,PINK,width=w-20);text(d,x,y+439,'16R・14R・15R ／ 薬は合計1個',30,MUTED,width=w-20);text(d,x,y+552,'敵の常設ビットが、そのまま味方に付くわけではない。',29,INK,width=w-20)
 elif id=='stones':
  text(d,x,y,'巻戻しの石は「通常スキル」へ',46,PLUM,width=w-20);gear(d,x+135,y+257,82);text(d,x+280,y+183,'T1',80,PINK);text(d,x+280,y+287,'出力20 ／ 特性なし',37,PLUM)
  chip(d,(x+12,y+430,x+w-25,y+516),'他の味方の通常スキルCD −1',size=38);text(d,x+24,y+568,'石のCDと必殺ゲージは、別。',37,PLUM,width=w-20)
 elif id=='controls':
  text(d,x,y,'編成＋予約で、ひとつの作戦',49,PLUM)
  for i,(num,cap,desc)in enumerate([('01','敵が複数','先頭ルネットの全体攻撃を予約'),('02','必殺が使える','準備できた必殺を、戦況に合わせて'),('03','傷ついたら','薬と回復を使い、倒れる前に支える')]):
   yy=y+137+i*182;text(d,x+15,yy,num,58,PINK if phase%3==i else MUTED);text(d,x+143,yy,cap,38,PLUM);text(d,x+143,yy+67,desc,31,MUTED)
 elif id=='battle1':
  text(d,x,y,'全体と単体、両方で削る',45,PLUM,width=w-20)
  for i,(cid,role)in enumerate([('lunette-awakened','広く削る'),('nox','一体を減らす')]):card(base,cid,(x+18+i*360,y+100,328,435),role,phase%2==i)
  text(d,x+12,y+590,'予定どおり動けない睡眠・魅了にも注意。',32,INK,width=w-20)
 elif id=='ultimate':
  text(d,x,y,'かわいい顔で、全体に。',47,PLUM,width=w-20)
  if full:
   card(base,'lunette-awakened',(x+20,y+105,340,520),'星時計・ルネット',True);xx=x+427;text(d,xx,y+105,'基礎',35,MUTED);text(d,xx,y+157,'190％',101,PINK);text(d,xx,y+292,'全体攻撃 ／ かばう対象外',37,PLUM,width=740)
   chip(d,(xx,y+391,xx+700,y+461),'連射 60％ → 最後の一撃 40％',size=32);text(d,xx,y+494,'表示の配分。弾数で元の総ダメージは増えない。',29,INK,width=740);text(d,xx,y+595,'味方の常設ビット追加や状態異常の解除ではない。',27,MUTED,width=740)
  else:
   text(d,x+60,y+160,'必殺技、来た！',66,PINK,width=w-70);text(d,x+42,y+295,'星時計・うさぎ座の大行進',35,PLUM,width=w-60);text(d,x+42,y+485,'準備 → 連射 → 最後の一撃',33,INK,width=w-60)
 elif id=='battle2':
  text(d,x,y,'敵が減ると、主役も変わる',43,PLUM,width=w-15)
  for i,(cap,col)in enumerate([('3体いる → 全体攻撃',PINK),('1体になったら → 単体の手数',COL['z']),('守り役の次も、睡眠には注意',PLUM)]):
   yy=y+145+i*170;chip(d,(x+10,yy,x+w-20,yy+100),cap,color=col,size=34)
 elif id=='fairy':
  text(d,x,y,'今回は、助けも使いました。',44,PLUM,width=w-20);text(d,x+32,y+150,'妖精',41,COL['z']);text(d,x+255,y+116,'4回',90,COL['z']);text(d,x+32,y+333,'戦場の花',41,PINK);text(d,x+310,y+299,'11回',85,PINK);text(d,x+16,y+535,'この出会いを含めた結果。',37,PLUM,width=w-25)
 elif id=='battle3':
  text(d,x,y,'決着まで、気を抜かない！'if not full else'第二層、突破！',45,PLUM,width=w-20)
  if full:
   for i,(v,cap)in enumerate([('25R','クリア'),('3個','薬を使用'),('4人','全員生存')]):
    xx=x+40+i*405;text(d,xx,y+163,v,91,PINK);text(d,xx,y+303,cap,37,PLUM)
   text(d,x+75,y+475,'妖精4回・花11回の助けも含む実戦記録',40,PLUM);text(d,x+75,y+600,'報酬を確定して、第三層へ。',40,COL['z'])
  else:text(d,x+18,y+174,'残り1体への手数を見る。\n回復とゲージも、最後まで。',40,INK,width=w-25)
 elif id=='review':
  text(d,x,y,'同じ実戦のHP記録を振り返る',47,PLUM);p=json.loads((ROOT/'artifacts/diary-part2/proofs/tower-1.json').read_text());rounds=[g for g in p['groups']if g['kind']=='round'];vals=[sum(u['hp']for u in rounds[0]['before']['battle']['units']if u['side']=='enemy')]+[sum(u['hp']for u in g['after']['battle']['units']if u['side']=='enemy')for g in rounds];top=max(vals);xx=x+70;yy=y+135;gw=1080;gh=350
  for f in[0,.5,1]:
   py=yy+gh*(1-f);d.line((xx,py,xx+gw,py),fill='#e2c8d5',width=2);text(d,xx-60,py-20,str(round(f*100))+'%',23,MUTED)
  pts=[(xx+i*gw/25,yy+gh*(1-v/top))for i,v in enumerate(vals)];d.line(pts,fill=PINK,width=7);r=[11,16,25][min(phase,2)];px,py=pts[r];d.ellipse((px-10,py-10,px+10,py+10),fill=CREAM,outline=PINK,width=5);text(d,max(xx,min(px-110,xx+gw-300)),max(yy,py-78),{11:'11R リオラ撃破',16:'16R 魔女撃破',25:'25R 全員撃破'}[r],27,PINK)
  for r in[0,5,10,15,20,25]:text(d,xx+r*gw/25-12,yy+gh+15,str(r)+'R',24,MUTED)
  text(d,x+90,y+589,'敵の合計HP ／ 25Rで0に。',37,PLUM);text(d,x+90,y+656,'覚醒・編成・操作を一緒に見直した結果。',30,MUTED)
 else:
  text(d,x,y,'ひとりに、全部任せない。',58,PLUM);text(d,x+52,y+133,'全体攻撃 ＋ 単体攻撃 ＋ 守り ＋ 回復',39,PINK);text(d,x+52,y+241,'今回のギャルパワー＝役割分担！',42,PLUM)
  for i,cid in enumerate(['lunette-awakened','nox','athena','benzaiten']):card(base,cid,(x+26+i*306,y+344,280,345),'また次の層へ',phase%4==i)

def plate(ch,phase,output,full=False,illustration=None):
 base=backdrop().copy();d=ImageDraw.Draw(base);text(d,27,15,'STILLVEIL / 白亜の塔攻略日記',26,PLUM);text(d,1380,14,'Part2  ｜ 第二層',28,PINK);d.line((27,57,1893,57),fill=EDGE,width=2)
 d.rounded_rectangle((296,73,1624,923),28,fill=CREAM,outline=EDGE,width=2)
 if ch.get('clip')and not full:d.rounded_rectangle((304,60,802,936),18,fill='#2d2631',outline=PINK,width=3)
 if illustration:
  im=Image.open(A/(illustration+'.png')).convert('RGBA');contained(base,im,(320,98,1280,790),24);text(d,1453,862,'挿絵',24,MUTED)
 elif ch['id']=='opening':
  text(d,395,120,'第二層、編成会議にギャルが来た！',49,PLUM)
  for id,x,ww in[('z-happy',356,340),('t-happy',790,340),('m-happy',1180,430)]:contained(base,sprite(id),(x,260,ww,570),32)
  text(d,605,837,'ルネットの必殺、見せます。',39,PINK)
 else:diagram(base,ch,phase,full)
 text(d,320,87 if not ch.get('clip')or full else 83,ch['title'].split(' ',1)[-1],24,MUTED)
 base.convert('RGB').save(output)

def phase_for(ch,l,index):
 id=ch['id'];source=l.get('sourceLine',index)
 if id=='farm':return 1 if l.get('tag')=='gear18'else 2 if source>=3 else 0
 if id=='enemy':return 0 if source<5 else 1 if source<7 else 2 if source<13 else 4
 if id=='rebuild':return 0 if index<2 else 3 if '先頭' in l['text']or'リーダー' in l['text']else 1+(index//3)%2
 return index//3

def illustration_for(ch,l,index):
 if ch['id']=='opening'and index>=1:return'clubroom'
 if ch['id']=='stones'and l.get('sourceLine')in[5,6,7]:return'shopping'
 if ch['id']=='jobs'and index>=4:return'clubroom'
 if ch['id']=='ending'and l.get('sourceLine')in[3,4,5,6]:return'clubroom'
 return None

def poses(ch,l,index):
 t=l['text'];panic=ch['id']in['hook','first']or any(w in t for w in['足りない','時間切れ','厳しい','眠','寝か','ワンオペ']);girl='t'if l['speaker']=='t'else'm'if l['speaker']=='m'else't'if ch['id']in['opening','rebuild','stones','ending']and index%3!=0 else'm'
 return('z-panic'if panic else'z-happy',('t-think'if ch['id']in['rebuild','stones','controls']else't-happy')if girl=='t'else('m-deadpan'if panic or 'ギャルパワー' in t else'm-happy'))
