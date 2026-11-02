"""Tsumugi's research notebook: semantic diagrams, original-art contain, safe heads."""
from pathlib import Path
from functools import lru_cache
import json,math
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-01';A=O/'assets'
W,H=1920,1080;INK='#54394e';PLUM='#71435f';PINK='#b45a87';MINT='#568e83';LAV='#9b82bb';GOLD='#bb8739';CREAM='#fffaf3';EDGE='#d9bfce';MUTED='#8a7182'
COL={'t':'#986110','z':'#3e7543','m':'#8b3f74'};NAMES={'t':'春日部つむぎ','z':'ずんだもん','m':'四国めたん'}
@lru_cache(None)
def font(n,b=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if b else'Regular')+'.ttc',n)
def wrap(s,n,w):
 out=[];v=''
 for c in str(s):
  if c=='\n'or font(n).getlength(v+c)>w:out.append(v);v=''if c=='\n'else c
  else:v+=c
 if v:out.append(v)
 return out or['']
def text(d,x,y,t,n=36,color=INK,b=True,width=None,anchor=None):
 lines=wrap(t,n,width)if width else str(t).split('\n')
 for i,line in enumerate(lines):d.text((x,y+i*round(n*1.36)),line,font=font(n,b),fill=color,anchor=anchor)
 return y+len(lines)*round(n*1.36)
def fit_text(d,x,y,t,n,w,color=INK,b=True):
 while font(n,b).getlength(t)>w and n>20:n-=1
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
 im=backdrop().copy();d=ImageDraw.Draw(im);text(d,27,14,'ビルド研究日誌',28,PLUM);text(d,575,17,'みんなが輝くRPGを！',24,PINK);text(d,1284,17,'#01 ルカ ／ 残り糸・留め縫い',25,GOLD);d.line((27,57,1893,57),fill=EDGE,width=2);d.rounded_rectangle((296,73,1624,923),28,fill=CREAM,outline=EDGE,width=2);fit_text(d,320,85,ch.get('title',''),24,1210,MUTED)
 if ch.get('clip')and not full:d.rounded_rectangle((304,60,802,936),18,fill='#28252e',outline=MINT,width=3)
 scope=None
 if ch['id']in['new-skill','trial','necessity','first-draft','recipe','lab-victory-a','lab-victory-b','no-ruka','alternatives','growth']:scope='LAB ／ 研究用の試作'
 if ch['id']=='resource':scope='現行の糸 ＋ 新石はLAB'
 if scope:pill(d,(1212,79,1596,125),scope,GOLD,'#fff0d0',23)
 return im

