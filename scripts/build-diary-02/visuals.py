"""Tsumugi's research notebook: semantic diagrams, original-art contain, safe heads."""
from pathlib import Path
from functools import lru_cache
import json,math
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-02';A=O/'assets'
W,H=1920,1080;INK='#54394e';PLUM='#71435f';PINK='#b45a87';MINT='#568e83';LAV='#9b82bb';GOLD='#bb8739';CREAM='#fffaf3';EDGE='#d9bfce';MUTED='#8a7182'
COL={'t':'#986110','z':'#3e7543','m':'#8b3f74'};NAMES={'t':'春日部つむぎ','z':'ずんだもん','m':'四国めたん'}
@lru_cache(None)
def episode():
 p=O/'render-plan.json';return json.loads(p.read_text())if p.exists()else{}
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
 im=backdrop().copy();d=ImageDraw.Draw(im);text(d,27,14,'ビルド研究日誌',28,PLUM);text(d,575,17,'みんなが輝くRPGを！',24,PINK);text(d,1284,17,episode().get('header','#02 守る子にも、休む番を。'),25,GOLD);d.line((27,57,1893,57),fill=EDGE,width=2);d.rounded_rectangle((296,73,1624,923),28,fill=CREAM,outline=EDGE,width=2);fit_text(d,320,85,ch.get('title',''),24,1210,MUTED)
 if ch.get('clip')and not full:d.rounded_rectangle((304,60,802,936),18,fill='#28252e',outline=MINT,width=3)
 scope=ch.get('scopeLabel')or('LAB ／ 研究用の試作'if ch.get('lab')or ch['id']not in ['roster','neri-now','future']else None)
 if scope:pill(d,(1212,79,1596,125),scope,GOLD,'#fff0d0',23)
 disclosure=ch.get('clipDisclosure')
 if disclosure:note(d,850,218,disclosure,738,23)
 return im

def block(d,box,head,body='',col=MINT,size=32):
 x,y,w,h=box;d.rounded_rectangle((x,y,x+w,y+h),22,fill='#eaf4ef'if col==MINT else'#fff2d7'if col==GOLD else'#f8edf3',outline=col,width=3);fit_text(d,x+23,y+16,head,38,w-46,col)
 if body:text(d,x+23,y+91,body,size,PLUM,width=w-46)
def round_row(d,x,y,n=6,rest=None,w=1110,small=False):
 cw=(w-20*(n-1))/n
 for i in range(n):
  color=MINT if i+1==rest else PINK if i==n-1 else LAV
  d.rounded_rectangle((x+i*(cw+20),y,x+i*(cw+20)+cw,y+103),15,fill='#e2f2e9'if i+1==rest else CREAM,outline=color,width=3);text(d,x+i*(cw+20)+14,y+12,f'R{i+1}',27,color);text(d,x+i*(cw+20)+14,y+54,'休息'if i+1==rest else'離脱'if i==n-1 and rest is None else'当番',26,PLUM)
