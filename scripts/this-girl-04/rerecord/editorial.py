from pathlib import Path
import json,hashlib,math,gzip
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();N=json.load(open(O/'narration.json'));L={l['lineId']:l for c in N['chapters']for l in c['lines']};A=O/'research/analysis/main.json';C=json.load(open(O/'research/recording-selection.json'));J=json.load(open(O/'research/mechanism-noelle.json'))['selected'];pages=[]
def refs(p,a,b):return[f'{p}-{i:02}'for i in range(a,b)]
def add(id,kind,title,lines,chapter=None,**spec):
 p={'id':id,'spec':{'kind':kind,'title':title,**spec},'lines':lines,'leadSeconds':.35,'tailSeconds':.8,'lineGapSeconds':.3}
 if chapter:p['chapter']=chapter
 pages.append(p);return p
def table(id,title,mode,lines,**kw):return add(id,'data-table',title,lines,evidence=str(A.relative_to(ROOT)),evidenceSha256=sha(A),mode=mode,caseId='kuzuha-awakening-T6-F2',**kw)
def cut(id,src,a,b,lines,title,body,replay=False):
 proof=O/f'research/native-buffer-qa-{src}.json';assert json.load(open(proof))['passed'];p=add(id,'battle',title,lines,section='葛葉覚醒級 · T6 / 編成2',body=body,note=('直前の場面を再掲 · ゲーム設定×1'if replay else'実戦の抜粋 · ゲーム設定×1 · 途中を省略'),unreleased=True);p['durationFrames']=b-a;p['gameCut']={'file':f'artifacts/this-girl-04/capture/{src}.mov','sourceStartFrame':a,'sourceEndFrame':b,'sourceApplicationSpeed':1,'audioSourceOffsetSamples':0,'audioCalibrationEvidence':{'file':str(proof.relative_to(ROOT)),'sha256':sha(proof)}};assert b-a>=180
 assert sum(math.ceil(L[x]['duration']*30)+9 for x in lines)+11<=b-a,(id,b-a,lines);return p
