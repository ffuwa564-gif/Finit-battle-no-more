from pathlib import Path
import json,hashlib,math,gzip,csv
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04-v2';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();N=json.load(open(O/'narration.json'));L={l['lineId']:l for c in N['chapters']for l in c['lines']};A=O/'research/analysis/main.json';S=json.load(open(O/'research/recording-selection.json'));J=json.load(open(O/'research/mechanism-noelle.json'));pages=[]
def refs(ch,a,b):return[f'{ch}-{i:02}'for i in range(a,b)]
def add(id,kind,title,lines,chapter=None,**spec):
 p={'id':id,'spec':{'kind':kind,'title':title,**spec},'lines':lines,'leadSeconds':.35,'tailSeconds':.8,'lineGapSeconds':.3}
 if chapter:p['chapter']=chapter
 pages.append(p);return p
def table(id,title,mode,lines,chapter=None,**kw):return add(id,'data-table',title,lines,chapter=chapter,evidence=str(A.relative_to(ROOT)),evidenceSha256=sha(A),mode=mode,caseId=S['caseId'],**kw)
def cut(id,src,a,b,lines,title,body):
 mp=O/f'capture/{src}.json';m=json.load(open(mp));assert m['calibration']['passed']and m['sourceNormalization']['passed'];p=add(id,'battle',title,lines,section='葛葉 覚醒級 · T6 / 編成1',body=body,note='実戦の抜粋 · ゲーム設定×1 · 途中を省略',unreleased=src=='noelle');p['durationFrames']=b-a;p['gameCut']={'file':f'artifacts/this-girl-04-v2/capture/{src}.mov','sourceStartFrame':a,'sourceEndFrame':b,'sourceApplicationSpeed':1,'audioSourceOffsetSamples':0,'audioCalibrationEvidence':{'file':str(mp.relative_to(ROOT)),'sha256':sha(mp)}};assert b-a>=180;assert sum(math.ceil(L[x]['duration']*30)+9 for x in lines)+11<=b-a,(id,b-a,lines);return p