def diagram(base,ch,phase,full=False):
 d=ImageDraw.Draw(base);id=ch['id'];side=bool(ch.get('clip'))and not full;x=848 if side else 346;w=744 if side else 1228;y=160
 if id=='roster':
  title(d,346,170,'少女たちの研究ノート',1220);note(d,365,850,'49名・72の姿 ／ 現行認定 0・試作認定 1',1180,33);return
 if id=='question':
  card(base,'ruka',(360,220,350,564),'夜継ぎの仕立て屋',True);title(d,777,196,'ルカだから、できる仕事。',790,49);text(d,778,331,'余った守りを、\n次の勝ち筋へ。',55,PLUM);pill(d,(778,521,1552,607),'「勝てた」から「この子が必要」へ',MINT,size=31);note(d,784,682,'現行能力を確かめてから、\n新技と試練を研究室で試す。',750,32);note(d,365,836,'現行映像：顔グラ修正後 v1.11 ／ 戦闘ルール v1.10と一致',1190,26)
 elif id=='ruka-now':
  title(d,x,y,'残りがあるまま、期限へ。',w,43)
  if side:
   for i,(h,b)in enumerate([('張る','味方が障壁を用意'),('余らせる','割れずに自然失効'),('拾う','ルカが残り糸を得る')]):
    yy=270+i*175;d.rounded_rectangle((x+8,yy,x+w-16,yy+128),22,fill='#eaf3e9'if phase%3==i else CREAM,outline=MINT if phase%3==i else EDGE,width=3);text(d,x+34,yy+12,h,35,MINT);text(d,x+34,yy+65,b,32,PLUM)
   note(d,x+18,824,'破壊・砕盾での消費では得られない。',w-36,26)
  else:
   for i,(h,b)in enumerate([('障壁','正の残量を残す'),('自然失効','期限を迎える'),('残り糸','夜継ぎの鋏を強化')]):
    xx=x+i*420;d.rounded_rectangle((xx,280,xx+385,680),24,fill='#edf4eb',outline=EDGE,width=3)
    if i==0:shield(d,xx+192,407,57)
    elif i==1:clock(d,xx+192,407,57)
    else:gem(d,xx+192,407,51,MINT,False)
    text(d,xx+34,501,h,43,MINT);text(d,xx+34,583,b,30,PLUM,width=320)
    if i<2:arrow(d,(xx+389,470),(xx+418,470))
   note(d,x+20,777,'守りを張る人・受ける人・拾うルカ。それぞれに仕事がある。',w-40,33)
 elif id=='candidates':
  if phase<2:
   title(d,x,y,'同じ仲間を支えに、先頭を替える。');ids=['ruka','nox','athena','benzaiten'];roles=['比較する枠','共通','共通','共通']
   for i,(cid,role)in enumerate(zip(ids,roles)):card(base,cid,(x+i*309,247,285,420),role,i==0)
   pill(d,(367,714,1545,785),'第1・3層：ほかの70体にも勝利があった',MINT,size=36);note(d,368,836,'固定の所持条件・操作で各20seed。唯一解の証明ではない。',1175,28)
  else:
   title(d,x,y,'100層から、追加調査の候補へ。');cw=75;gap=13;left=x+110
   for n in range(1,101):
    xx=left+(n-1)%10*(cw+gap);yy=245+(n-1)//10*54;active=n in[20,30];d.rounded_rectangle((xx,yy,xx+cw,yy+43),8,fill='#f6dfa7'if active else'#f1ecef',outline=GOLD if active else EDGE,width=3 if active else 1);text(d,xx+17,yy+4,str(n),23,GOLD if active else MUTED)
   pill(d,(367,830,1548,892),'第20層・第30層に仮の印 ◇　まだ認定ではない',GOLD,'#fff2d5',30)
 elif id=='revoke':
  title(d,x,y,'候補を増やすと、反例が見えた。');card(base,'ruka',(360,258,270,459),'現行ステージの候補');card(base,'elaine-awakened',(1308,258,270,459),'別キャラでも勝利')
  text(d,675,272,'同じ20seedで再確認',31,PLUM);headers=[('第20層','6 / 20','11 / 20'),('第30層','8 / 20','11 / 20')]
  for i,(h,a,b)in enumerate(headers):
   yy=369+i*157;d.rounded_rectangle((666,yy,1266,yy+132),18,fill='#f9eaf0',outline=EDGE,width=2);text(d,688,yy+13,h,28,PLUM);text(d,688,yy+59,a,43,GOLD);arrow(d,(933,yy+83),(1001,yy+83),PINK,6);text(d,1041,yy+59,b,43,MINT)
  gem(d,494,777,26,GOLD,False,True);text(d,541,747,'現行20/30層の仮説は撤回',34,PLUM,width=850);gem(d,744,860,23,GOLD,True);text(d,784,836,'LABの試作認定は、別条件で保持',29,GOLD)
 elif id=='resource':
  title(d,x,y,'余らせたい守りを、仲間で守る。');ids=['fio','liora-awakened','ruka'];roles=['回復＋障壁を供給','攻撃を受け持つ','自然失効を拾う']
  for i,(cid,role)in enumerate(zip(ids,roles)):card(base,cid,(x+14+i*414,258,370,429),role,cid=='ruka')
  for i,(h,b)in enumerate([('自分へ障壁60','新石案・再使用3R'),('残量を残して期限へ','割れたら糸にならない'),('残り糸1個','次の仕事へ使う')]):
   xx=x+i*414;d.rounded_rectangle((xx,738,xx+377,867),18,fill='#eaf3e9',outline=EDGE,width=2);fit_text(d,xx+15,yy:=752,h,31,347,MINT);fit_text(d,xx+15,yy+58,b,23,347,MUTED)
   if i<2:arrow(d,(xx+382,804),(xx+411,804))
 elif id=='new-skill':
  if phase<3:
   title(d,x,y,'留め縫い：一手を、仲間のために。');card(base,'ruka',(360,249,310,507),'糸1個＋通常の1手',True);xx=747;text(d,xx,273,'HP回復を止める',58,PINK);text(d,xx+5,393,'使用R ＋ 次R終了まで',39,PLUM);pill(d,(754,503,1546,583),'ダメージ0 ／ 再使用3R',GOLD,'#fff0d0',34);text(d,xx+5,654,'同じ糸は、鋏と二重に使えない。',31,MUTED,width=790);text(d,365,832,'例：R3で使用 → R3・R4に有効 ／ 次の使用可能はR6',30,PLUM)
  else:
   title(d,x,y,'増やすより、必要な一手を探す。')
   for i,(h,b,col)in enumerate([('新LSの保管案','今回は成立に不要 → 保留',MUTED),('新しい通常技','糸を何へ使うかを選ぶ',MINT)]):
    xx=x+i*630;d.rounded_rectangle((xx,295,xx+590,665),25,fill='#f8edf1'if i==0 else'#eaf3e9',outline=col,width=3);text(d,xx+28,337,h,42,col);text(d,xx+28,466,b,34,PLUM,width=535)
   text(d,x+28,770,'現行リーダースキルを維持し、まず通常技1つで試す。',35,PLUM,width=w-50)
 elif id=='trial':
  title(d,x,y,'ほどける回廊 ／ 研究用の試練')
  if phase<3:
   text(d,x+22,260,'4,800 HP',89,PLUM);d.rounded_rectangle((x+25,404,x+1180,447),15,fill='#e7d8e2');d.rounded_rectangle((x+25,404,x+1180,447),15,fill='#be7d9d');clock(d,x+1090,303,65,GOLD)
   for i,(h,b,col)in enumerate([('通常時','全HPダメージを合算\n最大300 / R',MINT),('R4・8・12…','回廊の周期で\nHPを全回復',PINK),('縫い傷中','回復停止 ＋\n上限解除',GOLD)]):
    xx=x+i*415;d.rounded_rectangle((xx,525,xx+380,783),22,fill=CREAM,outline=col,width=3);text(d,xx+25,549,h,36,col);text(d,xx+25,625,b,31,PLUM,width=330)
   note(d,x+15,843,'1ウェーブ・40R制限。新技・新石・この試練は配信版本体とは別。',w-35,27)
  else:
   clock(d,x+1010,380,110,GOLD);text(d,x+20,297,'睡眠・封印',55,MUTED);arrow(d,(x+410,366),(x+800,366),MUTED);text(d,x+500,414,'時計は遅れない',42,GOLD)
   pill(d,(x+20,596,x+1180,684),'敵の通常行動と、回廊の周期は別の仕組み',MINT,size=35);note(d,x+25,772,'予告と敵の説明に、違いを明示する必要がある。',w-45,33)
 elif id=='necessity':
  title(d,x,y,'縫い傷がない時、削れる量の上界。')
  for i in range(4):
   xx=x+17+i*238;d.rounded_rectangle((xx,269,xx+211,408),20,fill='#eaf3e9',outline=MINT,width=3);text(d,xx+21,283,'R'+str(i+1),29,MINT);text(d,xx+43,332,'300',44,PLUM)
   if i<3:text(d,xx+213,321,'＋',34,MINT)
  text(d,x+987,304,'最大',29,GOLD);text(d,x+950,351,'1,200',47,GOLD)
  text(d,x+22,486,'4 × 300 = 1,200 < 4,800',73,PLUM)
  d.rounded_rectangle((x+20,643,x+1190,700),18,fill='#b87997');d.rounded_rectangle((x+20,643,x+312,700),18,fill='#efe0e7');text(d,x+366,720,'最低3,600 HP 残る → 全回復',43,PINK)
  note(d,x+20,831,'味方が無敵で毎回上限まで攻撃できても、倒し切れない。',w-40,30)
 elif id=='first-draft':
  title(d,x,y,'初案：装備が育っても、同じ壁。')
  if phase<3:
   for i,(tier,col)in enumerate([('T3',MINT),('T6',GOLD)]):
    yy=321+i*203;text(d,x+20,yy,tier,54,col);d.rounded_rectangle((x+180,yy+9,x+943,yy+90),17,fill=col);text(d,x+973,yy+9,'6.38R',47,col)
   pill(d,(x+678,704,x+1164,791),'このままは不採用',PINK,'#f8e4eb',37);note(d,x+20,835,'初案HP1,800・常時上限300。T3もT6も平均6.38R。',w-40,30)
  else:
   for i,(h,b,col)in enumerate([('ルカが開く','回復停止で\n上限も解除',PINK),('仲間が走る','育てた火力が\nその時間へ届く',MINT)]):
    xx=x+i*650;d.rounded_rectangle((xx,304,xx+575,724),25,fill='#faedf1'if i==0 else'#eaf3e9',outline=col,width=3);text(d,xx+31,349,h,51,col);text(d,xx+31,486,b,39,PLUM,width=510)
   arrow(d,(x+585,506),(x+640,506),GOLD);note(d,x+20,824,'一人の役割と、仲間の成長の両方を残す。',w-40,35)
 elif id=='recipe':
  if phase<2:
   title(d,x,y,'四人で、ルカの仕事を作る。');ids=['ruka','nox','athena','fio'];roles=['先頭：糸の操作','攻撃＋慈雨の回復','攻撃の受け持ち','回復＋仮縫い障壁']
   for i,(cid,role)in enumerate(zip(ids,roles)):card(base,cid,(x+i*309,258,285,460),role,i==0)
   pill(d,(367,770,1545,843),'研究用の所持条件 ／ 現行と試作を分けて記録',MINT,size=31)
  else:
   title(d,x,y,'挑戦前に、連携を組める入口を。')
   for i,(h,b,col)in enumerate([('迎える','第7章の確定素材で\nルカを迎える',MINT),('準備する','技・石は\n挑戦より前に用意',GOLD),('挑む','試作の役割と\n操作の結果を追う',PINK)]):
    xx=x+i*415;d.rounded_rectangle((xx,303,xx+380,724),23,fill=CREAM,outline=col,width=3);text(d,xx+30,345,h,43,col);text(d,xx+30,476,b,34,PLUM,width=320)
    if i<2:arrow(d,(xx+384,505),(xx+411,505),MINT)
   note(d,x+20,819,'新規プレイの入手時間を測った動画ではない。',w-40,31)
 elif id in['lab-victory-a','lab-victory-b']:
  title(d,x,y,'残す守りを、次の一手へ。'if id.endswith('-a')else'開けた時間を、つなぎ直す。',w,42)
  items=[('供給','フィオの障壁60'),('変換','自然失効 → 残り糸'),('開放','留め縫い → 仲間の攻撃')]if id.endswith('-a')else[('次の周期','期限と再使用待ちを見る'),('攻めながら守る','ノクスの慈雨をつなぐ'),('seed1の到達例','妖精2回 / 花6回 / 回復薬0')]
  if side:
   for i,(h,b)in enumerate(items):
    yy=283+i*173;d.rounded_rectangle((x+7,yy,x+w-14,yy+130),20,fill='#fff0d0'if phase%3==i else CREAM,outline=GOLD if phase%3==i else EDGE,width=3);text(d,x+30,yy+13,h,34,GOLD);fit_text(d,x+30,yy+72,b,30,w-70,PLUM)
  else:
   for i,(h,b)in enumerate(items):
    xx=x+i*414;d.rounded_rectangle((xx,315,xx+380,690),22,fill='#fff4df',outline=GOLD,width=3);text(d,xx+25,355,h,42,GOLD);text(d,xx+25,493,b,34,PLUM,width=330)
   gem(d,x+55,796,25,GOLD,True);text(d,x+106,764,'LABの条件で、ルカの役割を確認した到達例',33,GOLD,width=1100)
  if id=='lab-victory-b':note(d,x+18,838,'seed1：妖精2回 ／ 花6回 ／ 回復薬0',w-36,25)
 elif id=='no-ruka':
  title(d,x,y,'火力や手数だけでは、届かない。',w,41)
  if side:
   text(d,x+20,279,'4 × 300',68,MINT);text(d,x+20,395,'= 1,200',68,MINT);text(d,x+20,518,'< 4,800 HP',55,PINK);pill(d,(x+15,681,x+w-14,761),'T6構成でも、回復の前に倒せない',GOLD,'#fff0d0',28);note(d,x+20,802,'10R全滅（映像は1〜5R抜粋）',w-40,27);note(d,x+20,854,'探索0勝と、数理上界は別の根拠。',w-40,24)
  else:
   for i,(h,b)in enumerate([('ルカ不在','縫い傷が付かない'),('糸の供給なし','留め縫いを使えない'),('新技なし','回復と上限が続く')]):
    xx=x+i*414;d.rounded_rectangle((xx,320,xx+380,712),22,fill='#f4edf1',outline=EDGE,width=3);text(d,xx+28,354,h,40,PINK);text(d,xx+28,488,b,34,PLUM,width=320)
   note(d,x+20,824,'キャラを持っているだけでなく、仕事が動く組み合わせが必要。',w-40,31)
 elif id=='alternatives':
  if phase<2:
   title(d,x,y,'ルカを核に、三つの席を替える。')
   for row,(ids,roles,label,result)in enumerate([(['ruka','nox','athena','fio'],['核','攻撃','守り','回復・供給'],'基本編成','100/100 · 11.63R'),(['ruka','seris-awakened','liora-awakened','benzaiten'],['核','別の攻撃役','別の守り役','別の回復役'],'3人を全員交替','100/100 · 11.71R')]):
    yy=250+row*324;text(d,x+14,yy-45,label,28,MINT);text(d,x+760,yy-45,result,30,GOLD)
    for i,(cid,role)in enumerate(zip(ids,roles)):card(base,cid,(x+i*309,yy,285,260),role,i==0,True)
   note(d,x+20,870,'同じT4中心の研究条件。残る3枠には選択肢がある。',w-40,26)
  else:
   title(d,x,y,'同じ役割でも、同じ結果ではない。');card(base,'neri',(365,260,305,490),'守り役を置換');text(d,747,288,'ネリへ替えた構成',42,PLUM);text(d,747,376,'68 / 100',79,PINK);text(d,747,544,'新石を使わない構成',39,PLUM);text(d,747,627,'98 / 100',76,MINT);note(d,365,832,'新石は準備の入り口。唯一の鍵にはしない。',1180,32)
 elif id=='growth':
  if phase==0:
   title(d,x,y,'石を更新する力も、攻略へ届く。');text(d,x+20,233,'平均攻略R（短いほど速い）',30,MUTED);barX=x+221;barW=809
   for i,(tier,val,col)in enumerate([('T3',12.36,MINT),('T4',11.63,'#749d8e'),('T5',10.97,LAV),('T6',9.70,GOLD)]):
    yy=309+i*129;text(d,x+20,yy,tier,43,col);d.rounded_rectangle((barX,yy+7,barX+barW,yy+73),14,fill='#eee7eb');d.rounded_rectangle((barX,yy+7,barX+barW*val/16,yy+73),14,fill=col);text(d,barX+barW*val/16+20,yy+9,f'{val:.2f}R',36,col)
   note(d,x+20,872,'各100seed、指定した可変石の威力・特性を各Tier上限へ。',w-40,25)
  elif phase==1:
   title(d,x,y,'必殺の温存は、実測では改善しなかった。');pill(d,(x+18,242,x+1160,300),'別の試作版での操作比較：第3案／T6',GOLD,'#fff0d0',28)
   for i,(h,v,col)in enumerate([('通常の予約',8.93,MINT),('開放まで温存',9.66,PINK)]):
    yy=382+i*210;text(d,x+18,yy,h,38,col);d.rounded_rectangle((x+370,yy+9,x+370+670*v/12,yy+89),16,fill=col);text(d,x+955,yy+12,f'{v:.2f}R',46,col)
   note(d,x+20,827,'綺麗な説明だけで最適解としない。原因の寄与は未分解。',w-40,29)
  else:
   title(d,x,y,'数字は、次を考えるためのノート。');text(d,x+45,360,'100 / 100',94,MINT);text(d,x+592,387,'≠',94,PINK);text(d,x+760,369,'全乱数\n100％',63,PLUM);note(d,x+40,686,'指定条件・指定seedの成績。\n人間の初見の難しさとは別に考える。',w-80,38)
 elif id=='audit':
  if phase==0:
   title(d,x,y,'過去のページも、事実のまま残す。');ids=['noelle','iris','fio'];roles=['号令の案 ◇','巻戻しの案 ◇','白花の案 ◇']
   for i,(cid,role)in enumerate(zip(ids,roles)):card(base,cid,(x+18+i*413,259,370,455),role)
   pill(d,(367,773,1546,843),'現行の本認定 0 ／ LABの試作認定 1',GOLD,'#fff0d0',36)
  else:
   title(d,x,y,'最後の専用攻略先を失ったら、認定を外す。',w,42)
   for i,(h,b)in enumerate([('新しい研究','認定済みの全攻略先を再審'),('一つでも残る','同じ条件で専用性を確認'),('最後も代替された','宝石を外し、次の役割へ')]):
    xx=x+20+i*414;d.rounded_rectangle((xx,322,xx+375,708),22,fill='#eaf3e9'if i==1 else CREAM,outline=MINT if i==1 else EDGE,width=3);text(d,xx+24,354,h,36,MINT if i==1 else PINK,width=330);text(d,xx+24,499,b,31,PLUM,width=325)
   note(d,x+20,802,'運用ルールの図。今回、旧キャラの本認定を剥奪した実績ではない。',w-40,27)
 elif id=='future':
  title(d,x,y,'接待の一歩から、自然な役割へ。')
  for i,(h,b,col)in enumerate([('今の一歩','任意の専用試練で\n仕事を具体化',GOLD),('次の研究','得意・苦手・\n助け合いを増やす',PINK),('目指す先','自然なオンリーワンとして\n輝く少女たち',MINT)]):
   xx=x+i*415;d.rounded_rectangle((xx,307,xx+380,737),23,fill=CREAM,outline=col,width=3);text(d,xx+28,350,h,41,col);text(d,xx+28,495,b,32,PLUM,width=324)
   if i<2:arrow(d,(xx+384,518),(xx+411,518))
  text(d,x+20,829,'未研究の子も、ノートから消さない。',40,PLUM,width=w-40)
 else:
  title(d,x,y,'一人の仕事から、みんなの可能性へ。')

