from pathlib import Path
import json,hashlib,zipfile,subprocess,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03';D=O/'delivery';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();movie=O/'render/ThisGirl-03.mp4';digest=sha(movie);assert movie.stat().st_size<100*1024*1024
reports=[('final-independent-qa.json','Final-Media-QA.json'),('freeze-and-voice-qa.json','Freeze-Voice-QA.json'),('final-browser-qa.json','Browser-QA.json'),('visual-qa.json','Visual-QC.json')]
for src,dest in reports:
 p=O/'research'/src;j=json.loads(p.read_text());assert j['passed']and j['movieSha256']==digest,('Stale/failed',p);shutil.copyfile(p,D/dest)
assert json.loads((O/'research/render-input-freeze.json').read_text())['passed'];assert json.loads((O/'research/analysis/main.json').read_text())['passedDataValidation']
for src,dest in [('used-audio-offset-plan.json','Used-Audio-Plan.json'),('render-input-freeze.json','Render-Input-Freeze.json'),('mechanism-tikka.json','Mechanism-Tikka.json')]:shutil.copyfile(O/'research'/src,D/dest)
for p in [ROOT/'docs'/n for n in ['combat-portfolio-research.md','portfolio-optimization-v02.md','endgame-invariance-v03.md']]:shutil.copyfile(p,D/p.name)
inputs=[]
for folder in [ROOT/'scripts/this-girl-03',O/'assets',O/'research',O/'proofs']:
 for p in folder.rglob('*'):
  if p.is_file()and '__pycache__'not in p.parts and p.suffix not in ['.pyc','.mp4','.mov','.mkv','.flac','.wav','.mp3']and p.stat().st_size<15*1024*1024:inputs.append(p)
for id in ['reference','tikka']:
 for suffix in ['.mov','.json','.pcm','-os-raw.mkv.clock.json','-os-raw.mkv.ffmpeg-debug.log']:
  p=O/'capture'/(id+suffix);assert p.is_file();inputs.append(p)
 inputs+=list((O/'capture'/('native-references-'+id)).glob('*.f32'))
inputs +=list((O/'speech').glob('*.query.json'))+list((O/'speech').glob('*.cache.json'))
inputs +=[O/p for p in ['narration.json','editorial.json','render/timeline.json','capture/used-intervals.json','rerecord/story.json','cache-cleanup.json']]
archive=D/'Production-and-Evidence.zip';parts=[];files=sorted(set(inputs))
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=5)as z:
 for p in files:z.write(p,p.relative_to(ROOT))
whole=sha(archive)
with archive.open('rb')as f:
 while data:=f.read(88*1024*1024):
  p=D/f'Production-and-Evidence.zip.part{len(parts)+1:03}';p.write_bytes(data);parts.append({'file':p.name,'bytes':len(data),'sha256':sha(p)})
archive.unlink();manifest={'passed':True,'episode':'THIS-GIRL-003','finishedSha256':digest,'productionCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'sourceLockSha256':sha(O/'research/confirmation-lock.json'),'durationFrames':json.loads((O/'render/timeline.json').read_text())['durationFrames'],'fps':30,'fullMotion':True,'applicationSpeed':1,'nativeSourceIds':['reference','tikka'],'freezeExplanations':4,'researchVerdict':'research; no certification','archive':{'sha256':whole,'parts':parts,'files':len(files),'excluded':'OS raw MKV retained locally; original music, voice models and raw synthesized narration excluded. Canonical PCM MOV and independent graph references included.'},'gameMainOrItchUpdated':False}
(D/'Packaging-Manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
public=[p for p in D.iterdir()if p.is_file()and p.name!='SHA256SUMS.txt'];(D/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.name+'\n'for p in sorted(public)));print('PACKAGED',len(files),'inputs',len(parts),'parts',sum(p['bytes']for p in parts)/1048576,flush=True)
