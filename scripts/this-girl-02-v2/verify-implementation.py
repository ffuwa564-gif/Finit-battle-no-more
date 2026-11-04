from pathlib import Path
import json,hashlib,gzip,subprocess
ROOT=Path(__file__).resolve().parents[2];R=ROOT/'artifacts/this-girl-02-v2/research';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def verify():
 p=R/'episode-implementation.json';j=json.load(open(p));assert j['status']=='implementation-complete' and j['adoptionScope']=='scoped-not-endgame-certified';a=json.load(open(R/'analysis/main.json'));assert a['passedDataValidation']and a['adoption']['passed']and not a['adoption']['endgameCertified'];lock=json.load(open(R/'confirmation-lock.json'));assert a['lockSha256']==sha(R/'confirmation-lock.json')
 for f,s in lock['sources'].items():assert sha(ROOT/f)==s,('Frozen research changed',f)
 for f,s in j['evidence'].items():assert sha(ROOT/f)==s,('Implementation evidence changed',f)
 assert len(lock['seedMap'])>=200 and len(set(x['applicationSeed']for x in lock['seedMap']))==len(lock['seedMap'])
 for spec in lock['cases']:
  data=json.load(gzip.open(R/'confirmation'/(spec['id']+'.json.gz')));assert data['lockSha']==a['lockSha256'];assert all(len(v['rows'])==len(lock['seedMap'])for v in data['arms'].values())
 for id in ['reference','miette']:
  proof=json.load(gzip.open(R.parent/'proofs'/(id+'.json.gz')));assert proof['applicationVerified']and proof['nativeVerified']and all(proof['checks'].values())
 changed=subprocess.check_output(['git','diff','--name-only',j['baseEngineCommit'],j['implementationCommit'],'--','src'],cwd=ROOT).decode().splitlines();assert changed and any(f.startswith('src/domain/')for f in changed);assert set(changed)==set(j['changedEngineFiles'])
 assert json.load(open(R/'baseline-equivalence.json'))['passed'];assert j['verification']['publicUnitTests']==750 and j['verification']['newMechanicTestsIncluded']==14 and j['verification']['gameBrowserTests']==2
 return j
if __name__=='__main__':print('IMPLEMENTATION GATE PASSED',verify()['adoptionScope'])
