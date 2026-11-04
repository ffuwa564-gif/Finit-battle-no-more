from pathlib import Path
import json,hashlib,math,gzip
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-v2';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();N=json.load(open(O/'narration.json'));L={l['lineId']:l for c in N['chapters']for l in c['lines']};A=O/'research/analysis/main.json';C=json.load(open(O/'research/recording-selection.json'));J=json.load(open(O/'research/mechanism-miette.json'));pages=[]
def refs(p,a,b):return[f'{p}-{i:02}'for i in range(a,b)]
def add(id,kind,title,lines,chapter=None,**spec):
 p={'id':id,'spec':{'kind':kind,'title':title,**spec},'lines':lines,'leadSeconds':.35,'tailSeconds':.8,'lineGapSeconds':.3}
 if chapter:p['chapter']=chapter
 pages.append(p);return p
def table(id,title,mode,lines,**kw):return add(id,'data-table',title,lines,evidence=str(A.relative_to(ROOT)),evidenceSha256=sha(A),mode=mode,caseId='ivory-tower-010-T6-F1',**kw)
def cut(id,src,a,b,lines,title,body,replay=False):
 proof=O/f'research/native-buffer-qa-{src}.json';assert json.load(open(proof))['passed'];p=add(id,'battle',title,lines,section='白亜の塔10層 · T6 / 編成1',body=body,note=('直前の場面を再掲 · ゲーム設定×1'if replay else'実戦の抜粋 · ゲーム設定×1 · 途中を省略'),unreleased=src=='miette');p['durationFrames']=b-a;p['gameCut']={'file':f'artifacts/this-girl-02-v2/capture/{src}.mov','sourceStartFrame':a,'sourceEndFrame':b,'sourceApplicationSpeed':1,'audioSourceOffsetSamples':0,'audioCalibrationEvidence':{'file':str(proof.relative_to(ROOT)),'sha256':sha(proof)}};assert b-a>=180
 assert sum(math.ceil(L[x]['duration']*30)+9 for x in lines)+11<=b-a,(id,b-a,lines);return p
