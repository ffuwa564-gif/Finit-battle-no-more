"""Approved pastel geometry; contained game art and complete heads for four speakers."""
from pathlib import Path
from functools import lru_cache
import json,math
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part3';A=O/'assets'
PLUM='#642c4e';PINK='#b84b82';INK='#4e2942';CREAM='#fffaf4';EDGE='#dca9c0';MUTED='#886579'
COL={'z':'#3e7543','m':'#aa3c76','t':'#986110','u':'#8c343c'};NAMES={'z':'ずんだもん','m':'四国めたん','t':'春日部つむぎ','u':'中国うさぎ'}
@lru_cache(None)
def font(n,b=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if b else'Regular')+'.ttc',n)
def wrap(s,n,w):
 out=[];v=''
 for c in str(s):
  if c=='\n'or font(n).getlength(v+c)>w:out.append(v);v=''if c=='\n'else c
  else:v+=c
 if v:out.append(v)
 return out or['']
def text(d,x,y,t,n=36,color=INK,b=True,width=None):
 lines=wrap(t,n,width)if width else str(t).split('\n')
 for i,line in enumerate(lines):d.text((x,y+i*round(n*1.38)),line,font=font(n,b),fill=color)
 return y+len(lines)*round(n*1.38)
@lru_cache(None)
def sprite(id):
 im=Image.open(A/(id+'.png')).convert('RGBA');box=im.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox();assert box;x,y,r,b=box;return im.crop((max(0,x-24),max(0,y-24),min(im.width,r+24),min(im.height,b+24)))
def contained(base,im,box,pad=16):
 x,y,w,h=box;im=im.copy();im.thumbnail((w-2*pad,h-2*pad),Image.Resampling.LANCZOS);px=x+(w-im.width)//2;py=y+(h-im.height)//2;base.alpha_composite(im,(px,py));return(px,py,im.width,im.height)
def avatar(id,path):
 im=Image.new('RGBA',(320,440));contained(im,sprite(id),(0,0,320,410),32);im.save(path);a=im.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox();assert a and a[0]>=30 and a[1]>=30 and a[2]<=290 and a[3]<=410,(id,a);return a
@lru_cache(None)
def content():
 c=json.loads((ROOT/'artifacts/diary-part2/content.json').read_text());return{v['id']:v for v in c['characters']},{v['id']:v for v in c['assets']}
@lru_cache(None)
def art(id):
 c,a=content();return Image.open(ROOT/'public'/a[c[id]['artId']]['path']).convert('RGBA')
def card(base,id,box,role='',active=False):
 d=ImageDraw.Draw(base);x,y,w,h=box;d.rounded_rectangle((x,y,x+w,y+h),22,fill=CREAM,outline=PINK if active else EDGE,width=4 if active else 2);contained(base,art(id),(x+8,y+10,w-16,h-110),10);c,_=content();name={'lunette-awakened':'覚醒ルネット','liora-awakened':'覚醒リオラ'}.get(id,c[id]['name']);text(d,x+12,y+h-94,name,27,PLUM,width=w-24);text(d,x+12,y+h-49,role,24,PINK,width=w-24)
@lru_cache(None)
def backdrop():
 im=Image.new('RGBA',(1920,1080),'#f9e8ef');d=ImageDraw.Draw(im)
 for x in range(-800,2300,240):d.polygon([(x,0),(x+135,0),(x+750,1080),(x+615,1080)],fill='#f4dfe9')
 for r in[370,450,530]:d.ellipse((1080-r,440-r,1080+r,440+r),outline='#e8c7d7',width=1)
 d.rectangle((0,935,1920,1080),fill='#fff8f2');d.line((24,933,1896,933),fill=EDGE,width=2);return im
