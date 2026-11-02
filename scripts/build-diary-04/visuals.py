"""Tsumugi's research notebook: semantic diagrams, original-art contain, safe heads."""
from pathlib import Path
from functools import lru_cache
import json,math,re
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-04';A=O/'assets'
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
 im=backdrop().copy();d=ImageDraw.Draw(im);text(d,27,14,'ビルド研究日誌',28,PLUM);text(d,575,17,'みんなが輝くRPGを！',24,PINK);text(d,1284,17,episode().get('header','#04 その余りを、次の誰かへ。'),25,GOLD);d.line((27,57,1893,57),fill=EDGE,width=2);d.rounded_rectangle((296,73,1624,923),28,fill=CREAM,outline=EDGE,width=2)
 if ch['id']!='next-episode':fit_text(d,320,85,ch.get('title',''),24,1210,MUTED)
 if ch.get('clip')and not full:d.rounded_rectangle((304,60,802,936),18,fill='#28252e',outline=MINT,width=3)
 research_scope=ch['lab']if 'lab'in ch else ch['id']not in ['roster','fio-now','future','next-episode'];scope=ch.get('scopeLabel')or('LAB ／ 研究用の試作'if research_scope else None)
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
 question_layout=question.replace('、','、\n',1);text(d,350,351,question_layout,37,PLUM,width=271);text(d,355,787,'次の頁を、\n一緒に開こう。',28,MINT,width=279)
 ax,ay,aw,ah=art_rect;assert ax>=682 and ay>=174 and ax+aw<=1238 and ay+ah<=858
 source=ROOT/'public'/entry['artPath'];digest=__import__('hashlib').sha256(source.read_bytes()).hexdigest();assert digest==entry['artSha256']
 return {'chapter':ch['id'],'characterId':cid,'seriesId':series_id,'name':name,'artPath':entry['artPath'],'artSha256':digest,'presentation':'contain','fullHeadVisible':True,'nameAndIdVisible':True,'unverifiedLabelVisible':True,'noNewGemClaim':True,'newCertification':False,'artSlot':[650,142,620,748],'artRect':list(art_rect),'originalSize':list(raw.size),'scaledSize':[aw,ah],'minimumInnerPadding':32,'nameRect':list(d.textbbox((1300,329),name,font=font(name_size,True))),'nameFontSize':name_size,'idRect':list(d.textbbox((1300,260),series_id,font=font(34,True))),'unverifiedLabel':scope,'scopeRect':[1210,808,394,50],'question':question,'questionLines':wrap(question_layout,37,271),'actorsOutsideMainArt':True,'method':'Whole unchanged original image contained with padding. Final visibility and lack of new-gem claim require independent final-frame review.'}

def clip_footer(d,x,w,content):
 lines=wrap(content,24,w-30);assert len(lines)<=3,('Clip footer too tall',content);text(d,x+15,806,content,24,MUTED,width=w-30)
def envelope(d,x,y,w=153,h=100,col=MINT):
 d.rounded_rectangle((x,y,x+w,y+h),12,fill=CREAM,outline=col,width=4);d.line((x+6,y+6,x+w/2,y+h*.58,x+w-6,y+6),fill=col,width=4)
def crown(d,x,y,r=22,col=GOLD):
 d.polygon([(x-r,y-r*.6),(x-r*.5,y),(x,y-r),(x+r*.5,y),(x+r,y-r*.6),(x+r*.7,y+r*.6),(x-r*.7,y+r*.6)],fill='#f3d890',outline=col,width=3)
def pilot_icon(d,x,y,r=22,col=MINT):
 d.ellipse((x-r,y-r,x+r,y+r),fill=CREAM,outline=col,width=3);arrow(d,(x-r*.45,y),(x+r*.5,y),col,4)
def hp_bar(d,x,y,w,value,col=MINT):
 d.rounded_rectangle((x,y,x+w,y+33),10,fill='#e8dfe6');d.rounded_rectangle((x,y,x+w*value,y+33),10,fill=col);d.line((x+w*.8,y-13,x+w*.8,y+49),fill=GOLD,width=4)
