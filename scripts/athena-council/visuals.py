"""Three-character council graphics; facts, interventions and toy models are labeled."""
from pathlib import Path
from functools import lru_cache
import json
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter,ImageEnhance
ROOT=Path(__file__).resolve().parents[2];ARTIFACTS=ROOT/'artifacts/athena-council';W,H=1920,1080
WHITE='#f4f1e9';MUTED='#afbfce';GOLD='#dac395'
KINDS={'lore':('現行の資料・検証','#b6c9ec'),'proposal':('未実装の提案','#b9dfa8'),'critique':('うさぎの異議','#ffb6ae'),'revision':('条件を詰め直す','#9ddbd7'),'verdict':('会議の評価','#dfca94')}
@lru_cache(maxsize=48)
def font(n,bold=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if bold else'Regular')+'.ttc',n)
def wrap(text,face,width):
 out=[]
 for paragraph in str(text).split('\n'):
  while paragraph:
   lo,hi=1,len(paragraph)
   while lo<hi:
    mid=(lo+hi+1)//2
    if face.getlength(paragraph[:mid])<=width:lo=mid
    else:hi=mid-1
   out.append(paragraph[:lo]);paragraph=paragraph[lo:]
 return out or['']
@lru_cache(maxsize=1)
def maps():
 c=json.loads((ARTIFACTS/'content.json').read_text());return {x['id']:x for x in c['characters']},{x['id']:x for x in c['assets']}
@lru_cache(maxsize=32)
def sprite(path,w,h):
 with Image.open(path)as source:im=source.convert('RGBA')
 im=im.crop(im.getbbox());im.thumbnail((w,h),Image.Resampling.LANCZOS);return im
@lru_cache(maxsize=20)
def background(cid):
 c,a=maps();p=ROOT/'public'/a[c[cid]['artId']]['path'];im=Image.open(p).convert('RGB');im=ImageOps.fit(im,(W,H),centering=(.5,.3)).filter(ImageFilter.GaussianBlur(22));im=ImageEnhance.Brightness(im).enhance(.15).convert('RGBA');return Image.alpha_composite(im,Image.new('RGBA',(W,H),(6,15,29,95)))
