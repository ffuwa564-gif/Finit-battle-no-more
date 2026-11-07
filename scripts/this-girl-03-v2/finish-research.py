from pathlib import Path
import json,hashlib,subprocess,re
ROOT=Path(__file__).resolve().parents[2];R=ROOT/'artifacts/this-girl-03-v2/research';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();a=json.load(open(R/'analysis/main.json'));assert a['adoption']['passed'];assert '2 passed' in (R/'research-browser.log').read_text();count=int(re.search(r'Tests\s+(\d+) passed',(R/'full-public-tests.log').read_text()).group(1));assert count==763
for p in ['research-build.log','public-build.log']:
 s=(R/p).read_text();assert 'built in' in s and 'Content gate passed' in s and 'UI contract gate passed' in s and 'Locale check passed' in s
files=['analysis/main.json','confirmation-lock.json','reports/adoption.json','reports/judgment.json','reports/ResearchReport.md','baseline-equivalence.json','full-public-tests.log','research-browser.log','research-build.log','public-build.log','recording-selection.json','code-pr.json']
evidence={str((R/f).relative_to(ROOT)):sha(R/f)for f in files}
for id in ['reference','tikka']:
 p=R.parent/f'proofs/{id}.json.gz';evidence[str(p.relative_to(ROOT))]=sha(p)
j={'episode':'THIS-GIRL-003-V2','status':'implementation-complete','adoptionScope':'scoped-not-endgame-certified','baseEngineCommit':'1fb9868','implementationCommit':'de639b1','policyCommit':'96d2e00','freezeCommit':'2894940','codePR':json.load(open(R/'code-pr.json'))['url'],'changedEngineFiles':subprocess.check_output(['git','diff','--name-only','1fb9868','de639b1','--','src'],cwd=ROOT).decode().splitlines(),'evidence':evidence,'verification':{'publicUnitTests':count,'newMechanicTestsIncluded':13,'gameBrowserTests':2,'legacyOutcomeMatches':72},'negativeConditionDisclosed':'All12 conditions are in ResearchReport and analysis. Scoped adoption is not universal noninferiority or endgame uniqueness.','gamePublished':False}
(R/'episode-implementation.json').write_text(json.dumps(j,ensure_ascii=False,indent=2));print('IMPLEMENTATION COMPLETE',a['adoption']['witnesses'])
