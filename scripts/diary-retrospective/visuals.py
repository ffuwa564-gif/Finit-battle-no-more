"""Pink central-stage diagrams and safe full-head character composition for the re-edit."""
from pathlib import Path
from functools import lru_cache
import json,math
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-retrospective';A=O/'assets'
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

def blocks(d,x,y,w,items,active=0):
 gap=29;ww=(w-gap*(len(items)-1))/len(items)
 for i,(head,body)in enumerate(items):
  xx=x+i*(ww+gap);d.rounded_rectangle((xx,y,xx+ww,y+330),23,fill='#faedf3'if i==active else CREAM,outline=PINK if i==active else EDGE,width=4 if i==active else 2);text(d,xx+22,y+26,head,37,PINK,width=ww-44);text(d,xx+22,y+118,body,30,INK,width=ww-44)
def diagram(base,ch,phase,full=False):
 d=ImageDraw.Draw(base);id=ch['id'];x=858 if ch.get('clip')and not full else 346;w=738 if ch.get('clip')and not full else 1228;y=154
 def title(t):
  n=46
  while font(n,True).getlength(t)>w-20 and n>30:n-=1
  text(d,x,y,t,n,PLUM,width=w-20)
 if id=='recap':
  title('攻略は進んだ。でも、欲しくなった？')
  for i,(cid,role)in enumerate([('iris','巻戻し：味方の次の仕事へ'),('fio','白花：回復と育てる楽しさ'),('lunette-awakened','第二層：全体＋単体の役割')]):card(base,cid,(x+i*411,y+112,380,470),role,phase%3==i)
  text(d,x+20,y+642,'完成品の説明 → 自分も組みたい、へ届いたか。',36,PLUM)
 elif id in['build','build_intro']:
  title('守る行動が、次の回復へ。')
  items=[('意図','次の回復を間に合わせたい'),('入力','今、防御を選ぶ'),('発動','巻戻しで通常スキルCDを短縮'),('結果','味方の仕事を早く戻す')]
  if full:
   blocks(d,x,y+145,w-8,items,phase%4)
   for i in range(3):arrow(d,(x+294+i*309,y+505),(x+319+i*309,y+505))
   text(d,x+25,y+585,'石の名前より、連携が動いた瞬間を。',40,PLUM);text(d,x+25,y+680,'石の再使用待ちは必要。短縮対象は味方の通常スキル。',28,MUTED)
  else:
   for i,(h,b)in enumerate(items):
    yy=y+105+i*145;chip(d,(x,yy,x+w-20,yy+108),h+'：'+b,size=30,color=PINK if phase%4==i else MUTED)
 elif id=='build_flower':
  title('今の小さな回復が、あとで咲く。')
  if full:
   for i,(v,cap)in enumerate([('33','即時回復'),('92','開花の合計'),('125','実回復の合計')]):
    xx=x+35+i*411;text(d,xx,y+170,v,104,PINK if i!=1 else COL['z']);text(d,xx,y+315,cap,37,PLUM)
   text(d,x+50,y+447,'開花の内訳：50 ＋ 0 ＋ 42',43,COL['z']);text(d,x+50,y+554,'使い手の弱点と、最初の代用品も見せたい。',36,PLUM);text(d,x+50,y+666,'同じ成功例の実測。毎回125回復する固定効果ではない。',27,MUTED)
  else:
   text(d,x+10,y+142,'33 ＋ 92',85,PINK);text(d,x+15,y+271,'即時 ＋ 開花',40,PLUM);text(d,x+10,y+399,'白花成功例の実測値',34,MUTED);text(d,x+10,y+523,'石だけの因果効果ではない。',29,INK,width=w-25)
 elif id=='causes':
  title('原因を、分けて確かめる。');blocks(d,x,y+137,w,[('動画で直せる','入手先が見えない\n発動を見逃す\n判断の途中を省略'),('ゲームで試す','共通の守り役に寄る\n別の勝ち筋の席\n選択と代償の違い')],phase%2);text(d,x+15,y+552,'今の記録だけで「どちらが何割」とは決められない。',34,PLUM);text(d,x+15,y+642,'次の比較：石だけ／仲間だけ／リーダーだけを分ける。',31,MUTED)
 elif id=='corner_intro':
  title('ちょっとひと息、必殺図鑑！');card(base,'lunette-awakened',(x+70,y+123,380,510),'全体攻撃の出番',True);text(d,x+560,y+154,'20秒',111,PINK);text(d,x+560,y+337,'かわいい ＋ 何に効く？',40,PLUM,width=630);text(d,x+560,y+476,'攻略の話につながる、小さなコーナー。',32,MUTED,width=610)
 elif id=='ultimate':
  title('必殺図鑑：ルネット')
  if full:
   card(base,'lunette-awakened',(x+10,y+107,330,540),'星時計・ルネット',True);xx=x+414;text(d,xx,y+139,'基礎 190％',85,PINK);text(d,xx,y+281,'全体攻撃 ／ かばう対象外',40,PLUM,width=770);text(d,xx,y+419,'連射60％ → 最後40％',39,PINK);text(d,xx,y+533,'演出の配分。弾数で元の総ダメージは増えない。',29,MUTED,width=745)
  else:
   text(d,x+40,y+155,'うさぎ、来た！',59,PINK);text(d,x+40,y+307,'準備 → 連射 → 最後の一撃',34,PLUM,width=w-60);text(d,x+40,y+496,'敵が並ぶとき、全体へ届く。',34,PLUM,width=w-60)
 elif id=='difficulty':
  title('同じ所持条件・別乱数100通り')
  c=json.loads((ROOT/'artifacts/diary-111/search/confirmatory.json').read_text());wins={r['id']:r['wins']for r in c}
  for i,(label,n,col)in enumerate([('巻戻し編成',wins['rewind'],COL['z']),('白花編成',wins['flower'],PINK)]):
   yy=y+145+i*193;text(d,x+15,yy,label,39,col);d.rounded_rectangle((x+340,yy+6,x+1100,yy+82),15,fill='#eedce6');d.rounded_rectangle((x+340,yy+6,x+340+760*n/100,yy+82),15,fill=col);text(d,x+1124,yy+4,str(n),56,col)
  text(d,x+18,y+561,'比較用T4装備・固定操作の結果。初心者全体の勝率ではない。',31,PLUM,width=w-20);text(d,x+18,y+651,'石単体の優劣、別条件の勝率へは一般化しない。',30,MUTED)
 elif id=='difficulty_result':
  title('第二層：違う条件での2つの記録')
  if full:blocks(d,x,y+145,w,[('40R：時間切れ','通常ルネット／攻撃1人\n薬5個'),('25R：突破','覚醒＋攻撃役追加＋操作変更\n薬3個・妖精4回・花11回')],phase%2)
  else:
   text(d,x+15,y+141,'40R',83,PINK);text(d,x+300,y+168,'時間切れ',43,PLUM);text(d,x+15,y+297,'25R',83,COL['z']);text(d,x+300,y+324,'複数条件を変えて突破',33,PLUM,width=410)
  text(d,x+18,y+584,'覚醒だけの効果としては比べられない。',33,PLUM,width=w-20);text(d,x+18,y+662,'準備の難しさ／操作／負け方を分けて見せる。',29,MUTED,width=w-20)
 elif id=='strategy':
  title('今ある戦略を見せて、次の幅を試す。')
  if phase<2:
   blocks(d,x,y+144,w,[('既存の予告','危険な大技を読む'),('既存の対応','守る／溜めを削る'),('選択の代償','攻撃の手数と再使用待ち'),('結果','なぜ助かり、なぜ負けたか')],phase%4);text(d,x+20,y+575,'敵HPを増やすだけでは、装備の壁に寄りやすい。',36,PLUM)
  else:
   blocks(d,x,y+144,w,[('通常の進行','仕組みを一つずつ覚える\n手持ちで代替する余地'),('任意の高難度','見えた危険へ対応する\n目的で必要な仕事が変わる')],phase%2);text(d,x+20,y+574,'必須キャラの所持確認や、お祈りだけに寄せない。',35,PLUM)
  text(d,x+20,y+669,'予告・防御・溜め削りは実装済み。改善案と分けて検証。',28,MUTED)
 elif id=='play':
  title('プレイヤーが決めた跡を残す。')
  items=[('意図','今、何をしたい？'),('入力','実際に選べる操作'),('結果','予想外も残す'),('次の判断','次はどう変える？')]
  if full:blocks(d,x,y+146,w,items,phase%4)
  else:
   for i,(head,body)in enumerate(items):
    yy=y+114+i*138;chip(d,(x+5,yy,x+w-20,yy+103),head+'：'+body,size=31,color=PINK if phase%4==i else MUTED)
  text(d,x+15,y+659,'次回の記録方針。今回の映像は既存実戦の再掲。',29,MUTED,width=w-20)
 elif id=='split':
  title('分けるなら、役目を分ける。');blocks(d,x,y+147,w,[('攻略編：判断のドキドキ','短い狙い → 最初の選択\n核の連携は本編でも見せる\n単独で楽しめる構成'),('準備編：自分も組める','最初の素材と入手先\n途中で動き始める連携\n妥協装備は検証して示す')],phase%2);text(d,x+20,y+566,'長い周回・厳選は別動画へ。毎回2本を強制しない。',34,PLUM);text(d,x+20,y+653,'準備にも見せ場があるかで、別動画か章分けかを決める。',30,MUTED)
 elif id=='price':
  title('そのビルド、どこから作る？');card(base,'lunette-awakened',(x+12,y+115,330,520),'ルネットの追加分',True)
  for i,(cap,val,unit)in enumerate([('加入','20','歯車'),('覚醒','3','心臓'),('巻戻し製作','6','時計素材')]):
   yy=y+112+i*174;text(d,x+400,yy,cap,35,PLUM);text(d,x+765,yy-9,val,75,PINK);text(d,x+930,yy+21,unit,34,PLUM)
  text(d,x+400,y+644,'既存装備・開放条件あり。新規の所要時間は未測定。',27,MUTED,width=775)
 elif id=='next':
  title('次の一本で、試す3つ。')
  for i,(num,cap,body)in enumerate([('01','働く瞬間を、先に。','短い実戦 → 役割を一枚で → 挑戦'),('02','判断の途中を、残す。','一ラウンド：意図・入力・結果・次の相談'),('03','組み始めの道筋を。','準備編か入手案内で、最初の一歩を見せる')]):
   yy=y+112+i*176;text(d,x+10,yy,num,63,PINK if phase%3==i else MUTED);text(d,x+145,yy,cap,41,PLUM);text(d,x+145,yy+70,body,30,MUTED)
  text(d,x+20,y+672,'次の検証：既存の予告・防御・溜め削り。新しい調整案は別に。',29,PLUM)
 else:title('反省を、次の一手へ。')