def pause(id,src,f,title,lines,focus,inset,explain,footnote=None):return add(id,'battle-pause',title,lines,pauseId=id,researchMode='after'if src=='noelle'else'before',freeze={'file':f'artifacts/this-girl-04-v2/capture/{src}.mov','sourceFrame':f,'sha256':sha(O/f'capture/{src}.mov')},focus=focus,inset=inset,explain=explain,**({'footnote':footnote}if footnote else{}))
def card(i):return[round(18+104.5*i),415,101,120]
add('opening','desk','その一手を、失わないために。',refs('question',0,1),'その一手を、失わないために。')
add('subject','subject','ノエルの、号令を直す。',refs('question',1,4),characterId='noelle',body=['R · 定数1.4 / 全体攻撃役','前の回は、号令の不利を測って終わった。','今回は、実際に発令条件を直す。'])
add('original','choice','命令と、追加攻撃は違う。',refs('design',0,2),'何を変えるか',cards=[{'title':'号令の仕事','body':['通常の単体行動の宛先をそろえる。','ノエルは自分の一手を使う。'],'status':'攻撃回数は増えない'},{'title':'仲間の仕事','body':['石・必殺・範囲・支援は保持。','無理に単体攻撃へ変えない。'],'status':'もともとの保護を維持'}])
add('new-rule','summary','資源を守る号令。',refs('design',2,5),body=['予約した生存受領者全員：石の待ち時間終了、または準備済み必殺予約。','条件を満たせば未発令。本人は通常判断の一行動へ。','今の準備状態によるルール。AIの次の技を予測しない。'])
add('method','summary','同じ基準で、測り直す。',refs('method',0,2),'新しい256入力で再検証',body=['既存2戦場 × 2編成 × T3/T4/T6。合法4石・薬5。','改修前後は同じ18の号令運用候補から、別々に選抜。','同構成から保護策だけを外した対照も確認する。'])
add('baseline-scope','summary','比較相手の、意味をそろえる。',refs('method',2,3),body=['Bは「号令を使う方針」の改修前。無制約の最強編成ではない。','Nは号令なし、Lは別リーダー、Aは有限の代替候補。','これらの機会費用も、最後まで残して見せる。'])
add('elements','choice','変える発令条件。残す能力。',refs('elements',0,2),'4要素の採用・見送り',cards=[{'title':'技能・能力値','body':['全体攻撃と星図の露出を維持。','石の効果も変更しない。'],'status':'本人の一手を保つ'},{'title':'リーダー','body':['未発令なら追加LSも保つ。','発令すれば従来の費用。'],'status':'別リーダーとも比較'},{'title':'指揮','body':['準備済み資源がある時の見送り。','発令後の空振りは返さない。'],'status':'追加攻撃は作らない'}])
add('owned-scope','summary','全所持を仮定した、研究の実戦。',refs('battle',0,1),'実戦を止めて、見る',body=['入手できないXRを含む全所持、4人分のT6石を仮定。','通常プレイの入手手順の案内ではない。','同じ出発シード。各版の選抜した石・方針で比べる。'])
b=J['reference']['issued']['sourceFrame'];f=J['noelle']['fallback']['sourceFrame'];n=J['noelle']['ordinary']['sourceFrame'];assert all(x is not None for x in [b,f,n])
cut('battle-reference','reference',b-90,b+300,refs('battle',1,2),'まずは、改修前の発令。',['本人の通常一手を、号令に使う。','石と作戦は、改修前の選抜。'])
pause('pause-reference','reference',b+12,'本当に発令すれば、一手を使う。',refs('battle',2,3),[card(0)],card(0),['ノエルが、号令を発令。','適用1人 / 宛先変更1人。','この一戦全体の記録。'])
add('party','party','研究版へ。同じ四人、石と作戦は別。',refs('battle',3,4),characters=[{'id':id,'leader':id=='noelle','subject':id=='noelle'}for id in J['noelle']['party']],note='両版ともノエルがリーダー。本人の石と方針は別々に選抜。')
meta=json.load(open(O/'capture/noelle.json'));start=max(math.ceil(meta['gameplayWindow'][0]*30)+3,f-20)
cut('battle-withhold','noelle',start,f+210,[],'準備済みの資源に、譲る。',['最初のラウンドの見送り。','次に止めて、受領者を確認します。'])
pause('pause-resource','noelle',f+12,'予約したのは、覚醒セリス一人。',refs('battle',4,6),[[123,415,101,94]],[123,415,101,94],['石の再使用待ちは終了。','一人の予約でも「全員」。','発令せず、本人の一手へ。'],footnote='石の準備状態は実入力で照合。拡大は持ち主を示します。')
cut('battle-normal','noelle',n-90,n+300,refs('battle',6,7),'ノエルの、もともとの一手へ。',['この場面は、残響石を使った。','追加した無料攻撃ではありません。'])
pause('pause-action','noelle',n+15,'残響石による、実ダメージ100。',refs('battle',7,8),[card(0)],card(0),['残った通常行動で、石を使う。','実ダメージ100。','後の追撃は既存の石効果。'])
pause('pause-cost','noelle',n+15,'号令25と、二重取りしない。',refs('battle',8,9),[card(0)],card(0),['号令のゲージは得ない。','通常行動25を、一回だけ。','通常の行動と再使用待ち。'])
frames={x['event']['id']:x['sourceFrame']for x in meta['battleEvents']};proof=json.loads(gzip.decompress((O/'proofs/noelle.json.gz').read_bytes()));dead=[e for e in proof['events']if e.get('actorId','').startswith('party:')and(e.get('amount')or 0)>0 and e.get('unitsAfter')and not any(u['side']=='enemy'and u['hp']>0 for u in e['unitsAfter'])];last=frames[dead[-1]['id']]
cut('battle-finish','noelle',last-390,last+24,[],'最後まで、結果を残す。',['一戦の結果は、改修前が良かった。','良い実例に差し替えず、次に全体を見ます。'])
table('example','この一戦は、改修前の方が良かった。','example',refs('battle',9,10))
table('main-results','256入力で、速さと生還が改善。','main',refs('results',0,2),chapter='256入力で、測り直す')
table('causal','同じ構成から、保護策だけを外す。','ablation',refs('results',2,3))
add('adoption','summary','三条件で、事前基準を満たした。',refs('results',3,4),body=['C-Bと、同構成C-X。両方への意味ある利益を確認。','勝利・速さ・薬・生還、計96比較を補正。','これは号令運用の保護策採用。最終盤の認定とは別。'])
table('opportunity','号令なしは、まだ強い。','opportunity',refs('limits',0,2),'残った機会費用も、見失わない')
table('panel','塔では、勝てない条件も残った。','panel',refs('limits',2,3))
table('growth','石が育つ利益は、別に測る。','growth',refs('growth',0,2),chapter='石を掘る、次の目標')
add('judgment','summary','保護策は採用。認定は、研究中。',refs('judgment',0,2),'研究ノート',status='保護策採用／研究中',certified=False,body=['発令条件を実装し、未使用の256入力で再検証。','号令を選びたい理由を作る課題は、まだ残る。','mainゲームとitch.ioには未導入。'])
add('farewell','desk','その一手を、失わないために。',refs('judgment',2,3))
add('preview','preview','次回、リゼットの一手を変える。',refs('preview',0,2),'次回予告：リゼットの改修',characterId='lisette',status='次回の改修研究 · 未検証',body=['敵の強化を、ほどいていく一手。','必要な改修を実装して、同条件で測る。','結果は、まだ決めない。'])
add('ledger','roster','研究記録',[],judgment='artifacts/this-girl-04-v2/research/reports/judgment.json')['durationFrames']=1050
music=json.load(open(O/'research/rights/music-source.json'));(O/'editorial.json').write_text(json.dumps({'episode':'THIS-GIRL-004-V2','finalized':False,'music':music,'pages':pages},ensure_ascii=False,indent=2))
with(O/'storyboard.csv').open('w')as out:
 w=csv.writer(out);w.writerow(['page','kind','title','voice','source']);w.writerows([p['id'],p['spec']['kind'],p['spec']['title'],';'.join(p['lines']),json.dumps(p.get('gameCut')or p['spec'].get('freeze'),ensure_ascii=False)]for p in pages)
print('Editorial pages',len(pages))
