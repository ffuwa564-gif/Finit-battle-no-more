"""Tsumugi's research notebook: semantic diagrams, original-art contain, safe heads."""
from pathlib import Path
from functools import lru_cache
import json,math,re
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-03';A=O/'assets'
W,H=1920,1080;INK='#54394e';PLUM='#71435f';PINK='#b45a87';MINT='#568e83';LAV='#9b82bb';GOLD='#bb8739';CREAM='#fffaf3';EDGE='#d9bfce';MUTED='#8a7182'
COL={'t':'#986110','z':'#3e7543','m':'#8b3f74'};NAMES={'t':'春日部つむぎ','z':'ずんだもん','m':'四国めたん'}
@lru_cache(None)
def episode():
 p=O/'render-plan.json';return json.loads(p.read_text())if p.exists()else{}
@lru_cache(None)
def font(n,b=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if b else'Regular')+'.ttc',n)
# Decimal numbers, fractions, ranges, IDs and their units remain whole.
ASCII_TOKEN=re.compile(r"[A-Za-z0-9]+(?:[._:'’][A-Za-z0-9]+)*(?:\s*[/×+−–~〜-]\s*[A-Za-z0-9]+(?:[._:'’][A-Za-z0-9]+)*)*(?:[%％]|個|人|件|回|倍|秒|層|ラウンド)?|\n|.")
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
 im=backdrop().copy();d=ImageDraw.Draw(im);text(d,27,14,'ビルド研究日誌',28,PLUM);text(d,575,17,'みんなが輝くRPGを！',24,PINK);text(d,1284,17,episode().get('header','#03 ビルド研究'),25,GOLD);d.line((27,57,1893,57),fill=EDGE,width=2);d.rounded_rectangle((296,73,1624,923),28,fill=CREAM,outline=EDGE,width=2)
 if ch['id']!='next-episode':fit_text(d,320,85,ch.get('title',''),24,1210,MUTED)
 if ch.get('clip')and not full:d.rounded_rectangle((304,60,802,936),18,fill='#28252e',outline=MINT,width=3)
 scope=ch.get('scopeLabel')or('LAB ／ 研究用の試作'if ch.get('lab')or ch['id']not in ['roster','ione-now','future','next-episode']else None)
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
 d=ImageDraw.Draw(base)
 title(d,347,171,'NEXT EPISODE',335,38)
 raw=art('fio');art_rect=contained(base,raw,(650,142,620,748),32)
 reviewed,by=registry();entry=by['fio'];assert entry['seriesId']=='BD071';assert not entry['gems'].get('badge','').startswith('solid'),'Preview cannot pre-award Fio a filled gem'
 registered=reviewed.get('nextEpisodePreview',{});assert registered.get('characterId')=='fio'and registered.get('seriesId')=='BD071'and registered.get('newCertificationGranted')is False,'Preview must remain unverified in the registry'
 text(d,1300,260,entry['seriesId'],34,MINT);fit_text(d,1300,329,c_name('fio'),48,281,PLUM)
 pill(d,(1210,808,1604,858),'次回の新ビルドは未検証・認定前',MUTED,'#f5f0f2',24)
 text(d,350,351,ch.get('previewQuestion','余った回復は、どんな勝ち筋になる？'),37,PLUM,width=271)
 text(d,355,787,'余りものから、\n次の一手を。',28,MINT,width=279)
 ax,ay,aw,ah=art_rect;assert ax>=682 and ay>=174 and ax+aw<=1238 and ay+ah<=858
 source=ROOT/'public'/entry['artPath'];digest=__import__('hashlib').sha256(source.read_bytes()).hexdigest();assert digest==entry['artSha256']
 return {'chapter':ch['id'],'characterId':'fio','seriesId':'BD071','name':c_name('fio'),'artPath':entry['artPath'],'artSha256':digest,'presentation':'contain','fullHeadVisible':True,'nameAndIdVisible':True,'unverifiedLabelVisible':True,'noNewGemClaim':True,'newCertification':False,'artSlot':[650,142,620,748],'artRect':list(art_rect),'originalSize':list(raw.size),'scaledSize':[aw,ah],'minimumInnerPadding':32,'nameRect':list(d.textbbox((1300,329),c_name('fio'),font=font(48,True))),'idRect':list(d.textbbox((1300,260),'BD071',font=font(34,True))),'unverifiedLabel':'次回の新ビルドは未検証・認定前','scopeRect':[1210,808,394,50],'question':ch.get('previewQuestion','余った回復は、どんな勝ち筋になる？'),'actorsOutsideMainArt':True,'method':'Whole unchanged original image is contained with padding. Final anatomy, label readability and no-gem claim require independent final-frame/manual review.'}