def diagram(base,ch,phase,full=False):
 d=ImageDraw.Draw(base);id=ch['id'];side=bool(ch.get('clip'))and not full;x=848 if side else 346;w=744 if side else 1228;y=161
 if id=='roster':title(d,x,y,'少女たちの研究ノート',w);return
 if id=='neri-now':
  title(d,x,y,'現行：灯を持つ「受けた人」を見る。',w,39)
  if side:
   shield(d,x+111,351,63);arrow(d,(x+212,351),(x+410,351));clock(d,x+532,351,65,GOLD)
   block(d,(x+9,467,w-22,171),'予告された大技を、実際に受ける','その人に灯があれば、一度だけ25％軽減',MINT,28)
   note(d,x+18,714,'通常攻撃すべてを軽減する技ではない。\nかばう人が変われば、灯の所在を確認。',w-36,31)
  else:
   card(base,'neri',(360,240,350,552),'BD070 ／ R・夜番',True);block(d,(777,261,785,247),'交代の灯','先頭の仲間へ灯 → 予告大技を受けたら25％軽減',MINT,38);note(d,789,618,'配る相手と、実際に受ける相手。\n二つが同じとは限らない。',750,39)
 elif id=='question':
  title(d,x,y,'硬くする以外の、ネリを選ぶ理由。');card(base,'neri',(360,250,330,525),'次の番は、頼むね',True)
  block(d,(758,269,800,225),'強さの上乗せ','もっと硬い子へ、替えられない？',PINK,37);block(d,(758,549,800,242),'働き方を変える','休む番を渡す → 残る三人が支える',MINT,35);note(d,366,852,'能力の必要性と、ビルドの面白さは分けて評価する。',1200,29)
 elif id=='failed-draft':
  title(d,x,y,'自分だけ、当番を降りなかった。',w,39)
  if side:
   values=[('R6','ネリが過労離脱'),('R9','覚醒リオラが離脱'),('R10','フィオが離脱'),('R12','ノクス一人 → 護衛失敗')]
   for i,(h,b)in enumerate(values):
    yy=292+i*126;d.rounded_rectangle((x+8,yy,x+w-15,yy+101),17,fill='#f9e6ec'if i==0 else CREAM,outline=PINK if i==0 else EDGE,width=3);text(d,x+28,yy+18,h,39,PINK);fit_text(d,x+165,yy+26,b,31,w-200,PLUM)
   note(d,x+14,838,'R5途中〜6抜粋 ／ R6は全体敗北ではない。',w-28,25)
  else:
   for i,(cid,rr)in enumerate([('neri',6),('liora-awakened',9),('fio',10),('nox',12)]):card(base,cid,(x+i*308,270,283,426),f'R{rr}'+('に離脱'if cid!='nox'else'に単独残留'),cid=='neri')
   pill(d,(367,749,1547,825),'自分を休ませない方針：100件とも護衛失敗',PINK,'#fae9ee',34);note(d,369,857,'HPが残っていても、連勤6Rの離脱は回復では消えない。',1170,28)
 elif id=='new-skill':
  if phase==0:
   title(d,x,y,'休番の札：明日の一手を、預ける。')
   for i,(h,b,col)in enumerate([('いま','一人へ予約\n自分も選べる',GOLD),('次のR','担当を外れ休息\n連勤を0へ',MINT),('その次のR','同じ本人が\n当番に戻る',LAV)]):
    xx=x+i*415;block(d,(xx,315,379,373),h,b,col,39)
    if i<2:arrow(d,(xx+385,496),(xx+411,496))
   pill(d,(368,783,1543,866),'再使用1R ／ 予約は一度に一人 ／ 本人の1手を使う',GOLD,'#fff2d8',31)
  elif phase<3:
   title(d,x,y,'休むことは、無敵になることではない。')
   block(d,(x,284,589,441),'休息中にできない','通常行動・必殺・石\n防御の手番も失う',PINK,38);block(d,(x+636,284,589,441),'休息中も受ける','敵からの被害\n味方の回復・補助',MINT,38);note(d,x+15,793,'睡眠・麻痺は、担当を持ったまま動けない状態。休番とは別。',w-30,30)
  else:
   title(d,x,y,'枠を増やさず、新技一つで比べる。');block(d,(x+12,305,1200,177),'現行の二枠','不変の岩守 ＋ 交代の灯',LAV,35);arrow(d,(960,503),(960,558));block(d,(x+12,577,1200,177),'試作の二枠','不変の岩守 ＋ 休番の札',MINT,35);note(d,x+20,839,'新リーダースキル・専用石は追加しない。',w-40,33)
 elif id=='trial':
  if phase<2:
   title(d,x,y,'朝の迎えまで、三人以上で帰る。');clock(d,x+226,382,114,GOLD);text(d,x+427,267,'12 ROUND',85,PLUM);text(d,x+434,414,'帰還時 3人以上',55,MINT)
   for i in range(4):
    xx=x+434+i*171;d.ellipse((xx,555,xx+107,662),fill='#d9ecdf'if i<3 else'#f5edf3',outline=MINT if i<3 else EDGE,width=3);text(d,xx+40,574,str(i+1),44,MINT if i<3 else MUTED)
   note(d,x+22,778,'敵のHPを削り切る競争ではない。\n画面は護衛の進捗と、生存人数を優先。',w-44,34)
  else:
   title(d,x,y,'同じ担当を、六連勤したら離脱。');round_row(d,x+20,320);text(d,x+24,488,'HPとは別の制約。休息で連勤を0へ。',43,PINK,width=w-45);round_row(d,x+20,618,rest=5);note(d,x+18,808,'全員を同じ規則で数える、研究用の任意制約。自然な難所の発見ではない。',w-36,28)
 elif id=='recipe':
  if phase==0:
   title(d,x,y,'一人が休む穴を、三人で支える。')
   for i,(cid,role)in enumerate([('neri','休番を渡す・自分も休む'),('nox','攻撃・状態操作'),('liora-awakened','休む人の分を受ける'),('fio','回復・事前の障壁')]):card(base,cid,(x+i*309,276,285,462),role,i==0)
   note(d,x+13,829,'ネリをリーダーに、石は既存T4。比較用の所持条件で試す。',w-26,30)
  elif phase<3:
   title(d,x,y,'回復を足すより、受け方を整えた。');card(base,'elaine-awakened',(x+12,255,335,451),'旧・二人回復');card(base,'liora-awakened',(x+872,255,335,451),'本命・守り役',True);arrow(d,(x+410,445),(x+817,445));text(d,x+417,322,'88 / 100',49,PINK);text(d,x+417,494,'100 / 100',49,MINT);note(d,x+416,617,'同じ試練での比較',361,27);note(d,x+24,807,'旧二人回復の逆順は57/100。盾役が常に強いという一般論ではない。',w-48,29)
  else:
   title(d,x,y,'他の二枠にも、選択肢がある。')
   for i,(cid,role)in enumerate([('neri','休番の核'),('seris-awakened','ノクスの席を交替'),('liora-awakened','共通の守り役'),('benzaiten','フィオの席を交替')]):card(base,cid,(x+i*309,272,285,461),role,i==0)
   pill(d,(367,794,1548,871),'100/100成功 ／ 覚醒リオラは共通・三人全員の交替ではない',MINT,size=30)
 elif id=='lab-victory-a':
  title(d,x,y,'今日決める、明日の当番表。',w,40)
  if side:
   rows=[('R1','ノクスへ札 → R2休息'),('R2','覚醒リオラへ → R3休息'),('R3','フィオへ札 → R4休息'),('R4','ネリへ札 → R5休息'),('R5','ネリも休み、札は配れない')]
   for i,(rr,desc)in enumerate(rows):
    yy=279+i*111;d.rounded_rectangle((x+7,yy,x+w-14,yy+92),15,fill='#fff0d3'if phase%5==i else CREAM,outline=GOLD if phase%5==i else EDGE,width=3);text(d,x+27,yy+16,rr,34,GOLD);fit_text(d,x+132,yy+23,desc,28,w-168,PLUM)
   note(d,x+14,862,'R6から同じ並びへ。空いた一手を仲間が支える。',w-28,23)
  else:
   card(base,'neri',(x+10,257,329,515),'自分の休みも予約',True);block(d,(x+412,290,783,240),'配る人も、休んでいい。','ネリの休息Rは、新しい札を配れない',GOLD,35);block(d,(x+412,598,783,221),'他の三人に任せる一回','行動・防御の穴を、作戦で守る',MINT,36)
 elif id=='lab-victory-b':
  title(d,x,y,'戻ってきたら、また一緒に。',w,40)
  if side:
   block(d,(x+9,290,w-22,201),'護衛12R ／ 四人生存','敵の撃破ではなく、帰還達成',MINT,31);block(d,(x+9,545,w-22,187),'seed1の環境・道具','回復薬0個 ／ 花7回 ／ 妖精1回',GOLD,28);note(d,x+17,790,'本命100件：薬は平均1.02個。\n映像の一戦を、いつでも薬0とは言わない。',w-34,27)
  else:
   for i,cid in enumerate(['neri','nox','liora-awakened','fio']):card(base,cid,(x+i*309,272,285,419),'四人とも帰還',i==0)
   pill(d,(367,743,1548,815),'seed1：薬0 ／ 花7 ／ 妖精1　・　本命平均は薬1.02個',GOLD,'#fff2d8',31);note(d,x+14,854,'誰か一人が背負い続けた勝利ではない。',w-28,30)
 elif id=='necessity':
  if phase<2:
   title(d,x,y,'失敗例だけで、全編成を断言しない。')
   for i,(h,b)in enumerate([('ネリなし・T6','0 / 100'),('アテナ軸・T6','0 / 100'),('ネリ単独','0 / 100')]):block(d,(x+i*414,315,379,345),h,b,PINK,59)
   note(d,x+20,787,'固定した候補と手順の実測。必要性の根拠は、その次に示す。',w-40,32)
  else:
   title(d,x,y,'当番を外れる経路が、必要。');block(d,(x+10,275,1199,161),'休番なし → 全員がR6で離脱','R12を三人以上で終える条件を満たせない',PINK,31);block(d,(x+10,489,1199,161),'回復・防御・睡眠・麻痺では、連勤は減らない','火力を上げても、帰還の時計は早まらない',LAV,31);block(d,(x+10,703,1199,161),'定めた合法候補では、ネリがその経路を持つ','ネリ一人で十分ではなく、休息中を支える編成が要る',MINT,29)
 elif id=='comparisons':
  if phase<2:
   title(d,x,y,'勝敗は同じでも、余裕には差が出た。')
   for i,(h,pot,hp)in enumerate([('本命の順番','1.02個','50.3％'),('本命を逆順','1.62個','45.3％')]):
    xx=x+i*635;block(d,(xx,281,589,483),h,'100 / 100 成功',MINT if i==0 else LAV,48);text(d,xx+25,503,'平均の薬：'+pot,35,GOLD);text(d,xx+25,609,'最低HP比の平均：'+hp,30,PLUM)
   note(d,x+17,831,'両方成功。少し順番を間違えたら必ず負ける、とは言えない。',w-34,30)
  else:
   title(d,x,y,'旧案の難しさを、本命へ移し替えない。');block(d,(x+10,290,1199,222),'旧・二人回復','通常順88/100 → 逆順57/100',PINK,45);block(d,(x+10,581,1199,221),'守り役を置いた本命','どちらも100/100。改善した一方、判断の余地は？',MINT,38)
 elif id=='growth':
  if phase<2:
   title(d,x,y,'石を厳選する必須性までは、増えなかった。')
   for i,(tier,pots)in enumerate([('T1','1.57'),('T3','1.04'),('T6','1.02')]):
    xx=x+i*414;block(d,(xx,296,379,445),tier,'100/100成功\n12Rの任務',MINT if i<2 else GOLD,39);text(d,xx+23,635,'平均の薬 '+pots,29,GOLD)
   note(d,x+16,822,'討伐速度の比較ではない。T1でも成立し、薬の余裕が少し変わる。',w-32,30)
  else:
   title(d,x,y,'成果を、全部の遊びへ乗せない。');block(d,(x+10,298,1199,218),'補助行動なしでも100/100成功','最善の操作を尽くさないと勝てない試練、とは言わない',LAV,35);block(d,(x+10,595,1199,218),'今回の成果：レア度や倍率と違う軸','育成・厳選・追加目標の魅力は、次の課題',MINT,35)
 elif id=='ruka-audit':
  title(d,x,y,'二つの場所に、違う仕事を残す。');text(d,x+385,260,'前回の回廊',35,PLUM);text(d,x+800,260,'今回の護衛',35,PLUM)
  for row,(label,a,b)in enumerate([('ルカ編成','100 / 100','0 / 100'),('ネリ編成','0 / 100','100 / 100')]):
   yy=340+row*178;text(d,x+10,yy+35,label,35,GOLD if row==0 else MINT)
   for j,value in enumerate([a,b]):
    xx=x+326+j*425;d.rounded_rectangle((xx,yy,xx+390,yy+135),18,fill='#e6f3e9'if value.startswith('100')else'#f5eaf1',outline=MINT if value.startswith('100')else EDGE,width=3);text(d,xx+32,yy+28,value,44,MINT if value.startswith('100')else MUTED)
  note(d,x+337,705,'同じ回廊条件：ルカ平均11.63R。\n各編成での交差比較であり、単独キャラの比較ではない。',w-345,27)
  for xx,cid in [(x+100,'ruka'),(x+527,'neri')]:gem(d,xx,842,26,GOLD,True);text(d,xx+40,818,c_name(cid)+' ◆ 試作認定',30,GOLD)
  text(d,x+943,824,'本認定は0',29,MUTED)
 elif id=='limits':
  if phase<2:
   title(d,x,y,'専用の鍵、という弱点は残る。');block(d,(x+9,290,1199,214),'今回置いた制約','12R護衛 ＋ 6R連勤離脱。自然な難所での発見ではない',PINK,34);block(d,(x+9,577,1199,251),'一般の休息状態でも、入口が一人なら','他の子の可能性を禁じて、宝石だけを守らない',MINT,34)
  else:
   title(d,x,y,'宝石を外すのは、その子の価値ではない。');block(d,(x+10,290,1199,240),'同じ攻略先に別の経路ができたら','専用性を再審。最後の専用先も失えば、認定を外す',GOLD,34);block(d,(x+10,600,1199,235),'定周期の作業から、意味ある選択へ','休む人で目標が変わる／休まない別リスクも試したい',MINT,32)
 elif id=='future':
  title(d,x,y,'守る子にも、休む番を。')
  for i,(h,b,col)in enumerate([('成立したこと','休番の仕組みと\n四人の帰還',MINT),('残る課題','人工的な制約\n育成・作業化',PINK),('次も持っていく','ルカとネリの\n二冊のノート',GOLD)]):block(d,(x+i*414,314,379,429),h,b,col,37)
  text(d,x+16,830,'好きな子を選ぶ理由を、一人ずつ研究する。',36,PLUM)
 else:raise NotImplementedError('Unknown reviewed Part2 chapter: '+id)

