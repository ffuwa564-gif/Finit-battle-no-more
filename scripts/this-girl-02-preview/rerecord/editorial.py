from pathlib import Path
import json,hashlib,math
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-preview';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
N=json.loads((O/'narration.json').read_text());L={l['lineId']:l for c in N['chapters']for l in c['lines']};A=O/'research/analysis/main.json';case='ivory-tower-010-T6-F1';pages=[]
def refs(prefix,a,b):return[f'{prefix}-{i:02}'for i in range(a,b)]
def add(id,kind,title,lines,chapter=None,**spec):
 p={'id':id,'spec':{'kind':kind,'title':title,**spec},'lines':lines,'leadSeconds':.35,'tailSeconds':.8,'lineGapSeconds':.3}
 if chapter:p['chapter']=chapter
 pages.append(p);return p
def table(id,title,mode,lines,**kw):return add(id,'data-table',title,lines,evidence=str(A.relative_to(ROOT)),evidenceSha256=sha(A),mode=mode,caseId=case,**kw)
def cut(id,src,a,b,lines,title,body):
 p=add(id,'battle',title,lines,section='白亜の塔 第10層 · T6 / 編成1',body=body,note='実戦の抜粋 · ゲーム設定×1 · 途中を省略',unreleased=True)
 proof=O/f'research/native-buffer-qa-{src}.json';assert json.loads(proof.read_text())['passed'];p['durationFrames']=b-a
 p['gameCut']={'file':f'artifacts/this-girl-02-preview/capture/{src}.mov','sourceStartFrame':a,'sourceEndFrame':b,'sourceApplicationSpeed':1,'audioSourceOffsetSamples':0,'audioCalibrationEvidence':{'file':str(proof.relative_to(ROOT)),'sha256':sha(proof)}}
 assert sum(math.ceil(L[x]['duration']*30)+9 for x in lines)+11<=b-a
 return p
def pause(id,src,f,title,lines,focus,inset,explain):
 p=add(id,'battle-pause',title,lines,pauseId=id,freeze={'file':f'artifacts/this-girl-02-preview/capture/{src}.mov','sourceFrame':f,'sha256':sha(O/f'capture/{src}.mov')},focus=focus,inset=inset,explain=explain)
 return p
