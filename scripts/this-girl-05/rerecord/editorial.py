from pathlib import Path
import json,hashlib,math,csv
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-05';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();N=json.load(open(O/'narration.json'));L={l['lineId']:l for c in N['chapters']for l in c['lines']};A=O/'research/analysis/main.json';S=json.load(open(O/'research/recording-selection.json'));J=json.load(open(O/'research/mechanism-lisette.json'));G=json.load(open(O/'research/native-layout.json'));pages=[]
def refs(ch,a,b):return[f'{ch}-{i:02}'for i in range(a,b)]
def add(id,kind,title,lines,chapter=None,**spec):
 p={'id':id,'spec':{'kind':kind,'title':title,**spec},'lines':lines,'leadSeconds':.35,'tailSeconds':.8,'lineGapSeconds':.3}
 if chapter:p['chapter']=chapter
 pages.append(p);return p
def table(id,title,mode,lines,chapter=None,caseId=None):return add(id,'data-table',title,lines,chapter=chapter,evidence=str(A.relative_to(ROOT)),evidenceSha256=sha(A),mode=mode,caseId=caseId or S['caseId'])
def cut(id,src,a,b,title,body):
 a,b=round(a),round(b);mp=O/f'capture/{src}.json';m=json.load(open(mp));assert m['calibration']['passed']and m['sourceNormalization']['passed'];p=add(id,'battle',title,[],section='白亜の塔 · 第4層 · T4 / 編成1',body=body,note='実戦の抜粋 · ゲーム設定×1 · 途中を省略',unreleased=src=='lisette');p['durationFrames']=b-a;p['gameCut']={'file':f'artifacts/this-girl-05/capture/{src}.mov','sourceStartFrame':a,'sourceEndFrame':b,'sourceApplicationSpeed':1,'audioSourceOffsetSamples':0,'audioCalibrationEvidence':{'file':str(mp.relative_to(ROOT)),'sha256':sha(mp)}};assert b-a>=180;return p
def pause(id,src,f,title,lines,rect,explain,footnote=None):return add(id,'battle-pause',title,lines,pauseId=id,researchMode='after'if src=='lisette'else'before',freeze={'file':f'artifacts/this-girl-05/capture/{src}.mov','sourceFrame':round(f),'sha256':sha(O/f'capture/{src}.mov')},focus=[rect],inset=rect,explain=explain,**({'footnote':footnote}if footnote else{}))
def card(i):
 x=G['partyUnits'][i];return[round(x[k])for k in ['x','y','width','height']]
