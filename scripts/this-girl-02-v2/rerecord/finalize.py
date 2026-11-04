"""Only close an episode after actual implementation and exact-file media QA."""
from pathlib import Path
import hashlib,json,importlib.util,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-v2';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
s=importlib.util.spec_from_file_location('gate',ROOT/'scripts/this-girl-02-v2/verify-implementation.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g);g.verify()
movie=O/'render/ThisGirl-02-v2.mp4';digest=sha(movie);evidence={}
for name in ['final-independent-qa.json','freeze-and-voice-qa.json','final-browser-qa.json','visual-qa.json']:
 p=O/'research'/name;j=json.load(open(p));assert j['passed']and j['movieSha256']==digest,name;evidence[str(p.relative_to(ROOT))]=sha(p)
p=O/'research/render-input-freeze.json';j=json.load(open(p));assert j['passed']and j['finishedSha256']==digest
for n,d in j['inputs'].items():
 p=Path(n);p=p if p.is_absolute()else ROOT/p;assert sha(p)==d,('Frozen input changed after render',n)
evidence['render-input-freeze.json']=sha(O/'research/render-input-freeze.json')
manifest=O/'research/render-manifest.json';m=json.load(open(manifest));assert m['sha256']==digest;m.update(finalized=True,finalQaComplete=True,implementationReceiptSha256=sha(O/'research/episode-implementation.json'),finalQaEvidence=evidence,note='Actual gameplay implementation, locked independent confirmation, newly recorded before/after footage and exact finished-file QA complete. Scoped adoption only; no endgame certification.');manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2))
receipt={'episode':'THIS-GIRL-002-V2','status':'complete','title':'消える盾を、命に縫う。','implementationReceipt':'research/episode-implementation.json','implementationReceiptSha256':sha(O/'research/episode-implementation.json'),'movieSha256':digest,'movie':'ThisGirl-02-v2.mp4','finalQaEvidence':evidence,'gameMainMerged':False,'itchDeployed':False,'scopedAdoption':True,'endgameCertified':False,'priorEpisodePreserved':True,'nextEpisodePreview':'ティッカの改修研究・未検証'}
p=O/'research/episode-completion.json';p.write_text(json.dumps(receipt,ensure_ascii=False,indent=2));shutil.copyfile(p,O/'delivery/Episode-Completion.json');shutil.copyfile(O/'research/episode-implementation.json',O/'delivery/Episode-Implementation.json');shutil.copyfile(manifest,O/'delivery/Render-Manifest.json');print('COMPLETE',digest)
