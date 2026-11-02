"""Derive episode facts from full native proofs and calibrated browser captures."""
from pathlib import Path
import json,gzip,hashlib
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part3'
def read(p):return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
ledger=read(O/'proofs/ledger.json');rows=[]
for r in ledger['records']:
 if r['mode']=='preparation':continue
 p=read(O/'proofs'/(r['id']+'.json.gz'));b=p['final']['battle'];rows.append({'id':r['id'],'win':p['win'],'rounds':p['rounds'],'potions':p['potionsUsed'],'party':p['initial']['partyIds'],'leader':p['initial']['leaderId'],'remaining':[{k:u[k]for k in ['characterId','side','hp','maxHp']}for u in b['units']],'proofSha256':sha(O/'proofs'/(r['id']+'.json.gz'))})
last=read(O/'proofs/attempt-10.json.gz');potionRounds=[g['round']for g in last['groups']if g['kind']=='potion'];captures={}
for id in ['attempt-1','farm-7','attempt-4','attempt-9','attempt-10']:
 m=read(O/'capture'/(id+'.json'));assert m['nativeBrowserVerified']and m['athenaBan']and m['calibration']['passed'];assert sha(O/'capture'/(id+'.mov'))==m['cleanSha256'];assert max(abs(x)for x in m['calibration']['encodedResidualMs'])<=80;captures[id]={'sha256':m['cleanSha256'],'gameplayWindow':m['gameplayWindow'],'anchors':len(m['calibration']['video']),'maxCalibrationResidualMs':max(abs(x)for x in m['calibration']['encodedResidualMs']),'nativeBrowserVerified':True,'claimVerified':m['claimVerified']}
assert captures['attempt-10']['claimVerified'];native=read(O/'research/Native-Verification.json');assert native['passed']
r={'sourceGameCommit':ledger['sourceGameCommit'],'sourceFixture':'artifacts/diary-part2/proofs/route-final.json.save','battles':rows,'captures':captures,'finalPotionRounds':potionRounds,'minimumGuardianRoundEndHP':37,'guardianMaxHP':371,'nativeBattleCount':17,'towerAttempts':10,'noAthenaAllBattles':True,'rngReset':False,'comparisonFixtureHasInheritedT4Stones':3,'scope':'Scripted legal commands; commentary after recording. No human-first-play claim. No causal estimate from different configurations/sequential RNG.','limits':'One successful run, not a measured win rate. End HP is healthy; the narrow margin is early survival. T6 was tried but not used in the winning run. Guardian swift echo stone power9 / bulwark100 is not a whole-item T1 budget guarantee.','proofVerificationSha256':sha(O/'research/Native-Verification.json')};(O/'evidence.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print('EVIDENCE PASSED',len(rows),'battles',potionRounds)