ITEMS={
'opening':[('アテナ使用禁止','第3層へ、継続データで挑戦'),('先に実戦！','負けた判断から、次の一手へ')],
'first':[('支援役を先に','虹の支援役 HP 2384'),('狼は後で','狼 HP 4063 ／ ATK 235'),('まず生き残る','通常リオラが受ける')],
'wall':[('第1〜3戦','すべて4Rで敗北'),('T6も試した','攻撃だけでは守りが続かない'),('次の準備','リオラの記憶40個を集める')],
'farm':[('虚ろの門 ×7周','全戦、アテナなしで踏破'),('記憶6個 ×7回','42個 → 覚醒に40個'),('実際の周回','7周目の終盤を抜粋')],
'awaken':[('通常 → 覚醒','最大HP 249 → 371'),('リーダー補正','HP +11.2% → +16%'),('ここから実戦','HPの増加だけで、勝てる？')],
'fourth':[('前進はあった','虹の支援役を撃破'),('まだ遠い','狼は3808 / 4063 HP'),('次の課題','倒した後も守りを回す')],
'ninth':[('先頭：弁財天','リーダー：覚醒リオラ'),('白灯石の障壁','初回の障壁 267'),('薬のタイミング','次の回復より先に倒れた')],
'final-a':[('弁財天が張る','白灯石の障壁 267'),('ノクスが攻める','慈悲の実回復 198'),('序盤をつなぐ','守り役を落とさない')],
'final-b':[('薬は残り0','R8から補充なしで続行'),('攻撃で回復','ノクスの慈悲をつなぐ'),('回る守り','障壁・回復・必殺の順番')],
'final-c':[('狼を削り切る','四人の仕事を途切れさせない'),('最後まで','攻撃だけに寄せない'),('報酬まで確認','第4層の開放へ')],
'result':[('第10戦：突破','19R ／ 4人生存'),('実際の消耗','薬5個・妖精1回・花9回'),('検証の範囲','引継T4石3個あり／再現率は未測定')],
'ending':[('お疲れさま！','アテナ禁止、第3層を突破'),('次の課題','別の手持ちでも作れる守りへ')],
}
def diagram(base,ch,phase,full=False):
 d=ImageDraw.Draw(base);id='fourth'if ch['id'].startswith('fourth-')else ch['id'];side=ch.get('clip')and not full;x=850 if side else 346;w=744 if side else 1228;y=164
 if id=='recipe':
  ids=['benzaiten','nox','liora-awakened','lunette-awakened'];roles=['先頭：白灯石','単体＋慈悲','リーダー：受ける','全体＋双潮']
  for i,(cid,role)in enumerate(zip(ids,roles)):card(base,cid,(346+i*309,207,285,480),role,phase%4==i)
  text(d,367,734,'先頭は操作する役。リーダーは補正を出す役。',39,PLUM);text(d,367,809,'3個のT4石を引継ぎ。リオラの石は威力9・堅牢100。',29,MUTED)
 elif id=='trials':
  for i,(n,h,b)in enumerate([('05','T6の火力','7R敗北'),('06','防御も混ぜる','9R敗北'),('07','回復役を増やす','6R敗北'),('08','薬を早める','6R敗北')]):
   xx=x+(i%2)*623;yy=y+(i//2)*310;d.rounded_rectangle((xx,yy,xx+592,yy+275),24,fill='#faedf3',outline=EDGE,width=2);text(d,xx+24,yy+16,n,62,PINK);text(d,xx+130,yy+28,h,37,PLUM);text(d,xx+130,yy+125,b,50,COL['u'])
  text(d,x+15,818,'編成・操作・進む乱数が違う。単独要因の比較ではない。',29,MUTED)
 elif id=='stone':
  card(base,'benzaiten',(346,208,330,545),'白灯石の使い手',True);xx=740;text(d,xx,207,'白灯石 × 弁財天',53,PLUM);text(d,xx,316,'初回障壁 267',84,PINK);text(d,xx,457,'守られる側の最大HP ＋ 張る側の攻撃力',28,PLUM,width=820);text(d,xx,547,'石の威力125 → 威力倍率 2.875',35,COL['u'],width=810);text(d,xx,660,'再使用待ちの穴を、薬と吸収回復でつなぐ。',29,MUTED,width=800);text(d,xx,780,'誰に持たせるかが、連携を変える。',37,PLUM,width=800)
 elif id=='awaken'and full:
  card(base,'liora',(346,210,328,542),'通常リオラ',False);card(base,'liora-awakened',(710,210,328,542),'覚醒リオラ',True);text(d,1092,232,'記憶 40個',49,PINK);text(d,1092,359,'HP 249 → 371',39,PLUM,width=482);text(d,1092,493,'所持42 → 残り2',36,PLUM);text(d,1092,632,'実際の報酬から覚醒。',29,MUTED,width=475);text(d,369,804,'受ける器を増やしても、回復と障壁の順番が必要。',34,PLUM)
 else:
  items=ITEMS.get(id,[('怒りの中国うさぎ','何を変えたか、見届ける。')]);head,body=items[phase%len(items)];text(d,x+10,y,head,48,PLUM,width=w-20)
  if side:
   for i,(h,b)in enumerate(items):
    yy=y+126+i*185;d.rounded_rectangle((x+4,yy,x+w-8,yy+156),22,fill='#f8e3ed'if phase%len(items)==i else CREAM,outline=PINK if phase%len(items)==i else EDGE,width=3);text(d,x+23,yy+16,h,32,PINK,width=w-53);text(d,x+23,yy+73,b,29,PLUM,width=w-53)
  else:
   for i,(h,b)in enumerate(items):
    yy=y+126+i*183;d.rounded_rectangle((x+4,yy,x+w-8,yy+151),24,fill='#faedf3',outline=EDGE,width=2);text(d,x+26,yy+18,h,38,PINK);text(d,x+26,yy+78,b,33,PLUM,width=w-60)
def plate(ch,phase,output,full=False,illustration=None):
 base=backdrop().copy();d=ImageDraw.Draw(base);text(d,27,15,'STILLVEIL / 白亜の塔攻略日記',26,PLUM);text(d,1320,14,'Part3  第3層 ／ アテナ禁止',28,PINK);d.line((27,57,1893,57),fill=EDGE,width=2);d.rounded_rectangle((296,73,1624,923),28,fill=CREAM,outline=EDGE,width=2)
 if ch.get('clip')and not full:d.rounded_rectangle((304,60,802,936),18,fill='#2d2631',outline=PINK,width=3)
 if illustration:contained(base,Image.open(A/(illustration+'.png')).convert('RGBA'),(320,122,1280,770),24)
 else:diagram(base,ch,phase,full)
 text(d,320,86,ch['title'],24,MUTED,width=1240);base.convert('RGB').save(output)
def phase_for(ch,l,index):return index//2
def illustration_for(ch,l,index):return'clubroom'if ch['id']in['intrusion','ending']else None
def poses(ch,l,index):
 panic=ch['id']in['first','intrusion','wall','trials','ninth']or any(v in l['text']for v in['三十七','怖い','倒れ']);z='z-panic'if panic else'z-happy';who=l['speaker']if l['speaker']!='z'else(['m','t'][index%2]if ch['id']in['opening','first']else['m','t','u'][index%3]);right={'m':'m-deadpan'if panic else'm-happy','t':'t-think'if ch['id']in['wall','recipe','stone']else't-happy','u':'u-angry'if panic else'u-think'}[who];return z,right