def plate(ch,phase,output,full=False,illustration=None):
 base=backdrop().copy();d=ImageDraw.Draw(base);text(d,27,15,'STILLVEIL / 白亜の塔攻略日記',26,PLUM);text(d,1340,14,'Part2までの反省会',28,PINK);d.line((27,57,1893,57),fill=EDGE,width=2);d.rounded_rectangle((296,73,1624,923),28,fill=CREAM,outline=EDGE,width=2)
 if ch.get('clip')and not full:d.rounded_rectangle((304,60,802,936),18,fill='#2d2631',outline=PINK,width=3)
 if illustration:
  im=Image.open(A/(illustration+'.png')).convert('RGBA');contained(base,im,(320,118,1280,770),24);text(d,1454,867,'挿絵',23,MUTED)
 else:diagram(base,ch,phase,full)
 if ch.get('proposal'):chip(d,(1150,83,1598,132),'既存機能＋次版への提案',size=25)
 else:text(d,320,86,ch['title'],24,MUTED,width=1240)
 if ch['id']=='opening':text(d,346,865,'「勝てた」の先に、「自分も作りたい」はあった？',31,PLUM)
 base.convert('RGB').save(output)
def phase_for(ch,l,index):return index//2
def illustration_for(ch,l,index):
 if ch['id']=='opening':return'reflection'
 if ch['id']=='ending':return'reflection'if index<3 else'clubroom'
 if ch['id']=='causes'and index==6:return'reflection'
 return None
def poses(ch,l,index):
 t=l['text'];panic=any(v in t for v in['反省','うっ','難しい','違うのだ','倒れて','失敗','薄かった']);z='z-panic'if panic else'z-happy';girl='t'if l['speaker']=='t'else'm'if l['speaker']=='m'else't'if index%2 else'm';right=('t-think'if ch['id']in['causes','strategy','split']else't-happy')if girl=='t'else('m-deadpan'if panic or ch['id']in['causes','play']else'm-happy');return z,right
