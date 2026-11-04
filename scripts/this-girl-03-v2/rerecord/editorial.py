from pathlib import Path
import json,hashlib,math,gzip,csv
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03-v2';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();N=json.load(open(O/'narration.json'));L={l['lineId']:l for c in N['chapters']for l in c['lines']};A=O/'research/analysis/main.json';C=json.load(open(O/'research/recording-selection.json'));J=json.load(open(O/'research/mechanism-tikka.json'));cases=json.load(open(A))['cases'];main=next(c for c in cases if c['id']==C['caseId']);pages=[]
def refs(p,a,b):return[f'{p}-{i:02}'for i in range(a,b)]
def add(id,kind,title,lines,chapter=None,**spec):
 p={'id':id,'spec':{'kind':kind,'title':title,**spec},'lines':lines,'leadSeconds':.35,'tailSeconds':.8,'lineGapSeconds':.3}
 if chapter:p['chapter']=chapter
 pages.append(p);return p
def table(id,title,mode,lines,**kw):return add(id,'data-table',title,lines,evidence=str(A.relative_to(ROOT)),evidenceSha256=sha(A),mode=mode,caseId=C['caseId'],**kw)
def cut(id,src,a,b,lines,title,body,replay=False):
 proof=O/f'research/native-buffer-qa-{src}.json';assert json.load(open(proof))['passed'];p=add(id,'battle',title,lines,section='白亜の塔10層 · T6 / 編成1',body=body,note=('同じ場面の再掲 · ゲーム設定×1'if replay else'実戦の抜粋 · ゲーム設定×1 · 途中を省略'),unreleased=src=='tikka');p['durationFrames']=b-a;p['gameCut']={'file':f'artifacts/this-girl-03-v2/capture/{src}.mov','sourceStartFrame':a,'sourceEndFrame':b,'sourceApplicationSpeed':1,'audioSourceOffsetSamples':0,'audioCalibrationEvidence':{'file':str(proof.relative_to(ROOT)),'sha256':sha(proof)}};assert b-a>=180
 assert sum(math.ceil(L[x]['duration']*30)+9 for x in lines)+11<=b-a,(id,b-a,lines);return p
