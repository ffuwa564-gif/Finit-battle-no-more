from pathlib import Path
from functools import lru_cache
import json,math,re,os
from PIL import Image,ImageDraw,ImageFont,ImageFilter
B=Path(__file__).resolve().parent;A=B/'assets';SOURCE=Path(os.environ.get('STILLVEIL_SOURCE','/workspace/STILLVEIL-part0-source'));C=json.loads((B/'catalogue.json').read_text());BY={c['id']:c for c in C['characters']}
W,H=1920,1080;INK='#54394e';MUTED='#8a7182';PINK='#b45a87';GOLD='#bb8739';MINT='#568e83';EDGE='#d9bfce';CREAM='#fffaf3';COL={'t':'#986110','z':'#3e7543','m':'#8b3f74'};NAMES={'t':'つむぎ','z':'ずんだもん','m':'めたん'}
@lru_cache(None)
def font(n,b=True):return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold'if b else'Regular')+'.ttc',n)
def wrap(t,n,w):
 lines=[];s=''
 for token in re.findall(r'[A-Za-z0-9]+(?:[.:/%+−-][A-Za-z0-9]+)*[%％]?|\n|.',str(t)):
  if token=='\n':lines.append(s);s='';continue
  if s and font(n).getlength(s+token)>w:lines.append(s);s=token
  else:s+=token
 if s:lines.append(s)
 return lines or['']
def text(d,x,y,t,n=40,color=INK,width=None,b=True,anchor=None):
 lines=wrap(t,n,width)if width else str(t).split('\n')
 for j,s in enumerate(lines):d.text((x,y+j*round(n*1.36)),s,font=font(n,b),fill=color,anchor=anchor)
 return y+len(lines)*round(n*1.36)
def contain(im,art,box,pad=0):
 x,y,w,h=box;p=art.copy().convert('RGBA');p.thumbnail((int(w-pad*2),int(h-pad*2)),Image.Resampling.LANCZOS);xx=round(x+(w-p.width)/2);yy=round(y+(h-p.height)/2);im.alpha_composite(p,(xx,yy));return(xx,yy,p.width,p.height)
@lru_cache(None)
def image(path):return Image.open(path).convert('RGBA')
def source_art(id):return image(str(SOURCE/'public'/BY[id]['art']))
def base(title,tag='ビルド研究日誌 #00  /  ver1.10'):
 im=Image.new('RGBA',(W,H),'#f5e5ec');d=ImageDraw.Draw(im)
 for x in range(-1200,2600,180):d.polygon([(x,0),(x+42,0),(x+650,H),(x+608,H)],fill='#efdae4')
 d.rounded_rectangle((335,80,1585,885),radius=32,fill=CREAM,outline=EDGE,width=3);text(d,385,112,tag,24,MUTED);text(d,385,155,title,51,PINK,width=1150)
 return im
def box(im,rect,title,body='',color=PINK,n=38):
 d=ImageDraw.Draw(im);x,y,w,h=rect;d.rounded_rectangle((x,y,x+w,y+h),radius=22,fill='#fffefd',outline=EDGE,width=2);text(d,x+24,y+18,title,40,color,width=w-48)
 if body:text(d,x+24,y+85,body,n,INK,width=w-48)
def arrow(im,xy1,xy2,color=PINK,w=7):
 d=ImageDraw.Draw(im);x,y=xy2;dx=x-xy1[0];dy=y-xy1[1];a=math.atan2(dy,dx);d.line((*xy1,x,y),fill=color,width=w);d.polygon([(x,y),(x-28*math.cos(a-.45),y-28*math.sin(a-.45)),(x-28*math.cos(a+.45),y-28*math.sin(a+.45))],fill=color)
def diamond(im,x,y,r=45,color='#9b82bb'):
 d=ImageDraw.Draw(im);d.polygon([(x,y-r),(x+r*.78,y),(x,y+r),(x-r*.78,y)],fill=color,outline='#695266',width=3);d.line((x,y-r,x-r*.25,y,x,y+r,x+r*.25,y,x,y-r),fill='#f5e7ff',width=2)
def crown(im,x,y):
 d=ImageDraw.Draw(im);d.polygon([(x-42,y-25),(x-22,y-5),(x,y-43),(x+22,y-5),(x+42,y-25),(x+34,y+22),(x-34,y+22)],fill='#d8ae5d',outline='#a47a36',width=3)