def clip_footer(d,x,w,content):
 lines=wrap(content,24,w-30);assert len(lines)<=3,('Clip footer too tall',content);text(d,x+15,806,content,24,MUTED,width=w-30)
def envelope(d,x,y,w=153,h=100,col=MINT):
 d.rounded_rectangle((x,y,x+w,y+h),12,fill=CREAM,outline=col,width=4);d.line((x+6,y+6,x+w/2,y+h*.58,x+w-6,y+6),fill=col,width=4)
def diagram(base,ch,phase,full=False):
 id=ch['id'];d=ImageDraw.Draw(base);side=bool(ch.get('clip'))and not full;x=848 if side else 346;w=744 if side else 1228;y=161
 if id=='roster':title(d,x,y,'少女たちの研究ノート',w);return
 if id=='next-episode':return next_episode_plate(base,ch)
 if id=='failed-draft':
  title(d,x,y,'誤撃は0。それでも、HPが12残った。',w,39)
  if side:
   text(d,x+30,279,'残HP',37,PINK);text(d,x+220,259,'12',111,PINK);block(d,(x+9,443,w-22,121),'R7：支援必殺を予約','',LAV);block(d,(x+9,593,w-22,121),'R8：閉門の全体攻撃 → 全滅','',PINK)
   clip_footer(d,x,w,'seed1：差戻し4回・誤撃HP0。\n同敵・同編成・同じT3装備の失敗記録。')
  else:
   block(d,(x+10,282,1199,194),'R6まで、成功例と同じ記録','宛先を戻せても、最後の攻撃までは選んでくれない。',MINT,34);block(d,(x+10,555,1199,221),'R7の予約を変える余地が残った','支援必殺 → HP12を残す → R8で全滅',PINK,43);note(d,x+20,831,'seed1失敗：8R・生存0 ／ 差戻し4・誤撃0。後から敵を弱めた成功例ではない。',w-40,27)
 elif id=='ione-now':
  title(d,x,y,'現行：宛先の余白を、別の仲間が拾う。',w,37)
  if side:
   for i,(h,b)in enumerate([('標を残す','敵一体へ、次R終了まで'),('別の味方がHPを削る','通常攻撃・キャラクター通常技'),('一回だけ回収','その味方の必殺ゲージ +10')]):block(d,(x+9,282+i*146,w-22,121),h,b,MINT,27)
   clip_footer(d,x,w,'本人・石・必殺・追加攻撃では回収しない。\nこの現行技は研究案でも維持する。')
  else:
   card(base,'ione',(360,248,329,521),'BD069 ／ 空欄を預かる書記',True);block(d,(762,289,799,235),'宛先の余白','別の仲間の通常攻撃・通常技がHPを削ると、回収してゲージ+10。',MINT,33);block(d,(762,589,799,225),'研究では、別の強化技を入れ替える','星灯の導き → 宛先の控え',LAV,35)
 elif id=='new-skill':
  if phase==0:
   title(d,x,y,'宛先の控え：公開した行き先を、渡す。')
   for i,(h,b,col)in enumerate([('画面で指定','いま生きている\n敵のUID',LAV),('他の味方へ','本人以外の一人へ\n同時に一枚',MINT),('次Rの終わりまで','誤って味方へ向いた\n通常攻撃を一回戻す',GOLD)]):
    xx=x+i*414;block(d,(xx,305,379,420),h,b,col,33)
    if i<2:arrow(d,(xx+382,514),(xx+412,514))
   note(d,x+18,821,'再使用1R。本人の普通の一手を使い、未来の技や非公開の意思は読まない。',w-36,29)
  elif phase==1:
   title(d,x,y,'戻すのは、強制攻撃の宛先だけ。');block(d,(x+10,291,1199,176),'変える：味方へ向いた攻撃の行き先','保存した、生存中の敵へ差し戻す。',MINT,34);block(d,(x+10,523,1199,271),'変えない：魅了・混乱、威力、行動の種類','通常攻撃のまま。元の技・予約必殺は戻らず、\n強制攻撃に通常手番のゲージ+25も付かない。',PINK,33);note(d,x+17,851,'睡眠・麻痺の行動不能を救う技でもない。',w-34,28)
  else:
   title(d,x,y,'追尾や治療へ、勝手に広げない。');block(d,(x+9,292,1199,206),'控えた敵が、もう倒れていたら','別の敵へ自動追尾しない。差戻し・控え消費なし、自然失効へ。',LAV,31);block(d,(x+9,577,1199,241),'ノエルの号令とは、別の仕事','動ける味方の攻撃をまとめる指揮ではなく、\n味方へ誤って向く一撃だけを戻す。',MINT,33)
 elif id=='trial':
  title(d,x,y,'名札の交差路 ／ R8から、閉門の攻撃。')
  for i,(h,b,col)in enumerate([('敵HP','1,800',LAV),('魅了成功率','通常の70％',PINK),('閉門','R8から全体攻撃',GOLD)]):block(d,(x+i*414,300,379,317),h,b,col,45 if i<2 else 34)
  block(d,(x+10,703,1199,169),'対策を消して、唯一解にはしない','魅了が外れる・祓う・耐性で防ぐ・先に倒す経路も残る。',MINT,31)
 elif id=='recipe':
  if phase==0:
   title(d,x,y,'準備の一手を、四人で支える。')
   for i,(cid,role)in enumerate([('ione','宛先を控える普通の一手'),('nox','高い攻撃値・魅了対象'),('liora-awakened','準備中の被害を受ける'),('fio','回復と障壁で支える')]):card(base,cid,(x+i*309,264,285,477),role,i==0)
   note(d,x+16,827,'イオネがリーダー、既存のT3装備。新リーダースキル・専用石を増やしていない。',w-32,28)
  else:
   title(d,x,y,'速さだけ、名前だけでは比べない。');block(d,(x+12,288,1198,206),'動く前に控えを置く','同じRを、誤撃のあとから巻き戻すことはできない。',MINT,36);block(d,(x+12,564,1198,240),'ノクスの席を覚醒ノエルへ：0/100','速さ・火力・対象選択が同時に変わる。\nこの一比較で、ノクス必須とは証明しない。',LAV,32)
 elif id=='lab-victory-a':
  title(d,x,y,'状態は残る。宛先だけが戻る。',w,40)
  if side:
   for i,(h,b)in enumerate([('控えを渡す','公開した敵の行き先を保存'),('魅了・混乱で味方へ','普通の攻撃のまま差し戻す'),('守りと回復は別に要る','受領者を誤る比較は58/100')]):block(d,(x+8,281+i*146,w-20,121),h,b,MINT if i<2 else LAV,27)
   clip_footer(d,x,w,'通常ゲージ+25・元の技は戻らない。\n準備したら勝ちが決まる予約ではない。')
  else:
   envelope(d,x+30,318,270,172);arrow(d,(x+333,404),(x+727,404));block(d,(x+770,291,428,324),'Noxの一撃','魅了のまま\n保存した敵へ',MINT,38);block(d,(x+15,705,1189,164),'守り・回復・最後の入力は、まだ別の仕事','宛先を戻す能力だけで、戦闘全部を終わらせない。',LAV,30)
 elif id=='lab-victory-b':
  title(d,x,y,'R7開始前に、攻撃を予約していた。',w,38)
  if side:
   for i,(h,b)in enumerate([('開始前：公開の閉門まであと1R','支援必殺ではなく、残響石を予約'),('先にノクスの差戻し攻撃','敵の残HPが12になる'),('予約したイオネの攻撃','残HP12を削って撃破')]):block(d,(x+8,282+i*146,w-20,121),h,b,GOLD if i!=1 else MINT,27)
   clip_footer(d,x,w,'seed1：7R・4人生存 ／ 薬0・花2・妖精0\n差戻し4・誤撃HP0。12は残HP分の実ダメージ。')
  else:
   for i,(h,b,col)in enumerate([('R6まで同じ','入力・展開も共通',LAV),('R7開始前の予約','支援必殺 → 残響石',GOLD),('ノクス → イオネ','残HP12 → 予約攻撃で0',MINT)]):
    xx=x+i*414;block(d,(xx,301,379,411),h,b,col,34)
    if i<2:arrow(d,(xx+383,507),(xx+411,507))
   note(d,x+18,822,'同技能・終盤予約だけを変更：94/100 → 100/100。\nHP12を見て途中入力したわけではなく、公開締切で事前予約。',w-36,31)
 elif id=='comparisons':
  if phase==0:
   title(d,x,y,'94と98は、終盤方針も違う。')
   for i,(h,v,b,col)in enumerate([('旧・安全策','94 / 100','新技あり ＋ 支援必殺',PINK),('元buffの別条件','98 / 100','元buff ＋ 終盤攻撃',LAV)]):
    xx=x+i*630;block(d,(xx,303,590,429),h,v,col,62);text(d,xx+25,566,b,32,PLUM,width=540)
   note(d,x+19,820,'技能と終盤方針の二つが違う。94<98を、新技の手数コストだけで説明しない。',w-38,28)
  elif phase==1:
   title(d,x,y,'終盤方針を揃えた、新技と元buffの比較。')
   for i,(h,success,damage,col)in enumerate([('改善本命','100 / 100','0',MINT),('元buffへ戻す','98 / 100','81.28',LAV)]):
    xx=x+i*630;block(d,(xx,301,590,459),h,success,col,58);text(d,xx+24,588,'平均の誤撃HP：'+damage,33,PLUM,width=540)
   note(d,x+17,821,'両者の終盤攻撃方針は同じ。有限標本の比較で、全勝保証や差の原因の分解ではない。',w-34,27)
  else:
   title(d,x,y,'受け手・時刻・支えも、結果に残る。');labels=[('改善本命','100 / 100','0'),('遅い予約','99 / 100','38.41'),('受領者を間違う','58 / 100','114.89'),('補助行動なし','57 / 100','0')]
   text(d,x+25,266,'方針',30,MUTED);text(d,x+505,266,'成功',30,MUTED);text(d,x+901,266,'平均誤撃HP',30,MUTED)
   for i,(h,a,b)in enumerate(labels):
    yy=327+i*107;d.rounded_rectangle((x+8,yy,x+w-12,yy+87),14,fill='#e9f3ed'if i==0 else CREAM,outline=EDGE,width=2);text(d,x+30,yy+18,h,32,MINT if i==0 else PLUM);text(d,x+505,yy+17,a,34,PLUM);text(d,x+915,yy+17,b,34,PINK)
   note(d,x+16,824,'94と98は終盤方針も違う。新技の手数コストだけで94<98を説明しない。',w-32,28)
 elif id=='counterexample':
  if phase<2:
   title(d,x,y,'同じ予算の別解と、高予算の別解を分ける。');card(base,'tikka',(x+8,262,331,465),'T3・祓い石の別解');block(d,(x+395,279,805,207),'同じT3：ティッカ＋祓いの石','100 / 100成功 ／ 治すために石1枠を使う',MINT,35);block(d,(x+395,554,805,208),'高予算T6：火力で先に倒す','100 / 100成功 ／ 全て1R撃破',LAV,35);note(d,x+16,835,'どちらも実際の反例。T6を同じ予算の比較と混ぜない。',w-32,29)
  else:
   title(d,x,y,'価値を消さず、認定は保留する。');card(base,'ione',(x+9,261,337,491),'案あり・専用攻略先は未認定');gem(d,x+479,391,59,MINT,False);text(d,x+588,333,'中抜きのまま',53,MINT);text(d,x+407,540,'誤撃0・別の石枠・最後の一手。\n見つけた仕事は、ノートに残す。',39,PLUM,width=790);note(d,x+18,839,'別の勝ち方を隠したり禁止して、イオネだけ正解にはしない。',w-36,30)
 elif id=='growth':
  title(d,x,y,'T1でも同じ、ではなかった。')
  for i,(h,v,col)in enumerate([('T1へ下げる','25 / 100',PINK),('本命T3','100 / 100',MINT)]):
   xx=x+i*630;block(d,(xx,305,590,419),h,v,col,64);text(d,xx+24,581,'同じ編成でティアを比較',31,PLUM)
  note(d,x+18,810,'誤撃0だけでは閉門までの勝利を保証しない。\n火力・守り・耐性の寄与や厳選の面白さまで、原因を一つに決めない。',w-36,29)
 elif id=='legacy-audit':
  title(d,x,y,'前の二人の仕事も、同条件で再審する。')
  for i,(cid,h,rnd)in enumerate([('ruka','回廊：100 / 100','平均11.63R'),('neri','護衛：100 / 100','12Rで帰還')]):
   xx=x+i*630;card(base,cid,(xx+10,267,254,432),'既存の試作認定');block(d,(xx+294,289,298,385),h,rnd,MINT,30);gem(d,xx+104,759,28,GOLD,True)
  note(d,x+20,823,'イオネの宛先修正では、回復阻止も休番も作らない。\n旧二人の琥珀◆を維持 ／ イオネは中抜き◇ ／ 現行の本認定0。',w-40,29)
 elif id=='future':
  title(d,x,y,'空欄は、負けた印ではない。');block(d,(x+9,294,1199,216),'今回見つけた役割','誤撃を戻す・本人の最後の一手・他の石枠を選べる余地',MINT,34);block(d,(x+9,588,1199,221),'まだ未達の目標','このビルドだけの専用攻略先。無理に塗り宝石を増やさない。',LAV,33)
 else:raise NotImplementedError('Unknown Part3 chapter: '+id)