add('opening','desk','その盾を、ほどいてもいいのかな。',refs('question',0,1),'その盾を、ほどいてもいいのかな。')
add('subject','subject','守りを、命に縫い直す子。',refs('question',1,4),characterId='miette',body=['ミエット · SR / BD019','障壁を消費し、HPを回復する。','守りをほどく、という選択。'])
add('skill','choice','いま、使える能力。',refs('skill',0,4),'装甲リサイクルの仕組み',cards=[{'title':'装甲リサイクル','body':['HP75%以下の味方。','障壁を消費し、回復。'],'status':'公開版の能力'},{'title':'基本の交換','body':['消費は最大HPの15%まで。','基本は、消費量の2倍を回復。'],'status':'HP上限まで'},{'title':'交換の代償','body':['1行動を使う。','再使用は3ラウンド後。'],'status':'残る守りも見る'}])
add('methods','summary','同じ条件で、確かめる。',refs('method',0,3),'研究の条件',body=['公開版1.12の能力を使用。今回は能力を追加しない。','回復できる17形態を、同じ探索予算で比較。','探索用と確認用の乱数を分離。各条件256シード。'])
add('conditions','conditions','勝てる。その先も、見る。',refs('method',3,4),note='薬・全員生還・別の編成での働きも、同じ基準で確認する。')
add('elements','choice','4要素を、ひとつの選択に。',refs('elements',0,5),'スキル・LS・石・指揮',cards=[{'title':'リーダー','body':['ミエット：毎ラウンド再生。','アテナ：別の守り方。'],'status':'同時には使えない'},{'title':'記憶石','body':['障壁を支える特性。','装備と操作を一緒に探索。'],'status':'石だけの効果と混同しない'},{'title':'指揮','body':['ノエルの指揮は、','今回は測っていません。'],'status':'未検証'}])
add('owned-scope','summary','この先は、全所持を仮定した研究。',refs('battle',0,1),'実戦を止めて、見る',body=['未入手のXRも含む、最終盤を想定した研究用セーブ。','映像の能力は公開版。入手できる編成の案内ではありません。'])
cut('battle-reference','reference',1370,1700,refs('battle',1,2),'比較の回復役は、弁財天。',['右端の回復役を、差し替えます。','仲間3人・出発シード・装備予算をそろえる。'])
pause('pause-reference','reference',1699,'見るのは、回復役と薬。',refs('battle',2,3),[[338,459,105,132],[270,600,65,110]],[338,459,105,132],['右端が、比較する枠。','回復薬と生還も見る。'])
add('miette-party','party','ここからは、ミエットと。',refs('battle',3,4),characters=[{'id':'seris-awakened'},{'id':'athena','leader':True},{'id':'astraea'},{'id':'miette','subject':True}],note='操作は各編成で事前に探索。同じ敵とシードで比較。')
pause('pause-target','miette',1631,'左端のセリスを、追います。',refs('battle',4,5),[[3,459,108,132]],[3,459,108,132],['左端の味方。','HPと障壁を見ます。'])
cut('battle-miette','miette',1631,1775,[],'装甲リサイクル。',['障壁を使い、傷を縫い直す。'])['durationFrames']=144
# A short mechanism action is lengthened before the event, preserving all frames and normal playback.
pages[-1]['gameCut']['sourceStartFrame']=1547;pages[-1]['durationFrames']=228
pause('pause-conversion','miette',1774,'守り48を、回復96へ。',refs('battle',5,8),[[3,459,108,132]],[3,459,108,132],['障壁 216 → 168','HP 218 → 314','消費48 → 回復96'])
pause('pause-remainder','miette',1774,'168の守りは、残っています。',refs('battle',8,10),[[3,459,108,132]],[3,459,108,132],['障壁は、全部使わない。','消費48は、次の守りに使えない。'])
cut('battle-miette-finish','miette',3830,4165,refs('battle',10,11),'この一戦は、どちらも生還。',['両編成とも、9ラウンド。','4人とも、生きて帰りました。'])
table('sample-cost','同じ勝利でも、薬が違いました。','example',refs('battle',11,12))
table('main-results','勝利数だけでは、決められない。','main',refs('results',0,3),chapter='256シードの結果')
table('frugal-results','節約を目指しても、差は残る。','frugal',refs('results',3,4))
table('all-results','別の編成でも、同じでしょうか。','panel',refs('results',4,6))
table('ablation','この能力を、外したら。','ablation',refs('control',0,4),chapter='固有の働きを、切り分ける')
table('growth','良い石は、どこまで助ける？','growth',refs('growth',0,2),chapter='次に探したい石')
add('stone-goal','goal','まずは、障壁を支える石から。',refs('growth',2,3),stone='澄明の残響石 · 障壁特性',body=['映像例：Tier6 / 力239・特性239。','塔41層以降などに、T6の入手候補。','指定の石・特性・ロールは確定しません。'])
add('judgment','summary','今回は、研究中。',refs('judgment',0,3),'研究日誌',status='研究中 · 固有の採用理由は未確立',certified=False,body=['既存能力の作動は確認できました。','最終盤で、他の回復役より選ぶ理由はまだ足りない。','次は、障壁を使うタイミングを研究。新能力は未実装。'])
add('farewell','desk','好きな子との、お別れにしないために。',refs('judgment',3,6))
add('ledger','roster','研究記録',[],judgment='artifacts/this-girl-02-preview/research/reports/judgment.json')['durationFrames']=1050
music=json.loads((O/'research/rights/music-source.json').read_text())
e={'episode':'THIS-GIRL-002','finalized':False,'music':music,'pages':pages};(O/'editorial.json').write_text(json.dumps(e,ensure_ascii=False,indent=2));print('PAGES',len(pages))
