"""Restore the pinned own recording/OP inputs; retained speech and new illustration pixels are in Production-Inputs.zip."""
import pathlib,urllib.request,zipfile,json,gzip,subprocess,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2];OLD=ROOT/'artifacts/diary-part2';(OLD/'render').mkdir(parents=True,exist_ok=True)
def fetch(url,path,expected=None):
 if path.exists()and(not expected or hashlib.sha256(path.read_bytes()).hexdigest()==expected):return
 path.parent.mkdir(parents=True,exist_ok=True);urllib.request.urlretrieve(url,path)
 if expected:assert hashlib.sha256(path.read_bytes()).hexdigest()==expected
archive=OLD/'delivery/Recording-Sources.zip';fetch('https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/21e02698d863391716664fc1145366f44d81e526/Recording-Sources.zip',archive,'39d3f793d9c08d4d4421373bee9ee13cc9d0c131eb81985e5691d43efb0b3bc9')
# Extraction is restricted to the known capture prefix.
with zipfile.ZipFile(archive)as z:
 for item in z.infolist():
  assert item.filename.startswith('artifacts/diary-part2/capture/')and'..'not in pathlib.PurePosixPath(item.filename).parts
  z.extract(item,ROOT)
for p in(OLD/'capture').glob('*.json.gz'):p.with_suffix('').write_bytes(gzip.decompress(p.read_bytes()))
op=OLD/'assets/STILLVEIL-TowerDiary-Opening-v4-1080p.mp4';fetch('https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/017a0ccca241d1ec6a72b8a73f63188fc1043875/'+op.name,op,'226d8a8f305774156295062bc7d33049657c6a7b270af24ecbf05e695e6d1e6f')
# Exact preprocessing of Part2's common OP: 23 seconds at 30fps, audio on 48kHz PCM.
subprocess.run(['ffmpeg','-v','error','-y','-i',str(op),'-vf','fps=30,setsar=1','-af','aresample=48000,apad,atrim=end_sample=1104000,asetpts=N/SR/TB','-frames:v','690','-c:v','libx264','-threads','2','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','pcm_s16le',str(OLD/'render/common-op.mov')],check=True)