def plate(ch,phase,output,full=False,illustration=None):
 im=base_plate(ch,phase,full or not bool(ch.get('clip')));metadata=None
 if illustration:contained(im,Image.open(A/(illustration+'.png')).convert('RGBA'),(320,131,1280,770),25)
 else:
  metadata=diagram(im,ch,phase,full)
  if metadata:
   metadata['processingSha256']=__import__('hashlib').sha256(Path(__file__).read_bytes()).hexdigest();metadata['plate']=str(Path(output).relative_to(ROOT));(Path(output).parent/'next-episode-preview.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
 im.convert('RGB').save(output)
 if metadata:
  metadata['plateSha256']=__import__('hashlib').sha256(Path(output).read_bytes()).hexdigest();(Path(output).parent/'next-episode-preview.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
def phase_for(ch,line,index):
 id=ch['id']
 if id=='new-skill':return 0 if index<2 else 1 if index<5 else 2
 if id=='recipe':return 0 if index<2 or index==4 else 1
 if id=='comparisons':return 0 if index<2 else 1 if index<4 else 2
 if id=='counterexample':return 0 if index<4 else 2
 return index//2
def illustration_for(ch,line,index):return'research-lab-register'if ch['id']=='future'and index>=3 else None
def poses(ch,line,index):
 t=line['text'];who=line['speaker']
 if any(word in t for word in ['寂し','諦め','消え','大切','取り残','消さない','好きだから']):left='t-research-care'
 elif any(word in t for word in ['比べ','検証','考え','研究','数字','必要','未確認','試作']):left='t-research-think'
 else:left='t-research-determined'if index%3==0 else't-research-happy'
 if who=='z':right='z-panic'if any(word in t for word in ['なくな','寂し','駄目','負け','ゼロ'])else'z-happy'
 elif who=='m':right='m-deadpan'if index%3==1 else'm-happy'
 else:right='m-happy'if index%2==0 else'z-happy'
 return left,right