def pause(id,src,f,title,lines,focus,inset,explain):return add(id,'battle-pause',title,lines,pauseId=id,freeze={'file':f'artifacts/this-girl-04/capture/{src}.mov','sourceFrame':f,'sha256':sha(O/f'capture/{src}.mov')},focus=focus,inset=inset,explain=explain)
def card(index):return[18+105*index,414,101,122]
add('opening','desk','その号令は、誰のため。',refs('question',0,1),'その号令は、誰のため。')
add('subject','subject','仲間の一手を、星図に。',refs('question',1,4),characterId='noelle',body=['R · 定数1.4 / 全体攻撃役','星図の号令で、宛先をそろえる。','命令した回数だけ、強くなる？'])
add('skill','choice','増やすのではなく、向け直す。',refs('skill',0,4),'星図の号令の仕組み',cards=[{'title':'変えるもの','body':['通常の単体敵向け行動の宛先。','攻撃回数そのものは増えない。'],'status':'全体・支援・石・必殺は保護'},{'title':'使うもの','body':['ノエルの通常行動。','そのラウンドの追加LS効果。'],'status':'基礎の能力補正は残る'},{'title':'普段の仕事','body':['味方の全体攻撃＋15%。','自身の通常AoEで防御低下。'],'status':'機会費用も見る'}])
add('load','choice','表示のレアと、号令の重さ。',refs('load',0,2),'二人を予約する条件',cards=[{'title':'覚醒セリス','body':['SSRの表示。','R系統の負荷1を継承。'],'status':'負荷 1'},{'title':'覚醒リゼット','body':['SRの表示。','SR系統の負荷2を継承。'],'status':'負荷 2'},{'title':'Rノエル','body':['容量3へ、合計3。','覚醒ノエルSRなら容量4。'],'status':'1 ＋ 2 ＝ 3 / 3'}])
add('method','summary','比較の前に、条件を固定。',refs('method',0,3),'研究の条件',body=['公開版1.12の既存能力。新しい強化は足さない。','2戦場 × 2編成 × T3/T4/T6。別の256シードで確認。','号令だけを外す対照、再選抜、別LS、6差替え候補。'])
add('conditions','conditions','勝てる。その先も、見る。',refs('method',3,4),note='速さ・薬・生還・別の組み合わせまで、同じ基準で確認する。')
add('elements','choice','仲間の仕事と、交換する。',refs('elements',0,3),'LS・石・公開情報',cards=[{'title':'リーダー効果','body':['味方全体攻撃＋15%。','号令ラウンドは追加LSが休む。'],'status':'能力補正は残る'},{'title':'残響石','body':['石の技は、石の仕事。','号令で上書きしない。'],'status':'今回は四人に装備'},{'title':'操作の条件','body':['見える状態から選択。','AI予定や未来乱数を覗かない。'],'status':'作戦は確認前に固定'}])
add('owned-scope','summary','この先は、全所持を仮定した研究。',refs('battle',0,1),'実戦を止めて、見る',body=['高級な石までそろった、最終盤を想定した研究用セーブ。','能力は公開版。通常の入手進行の案内ではありません。'])
r=json.load(open(O/'capture/reference.json'));a=next(e['sourceFrame']for e in r['battleEvents']if e['round']==2)+40;b=a+420
cut('battle-reference','reference',a,b,refs('battle',1,2),'同じ四人で、号令を出さない。',['ノエル / 覚醒セリス / 覚醒リゼット / サクヤヒメ。','同じ装備・リーダー・方針。号令だけを変える。'])
pause('pause-reference','reference',b-1,'比較するのは、同じ四人。',refs('battle',2,3),[card(0)],card(0),['左端が、ノエル。','石と仲間は同じ。','号令だけを、オフ。'])
add('noelle-party','party','ここからは、号令あり。',refs('battle',3,4),characters=[{'id':id,'leader':id=='noelle','subject':id=='noelle'}for id in C['arms']['M']['config']['party']],note='同じ敵・出発シード・装備予算。方針は確認前に固定。')
f=J['orderSourceFrame'];h=J['changedSourceFrame'];assert f is not None and h is not None
cut('battle-order','noelle',f-75,f+135,[],'星図の号令。',['ノエルが、通常行動を使って命令する。','予約は、追加攻撃ではない。'])
pause('pause-order','noelle',f+35,'二人を、予約した。',refs('battle',4,6),[card(0),[100,202,250,52]],[100,202,250,52],['予約 2人。','適用 1行動。','宛先の変更 1行動。'])['spec']['footnote']='この後、セリスは石の技を使用。石の行動は、号令の対象外です。'
pause('pause-follower','noelle',h+24,'この50は、仲間の通常攻撃。',refs('battle',6,8),[card(2),[100,202,250,52],[205,139,55,46]],[96,137,260,116],['覚醒リゼットの一撃。','実ダメージ 50。','追加50ではない。'])
cut('battle-command','noelle',f-75,h+100,[],'命令から、仲間の一撃へ。',['同じ場面を、もう一度。','宛先が変わった、通常攻撃。'],replay=True)
pause('pause-cost','noelle',h+36,'命令する間、自分の行動は休む。',refs('battle',8,9),[card(0)],card(0),['このラウンド。','ノエルの通常行動 0。','追加LSも休む。'])
meta=json.load(open(O/'capture/noelle.json'));frames={x['event']['id']:x['sourceFrame']for x in meta['battleEvents']};proof=json.loads(gzip.decompress((O/'proofs/noelle.json.gz').read_bytes()));dead=[e for e in proof['events']if e.get('actorId','').startswith('party:')and(e.get('amount')or 0)>0 and e.get('unitsAfter')and not any(u['side']=='enemy'and u['hp']>0 for u in e['unitsAfter'])];last=frames[dead[-1]['id']]
cut('battle-noelle-finish','noelle',last-420,last+24,refs('battle',9,10),'勝利までの道のりも、比べる。',['号令あり13R、号令なし11R。','薬1個、生還3人。どちらも同じ。'])
table('sample-cost','七回の号令。一回の変更。','example',refs('battle',10,11))
table('main-results','全勝だけでは、決められない。','main',refs('results',0,2),chapter='256シードの結果')
table('order-counts','表示の回数と、実際の変更。','counts',refs('results',2,3))
table('alternatives','選抜の良さは、確認で確かめる。','alternatives',refs('results',3,5))
table('all-results','同じ号令は、どこでも役立つ？','panel',refs('results',5,6))
table('frequent','毎回、命令すればいい？','counts',refs('control',0,1),chapter='命令を増やすことの、落とし穴')
table('stones','仕事を消して、命令を増やさない。','stones',refs('control',1,4))
table('growth','良い石と、良い命令は別の問い。','growth',refs('growth',0,2),chapter='石と号令の関係')
add('judgment','summary','今回は、研究中。',refs('judgment',0,3),'研究日誌',status='研究中 · 号令の純利益は未確立',certified=False,body=['宛先の変更は確認。でも、最終盤の採用価値は未確立。','仲間の仕事を失わせず、どの一手を向け直すか。','全員共通の予告表示は、まだ未実装の設計案。'])
add('farewell','desk','仲間の仕事を、大切にする命令を。',refs('judgment',3,5))
add('next-preview','preview','次回、その強さを、ほどけるなら。',refs('preview',0,3),'次回予告：リゼット',characterId='lisette',status='次回の研究対象 · 未検証',body=['敵の強さを、ほどいていく。','弱体の一手と、強い一撃。','その交換は、どこで役立つ？'])
add('ledger','roster','研究記録',[],judgment='artifacts/this-girl-04/research/reports/judgment.json')['durationFrames']=1050
music=json.load(open(O/'research/rights/music-source.json'));e={'episode':'THIS-GIRL-004','finalized':False,'music':music,'pages':pages};(O/'editorial.json').write_text(json.dumps(e,ensure_ascii=False,indent=2));print('PAGES',len(pages),[(p['id'],p['durationFrames'])for p in pages if p.get('gameCut')])
