from pathlib import Path
import json,hashlib,gzip,subprocess,re
ROOT=Path(__file__).resolve().parents[2];R=ROOT/'artifacts/this-girl-05/research';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def verify():
 j=json.load(open(R/'episode-implementation.json'));assert j['status']=='implementation-complete' and j['adoptionScope']=='scoped-not-endgame-certified'
 a=json.load(open(R/'analysis/main.json'));assert a['passedDataValidation'] and a['adoption']['passed'];lock=json.load(open(R/'confirmation-lock.json'));assert a['lockSha256']==sha(R/'confirmation-lock.json')
 for f,h in lock['sources'].items():assert sha(ROOT/f)==h,('Frozen research changed',f)
 for f,h in j['evidence'].items():assert sha(ROOT/f)==h,('Implementation evidence changed',f)
 held={x['applicationSeed']for x in lock['seedMap']};assert len(held)==256 and not held.intersection(lock['developmentSeeds']+lock['selectionSeeds'])
 for spec in lock['cases']:
  d=json.load(gzip.open(R/'confirmation'/(spec['id']+'.json.gz')));assert d['lockSha']==a['lockSha256'];assert all(len(v['rows'])==256 for v in d['arms'].values())
 for ident in ['reference','lisette']:
  p=json.load(gzip.open(R.parent/'proofs'/(ident+'.json.gz')));assert p['applicationVerified'] and p['nativeVerified'] and all(p['checks'].values())
 assert json.load(open(R/'baseline-equivalence.json'))['passed'];assert j['verification']['newMechanicTestsIncluded']==11 and j['verification']['gameBrowserTests']==2
 assert int(re.search(r'Tests\s+(\d+) passed',(R/'full-public-tests.log').read_text()).group(1))==786
 return j
if __name__=='__main__':print('IMPLEMENTATION GATE PASSED',verify()['adoptionScope'])
