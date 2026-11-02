"""Restore public common OP and lossless capture containers after unpacking both archives at repository root."""
from pathlib import Path
import urllib.request,json,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part3';OLD=ROOT/'artifacts/diary-part2'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=OLD/'assets/STILLVEIL-TowerDiary-Opening-v4-1080p.mp4';source.parent.mkdir(parents=True,exist_ok=True);expected='226d8a8f305774156295062bc7d33049657c6a7b270af24ecbf05e695e6d1e6f'
if not source.exists()or sha(source)!=expected:
 data=urllib.request.urlopen('https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/017a0ccca241d1ec6a72b8a73f63188fc1043875/'+source.name,timeout=60).read();assert hashlib.sha256(data).hexdigest()==expected;source.write_bytes(data)
(OLD/'render').mkdir(parents=True,exist_ok=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-vf','fps=30,setsar=1','-af','aresample=48000,apad,atrim=end_sample=1104000,asetpts=N/SR/TB','-frames:v','690','-c:v','libx264','-threads','2','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','pcm_s16le',str(OLD/'render/common-op.mov')],check=True)
manifest=json.loads((ROOT/'Recording-Sources.json').read_text())
for id,e in manifest.items():
 src=O/'capture'/(id+'.mkv');assert sha(src)==e['losslessFlacMkvSha256'];subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-c:v','copy','-c:a','pcm_s16le',str(O/'capture'/(id+'.mov'))],check=True)
assert(ROOT/'public/audio/fjordnosundakaze.mp3').exists(),'Acquire the licensed Amacha track from the official source; see Credits.md.'
for name in ['render','delivery','research']:(O/name).mkdir(exist_ok=True)
print('Common OP and five lossless capture containers restored. Existing narration is bundled; render.py regenerates conditions/hash-bound AV cuts. Native continuity can be rechecked with verify.ts.')
