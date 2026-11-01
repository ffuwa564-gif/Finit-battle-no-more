from pathlib import Path
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter,ImageEnhance
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2';W,H=1920,1080
COL={'z':'#c9eca5','m':'#f2bed6','t':'#ffd78c'};NAMES={'z':'ずんだもん','m':'四国めたん','t':'春日部つむぎ'}
@lru_cache(None)
def font(n,b=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if b else'Regular')+'.ttc',n)
def wrap(s,n,w):
 out=[];v=''
 for c in s:
  if c=='\n' or font(n).getlength(v+c)>w:out.append(v);v='' if c=='\n'else c
  else:v+=c
 if v:out.append(v)
 return out
@lru_cache(None)
def sprite(who,w,h):
 p=O/'assets/tsumugi.png'if who=='t'else ROOT/'artifacts/athena-council/assets'/('zunmon003.png'if who=='z'else'met002_cr.png');im=Image.open(p).convert('RGBA');im=im.crop(im.getbbox());im.thumbnail((w,h),Image.Resampling.LANCZOS);return im

def plate(ch,output,shot=None):
 base=Image.new('RGBA',(W,H),'#0b1727');d=ImageDraw.Draw(base)
 for y in range(H):d.line((0,y,W,y),fill=(10+int(y*.006),22+int(y*.008),37+int(y*.008)))
 d.text((32,20),'STILLVEIL   /   白亜の塔 攻略日記 Part 2',font=font(31,True),fill='#dcc79c');d.text((1190,25),'第二層「旅立ちの残響」  /  v1.10.0',font=font(26),fill='#adbdca');d.line((30,77,1890,77),fill='#6c654e',width=2)
 for who,x,y,w,h in [('z',8,200,235,285),('m',8,600,235,285),('t',1110,240,265,610)]:
  im=sprite(who,w,h);base.alpha_composite(im,(x+(w-im.width)//2,y+h-im.height));d.text((x+12,y-65),NAMES[who],font=font(30,True),fill=COL[who])
 d.text((1125,890),'ギャルも作戦会議！',font=font(23,True),fill=COL['t'])
 title=ch['title'].split(' ',1);d.text((270,124),title[0],font=font(56,True),fill='#dcc79c');yy=208
 for s in wrap(title[-1],38,345):d.text((270,yy),s,font=font(38,True),fill='#f5f0e4');yy+=54
 yy+=35
 for item in ch['bullets']:
  d.line((272,yy,595,yy),fill='#4b5f73',width=1);yy+=15
  for s in wrap(item,26,330):d.text((272,yy),s,font=font(26),fill='#d9e0e6');yy+=39
  yy+=25
 d.rounded_rectangle((634,99,1096,910),radius=18,fill='#060c15',outline='#a28d69',width=2)
 if shot:
  im=Image.open(shot).convert('RGB');im=ImageOps.fit(im,(450,800));base.paste(im,(640,105))
 d.text((1410,150),'TODAY’S ROUTE',font=font(28,True),fill='#dcc79c');yy=223
 labels=['敵の三役を確認','加入素材を集める','通常形態で挑戦','覚醒と役割を見直す','必殺技を実機で紹介','第二層の結果を確認']
 active=0 if ch['id']in['opening','carry','enemy','jobs']else 1 if ch['id']=='farm'else 2 if ch['id']=='first'else 3 if ch['id']in['rebuild','awake','stones','controls']else 4 if ch['id']in['battle1','ultimate']else 5
 for i,label in enumerate(labels):
  c='#ffd78c'if i==active else'#9eb0c1';d.ellipse((1410,yy+8,1424,yy+22),fill=c);d.text((1440,yy),label,font=font(28,i==active),fill=c);yy+=74
 d.text((1410,730),'記録に基づく攻略日記',font=font(28,True),fill='#dcc79c')
 for j,s in enumerate(['比較用の前回データを継続','追加素材はゲーム内で獲得','先頭の行動予約あり','結果には花・妖精の助けを含む']):d.text((1410,783+j*34),s,font=font(22),fill='#aebdcc')
 d.line((30,931,1890,931),fill='#6c654e',width=1);base.convert('RGB').save(output)
