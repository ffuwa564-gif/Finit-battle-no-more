from pathlib import Path
import json,hashlib,subprocess,re
ROOT=Path(__file__).resolve().parents[2];R=ROOT/'artifacts/this-girl-04-v2/research';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();a=json.load(open(R/'analysis/main.json'));assert a['adoption']['passed'];assert '2 passed' in (R/'game-browser-tests.log').read_text();count=int(re.search(r'Tests\s+(\d+) passed',(R/'full-public-tests.log').read_text()).group(1));assert count==775
for p in ['research-build.log','public-build.log']:
 s=(R/p).read_text();assert 'built in' in s and 'Content gate passed' in s and 'UI contract gate passed' in s and 'Locale check passed' in s
files=['analysis/main.json','confirmation-lock.json','reports/adoption.json','reports/judgment.json','reports/ResearchReport.md','baseline-equivalence.json','full-public-tests.log','game-browser-tests.log','research-build.log','public-build.log','recording-selection.json','code-pr.json']
evidence={str((R/f).relative_to(ROOT)):sha(R/f)for f in files}
for id in ['reference','noelle']:
 p=R.parent/f'proofs/{id}.json.gz';evidence[str(p.relative_to(ROOT))]=sha(p)
j={'episode':'THIS-GIRL-004-V2','status':'implementation-complete','adoptionScope':'scoped-not-endgame-certified','baseEngineCommit':'53c4cd0','implementationCommit':'568c57f','policyCommit':'96d2e00','freezeCommit':'98273ae','codePR':json.load(open(R/'code-pr.json'))['url'],'changedEngineFiles':subprocess.check_output(['git','diff','--name-only','53c4cd0','568c57f','--','src'],cwd=ROOT).decode().splitlines(),'evidence':evidence,'verification':{'publicUnitTests':count,'newMechanicTestsIncluded':12,'gameBrowserTests':2,'legacyOutcomeMatches':72},'negativeConditionDisclosed':'All12 conditions are in ResearchReport and analysis. Scoped adoption is not universal noninferiority or endgame uniqueness.','gamePublished':False}
(R/'episode-implementation.json').write_text(json.dumps(j,ensure_ascii=False,indent=2));print('IMPLEMENTATION COMPLETE',a['adoption']['witnesses'])