def causal_figure(base,d,x,w):
 title(d,x,161,'HPの境界を越え、同じ一手の選び方が変わる。',w,39)
 for i,(h,hp,ratio,body,col)in enumerate([('支払OFF：作用確認の架空対照','156 / 204',.7647058824,'全量回復48を選ぶ',LAV),('箱の支払あり','186 / 204',.9117647059,'既存石110 ＋ 慈雨43',MINT)]):
  xx=x+i*630;block(d,(xx,278,590,441),h,'',col);text(d,xx+25,375,hp,49,col);hp_bar(d,xx+25,475,530,ratio,col);text(d,xx+25,538,f'{ratio*100:.2f}％　｜　基準80％',31,PLUM);text(d,xx+25,628,body,31,col)
 note(d,x+17,797,'R1 Noelleへ30、R2直前のHP条件が変わる。他の三人も80％超。\n30が110へ変換されたのではなく、既存の通常1手を別の行動へ使えた記録。',w-34,27)
def sleep_figure(base,d):
 x=848;w=744;source=Image.open(O/'assets/research-r7-payment-source.png').convert('RGBA');contained(base,source,(310,66,486,864),0)
 d.rounded_rectangle((312,67,790,97),8,fill='#243947');text(d,321,72,'全記録より・別のR7の静止画',18,'#ffffff')
 title(d,x,161,'眠る前に置いた、有限の分だけ。',w,39)
 block(d,(x+9,291,w-22,178),'R6に作った別箱3','R1の37とは別。',MINT,31);block(d,(x+9,523,w-22,183),'R7：Noelleへ3 → 在庫0','Fioの睡眠は治らず、追加の手番もない。',LAV,28)
 clip_footer(d,x,w,'合計支払45のうち、睡眠中は3だけ。\n副性質の確認であり、勝因の主張ではない。')