def note(im,t,y=805):text(ImageDraw.Draw(im),390,y,t,27,MUTED,width=1140)
def hero(im,id,rect,label=True):
 x,y,w,h=rect;contain(im,source_art(id),(x,y,w,h-55),10)
 if label:text(ImageDraw.Draw(im),x+w/2,y+h-42,BY[id]['name'],27,INK,anchor='mm')
def cards(im,items):
 for j,(title,body)in enumerate(items):box(im,(390+(j%2)*580,270+(j//2)*255,545,220),title,body)

def diagram(scene,title):
 im=base(title);d=ImageDraw.Draw(im)
 if scene in ['lab','goodbye']:
  im=Image.new('RGBA',(W,H),'#f5e5ec');contain(im,image(str(A/'research-lab.png')),(50,15,1820,875),10);d=ImageDraw.Draw(im);d.rounded_rectangle((60,30,930,120),radius=22,fill='#fffaf3');text(d,90,47,'ビルド研究日誌 #00 ｜ はじめての方へ',39,PINK)
 elif scene in ['four','costs']:
  items=[('① スキル','その子が持つ行動'),('② リーダースキル','編成の方針を一人で選ぶ'),('③ 記憶石','装備して行動を追加'),('④ 指揮','対象になる攻撃先をそろえる')]
  if scene=='costs':items=[('一手','いま何に行動を使う？'),('リーダー一枠','どの追加効果を選ぶ？'),('石一枠','どの追加技を持ち込む？'),('指揮枠','誰と連携する？')]
  cards(im,items)
 elif scene=='scope':
  box(im,(405,280,1110,185),'前半：ver1.10の実装','スキル・LS・記憶石・指揮を紹介',MINT);box(im,(405,515,1110,195),'後半：#06以降の研究方針','未実装の候補や認定は、実装と区別する');note(im,'今回は新たな攻略結果・勝率・認定を発表する回ではありません。')
 elif scene in ['home','party']:
  contain(im,image(str(A/('game-home.png'if scene=='home'else'game-party.png'))),(385,235,410,600),5)
  for j,(a,b)in enumerate([('迷宮を探索','STILLVEIL'),('最大4人で編成','攻撃・回復・守護・支援'),('組み合わせを考える','研究日誌で扱う「ビルド」')]):box(im,(845,260+j*180,660,155),a,b,n=31)
 elif scene in ['roles','build','leader-pilot']:
  for j,id in enumerate(['elaine','liora','seris','noelle']):hero(im,id,(385+j*290,260,275,430));text(d,520+j*290,715,BY[id]['role'],32,MINT,anchor='mm')
  if scene=='build':
   for j in range(4):diamond(im,520+j*290,780,28)
   crown(im,1390,250);note(im,'図は役割の例です。最強編成の認定ではありません。',835)
  elif scene=='leader-pilot':text(d,400,790,'先頭の操作担当と、リーダーは別に指定できる',37,PINK)
  else:note(im,'R / SR / SSR / XR はレア度。役割や採用価値とは分けて考えます。')
 elif scene in ['skills','skill-examples','sakuya','barrier']:
  if scene in ['sakuya','barrier']:
   hero(im,'mireille',(390,260,390,530));box(im,(820,280,670,190),'桜花の祈り','HPが低い味方1人を回復',MINT);box(im,(820,520,670,235),'月光の障壁','次ラウンド終了まで\nダメージを肩代わり',PINK);note(im,'ver1.10の実装。後述する「桜の返礼」は、今後の設計候補です。')
  else:
   hero(im,'seris',(390,260,310,430));hero(im,'elaine',(775,260,310,430));box(im,(1140,315,355,310),'行動の役割','攻撃\n回復\n支援・解除',MINT);text(d,405,760,'同じ役割でも、持っている行動の組が違う',36,PINK)
 elif scene in ['cooldown','ultimate']:
  if scene=='cooldown':
   for j,(a,b)in enumerate([('使う','一手を使う'),('再使用待ち','その間は別の行動'),('また使える','状況を見て選ぶ')]):box(im,(390+j*390,330,350,285),a,b,n=35)
   for j in range(2):arrow(im,(755+j*390,470),(772+j*390,470))
  else:box(im,(410,300,520,330),'通常スキル','再使用待ちを管理');box(im,(980,300,520,330),'必殺技','別枠のゲージを管理',MINT);note(im,'必殺技の共通役割別効果も、資料編に掲載します。')
 elif scene in ['leaders','leader-parts','leader-sakuya']:
  crown(im,620,330);hero(im,'mireille',(390,360,410,420));box(im,(830,285,670,200),'基礎の補正','サクヤヒメ：全員の最大HP +14.4%',MINT,n=33);box(im,(830,525,670,230),'追加効果：月の慈愛','ラウンド終了時に全員の最大HPの3%回復\nリーダー生存中のみ',PINK,n=32)
 elif scene in ['leader-choice','leader-cost','two-builds']:
  hero(im,'mireille',(410,265,330,370));hero(im,'noelle',(1110,265,330,370));crown(im,575,270);crown(im,1275,270);box(im,(410,650,480,145),'サクヤヒメをリーダー','回復を重視',MINT,n=30);box(im,(960,650,540,145),'ノエルをリーダー','指揮を使う',PINK,n=30);text(d,950,440,'OR',60,MUTED,anchor='mm');note(im,'ver1.10ではリーダーは一人。両方を同時には選べません。',835)
 elif scene in ['gems','gem-equip','gem-affixes']:
  if scene=='gem-affixes':cards(im,[('種類','例：残響石'),('変種','例：澄明'),('強度','例：80（T3）'),('追加特性','例：慈雨。値にもTierがある')])
  else:hero(im,'seris',(405,280,350,440));diamond(im,860,465,80);arrow(im,(970,465),(1090,465));box(im,(1105,330,385,300),'技が増える','1人に1個\n装備して使う',MINT,n=34);note(im,'装備する「記憶石」と、ガチャ用の「祈願石」は別のものです。')
 elif scene=='gem-ward':
  diamond(im,580,460,90,'#c8b477');box(im,(785,300,710,330),'白灯石','味方に障壁を張る行動を追加\n重ね掛けで量は増えない',MINT,n=36)
 elif scene=='gem-echo':
  for j,(a,b)in enumerate([('攻撃','実際にHPへ与えたダメージ'),('次のラウンド','その35%で追撃')]):box(im,(400+j*580,330,520,310),a,b,n=34)
  arrow(im,(930,475),(967,475));note(im,'障壁・かばうは有効。追撃から新しい追撃を作らない。')
 elif scene=='gem-cost':cards(im,[('石一枠','持ち込める追加技は限られる'),('一手','使うときに行動が必要'),('再使用待ち','毎回は連打できない'),('選ぶ機会','その間、別の技を使う？')])
 elif scene in ['tiers','gem-limits']:
  for j,(a,b)in enumerate([('T3','強度 67〜100'),('T4','強度 120〜139'),('T6','強度 220〜239')]):box(im,(390+j*390,335,350,260),a,b,n=31)
  note(im,'強度Tierと特性Tierは別。固定品・上限・相性がある。',730);note(im,'高Tierだけで、どの編成でも勝てるとは限りません。',790)
 elif scene in ['command','command-target']:
  hero(im,'noelle',(400,270,300,410));crown(im,550,270);box(im,(1130,365,360,205),'指定した敵','攻撃先をそろえる',n=32)
  for j,id in enumerate(['seris','iris']):hero(im,id,(740,270+j*255,245,250));arrow(im,(985,390+j*255),(1120,455))
  note(im,'ノエルをリーダーにしたときの「星図の号令」。')
 elif scene=='command-boundary':
  box(im,(405,280,1100,190),'変えるもの','対象となる通常単体行動の攻撃先',MINT);box(im,(405,515,1100,240),'直接命令しないもの','回復・障壁・記憶石・追撃・範囲・予約必殺など',PINK,n=35)
 elif scene=='command-budget':
  for j,(a,b)in enumerate([('R','1'),('SR','2'),('SSR','3'),('XR','4')]):box(im,(390+j*290,350,260,240),a,b,n=68)
  text(d,410,265,'指揮枠：ノエル 3 ／ 覚醒ノエル 4',40,MINT);note(im,'明示的な覚醒は元の負荷を継承。別衣装とは区別します。')
 elif scene in ['command-cost','command-limits']:
  if scene=='command-cost':cards(im,[('ノエル本人の一手','発令に使う'),('そのラウンドの追加LS','発令時は得られない'),('狙いが元から同じ','利益は小さいことも'),('判断する','命令した回数だけで評価しない')])
  else:cards(im,[('使えない例','指揮官の戦闘不能・状態異常'),('予約との競合','指揮官の必殺予約など'),('指定敵が死亡','通常判断へ戻る'),('発令の費用','枠と本人の一手は返らない')])
 elif scene in ['future-label','proposal']:
  if scene=='proposal':hero(im,'mireille',(390,260,365,530));box(im,(800,280,700,185),'現行 ver1.10','桜花の祈り・月光の障壁',MINT);box(im,(800,515,700,220),'今後の設計候補・未実装','桜の返礼 など\n実戦で合格した効果とは分ける',PINK,n=34)
  else:box(im,(400,285,1100,420),'ここからは、今後の方針','新しい実装や勝利結果の発表ではありません。\n数理研究の基準と、シリーズの方向転換を紹介します。',PINK,n=39)
 elif scene=='old-new':
  box(im,(410,285,1090,200),'#01〜05：旧方針・試作条件','その子がいないと勝てない条件を探す');box(im,(410,535,1090,210),'#06以降：新しい研究方針','全所持でも、選ぶ理由・連携・育成価値を比べる',MINT,n=36);note(im,'旧結果を新基準の「検証済み」へ、自動で読み替えません。',825)
 elif scene=='endgame':cards(im,[('全キャラを所持','高いレアも比較候補に入れる'),('最高級の記憶石','入手しやすさだけで評価しない'),('同じ予算で比較','相手の編成・石・操作も探す'),('強い子と組む','低いレアにも、固有の利益は？')])
 elif scene=='objective':
  labels=['用済みになる子を減らす','上位互換を減らす','固定メンバーへの依存を減らす','有効なビルドを増やす','相乗効果を増やす']
  for j,label in enumerate(labels):box(im,(420,255+j*107,1080,90),str(j+1)+'  '+label,'',MINT if j>2 else PINK)
 elif scene=='three':
  for j,(a,b)in enumerate([('勝てる','実用性'),('選ぶ理由がある','固有の利益'),('育てたくなる','石の厳選に意味')]):box(im,(390+j*390,310,350,320),a,b,n=35)
  note(im,'勝率だけで認定しない。ほかの子の出番も消えていないか調べる。',775)
 elif scene=='fair':cards(im,[('共通の既存ステージ','専用の接待ステージを足さない'),('両側を公平に探索','同じ石・アイテム・操作の予算'),('確認用の乱数を分離','原則200条件以上。誤差も評価'),('結果を複数の軸で見る','勝率・ラウンド・薬・生還')])
 elif scene=='delta':
  text(d,480,330,'Δ = 対象入りの勝率',63,PINK);text(d,580,455,'− 比較候補の勝率',63,PINK);note(im,'探索で見つけた「最良既知」。最適性を証明した値とは区別。',720);note(im,'1回の勝利は、勝率や固有効果の証明ではありません。',790)
 elif scene=='monologue':
  text(d,405,300,'研究独白',65,PINK);text(d,405,405,'「この子で、勝ちたい。」',62,INK);hero(im,'mireille',(1120,490,350,300));text(d,430,610,'研究は厳密に。説明は簡潔に。',42,MINT);text(d,430,695,'好きな子を、根拠と一緒に。',42,INK);note(im,'#06以降で合わせていく予定の方針です。',825)
 elif scene=='appendix-guide':cards(im,[('全75形態','通常スキル・リーダー効果'),('記憶石13種類・20変種','追加特性・Tierも掲載'),('指揮の詳細','費用・対象・制約'),('ここからはBGMのみ','一時停止とチャプターでどうぞ')])
 else:raise ValueError('Missing scene '+scene)
 return im

def speech_plate(line,index):
 im=diagram(line['scene'],line['chapterTitle']);d=ImageDraw.Draw(im)
 if line['scene']not in ['lab','goodbye']:
  key='t-research-care'if any(w in line['text']for w in ['好き','失わ','消え','取り残','価値'])else't-research-think'if any(w in line['text']for w in ['研究','比べ','確認','選ぶ','検証'])else't-research-happy'
  contain(im,image(str(A/(key+'-avatar.png'))),(0,440,320,440))
  guest='z-panic'if line['speaker']=='z'and any(w in line['text']for w in ['全部','絶対','多い','完成','勝てる'])else'z-happy'if line['speaker']=='z'else'm-deadpan'if index%3==0 else'm-happy'
  contain(im,image(str(A/(guest+'-avatar.png'))),(1600,440,320,440))
 d=ImageDraw.Draw(im);d.rectangle((0,914,1920,1080),fill=CREAM);text(d,72,945,NAMES[line['speaker']],34,COL[line['speaker']]);lines=wrap(line['text'],48,1530);assert len(lines)<=2,(line['id'],lines)
 text(d,300,931,line['text'],48,COL[line['speaker']],1530);text(d,65,1052,'STILLVEIL ver1.10  |  VOICEVOX:春日部つむぎ・ずんだもん・四国めたん  |  Music: 甘茶の音楽工房',18,MUTED,b=False)
 return im.convert('RGB')

CAT_QC=[]
def catalogue_plate(kind,item,index,total):
 im=Image.new('RGBA',(W,H),CREAM);d=ImageDraw.Draw(im);d.rectangle((0,0,1920,84),fill='#70465f');text(d,55,17,'資料編  /  ver1.10  /  一時停止で読めます',34,'#fffaf3');text(d,1860,39,f'{index:02}/{total:02}',30,'#fffaf3',anchor='rm')
 title=item['name'];text(d,555,115,title,56,PINK,width=1300)
 if kind=='character':
  contain(im,source_art(item['id']),(45,140,450,820),20)
  text(d,555,192,f"{item['rarity']}  /  {item['role']}  /  定数 {item['strength']:.1f}  /  指揮負荷 {item['commandCost']}",29,MUTED)
  blocks=[(s['name'],s['description'])for s in item['skills']]+[('リーダースキル',item['leader'])]
  if item['commandCapacity']:blocks.append(('指揮',f"ノエルの星図の号令：{item['commandCapacity']}枠。対象と費用は指揮資料を参照。"))
  footer='必殺技：'+item['ultimate']['name']+'（役割別の効果は後掲）'
 elif kind=='gem':
  diamond(im,270,430,140,{'聖域':'#c7b27a','機巧':'#81b5c2','黄昏':'#b399cd'}[item['family']]);text(d,270,650,item['family'],43,MUTED,anchor='mm');text(d,555,192,('固定製作品'if item['fixed']else'表示例：強度80（T3）・特性なし')+'  /  '+('ボス枠'if item['bossOnly']else'製作'if item['fixed']else'通常候補'),29,MUTED)
  blocks=[('技の効果',item['description']),('表示例の補正',item['rollDescription']),('付与できる追加特性',' / '.join(item['supportedTraits']))];footer='固定品は元の固定値を使用。変種と強度・特性のTierは別。入手確率の保証ではありません。'
 else:
  contain(im,image(str(A/'t-research-think.png')),(65,270,395,620),35);text(d,555,192,item.get('subtitle','実装の説明・研究案とは区別'),29,MUTED);blocks=item['blocks'];footer=item.get('footer','この一覧はver1.10の実装から作成しています。')
 n=38
 def height(n):return sum(46+len(wrap(t,n,1280))*round(n*1.36)+22 for _,t in blocks)
 while height(n)>660 and n>30:n-=2
 assert height(n)<=660,(title,height(n));y=260
 for label,body in blocks:
  text(d,555,y,label,30,MINT);y+=43;y=text(d,555,y,body,n,INK,1280,b=False)+22
 assert y<=940,(title,y);text(d,555,958,footer,23,MUTED,1280,b=False);text(d,55,1040,'資料一覧：全登録形態を掲載。通常の加入可否や解放条件とは別です。',22,MUTED,b=False)
 CAT_QC.append({'kind':kind,'id':item.get('id',title),'font':n,'lastBodyY':y,'blocks':len(blocks)});return im.convert('RGB')

def section_plate(title,body):
 im=Image.new('RGBA',(W,H),'#f6e8ec');d=ImageDraw.Draw(im);d.rounded_rectangle((160,180,1760,875),radius=42,fill=CREAM,outline=EDGE,width=3);text(d,960,325,'ここからは、見たい人だけ',42,MUTED,anchor='mm');text(d,960,475,title,78,PINK,anchor='mm');text(d,960,635,body,37,INK,anchor='mm');text(d,960,790,'一時停止・チャプター移動でご覧ください',32,MUTED,anchor='mm');return im.convert('RGB')

def thumbnail():
 im=Image.new('RGBA',(1280,720),'#f5e5ec');contain(im,image(str(A/'research-lab.png')),(0,0,1280,635));d=ImageDraw.Draw(im);d.rounded_rectangle((25,25,420,93),radius=20,fill=CREAM);text(d,50,35,'PART 0  /  ver1.10',35,PINK);d.rectangle((0,570,1280,720),fill=CREAM);text(d,640,622,'はじめての ビルド研究日誌',57,PINK,anchor='mm');text(d,640,686,'スキル  /  リーダー  /  記憶石  /  指揮',32,INK,anchor='mm');return im.convert('RGB')
