from pathlib import Path
import json,hashlib,zipfile,subprocess,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';D=O/'delivery';R=O/'rerecord';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
movie=O/'render/ThisGirl-01.mp4';digest=sha(movie);assert movie.stat().st_size<100*1024*1024
for p in [O/'research/final-independent-qa.json',O/'research/freeze-and-voice-qa.json',O/'research/final-browser-qa.json',R/'Visual-QC.json']:
 j=json.loads(p.read_text());assert j['passed'] and j['movieSha256']==digest,('Stale/failed',p)
assert json.loads((O/'research/used-audio-offset-plan.json').read_text())['passed'];assert not json.loads((O/'capture/sakuya-full.json').read_text())['calibration']['passed'];assert json.loads((R/'engine-invariance.json').read_text())['passed']
shutil.copy2(movie,D/'ThisGirl-01-v112.mp4')
for source,name in [(O/'research/final-independent-qa.json','Final-Media-QA.json'),(O/'research/freeze-and-voice-qa.json','Freeze-Voice-QA.json'),(O/'research/final-browser-qa.json','Browser-QA.json'),(R/'Visual-QC.json','Visual-QC.json'),(O/'research/used-audio-offset-plan.json','Used-Audio-Plan.json'),(R/'engine-invariance.json','Engine-Invariance.json'),(O/'research/global-calibration-failure-sakuya-full.json','Raw-Global-Failure.json'),(O/'research/reports/judgment.json','Character-Judgment.json')]:shutil.copy2(source,D/name)
inputs=[]
for folder in [ROOT/'scripts/this-girl-01',O/'assets',O/'research',O/'proofs',O/'baseline/src']:
 for p in folder.rglob('*'):
  if p.is_file()and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.mp4','.mov','.mkv','.flac','.wav','.mp3'] and p.stat().st_size<15*1024*1024:inputs.append(p)
for ident in ['reference-full','sakuya-full']:
 for suffix in ['.mov','.json','.pcm','-os-raw.mkv.clock.json','-os-raw.mkv.ffmpeg-debug.log']:
  p=O/'capture'/(ident+suffix);assert p.is_file();inputs.append(p)
 inputs+=list((O/'capture'/('native-references-'+ident)).glob('*.f32'))
inputs+=[O/p for p in ['narration.json','editorial.json','render/timeline.json','capture/used-intervals.json']]
for folder in [R/'reference',R/'interval-v1']:
 inputs +=[p for p in folder.rglob('*')if p.is_file()and p.suffix in ['.md','.json','.txt','.log','.gz']]
inputs +=[R/p for p in ['story.json','capture-source-lock.json','engine-invariance.json','discarded-regenerable-inputs.json']]
archive=D/'Production-and-Evidence-v112.zip';chunk=88*1024*1024;parts=[];files=sorted(set(inputs))
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=5)as z:
 for p in files:z.write(p,p.relative_to(ROOT))
whole=sha(archive)
with archive.open('rb')as f:
 while data:=f.read(chunk):
  p=D/f'Production-and-Evidence-v112.zip.part{len(parts)+1:03}';p.write_bytes(data);parts.append({'file':p.name,'bytes':len(data),'sha256':sha(p)})
archive.unlink()
manifest={'revision':'v112-freeze-explanation-01','passed':True,'finishedSha256':digest,'recordedGameCommit':json.loads((R/'engine-invariance.json').read_text())['gameCommit'],'productionCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'durationFrames':json.loads((O/'render/timeline.json').read_text())['durationFrames'],'fps':30,'fullMotion':True,'applicationSpeed':1,'nativeSourceIds':['reference-full','sakuya-full'],'freezeExplanations':4,'statisticalResults':'Original locked256-seed study retained; no new certification','archive':{'sha256':whole,'parts':parts,'files':len(files),'excluded':'OS raw MKV kept locally; original music, raw voice and VOICEVOX model not redistributed. Canonical30fps PCM MOV and independent graph references included.'},'rawGlobalFailureRetained':True,'gameMainOrItchUpdated':False};(D/'Packaging-Manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
public=[p for p in D.iterdir()if p.is_file()and p.name!='SHA256SUMS.txt'and p.name!='ThisGirl-01.mp4'];(D/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.name+'\n'for p in sorted(public)));print('PACKAGED',len(files),'inputs',len(parts),'parts',round(sum(p['bytes']for p in parts)/1048576,1),'MiB',flush=True)
