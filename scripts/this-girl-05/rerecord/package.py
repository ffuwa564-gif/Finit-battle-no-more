from pathlib import Path
import json,hashlib,zipfile,subprocess,shutil,io
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-05';D=O/'delivery';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();movie=O/'render/ThisGirl-05.mp4';digest=sha(movie);assert movie.stat().st_size<100*1024*1024
reports=[('final-independent-qa.json','Final-Media-QA.json'),('freeze-and-voice-qa.json','Freeze-Voice-QA.json'),('final-browser-qa.json','Browser-QA.json'),('visual-qa.json','Visual-QC.json')]
for src,dest in reports:
 p=O/'research'/src;j=json.loads(p.read_text());assert j['passed']and j['movieSha256']==digest,('Stale/failed',p);shutil.copyfile(p,D/dest)
assert json.loads((O/'research/render-input-freeze.json').read_text())['passed'];assert json.loads((O/'research/analysis/main.json').read_text())['passedDataValidation']
for src,dest in [('used-audio-offset-plan.json','Used-Audio-Plan.json'),('render-input-freeze.json','Render-Input-Freeze.json'),('mechanism-lisette.json','Mechanism-Lisette.json')]:shutil.copyfile(O/'research'/src,D/dest)
for p in [ROOT/'docs'/n for n in ['combat-portfolio-research.md','portfolio-optimization-v02.md','endgame-invariance-v03.md']]:shutil.copyfile(p,D/p.name)
inputs=[]
for folder in [ROOT/'scripts/this-girl-05',O/'assets',O/'research',O/'proofs']:
 for p in folder.rglob('*'):
  if p.is_file()and '__pycache__'not in p.parts and p.suffix not in ['.pyc','.mp4','.mov','.mkv','.flac','.wav','.mp3']and p.stat().st_size<15*1024*1024:inputs.append(p)
for id in ['reference','lisette']:
 for suffix in ['.mov','.json','.pcm','-os-raw.mkv.clock.json','-os-raw.mkv.ffmpeg-debug.log']:
  p=O/'capture'/(id+suffix);assert p.is_file();inputs.append(p)
 inputs+=list((O/'capture'/('native-references-'+id)).glob('*.f32'))
inputs +=list((O/'speech').glob('*.query.json'))+list((O/'speech').glob('*.cache.json'))
inputs +=[O/p for p in ['narration.json','editorial.json','render/timeline.json','capture/used-intervals.json','rerecord/story.json','cache-cleanup.json']]
# Stream one valid ZIP into fixed-size parts; never duplicate a full archive on disk.
parts=[];files=sorted(set(inputs));whole_hasher=hashlib.sha256()
class PartsWriter:
 def __init__(self):self.total=0;self.stream=None;self.count=0;self.digest=None;self.path=None
 def tell(self):return self.total
 def flush(self):
  if self.stream:self.stream.flush()
 def finish(self):
  if self.stream:
   self.stream.close();parts.append({'file':self.path.name,'bytes':self.count,'sha256':self.digest.hexdigest()});self.stream=None
 def write(self,data):
  size=len(data);whole_hasher.update(data);self.total+=size;view=memoryview(data)
  while len(view):
   if self.stream is None:
    self.path=D/f'Production-and-Evidence.zip.part{len(parts)+1:03}';assert not self.path.exists();self.stream=self.path.open('wb');self.count=0;self.digest=hashlib.sha256()
   n=min(len(view),88*1024*1024-self.count);chunk=view[:n];self.stream.write(chunk);self.digest.update(chunk);self.count+=n;view=view[n:]
   if self.count==88*1024*1024:self.finish()
  return size
writer=PartsWriter()
with zipfile.ZipFile(writer,'w',zipfile.ZIP_DEFLATED,compresslevel=5)as z:
 for p in files:z.write(p,p.relative_to(ROOT))
writer.finish();whole=whole_hasher.hexdigest()
archive_bytes=b''.join((D/p['file']).read_bytes()for p in parts);assert hashlib.sha256(archive_bytes).hexdigest()==whole
with zipfile.ZipFile(io.BytesIO(archive_bytes))as z:assert z.testzip()is None and len(z.infolist())==len(files)
del archive_bytes
manifest={'passed':True,'episode':'THIS-GIRL-005','finishedSha256':digest,'productionCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'sourceLockSha256':sha(O/'research/confirmation-lock.json'),'durationFrames':json.loads((O/'render/timeline.json').read_text())['durationFrames'],'fps':30,'fullMotion':True,'applicationSpeed':1,'nativeSourceIds':['reference','lisette'],'freezeExplanations':4,'researchVerdict':'research; no certification','archive':{'sha256':whole,'parts':parts,'files':len(files),'excluded':'OS raw MKV retained locally; original music, voice models and raw synthesized narration excluded. Canonical PCM MOV and independent graph references included.'},'gameMainOrItchUpdated':False}
(D/'Packaging-Manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
public=[p for p in D.iterdir()if p.is_file()and p.name!='SHA256SUMS.txt'];(D/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.name+'\n'for p in sorted(public)));print('PACKAGED',len(files),'inputs',len(parts),'parts',sum(p['bytes']for p in parts)/1048576,flush=True)