def plate(ch,phase,output,full=False,illustration=None):
 im=base_plate(ch,phase,full or not bool(ch.get('clip')))
 if illustration:contained(im,Image.open(A/(illustration+'.png')).convert('RGBA'),(320,131,1280,770),25)
 else:diagram(im,ch,phase,full)
 im.convert('RGB').save(output)
def phase_for(ch,line,index):
 id=ch['id']
 if id=='growth':return 0 if index<3 else 1 if index<5 else 2
 if id=='audit':return 0 if index<4 else 1
 return index//2

def illustration_for(ch,line,index):
 if ch['id']=='revoke'and index in[3,7]:return'research-lab'
 if ch['id']=='audit'and index==8:return'research-lab'
 if ch['id']=='future'and index>=6:return'research-lab'
 return None

def poses(ch,line,index):
 t=line['text'];who=line['speaker'];id=ch['id']
 if id in['revoke','audit','future']and any(word in t for word in['寂し','諦め','消え','大切','取り残','消さない','好きだから']):left='t-research-care'
 elif id in['question','new-skill','trial','necessity','recipe','lab-victory-a','lab-victory-b']:left='t-research-determined'if index%3!=1 else't-research-think'
 elif any(word in t for word in['比べ','検証','考え','研究','数字','必要','未確認','試作']):left='t-research-think'
 else:left='t-research-happy'
 if who=='z':right='z-panic'if any(word in t for word in['なくな','寂し','駄目','負け','まだ','ゼロ'])else'z-happy'
 elif who=='m':right='m-deadpan'if id in['revoke','necessity','audit','growth']else'm-happy'
 else:right=('m-deadpan'if id in['revoke','audit']else'm-happy')if index%2==0 else'z-happy'
 return left,right