def paste(base,name,box):
 x,y,w,h=box;im=sprite(str(ARTIFACTS/'assets'/name),w,h);base.alpha_composite(im,(x+(w-im.width)//2,y+h-im.height))
def _text(d,x,y,t,n=32,color=WHITE,b=True):d.text((x,y),t,font=font(n,b),fill=color)
def chart(d,kind):
 if kind in {'native','ablation'}:
  rows=[('基準：現行の二編成',51,71),('リオラへ交代＋リーダー交代',10,28)]if kind=='native'else[('基準',51,71),('かばうなし',0,0),('必殺なし',8,23),('HP補正なし',15,39),('軽減なし',19,48),('号令なし',51,69)]
  _text(d,405,385,'固定100通り',27,GOLD);_text(d,1120,385,'巻戻し',27,GOLD);_text(d,1340,385,'白花',27,GOLD)
  for i,(name,x,y)in enumerate(rows):
   yy=438+i*55;d.line((400,yy+47,1485,yy+47),fill='#445466',width=1);_text(d,405,yy,name,30);_text(d,1135,yy,str(x),32);_text(d,1360,yy,str(y),32)
  note='現在の合法編成の比較。全キャラ・全操作を調べた最適解ではない。'if kind=='native'else'一つずつ止めた隔離計算。差は加算不可／公開ゲームは変更しない。'
  _text(d,400,780,'乱数90001〜90100／白花以外T4・所持条件と操作方針は固定',23,GOLD)
  _text(d,400,825,note,23,MUTED)
 elif kind=='scatter':
  _text(d,400,387,'未実装の模型：単体220を四人へ',31,GOLD)
  vals=[('元の対象','HP160 → 72','88を受ける'),('仲間A','HP240 → 196','44を受ける'),('仲間B','HP240 → 196','44を受ける'),('仲間C','HP240 → 196','44を受ける')]
  for i,(title,value,note)in enumerate(vals):
   x=395+i*275;d.rounded_rectangle((x,460,x+255,642),radius=14,fill='#253b50',outline='#7fa9b7',width=1);_text(d,x+18,477,title,27);_text(d,x+16,526,value,24,GOLD);_text(d,x+18,580,note,24)
  _text(d,405,700,'88＋44＋44＋44＝220。被害の合計は消えていない。',29)
  _text(d,405,755,'同じ対象へ二発目 → 札なしで戦闘不能。全体攻撃は対象外。',27,'#ffb6ae')
  _text(d,405,812,'架空のHP条件による処理検査／塔の突破率ではありません。',23,MUTED)
 elif kind=='debt':
  vals=[('攻撃前','HP160','残債0'),('220の攻撃','HP50','残債110'),('80回復','HP130','残債110'),('110支払い','HP20','残債0')]
  _text(d,400,390,'未実装の模型：借りた時間に、回復を置く',30,GOLD)
  for i,(title,value,note)in enumerate(vals):
   x=395+i*275;d.rounded_rectangle((x,470,x+255,650),radius=14,fill='#253b50',outline='#a08fb6',width=1);_text(d,x+17,488,title,27);_text(d,x+17,535,value,35,GOLD);_text(d,x+17,592,note,26)
  _text(d,405,709,'回復なし → 支払いで戦闘不能。延期は回復ではない。',29,'#ffb6ae');_text(d,405,765,'支払いは障壁・再延期で防げず、ゲージ獲得にも使えない。',27)
  _text(d,405,818,'行動順・敵AIを再現しない固定例。ゲームの勝率ではない。',23,MUTED)

def draw_plate(chapter,phase,output_path):
 kind=phase['kind'];label,accent=KINDS[kind];base=background(chapter['character_id']).copy();d=ImageDraw.Draw(base)
 _text(d,35,25,'STILLVEIL ／ アテナ依存対策会議',31,GOLD)
 d.rounded_rectangle((1245,20,1880,82),radius=14,fill='#29313c',outline='#a69471',width=1);_text(d,1270,34,'仕様検討 ／ 提案部分は未実装',29,GOLD)
 d.line((35,106,1880,106),fill='#a18c64',width=1)
 _text(d,35,142,'ずんだもん',34,'#b5df93');_text(d,35,187,'発想・まずは提案',22,MUTED);paste(base,'zunmon003.png',(15,230,285,275))
 _text(d,35,513,'四国めたん',34,'#efbfd8');_text(d,35,557,'条件・仕様の整理',22,MUTED);paste(base,'met002_cr.png',(15,610,285,305))
 _text(d,1600,154,'中国うさぎ',37,'#ffb6ae');_text(d,1600,211,'またアテナですか。',24,MUTED)
 d.rounded_rectangle((1600,290,1875,348),radius=12,fill='#482c32'if kind=='critique'else'#263644');_text(d,1622,300,'異議あり'if kind=='critique'else'厳しく検討中',29,'#ffb6ae')
 pose='usagi_s005.png'if kind in {'critique','verdict'}else'usagi_s004.png'if kind=='proposal'else'usagi_s001.png';paste(base,pose,(1580,385,310,530))
 d.rounded_rectangle((325,126,1560,911),radius=20,fill='#142337',outline='#6c8295',width=2)
 _text(d,355,144,chapter['title'],31,GOLD);_text(d,355,192,chapter['source_short'],18,MUTED)
 d.rounded_rectangle((345,235,1540,885),radius=15,fill='#192b40',outline='#3a526b',width=1)
 _text(d,375,250,label,24,accent)
 y=292
 for line in wrap(phase['title'],font(40,True),1115):_text(d,375,y,line,40,accent);y+=51
 if y>405:raise ValueError('Phase title too long: '+phase['title'])
 if phase.get('chart'):chart(d,phase['chart'])
 else:
  y=max(y+24,395)
  nodes=phase.get('nodes',[])
  if nodes:
   width=(1100-(len(nodes)-1)*18)//len(nodes)
   for i,node in enumerate(nodes):
    x=390+i*(width+18);d.rounded_rectangle((x,y,x+width,y+135),radius=12,fill='#294057',outline=accent,width=1);_text(d,x+18,y+16,node['title'],27);_text(d,x+18,y+65,node.get('value',''),36,accent)
   y+=167
  for bullet in phase['bullets']:
   lines=wrap(bullet,font(30),1070);d.ellipse((382,y+15,392,y+25),fill=accent)
   for line in lines:_text(d,410,y,line,30,WHITE,False);y+=43
   y+=17
  if y>867:raise ValueError(f"Content overflow {chapter['id']} {phase['title']}: {y}")
 d.rectangle((0,930,W,H),fill='#070e18');d.line((35,930,1880,930),fill='#65798f',width=1)
 _text(d,35,941,'',10)
 for i,p in enumerate(chapter['phases']):d.rectangle((355+i*395,916,735+i*395,920),fill=KINDS[p['kind']][1]if p is phase else'#354453')
 output_path=Path(output_path);base.convert('RGB').save(output_path);return output_path