def pause(id,src,f,title,lines,focus,inset,explain):return add(id,'battle-pause',title,lines,pauseId=id,researchMode='after'if src=='tikka'else'before',freeze={'file':f'artifacts/this-girl-03-v2/capture/{src}.mov','sourceFrame':f,'sha256':sha(O/f'capture/{src}.mov')},focus=focus,inset=inset,explain=explain)
def card(i):return[18+105*i,466,101,122]
add('opening','desk','その一拍で、仲間を守る。',refs('question',0,1),'その一拍で、仲間を守る。')
add('subject','subject','ティッカの、一手を変える。',refs('question',1,4),characterId='tikka',body=['R · 定数1.4 / 弱体役','前のパート3は、測定で止まっていた。','今回は、技能を変えて測り直す。'])
add('rejected','choice','早く撃てる。それだけでは。',refs('design',0,3),'失敗した案から、設計し直す',cards=[{'title':'ゲージを渡す','body':['封印から、味方の必殺を早める。','研究版で試作した。'],'status':'試作・不採用'},{'title':'手番の競合','body':['早い必殺が、石の手番を奪う。','保留も、火力不足を招いた。'],'status':'不利な結果も保存'},{'title':'方向を変える','body':['封印のあとも飛ぶ一撃。','そこへ、有限の守りを足す。'],'status':'未使用パネルで確認'}])
add('new-skill','summary','秒針の余白。',refs('design',3,6),body=['通常技の待ち時間が実際に延びたときだけ、印を付ける。','次の通常攻撃1回を50%軽減。次ラウンド終了まで。','技能・必殺・大技・ビット・強制攻撃は対象外。'])
add('method','summary','変えた後も、同じ基準で。',refs('method',0,3),'比較の条件を固定する',body=['2戦場 × 2編成 × T3/T4/T6。新しい共通512入力。','各候補に同じ有限探索予算。装備4枠・薬5。','各版で再選抜し、同構成から緩衝だけを外す対照も確認。'])
add('conditions','conditions','勝てる。選ぶ理由がある。育てたくなる。',refs('method',3,4),note='限定的な改修採用と、全キャラの最終盤認定は別です。')
add('elements','choice','四要素を、無理に全部変えない。',refs('elements',0,3),'LS・石・指揮との関係',cards=[{'title':'薄明の追撃','body':['弱った敵を追う既存LS。','能力値とともに維持する。'],'status':'LSは変更しない'},{'title':'既存の4石','body':['同じ装備予算で再選抜。','新しい石は足さない。'],'status':'石と手番を両立する'},{'title':'指揮','body':['今回は変更しない。','封印後の一撃へ絞る。'],'status':'全指揮最適化は未検証'}])
add('owned-scope','summary','全所持を仮定した、研究の実戦。',refs('battle',0,1),'実戦を止めて、見る',body=['今は入手できないXRを含む、全所持想定のセーブ。','4人分のT6石と薬5。通常の入手進行の案内ではない。','同じ敵・同じ出発シード。各版の選抜方針で戦う。'])
b=J['reference']['jam']['sourceFrame'];j=J['tikka']['jam']['sourceFrame'];h=J['tikka']['hit']['sourceFrame'];assert all(f is not None for f in [b,j,h])
cut('battle-reference','reference',b-60,b+330,refs('battle',1,2),'まずは、改修前。',['通常技の待ち時間を延ばす。','通常攻撃まで、止める技ではない。'])
pause('pause-reference','reference',b+10,'三十三は、もともとの働き。',refs('battle',2,3),[card(3)],card(3),['ティッカのゲージ。','0 → 33。','通常行動25 + 既存診断8。'])
add('tikka-party','party','研究版へ。同じ四人、選抜は別。',refs('battle',3,4),characters=[{'id':id,'leader':id==J['tikka']['leader'],'subject':id=='tikka'}for id in J['tikka']['party']],note='リーダーは両版アテナ。並びと優先方針は異なります。')
cut('battle-jam','tikka',j-120,j+270,[],'封印の先に、印を残す。',['ここからは、新しい研究版。','次に止めて、敵の状態を見ます。'])
pause('pause-mark','tikka',j+8,'実際に封印した相手だけ。',refs('battle',4,5),[[75,15,300,105]],[75,15,300,105],['通常技の再使用が延びた。','余白の緩衝50%。','次の通常攻撃、一回だけ。'])
cut('battle-hit','tikka',j-30,h+360,refs('battle',5,6),'その印を、敵が使い切る。',['印を付けた直後の攻撃を再掲。','命中した後、もう一度止めます。'],replay=True)
pause('pause-hp','tikka',h+10,'一撃を受けた、アテナを見る。',refs('battle',6,8),[card(2)],card(2),['HP436 → 405。','実HPダメージ31。','50%は障壁より前の補正。'])
pause('pause-spent','tikka',h+10,'一回で消える、有限の守り。',refs('battle',8,9),[[75,15,300,105]],[75,15,300,105],['使った印は消えた。','通常の一行動を使う。','再使用は4ラウンド後。'])
meta=json.load(open(O/'capture/tikka.json'));frames={x['event']['id']:x['sourceFrame']for x in meta['battleEvents']};proof=json.loads(gzip.decompress((O/'proofs/tikka.json.gz').read_bytes()));dead=[e for e in proof['events']if e.get('actorId','').startswith('party:')and(e.get('amount')or 0)>0 and e.get('unitsAfter')and not any(u['side']=='enemy'and u['hp']>0 for u in e['unitsAfter'])];last=frames[dead[-1]['id']]
cut('battle-finish','tikka',last-390,last+24,[],'最後まで、結果を残す。',['この一戦は、改修後の方が苦しかった。','都合の良い戦いに差し替えません。'])
table('sample','この一戦は、改修前の方が良かった。','example',refs('battle',9,10))
add('one-example','summary','動いた映像と、改善の証拠は別。',refs('battle',10,11),body=['一戦は、仕組みを読むための実例。','勝率や平均の改善は、512入力で別に確かめる。','事前に決めた選び方と、不利な結果を保存する。'])
table('main-results','五百十二入力で、薬が減った。','main',refs('results',0,2),chapter='512シードで、測り直す')
table('causal','緩衝だけを、外したら。','ablation',refs('results',2,3))
add('criteria','summary','両方の比較に、利益が残る。',refs('results',3,4),body=['各版で再選抜した改修前との比較。','同構成から、新効果だけを外した因果対照。','96比較を補正し、5条件で事前の意味ある改善を確認。'])
table('negative','勝率と速さの、不利も残す。','negative',refs('control',0,1),chapter='悪化した結果も、同じノートへ')
table('panel','全十二条件を、見失わない。','panel',refs('control',1,2))
table('growth','同じビルドで、石を育てる。','growth',refs('growth',0,2),chapter='石を掘る、次の目標')
add('stone-goal','goal','育成は、直線ではない。',refs('growth',2,3),stone='ティッカの奪灯石と、仲間の残響石',body=['T3/T4/T6は、4人分の石全体の比較。','緩衝50%そのものが増えるわけではない。','実際の入手先を資料へ。必要周回数は未推定。'])
table('replacement','強い代替も、残っている。','alternative',refs('limits',0,1))
add('scope','summary','改修は採用。認定は、研究中。',refs('limits',1,3),'限定的な採用と、全体認定',status='改修採用／研究中',certified=False,body=['能力値・他キャラ・石定義・共通ステージは変更なし。','限定的な利益は確認。全所持の最終盤価値は未確立。','mainゲームとitch.ioには、まだ未導入。'])
add('farewell','desk','その一拍で、仲間を守る。',refs('judgment',0,2),'研究ノート')
add('next-preview','preview','次回、ノエルの一手を変える。',refs('preview',0,3),'次回予告：ノエルの改修',characterId='noelle',status='次回の改修研究 · 未検証',body=['号令の利益と、そのために払う一手。','必要な改修を実装し、同条件で測り直す。','結果は、まだ決めない。'])
add('ledger','roster','研究記録',[],judgment='artifacts/this-girl-03-v2/research/reports/judgment.json')['durationFrames']=1050
music=json.load(open(O/'research/rights/music-source.json'));e={'episode':'THIS-GIRL-003-V2','finalized':False,'music':music,'pages':pages};(O/'editorial.json').write_text(json.dumps(e,ensure_ascii=False,indent=2))
with (O/'storyboard.csv').open('w')as f:
 w=csv.writer(f);w.writerow(['page','kind','title','lines','source']);w.writerows([p['id'],p['spec']['kind'],p['spec']['title'],';'.join(p['lines']),json.dumps(p.get('gameCut')or p['spec'].get('freeze'),ensure_ascii=False)]for p in pages)
print('PAGES',len(pages),[(p['id'],p['durationFrames'])for p in pages if p.get('gameCut')])
