from pathlib import Path
import json,hashlib,math,gzip
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();N=json.load(open(O/'narration.json'));L={l['lineId']:l for c in N['chapters']for l in c['lines']};A=O/'research/analysis/main.json';C=json.load(open(O/'research/recording-selection.json'));M=json.load(open(O/'research/mechanism-tikka.json'));J=M['selected'];F=M['ordinaryAttackAfterSeal'];pages=[]
def refs(p,a,b):return[f'{p}-{i:02}'for i in range(a,b)]
def add(id,kind,title,lines,chapter=None,**spec):
 p={'id':id,'spec':{'kind':kind,'title':title,**spec},'lines':lines,'leadSeconds':.35,'tailSeconds':.8,'lineGapSeconds':.3}
 if chapter:p['chapter']=chapter
 pages.append(p);return p
def table(id,title,mode,lines,case='ivory-tower-010-T6-F1',**kw):return add(id,'data-table',title,lines,evidence=str(A.relative_to(ROOT)),evidenceSha256=sha(A),mode=mode,caseId=case,**kw)
def cut(id,src,a,b,lines,title,body,replay=False):
 proof=O/f'research/native-buffer-qa-{src}.json';assert json.load(open(proof))['passed'];p=add(id,'battle',title,lines,section='塔 第10層 · T6 / 編成1',body=body,note=('直前の場面を再掲 · ゲーム設定×1'if replay else'実戦の抜粋 · ゲーム設定×1 · 途中を省略'),unreleased=True);p['durationFrames']=b-a;p['gameCut']={'file':f'artifacts/this-girl-04/capture/{src}.mov','sourceStartFrame':a,'sourceEndFrame':b,'sourceApplicationSpeed':1,'audioSourceOffsetSamples':0,'audioCalibrationEvidence':{'file':str(proof.relative_to(ROOT)),'sha256':sha(proof)}};assert b-a>=180
 assert sum(math.ceil(L[x]['duration']*30)+9 for x in lines)+11<=b-a,(id,b-a,lines);return p
