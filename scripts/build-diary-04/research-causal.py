from pathlib import Path
import json,hashlib
O=Path(__file__).resolve().parents[2]/'artifacts/build-diary-04/research'
def read(k):return json.loads((O/f'fio-{k}-seed65.json').read_text())
def sha(k):return hashlib.sha256((O/f'fio-{k}-seed65.json').read_bytes()).hexdigest()
def before_fio(d,round):
 s=next(s for s in d['captureSteps']if s['kind']=='round'and s['before']['round']==round);units=s['before']['units']
 for e in s['after']['events']:
  if e.get('actorId')=='party:fio'and e.get('actionSelection'):
   return {'beforeUnits':[{k:u[k]for k in['characterId','hp','maxHp']}for u in units if u['side']=='party'],'actionText':e['text'],'skillId':e.get('skillId'),'amount':e.get('amount'),'actionSelection':True}
  if e.get('unitsAfter')is not None:units=e['unitsAfter']
main,old,off=read('main'),read('old-overflow'),read('payment-disabled');cases=[]
for key,d in [('main',main),('old-overflow',old),('payment-disabled',off)]:
 state=before_fio(d,2);noelle=next(u for u in state['beforeUnits']if u['characterId']=='noelle-awakened');state['noelleHpRatio']=noelle['hp']/noelle['maxHp'];cases.append({'id':key,'fixturePath':f'artifacts/build-diary-04/research/fio-{key}-seed65.json','fixtureSha256':sha(key),'beforeFioRound2':state,'outcome':{k:d[k]for k in['seed','win','rounds','survivors','remainingHP','pots','flowers','fairies','stockMade','stockPaid','fioDamageActions','fioFullHeals','stockPaidWhileSleeping']}})
ledger=[]
for s in main['captureSteps']:
 if s['kind']!='round':continue
 units=s['before']['units'];boxes=s['before'].get('researchSupplyBoxes',{})
 for e in s['after']['events']:
  if '預かり箱' in e['text']and '届けた'in e['text']:
   uid=e['targetIds'][0];before=next(u for u in units if u['uid']==uid);after=next(u for u in e['unitsAfter']if u['uid']==uid);source=next(u for u in e['unitsAfter']if u['uid']==e['actorId']);beforebox=boxes[e['actorId']];afterbox=e['researchSupplyBoxesAfter'][e['actorId']];ledger.append({'round':s['before']['round'],'text':e['text'],'targetId':uid,'hpBeforePayment':before['hp'],'hpAfterPayment':after['hp'],'amount':e['amount'],'stockBefore':beforebox['amount'],'stockAfter':afterbox['amount'],'sourceSleeping':bool(source.get('ailments',{}).get('sleep')),'passed':after['hp']-before['hp']==e['amount']and beforebox['amount']-afterbox['amount']==e['amount']})
  if e.get('unitsAfter')is not None:units=e['unitsAfter']
  if 'researchSupplyBoxesAfter'in e:boxes=e['researchSupplyBoxesAfter']
checks={'sameSeedAndPhysicalInitialConditions':all(d['seed']==65 and d['captureFixture']['units']==main['captureFixture']['units']and d['captureFixture']['memoryGems']==main['captureFixture']['memoryGems']and d['captureFixture']['partyIds']==main['captureFixture']['partyIds']and d['captureFixture']['leaderId']==main['captureFixture']['leaderId']for d in[old,off]),'mainNoelleAboveNativeSurvivalHealThreshold':cases[0]['beforeFioRound2']['noelleHpRatio']>.8,'controlsNoelleBelowThreshold':all(x['beforeFioRound2']['noelleHpRatio']<.8 for x in cases[1:]),'mainAttackControlsHeal':cases[0]['beforeFioRound2']['skillId'].startswith('memory:echo-shard:')and all(x['beforeFioRound2']['skillId']=='heal-17'for x in cases[1:]),'actualPaymentsConserveHpAndInventory':all(x['passed']for x in ledger),'sleepPaymentOnlyThreeOf45':sum(x['amount']for x in ledger if x['sourceSleeping'])==3 and sum(x['amount']for x in ledger)==45,'mainWinBothControlsLose':main['win']and not old['win']and not off['win']}
report={'passed':all(checks.values()),'type':'Paired native witness from a declared100-seed cohort; not a universal win claim','seed':65,'selectionNote':'Chosen from seeds1..100 for a visible mechanism; aggregate success rates are disclosed separately.','checks':checks,'cases':cases,'mainPaymentLedger':ledger,'causalExplanation':['R1の通常範囲攻撃後、Noelleへ30支払い、HP156から186へ戻す。R2の別の支払7はLioraへ。','R2のFio行動選択直前、箱ありNoelle186/204=91.18%、旧技/支払停止156/204=76.47%。native survival healerの80%閾値を跨ぐ。','箱ありはFioの残響石110ダメージ＋慈雨43回復を選ぶ。旧技/支払停止はNoelleへの全量回復(実48)を選ぶ。元からある通常1手の内容が変わるので、箱が追加手番を作ったわけではない。','同じ通常攻撃の残響38は既存石の次R追撃であり、新しい行動数には数えない。','R7睡眠中の3はR6に作った別の小箱。R1の37がずっと残った話ではない。','新旧比較はスキル置換＋LS発火条件変更の採用セット。支払停止では箱作成/新LSを保ったまま支払だけ止め、作用を切り分ける。'],'limits':['この一組だけから全勝率や必要性を証明しない。','薬/花/妖精を使う条件。無しの成功率は別に表示する。','同予算の祓い/再生/他回復役による別解は残る。']}
(O/'research-causal-witness.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('CAUSAL WITNESS',report['passed'],checks)
