import json,pathlib,re
P=pathlib.Path('artifacts/diary-111');reports={}
for ident,rounds,survivors in [('rewind',22,3),('flower',27,4),('command',19,0)]:
 p=json.loads((P/'proofs'/f'{ident}.json').read_text());assert p['nativeVerified'] and p['comparisonFixture'];assert p['rounds']==rounds
 units=[u for u in p['final']['battle']['units']if u['side']=='party'];alive=sum(u['hp']>0 for u in units)
 assert alive==survivors,(ident,alive)
 reports[ident]={'rounds':rounds,'survivors':alive,'phase':p['final']['battle']['phase'],'nativeVerified':True}
f=json.loads((P/'proofs/flower.json').read_text());es=f['events'];seed=[e for e in es if 'memory:white-flower-seed' in e.get('skillId','')];bloom=[e for e in es if e.get('text','').startswith('摘まない白花 — 実行した防御')];overflow=[e for e in es if '余り布が障壁' in e.get('text','')]
assert len(seed)==7 and sum(e.get('amount',0)for e in seed)==33
assert [e['amount']for e in bloom]==[50,0,42]
assert len(overflow)==1 and '障壁5' in overflow[0]['text']
assert len([e for e in es if e.get('skillId')=='scout-fio-overflow'])==4
reports['flowerObserved']={'seedUses':7,'actualImmediateHealing':33,'bloomHealing':[50,0,42],'totalActualHealing':125,'overflowAdditionalBarrier':5,'overflowSkillUses':4}
confirm=json.loads((P/'search/confirmatory.json').read_text())
for row,wins in zip(confirm,[61,76]):
 assert row['wins']==wins and row['total']==100
 proof=json.loads((P/'proofs'/f"{row['id']}.json").read_text());assert row['config']==proof['config']
 assert [o['seed']for o in row['outcomes']]==list(range(70001,70101))
reports['confirmation']=[{'id':r['id'],'wins':r['wins'],'total':r['total'],'seeds':'70001..70100'}for r in confirm]
p=json.loads((P/'proofs/preparation.json').read_text());assert p['nativeVerified'] and p['materialsGrantedNotFarmed']
(P/'delivery/Data-Validation.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(reports)
