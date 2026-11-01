"""Specific discussion panels; values are tied to saved native experiments."""
from PIL import Image,ImageDraw
import json
GEMS={'echo-shard':'残響石','rewind-thread':'巻戻しの石','pale-ward':'白灯石','twin-tide':'双潮の記憶','white-flower-seed':'摘まない白花'}
def draw(base,ch,ROOT,OUT,font,CHARS,ASSETS):
 ident=ch['id']
 if ident not in {'rewind-plan','flower-plan','enemies','equipment','comparison','preparation','command'}:return False
 d=ImageDraw.Draw(base);white='#f0f2f4';gold='#d9c195';muted='#a8b8c7';green='#b8e391'
 d.rounded_rectangle((310,220,1290,660),radius=15,fill='#172638')
 def text(x,y,t,n=26,col=white):d.text((x,y),t,font=font(n,True),fill=col)
 def portrait(cid,x,y,s=100):
  c=CHARS[cid];im=Image.open(ROOT/'public'/ASSETS[c['portraitId']]['path']).convert('RGBA');z=min(im.size);im=im.crop(((im.width-z)//2,(im.height-z)//2,(im.width+z)//2,(im.height+z)//2)).resize((s,s));base.alpha_composite(im,(x,y))
 if ident=='rewind-plan':
  for i,(cid,job)in enumerate([('seris-awakened','主な攻撃'),('iris','巻戻し'),('athena','受け・リーダー'),('benzaiten','回復')]):
   x=335+i*235;portrait(cid,x+40,230);text(x,340,CHARS[cid]['name'],22);text(x,377,job,21,gold)
  for i,t in enumerate(['同じ40乱数：ヴェスペラ28勝 → ウズメ28勝','セリス→ノクス：17勝／アテナ→リオラ：6勝','ウズメ＋エレイン同時交代：23勝（単独交換と別）']):text(335,450+i*53,t,25)
 elif ident=='flower-plan':
  for i,(a,b)in enumerate([('① 植える','固定20回復＋種'),('② 本人が防御','予約だけでは不可'),('③ 咲く','固定50回復')]):
   x=330+i*315;d.rounded_rectangle((x,240,x+295,370),radius=12,fill='#263d50');text(x+18,259,a,27,gold);text(x+18,309,b,23)
  portrait('fio',345,425,125);text(500,427,'フィオを先頭：種・防御・回復を自分で選ぶ',27);text(500,479,'余り布の回復技：超過分30％ → 障壁',26);text(500,530,'白花・妖精など、全回復が対象ではない',24,muted)
 elif ident=='enemies':
  text(835,175,'総定数35.0 ／ 40R制限',24,gold)
  for i,(cid,hp,atk,de,spd,job)in enumerate([('seris',4786,246,17,14,'単体火力／防御65％無視'),('moon-moth',1026,128,10,11,'全体攻撃／睡眠'),('thorn-witch',1367,132,14,15,'弱体／魅了')]):
   y=225+i*134;portrait(cid,335,y,105);text(465,y,CHARS[cid]['name']+'  HP '+str(hp),29);text(465,y+45,f'攻撃 {atk}  防御 {de}  速度 {spd}',24,muted);text(870,y+45,job,23,gold)
 elif ident=='equipment':
  for j,build in enumerate(['rewind','flower']):
   cfg=json.loads((OUT/'proofs'/f'{build}.json').read_text())['config'];x=330+j*480;text(x,225,'巻戻し編成'if j==0 else'白花編成',29,gold)
   for i,(cid,g)in enumerate(zip(cfg['party'],cfg['gems'])):
    y=286+i*76;text(x,y,CHARS[cid]['name'],23);text(x,y+31,GEMS[g['defId']],23,green)
  text(330,608,'白花のみ固定T3・威力80／他はT4・威力125・特性125',23,muted)
 elif ident=='comparison':
  for y,t,n in [(260,'低レア巻戻し',61),(410,'白花と余り布',76)]:
   text(335,y,t,30);d.rounded_rectangle((335,y+58,1240,y+100),radius=10,fill='#304356');d.rounded_rectangle((335,y+58,335+905*n/100,y+100),radius=10,fill='#7cae9b');text(1030,y,f'{n} / 100',34,gold)
  text(335,580,'選定後の別乱数70001〜70100／固定装備・固定方針',25);text(335,623,'実プレイヤー全体の勝率・石単体の優劣ではありません',23,muted)
 elif ident=='preparation':
  for i,t in enumerate(['宣言した素材：聖域の記憶の欠片 ×6','実ゲーム処理で製作 → 摘まない白花','実ゲーム処理でフィオに装備','実施していない周回・抽選は実績に含めない']):text(340,255+i*85,t,29,gold if i==0 else white)
 elif ident=='command':
  text(340,250,'指揮容量4：SSR 3 ＋ R 1 ＝ 4',33,gold);text(340,325,'対象外：石スキル／必殺／全体／支援／先頭手動',26);text(340,400,'石中心の編成では、狙いを動かせる行動が少ない',27);text(340,475,'指揮あり：今回の全候補 0 / 16',32);text(340,548,'代表例 19R敗北／別の敵・通常攻撃型への一般化不可',24,muted)
 else:return False
 return True