def diagram(base,ch,phase,full=False):
 id=ch['id'];d=ImageDraw.Draw(base);side=bool(ch.get('clip'))and not full;x=848 if side else 346;w=744 if side else 1228;y=161
 if id=='roster':title(d,x,y,'少女たちの研究ノート',w);return
 if id=='next-episode':return next_episode_plate(base,ch)
 if id=='failed-draft':
  title(d,x,y,'旧セット：あと78を残し、R12で全滅。',w,39)
  if side:
   text(d,x+28,279,'残る敵HP',37,PINK);text(d,x+286,259,'78',109,PINK);block(d,(x+8,441,w-21,130),'旧セットは全量回復2回','',LAV);block(d,(x+8,598,w-21,122),'Fioの攻撃手番は戦闘全体で1回','',PINK)
   clip_footer(d,x,w,'seed65：旧R9〜12抜粋 ／ 薬1・花4・妖精3。\n新旧は技能・LS条件・準備AIの採用セット比較。')
  else:
   block(d,(x+9,284,1199,210),'旧セットのseed65','12Rで全滅 ／ 敵HP78 ／ Fio攻撃1・全量回復2',PINK,37);block(d,(x+9,570,1199,216),'箱が一つ足りなかった、と単純化しない','同じ敵・編成・装備のまま、採用セットを比べる。',MINT,34);note(d,x+17,836,'支払のみを止めたケースは、別の架空の作用確認。録画の旧セットと混ぜない。',w-34,28)
 elif id=='fio-now':
  title(d,x,y,'現行：半量手当の本当の余りを、障壁へ。',w,37)
  if side:
   for i,(h,b)in enumerate([('最も傷ついた仲間を手当','全量回復とは別の半量手当'),('実際の余剰から障壁','余剰30％・対象の最大HP15％まで'),('既存の支度','初回の正の障壁で本人ゲージ+10')]):block(d,(x+8,282+i*145,w-20,121),h,b,MINT,27)
   clip_footer(d,x,w,'現行1.11の紹介。研究の新箱・比較編成とは別。\nこの紹介のR3末にFioは離脱し、クリア例ではない。')
  else:
   card(base,'fio',(x+8,254,334,516),'BD071 ／ 余り布の薬草師',True);block(d,(x+418,282,780,226),'現行の余花の包帯','半量手当の余りを、その場の障壁へ。',MINT,35);block(d,(x+418,582,780,233),'研究案ではこの枠を箱へ置換','全量回復heal-17は残し、二枠で比べる。',LAV,34)
 elif id=='new-skill':
  if phase==0:
   title(d,x,y,'余った分を、有限の預かり箱へ。')
   for i,(h,b,col)in enumerate([('手当する','半量手当で\n本当に余った分だけ',MINT),('箱を作る','余剰の75％\n一箱の上限60',GOLD),('後で払う','敵の通常行動後\n1Rに一人・最大30',LAV)]):
    xx=x+i*414;block(d,(xx,306,379,420),h,b,col,34)
    if i<2:arrow(d,(xx+382,509),(xx+411,509))
   note(d,x+17,814,'作成R+3の終了まで。再使用4R。在庫が残る間は追加も期限更新もしない。',w-34,30)
  elif phase==1:
   title(d,x,y,'HP被害が先。手当は、その後。');block(d,(x+10,282,1199,215),'傷ついて生き残った一人へ','その敵の通常行動でHPを失った仲間から、低いHP比の一人へ。',MINT,32);block(d,(x+10,571,1199,242),'致死は救えず、連鎖して箱も増やさない','盾が全吸収・必殺・閉廊攻撃などは対象外。\n薬・花・再生・慈雨・箱の支払からは備蓄を作らない。',LAV,31)
  elif phase==2:
   title(d,x,y,'入れ替えるのは、採用セット。');block(d,(x+9,285,1199,207),'二枠のまま：全量回復 ＋ 預かり箱','旧・余花の包帯を置換。準備にも普通の一手を使う。',MINT,33);block(d,(x+9,567,1199,246),'支度の発火先・箱を準備するAIも変更','初回の正の備蓄で本人ゲージ+10。通常の+25とは別。\n新旧の差を、箱の支払一つだけの効果としない。',GOLD,31)
  else:sleep_figure(base,d)
 elif id in ['sleep','boundaries','shelf-check']:
  sleep_figure(base,d)
 elif id=='trial':
  title(d,x,y,'薬布の渡り廊下 ／ 閉廊はR12から。')
  for i,(h,b,col)in enumerate([('二体の敵','実HP合計3,736',LAV),('睡眠','通常70％の成功率',PINK),('大きな衝撃','先頭が受ける予告攻撃',GOLD)]):block(d,(x+i*414,304,379,320),h,b,col,34)
  block(d,(x+9,700,1199,167),'研究用の敵AI・試練','耐性・祓い・別の回復役を消して、Fioだけの正解にはしない。',MINT,30)
 elif id=='hypothesis':
  if phase==0:
   title(d,x,y,'初期探索と、最終の同条件比較を分ける。')
   for i,(h,b,col)in enumerate([('初期の相手','両案とも勝てた。\n役割の必要性は未確認。',LAV),('研究条件を変える','回復役への睡眠など、\n違う相性を調べた。',PINK),('最終の比較','新旧を同じ敵条件で。\n技だけの改善と混ぜない。',MINT)]):block(d,(x+i*414,310,379,414),h,b,col,32)
   note(d,x+18,827,'箱が残れば、本人は倒れていい、ではない。四人で帰る編成を探す。',w-36,30)
  else:
   title(d,x,y,'勝利92は同じ。四人生還は87→92。')
   for i,(h,a,b,col)in enumerate([('Fio先頭・本人の装備は保持','92 / 100 勝利','87 / 100 四人生還',LAV),('リオラ先頭・Fioリーダー','92 / 100 勝利','92 / 100 四人生還',MINT)]):
    xx=x+i*630;block(d,(xx,301,590,436),h,a,col,44);text(d,xx+24,590,b,36,col,width=540)
   note(d,x+18,821,'先頭を替えて勝率が急増した比較ではない。本人の装備を保ち、分業した。',w-36,28)
 elif id in ['recipe','roles']:
  if phase==0:
   title(d,x,y,'先頭とリーダーを、別の人に。')
   for i,(cid,role)in enumerate([('liora-awakened','先頭・白花／被害を受け持つ'),('nox','残響石＋慈雨／主攻撃'),('fio','リーダー・残響石＋慈雨'),('noelle-awakened','範囲攻撃・白灯石')]):card(base,cid,(x+i*309,274,285,467),role,cid=='fio')
   pilot_icon(d,x+30,798);text(d,x+66,776,'先頭：覚醒リオラ',31,MINT);crown(d,x+674,798);text(d,x+710,776,'リーダー：フィオ',31,GOLD)
  else:
   title(d,x,y,'勝利と、四人生還は別の指標。')
   for i,(h,a,b,col)in enumerate([('Fio先頭・装備は本人に保持','92 / 100 勝利','87 / 100 四人生還',LAV),('リオラ先頭・Fioリーダー','92 / 100 勝利','92 / 100 四人生還',MINT)]):
    xx=x+i*630;block(d,(xx,301,590,436),h,a,col,44);text(d,xx+24,590,b,36,col,width=540)
   note(d,x+18,821,'先頭を替えて勝率が急増した比較ではない。同じ装備を各本人に持たせた。',w-36,28)
 elif id in ['causal','one-turn','causal-witness']:
  causal_figure(base,d,x,w)
 elif id=='lab-victory-a':
  if side:
   title(d,x,y,'回復優先の80％を、越えた。',w,39)
   for i,(h,b)in enumerate([('R1：Noelleへ箱から30','156/204 → 186/204'),('R2直前：76.47％ → 91.18％','他の三人も80％超'),('通常1手の選択が変わる','既存石110 ＋ 慈雨の実回復43')]):block(d,(x+8,283+i*145,w-20,121),h,b,MINT if i<2 else GOLD,27)
   clip_footer(d,x,w,'30を110へ変換したのでも、追加手番でもない。\n既存石の次R追撃38は別の通常行動に数えない。')
  else:causal_figure(base,d,x,w)
 elif id=='lab-victory-b':
  title(d,x,y,'もう一手を使い、四人で帰る。',w,40)
  if side:
   block(d,(x+8,283,w-20,175),'新セットseed65：11R勝利','四人生還 ／ 旧は12R失敗・敵HP78',MINT,29);block(d,(x+8,519,w-20,181),'Fioの攻撃2回・全量回復1回','戦闘全体の手番数。旧は攻撃1・全量回復2。',GOLD,27)
   clip_footer(d,x,w,'新：薬1・花3・妖精3 ／ 総支払45、睡眠中は3。\n仕組みを見るため、固定100seedから選んだ一組。')
  else:
   for i,(h,b,col)in enumerate([('旧セット','12R失敗\n敵HP78',PINK),('新セット','11R勝利\n四人生還',MINT),('差を観察する','同seed65\n技能・LS・準備AI',LAV)]):block(d,(x+i*414,308,379,413),h,b,col,39)
   note(d,x+17,818,'本人の既存の一手を攻撃へ。支えた薬・花・妖精も、記録から消さない。',w-34,30)
 elif id=='comparisons':
  if phase==0:
   title(d,x,y,'採用セット比較と、架空の作用確認。')
   labels=[('新箱セット',92,MINT),('旧セット',84,LAV),('支払のみ停止（架空）',86,PINK),('LS充填なし（架空）',85,GOLD)]
   for i,(h,v,col)in enumerate(labels):
    yy=287+i*119;text(d,x+15,yy+15,h,29,col);d.rounded_rectangle((x+409,yy+8,x+409+v*6,yy+83),14,fill=col);text(d,x+1050,yy+19,f'{v}/100',34,col)
   note(d,x+18,830,'同じ固定100seed。新旧は技能・LS条件・準備AIのセット、OFFは合法の別ビルドではない。',w-36,27)
  else:
   title(d,x,y,'補助を、なかったことにしない。');block(d,(x+8,288,1199,222),'薬・花・妖精を使わない条件','28 / 100 成功',PINK,61);block(d,(x+8,586,1199,224),'新セット全100戦の平均の補助','薬0.53個 ／ 花4.78回 ／ 妖精2.21回',MINT,36);note(d,x+17,847,'毎回この個数ではない。見せたseed65は薬1・花3・妖精3。',w-34,29)
 elif id=='counterexample':
  if phase<2:
   title(d,x,y,'同T3の別解が、実際に残っている。')
   for i,(cid,h,b)in enumerate([('fio','旧Fio＋先頭の祓い石','100 / 100'),('elaine-awakened','覚醒エレイン・二人回復','99 / 100'),('selene-standard','通常セレネSR・再生','99 / 100')]):card(base,cid,(x+i*414,271,382,464),h,cid=='fio');text(d,x+i*414+26,775,b,40,MINT)
   note(d,x+17,846,'覚醒エレインは再生役ではない。石Tierとキャラの入手予算は別。\nFioの新しい専用攻略先は認定保留。',w-34,25)
  else:
   title(d,x,y,'石Tierと、キャラ入手予算も分ける。');block(d,(x+8,291,1199,213),'同T3でも、SSRの人数が違う','弁財天100/100 ／ アテナ＋回復役なしはSSR3人で100/100',LAV,31);block(d,(x+8,574,1199,239),'T6火力は、XRも含む高予算の別解','100/100・全て3R。新箱の唯一性を証明した結果ではない。',MINT,31)
 elif id=='legacy-audit':
  title(d,x,y,'前の三人にも、新Fioを入れて再審。')
  for i,(h,b,col)in enumerate([('ルカの回廊','100/100を維持\n平均11.63→11.69R',GOLD),('ネリの護衛','100/100を維持\n12R',GOLD),('イオネの宛先','100/100・6.03R\nTikka反例も維持',MINT)]):block(d,(x+i*414,306,379,426),h,b,col,34)
  note(d,x+17,800,'ルカへ全く無影響とは言わない。専用の仕事は崩さず旧琥珀◆2を保持。\nイオネ◇、新Fio◇。現行版の本認定は0のまま。',w-34,29)
 elif id=='future':
  title(d,x,y,'箱だけでなく、本人も帰ってきてほしい。');block(d,(x+8,290,1199,216),'今回見えた仕事','有限の手当で、後の普通の一手の選択を変えられた。',MINT,35);block(d,(x+8,582,1199,226),'まだ、唯一の攻略先ではない','別解と、支えてくれた仲間・石・道具を一緒にノートへ。',LAV,34)
 else:raise NotImplementedError('Unknown reviewed Part4 chapter: '+id)

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
 if id=='hypothesis':return 0 if index<4 else 1
 if id=='recipe':return 0
 if id=='new-skill':return 0 if index in[0,2]else 1 if index<5 else 2
 if id=='comparisons':return 0 if index<5 else 1
 if id=='counterexample':return 0 if index<4 else 2
 return index//2
def illustration_for(ch,line,index):return'research-lab-overflow'if ch['id']=='future'and index>=3 else None
def poses(ch,line,index):
 t=line['text'];who=line['speaker']
 if any(word in t for word in ['寂し','諦め','消え','大切','取り残','消さない','好きだから']):left='t-research-care'
 elif any(word in t for word in ['比べ','検証','考え','研究','数字','必要','未確認','試作']):left='t-research-think'
 else:left='t-research-determined'if index%3==0 else't-research-happy'
 if who=='z':right='z-panic'if any(word in t for word in ['なくな','寂し','駄目','負け','ゼロ'])else'z-happy'
 elif who=='m':right='m-deadpan'if index%3==1 else'm-happy'
 else:right='m-happy'if index%2==0 else'z-happy'
 return left,right