def plate(ch,phase,output,full=False,illustration=None):
 im=base_plate(ch,phase,full or not bool(ch.get('clip')))
 if illustration:contained(im,Image.open(A/(illustration+'.png')).convert('RGBA'),(320,131,1280,770),25)
 else:diagram(im,ch,phase,full)
 im.convert('RGB').save(output)
def phase_for(ch,line,index):
 id=ch['id']
 if id=='new-skill':return 0 if index<2 else 1 if index<5 else 3
 if id=='trial':return 0 if index<3 else 2
 if id=='recipe':return 0 if index==0 or index in[5,6]else 1 if index<5 else 3
 if id=='lab-victory-a':return min(4,max(0,index-1))
 if id=='necessity':return 0 if index<2 else 2
 if id=='comparisons':return 0 if index<3 else 2
 if id=='growth':return 0 if index<3 else 2
 return index//2
def illustration_for(ch,line,index):
 return'research-lab-handoff'if ch['id']=='future'and index>=3 else None
def poses(ch,line,index):
 t=line['text'];who=line['speaker']
 if any(word in t for word in ['寂し','諦め','消え','大切','取り残','消さない','好きだから']):left='t-research-care'
 elif any(word in t for word in ['比べ','検証','考え','研究','数字','必要','未確認','試作']):left='t-research-think'
 else:left='t-research-determined'if index%3==0 else't-research-happy'
 if who=='z':right='z-panic'if any(word in t for word in ['なくな','寂し','駄目','負け','ゼロ'])else'z-happy'
 elif who=='m':right='m-deadpan'if index%3==1 else'm-happy'
 else:right='m-happy'if index%2==0 else'z-happy'
 return left,right