def pause(id,src,f,title,lines,focus,inset,explain):return add(id,'battle-pause',title,lines,pauseId=id,freeze={'file':f'artifacts/this-girl-04/capture/{src}.mov','sourceFrame':f,'sha256':sha(O/f'capture/{src}.mov')},focus=focus,inset=inset,explain=explain)
def card(index):return[3+112*index,459,108,132]
add('opening','desk','その一拍で、救えるかな。',refs('question',0,1),'その一拍で、救えるかな。')
add('subject','subject','小さな一手を、選ぶ理由。',refs('question',1,4),characterId='tikka',body=['R · 定数1.4 / 機巧の弱体役','通常技を封じ、必殺へつなぐ。','遅らせた時間は、何を変える？'])
add('skill','choice','止められるもの、止まらないもの。',refs('skill',0,4),'秒針ジャミングの仕組み',cards=[{'title':'秒針ジャミング','body':['敵1体の通常スキル。','R1・R2は待機、R3から使用可。'],'status':'再使用は4ラウンド後'},{'title':'故障診断','body':['通常の封印で待ちを延長。','本人の必殺ゲージ＋8。'],'status':'1行動1回・上限100'},{'title':'対象の外','body':['通常攻撃。','予告大技・ビット射撃。'],'status':'封印 ≠ 行動不能'}])
add('method','summary','比較の前に、条件を固定。',refs('method',0,3),'研究の条件',body=['公開版1.12の既存能力。新しい強化は足さない。','弱体役＋高レア攻撃役の16形態を、同じ予算で探索。','2戦場 × 2編成 × T3/T4/T6。別の256シードで確認。'])
add('conditions','conditions','勝てる。その先も、見る。',refs('method',3,4),note='速さ・薬・生還・別の組み合わせまで、同じ基準で確認する。')
add('elements','choice','一手は、ほかの選択と交換。',refs('elements',0,4),'LS・石・指揮',cards=[{'title':'薄明の追撃','body':['HP35%以下の敵へ','ダメージ20%増。'],'status':'映像ではアテナを選択'},{'title':'奪灯石','body':['敵の強化を奪う。','封印以外の仕事も持つ。'],'status':'石・方針を同時に探索'},{'title':'指揮','body':['ノエルの号令を含む','全面の比較は未検証。'],'status':'今回は含めない'}])
add('owned-scope','summary','この先は、全所持を仮定した研究。',refs('battle',0,1),'実戦を止めて、見る',body=['未入手のXRも含む、最終盤を想定した研究用セーブ。','能力は公開版。通常の入手進行の案内ではありません。'])
r=json.load(open(O/'capture/reference.json'));a=next(e['sourceFrame']for e in r['battleEvents']if e['wave']==1)+120;b=a+360
cut('battle-reference','reference',a,b,refs('battle',1,2),'比較は、アストライア入り。',['同じ3人を残し、1枠を差し替える。','石と操作も、同じ探索予算で選ぶ。'])
index=C['arms']['A']['config']['party'].index('astraea');box=card(index)
pause('pause-reference','reference',b-1,'速さと、帰り方も見る。',refs('battle',2,3),[box,[275,600,60,110]],box,['この一枠を、差し替える。','薬と、生還も見る。'])
add('tikka-party','party','ここからは、ティッカと。',refs('battle',3,4),characters=[{'id':id,'leader':id==C['arms']['M']['config']['leader'],'subject':id=='tikka'}for id in C['arms']['M']['config']['party']],note='同じ敵・出発シード・装備予算。双方の方針を事前に選定。')
box=card(C['arms']['M']['config']['party'].index('tikka'));f=J['sourceFrame'];assert f is not None
pause('pause-target','tikka',f-4,'右端のゲージを、追います。',refs('battle',4,5),[box],box,['右端が、ティッカ。','必殺ゲージを見ます。'])
pause('pause-jam','tikka',f+18,'通常25と、故障診断8。',refs('battle',5,9),[box,[70,225,310,65]],box,['通常技2種は、R3から使用可。','必殺 0 → 33%','行動25 ＋ 固有8'])
cut('battle-tikka','tikka',f-90,F['sourceFrame']+22,[],'直前から、もう一度。',['秒針ジャミングの後も、','エオスは通常攻撃を行う。'],replay=True)
pause('pause-ordinary','tikka',F['sourceFrame']+18,'封印しても、攻撃は来る。',refs('battle',9,10),[[70,225,310,65]],[70,225,310,65],['封印中も、通常攻撃。','障壁が70受けた。','HPへの損傷は0。'])
meta=json.load(open(O/'capture/tikka.json'));frames={x['event']['id']:x['sourceFrame']for x in meta['battleEvents']};proof=json.loads(gzip.decompress((O/'proofs/tikka.json.gz').read_bytes()));dead=[e for e in proof['events']if e.get('actorId','').startswith('party:')and(e.get('amount')or 0)>0 and e.get('unitsAfter')and not any(u['side']=='enemy'and u['hp']>0 for u in e['unitsAfter'])];last=frames[dead[-1]['id']]
cut('battle-tikka-finish','tikka',last-390,last+20,refs('battle',10,11),'この一戦は、17ラウンド。',['比較側は、11ラウンド。','両編成とも勝利。生還は3人。'])
table('sample-cost','同じ勝利でも、道のりが違う。','example',refs('battle',11,12))
table('main-results','全勝だけでは、決められない。','main',refs('results',0,2),chapter='256シードの結果')
table('frugal-results','帰り方を変える、という選択。','frugal',refs('results',2,3))
table('all-results','同じ仕事は、どこでもできる？','panel',refs('results',3,5))
table('ablation','技能が役立つことと、選ぶ理由。','ablation',refs('control',0,4),case='ivory-tower-010-T6-F2',chapter='封印の働きを、切り分ける')
table('growth','良い石は、どこまで助ける？','growth',refs('growth',0,2),chapter='次に探したい石')
add('stone-goal','goal','封じる仕事と、奪う仕事。',refs('growth',2,3),stone='奪灯石 · 機巧系',body=['映像例：T6・庇護 / 力239・特性239。','候補：ルネット覚醒級、塔41層以降の機巧系など。','指定の石・特性・ロールは、確定しません。'])
add('judgment','summary','今回は、研究中。',refs('judgment',0,3),'研究日誌',status='研究中 · 最終盤での採用価値は未確立',certified=False,body=['通常スキルの封印と、追加の充填は作動。','役立つことと、最良代替より選ぶ理由を分ける。','共通の通常技予告は、まだ未実装の設計案。'])
add('farewell','desk','小さな一拍を、なくさないために。',refs('judgment',3,5))
add('next-preview','preview','次回、その号令は、誰のため。',refs('preview',0,3),'次回予告：ノエル',characterId='noelle',status='次回の研究対象 · 未検証',body=['星図の号令。','指揮官の一手と、仲間の一撃。','その交換は、得になる？'])
add('ledger','roster','研究記録',[],judgment='artifacts/this-girl-04/research/reports/judgment.json')['durationFrames']=1050
music=json.load(open(O/'research/rights/music-source.json'));e={'episode':'THIS-GIRL-004','finalized':False,'music':music,'pages':pages};(O/'editorial.json').write_text(json.dumps(e,ensure_ascii=False,indent=2));print('PAGES',len(pages),[(p['id'],p['durationFrames'])for p in pages if p.get('gameCut')])