add('opening','desk','祓った、その先へ。',refs('question',0,1),'祓った、その先へ。')
add('subject','subject','リゼットの、解除を変える。',refs('question',1,3),characterId='lisette',body=['SR · 定数1.8 / 弔鐘の剣姫','敵の強化をほどく一手。','そこから、一度だけ斬り返す。'])
add('new-rule','summary','解除に成功したとき、一度だけ。',refs('design',0,2),'弔鐘の返し刃',body=['有効な攻撃強化・再生を実際に解除。','1効果でも2効果でも、斬撃は一度だけ。','何も解除しなければ、斬撃は出ない。'])
add('one-action','choice','守りを無視せず、一手の中に。',refs('design',2,4),cards=[{'title':'威力','body':['攻撃力100%が基準。','防御で減り、盾も効く。'],'status':'無条件の固定ダメージではない'},{'title':'受ける相手','body':['かばうがあれば身代わり。','解除の相手は元のまま。'],'status':'対象を取り違えない'},{'title':'支払い','body':['通常1行動 / 再使用3R。','本人ゲージは通常25だけ。'],'status':'追加行動を生まない'}])
add('method','summary','不発も残して、測り直す。',refs('method',0,3),'実装してから、確認用256入力',body=['3既存戦場 × 2コア × T3/T4/T6 = 18条件。','各本人・各代替に18候補。16開発 → 32選抜 → 256確認。','C/B再選抜、同構成での無効対照、有限の代替。'])
add('elements','summary','変える技能。残す選択肢。',refs('elements',0,2),body=['本人の解除技能だけを変更。数値・LS・石・敵は維持。','主編成のリーダーはアテナ。本人LSも別比較。','指揮を新技能に上乗せしない。公開版とは分離。'])
add('owned-scope','summary','全所持を仮定した、研究の実戦。',refs('battle',0,1),'実戦：白亜の塔 第4層',body=['未入手XRを含む仮想所持 / 四人にT4石 / 薬5。','通常の入手進行の案内ではありません。','同じ出発入力。実際の21ラウンドから抜粋。'])
b=J['reference']['firstRemoval']['sourceFrame'];f=J['lisette']['firstStrike']['sourceFrame'];n=J['lisette']['firstPostStrike']['sourceFrame'];late=J['lisette']['lastStrike']['sourceFrame'];hud=[103,38,230,50]
cut('battle-reference','reference',b-195,b+150,'まずは、改修前の解除。',['敵セリスの強化を解除。','次に止めて、一手の仕事を見ます。'])
pause('pause-reference','reference',b+12,'まずは、解除だけの一手。',refs('battle',1,3),hud,['敵セリスの強化を解除。','この技能でのHP損失は0。','通常の行動を一回消費。'])
add('party','party','同じ四人、同じ石と作戦へ。',refs('battle',3,4),characters=[{'id':'lisette','subject':True,'role':'解除 → 斬り返し'},{'id':'seris-awakened','role':'攻撃と決着'},{'id':'athena','role':'かばう・障壁','leader':True},{'id':'benzaiten','role':'回復'}],note='別々に選抜したB/Cが、主条件では同じ構成に収束。')
cut('battle-strike','lisette',f-200,f+150,'解除と斬撃。受ける相手は？',['解除の対象：敵セリス。','斬撃の被弾：石燐の幼竜。'])
pause('pause-guard','lisette',f+12,'41ダメージは、かばった幼竜へ。',refs('battle',4,6),hud,['解除は、敵セリスへ。','斬撃は、かばう幼竜へ。','幼竜への実HP損失41。'],footnote='解除と被弾の相手は実イベントで照合。別の対象へ塗り替えていません。')
pause('pause-action','lisette',n+12,'25 → 50。一手分だけ。',refs('battle',6,7),card(0),['本人の通常行動は、一回。','ゲージ25 → 50。','再使用待ちは通常の3R。'])
cut('battle-late','lisette',late-180,late+150,'終盤の、一度だけの返し刃。',['ワカヒルメの攻撃強化を解除。','実HP損失32。'])
pause('pause-late','lisette',late+12,'32ダメージ。二度目も、一回だけ。',refs('battle',7,9),hud,['強化を実際に解除。','ワカヒルメへ32。','一戦合計：2斬撃 / 73。'])
meta=json.load(open(O/'capture/lisette.json'));end=max(x['sourceFrame']for x in meta['battleEvents']);cut('battle-finish','lisette',end-240,end+60,'最後まで、結果を残す。',['21R / 薬3 / 4人生還。','良い一戦だけに選び直さない。'])
table('example','この一戦は、改修前後で同じ結果。','example',refs('battle',9,10))
table('main-results','平均で、約0.35ラウンド短く。','main',refs('results',0,2),'改修前後を、同じ尺度で')
table('causal','同じ構成から、返し刃だけを外す。','ablation',refs('results',2,4))
table('panel','不発も悪化も、十八条件を残す。','panel',refs('limits',0,1),'限界を、隠さない')
table('opportunity','速さ、薬、生還。同じ答えではない。','opportunity',refs('limits',1,3))
table('no-gems','返し刃だけで、十分ではない。','no-gems',refs('growth',0,1),'次に、石を掘る理由')
table('growth','石の育成も、指標を分けて。','growth',refs('growth',1,2),caseId='ivory-tower-004-T6-F1')
add('stone-goal','summary','次に探す、澄明の残響石。',refs('growth',2,3),body=['機巧系統 / T4〜T6の育成候補。','実際の入手先は資料のStone-Goalsへ。','完成特性の確率・必要周回数は未推定。'])
add('judgment','summary','返し刃を採用。認定は、研究中。',refs('judgment',0,3),'研究ノート',status='返し刃採用／研究中',certified=False,body=['実装 → 凍結比較 → 未使用256入力 → 限定採用。','速度の改善は一条件。固有の最終盤価値は未認定。','mainゲームとitch.ioには未導入。'])
add('farewell','desk','祓った、その先へ。',refs('judgment',3,4))
add('preview','preview','次回、エレインの仕事を見つめる。',refs('preview',0,2),'次回予告：エレイン',characterId='elaine',status='次回の改修研究 · 未検証',body=['傷を癒やす。悪い状態を取り除く。','必要な改修を実装し、同条件で測る。','結果は、まだ決めない。'])
add('ledger','roster','研究記録',[],judgment='artifacts/this-girl-05/research/reports/judgment.json')['durationFrames']=1050
music=json.load(open(O/'research/rights/music-source.json'));(O/'editorial.json').write_text(json.dumps({'episode':'THIS-GIRL-005','finalized':False,'music':music,'pages':pages},ensure_ascii=False,indent=2))
with(O/'storyboard.csv').open('w')as out:
 w=csv.writer(out);w.writerow(['page','kind','title','voice','source']);w.writerows([p['id'],p['spec']['kind'],p['spec']['title'],';'.join(p['lines']),json.dumps(p.get('gameCut')or p['spec'].get('freeze'),ensure_ascii=False)]for p in pages)
print('Editorial pages',len(pages))