def pause(id,src,f,title,lines,focus,inset,explain):return add(id,'battle-pause',title,lines,pauseId=id,researchMode='after'if src=='miette'else'before',freeze={'file':f'artifacts/this-girl-02-v2/capture/{src}.mov','sourceFrame':f,'sha256':sha(O/f'capture/{src}.mov')},focus=focus,inset=inset,explain=explain)
def card(index):return[18+105*index,466,101,122]
add('opening','desk','消える盾を、命に縫う。',refs('question',0,1),'消える盾を、命に縫う。')
add('subject','subject','ミエットの、一手を変える。',refs('question',1,4),characterId='miette',body=['SR · 定数1.8 / 回復役','前のパート2は、測定で止まっていた。','今回は技能を変え、実戦で確かめる。'])
add('old-cost','choice','仲間の盾を、奪わないために。',refs('design',0,2),'技能を実際に改修する',cards=[{'title':'従来の修繕','body':['対象の障壁を消費して回復。','守りと回復が、競合する。'],'status':'改修前の実装'},{'title':'採らなかった案','body':['仲間の有効な障壁を借りる。','守る仕事を壊す危険があった。'],'status':'試作は見送り'},{'title':'今回の入口','body':['使われず、期限の切れた盾。','消えるはずの力だけを残す。'],'status':'余り糸の修繕'}])
add('new-skill','summary','消える盾を、糸として残す。',refs('design',2,5),body=['糸は各持ち主の最大HPまで。期限切れ盾の追加から3ラウンド。','糸を先に使い、足りなければ対象本人の有効な障壁だけ使う。','通常の一行動と再使用3ラウンド。無限回復にはしない。'])
add('method','summary','変えた後も、同じ基準で。',refs('method',0,3),'比較の条件を固定する',body=['研究ブランチだけの変更。公開ゲームには未導入。','2戦場 × 2編成 × T3/T4/T6。別の512シードで確認。','同じ予算で有限探索。確認結果から作戦を選び直さない。'])
add('conditions','conditions','勝てる。選ぶ理由がある。育てたくなる。',refs('method',3,4),note='技能の改修採用と、最終盤での固有価値の認定は別です。')
add('elements','choice','変える技能。残す、仲間の仕事。',refs('elements',0,3),'LS・石・指揮との関係',cards=[{'title':'月の慈愛','body':['HP補正と、毎ラウンド3%再生。','今回、LSは変えていない。'],'status':'リーダーはミエット'},{'title':'白灯石','body':['アテナの障壁が、糸の入口。','石そのものの強化ではない。'],'status':'残り三人は残響石'},{'title':'指揮','body':['今回は新しい能力を足さない。','通常の一行動で回復する。'],'status':'四要素を無理に全部変えない'}])
add('owned-scope','summary','全所持を仮定した、研究用の実戦。',refs('battle',0,1),'実戦を止めて、見る',body=['最高級の石と、未入手を含む全キャラ所持を仮定したセーブ。','通常の入手進行の案内ではありません。','同じ敵・同じ出発シード。改修前と研究版を比較します。'])
f0=J['reference']['sourceFrame'];f=J['miette']['sourceFrame'];assert f0 is not None and f is not None
cut('battle-reference','reference',f0-180,f0+210,refs('battle',1,2),'まずは、改修前。',['同じ四人、同じ石、同じリーダー。','改修前の公開版ルール。'])
pause('pause-reference','reference',f0+24,'回復する。その代わり、盾を使う。',refs('battle',2,3),[card(1)],card(1),['覚醒セリスのHP。','219 → 309 / 回復90。','有効な障壁を38消費。'])
add('miette-party','party','同じ四人で、研究版へ。',refs('battle',3,4),characters=[{'id':id,'leader':id=='miette','subject':id=='miette'}for id in J['miette']['party']],note='T6・同じ装備。選抜された作戦も、今回は同一です。')
cut('battle-mend','miette',f-180,f+30,[],'盾がない相手へ、修繕する。',['ミエットが、一行動を使う。','これから止めて、順に見ます。'])
pause('pause-target','miette',f-8,'対象に、盾がなくても。',refs('battle',4,5),[card(2)],card(2),['アテナを確認。','HPは255 / 421。','本人の有効な障壁は0。'])
pause('pause-thread','miette',f+24,'消えるはずの力が、届いた。',refs('battle',5,8),[card(2),card(3)],card(2),['HP255 → 421。','アストレアの糸を47消費。','実回復166 / 不足HPで上限。'])['spec']['footnote']='糸を基礎3倍で回復へ。今回は結晶補正も適用。他人の有効な障壁は消費しません。'
cut('battle-replay','miette',f-150,f+90,[],'糸が、命に変わる。',['同じ場面を、もう一度。','新しい攻撃や、追加行動ではない。'],replay=True)
pause('pause-cost','miette',f+36,'無料の回復には、しない。',refs('battle',8,9),[card(0)],card(0),['通常の一行動を使う。','再使用は3ラウンド後。','糸にも、量と期限がある。'])
meta=json.load(open(O/'capture/miette.json'));frames={x['event']['id']:x['sourceFrame']for x in meta['battleEvents']};proof=json.loads(gzip.decompress((O/'proofs/miette.json.gz').read_bytes()));dead=[e for e in proof['events']if e.get('actorId','').startswith('party:')and(e.get('amount')or 0)>0 and e.get('unitsAfter')and not any(u['side']=='enemy'and u['hp']>0 for u in e['unitsAfter'])];last=frames[dead[-1]['id']]
cut('battle-finish','miette',last-420,last+24,refs('battle',9,10),'同じ14ラウンド。薬は、3個から1個。',['改修前後とも、4人生還。','この一戦の結果。勝率の証明ではない。'])
table('sample','一戦の手応えと、複数戦の結果。','example',refs('battle',10,12))
table('main-results','512戦で、薬が減った。','main',refs('results',0,2),chapter='512シードの再検証')
add('same-policy','summary','同じ装備、同じ作戦で比較する。',refs('results',2,3),body=['この主条件では、改修前後の選抜された編成・石・方針が一致。','同じ研究版の条件から技能を戻した対照も、改修前と一致。','作戦の差だけによる改善ではありません。'])
table('thread-control','仲間の糸だけを、使えなくしたら。','ablation',refs('results',3,4))
add('ai-limit','summary','見えた利益と、まだ言えないこと。',refs('control',0,1),'悪化した条件も、残す',body=['この主条件は手動の技能優先方針。','新しい自動AIの安全策が改善の原因とは言えません。','糸と障壁の使い分けの効果を、分けて記録します。'])
table('negative','強化して、悪くなった編成もある。','negative',refs('control',1,3))
table('growth','同じビルドで、石を育てる。','growth',refs('growth',0,2),chapter='石を掘る、次の目標')
add('stone-goal','summary','白灯石を、次の目標に。',refs('growth',2,3),body=['障壁から、使われなかった糸へ。その戦術を支える石。','T3・T4・T6は四人分の石をそろえて比較しました。','実際の入手先は同梱の資料へ。必要周回数は未推定です。'])
table('replacement','最良の代替は、まだ強い。','alternative',refs('limits',0,1))
add('scope','summary','改修は採用。認定は、研究中。',refs('limits',1,3),'改修の採用と、認定を分ける',body=['限られた条件で、薬・生還・速さに改善を確認。','すべての編成や、全所持の最終盤での優位性は未確立。','他のキャラの能力や敵のルールは変えていません。'])
table('audit','良い結果も、悪い結果も残す。','panel',refs('limits',3,4))
add('judgment','summary','測るだけで、終わらせない。',refs('judgment',0,2),'研究日誌',status='改修採用／研究中',certified=False,body=['余り糸の修繕を実装。確認用512シードで再検証。','消える障壁に、回復へつながる役割を追加。','全キャラが輝く、という目標はまだ研究中です。'])
add('farewell','desk','この糸を、もう少し。',refs('judgment',2,3))
add('next-preview','preview','次回、ティッカの一手を変える。',refs('preview',0,3),'次回予告：ティッカの改修',characterId='tikka',status='次回の改修研究 · 未検証',body=['既存の測定から、一歩先へ。','必要な能力を実装して、再検証する。','結果は、まだ決めない。'])
add('ledger','roster','研究記録',[],judgment='artifacts/this-girl-02-v2/research/reports/judgment.json')['durationFrames']=1050
music=json.load(open(O/'research/rights/music-source.json'));e={'episode':'THIS-GIRL-002-V2','finalized':False,'music':music,'pages':pages};(O/'editorial.json').write_text(json.dumps(e,ensure_ascii=False,indent=2));print('PAGES',len(pages),[(p['id'],p['durationFrames'])for p in pages if p.get('gameCut')])
