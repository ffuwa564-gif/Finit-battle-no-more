"""Restore the approved OP and check privately acquired licensed music plus portable AV cuts."""
from pathlib import Path
import urllib.request,json,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-retrospective';OLD=ROOT/'artifacts/diary-part2'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=OLD/'assets/STILLVEIL-TowerDiary-Opening-v4-1080p.mp4';source.parent.mkdir(parents=True,exist_ok=True);expected='226d8a8f305774156295062bc7d33049657c6a7b270af24ecbf05e695e6d1e6f'
if not source.exists()or sha(source)!=expected:
 data=urllib.request.urlopen('https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/017a0ccca241d1ec6a72b8a73f63188fc1043875/'+source.name,timeout=60).read();assert hashlib.sha256(data).hexdigest()==expected;source.write_bytes(data)
(OLD/'render').mkdir(parents=True,exist_ok=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-vf','fps=30,setsar=1','-af','aresample=48000,apad,atrim=end_sample=1104000,asetpts=N/SR/TB','-frames:v','690','-c:v','libx264','-threads','2','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','pcm_s16le',str(OLD/'render/common-op.mov')],check=True)
m=json.loads((O/'music-source.json').read_text());music=O/'assets/nandeshou-recorder.mp3'
if not music.exists():raise SystemExit('Download KK「なんでしょう？」Track2 (へたっぴリコーダー版) through the official download page, then save it as '+str(music)+' . Page: '+m['page']+' . Music is deliberately excluded from this ZIP; see its license.')
assert sha(music)==m['sha256'],'Music source differs; verify the selected track before rebuilding.'
manifest=json.loads((O/'approved-cuts.json').read_text())
for name,e in manifest.items():assert sha(O/'render'/(name+'-game.mov'))==e['sha256'],name
print('Approved source cuts, OP and licensed music verified. Next: render.py --use-approved-cuts')
