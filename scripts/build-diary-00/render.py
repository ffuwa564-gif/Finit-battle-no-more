from pathlib import Path
import json,subprocess,hashlib
B=Path(__file__).resolve().parent;T=json.loads((B/'timeline.json').read_text());M=json.loads((B/'soundtrack-manifest.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert M['timelineSha256']==sha(B/'timeline.json')and M['soundtrackSha256']==sha(B/'soundtrack.flac')
frozen={str(p):sha(p)for p in [B/'timeline.json',B/'pictures.ffconcat',B/'soundtrack.flac',B/'soundtrack-manifest.json',Path(__file__)]}
(B/'render-inputs.json').write_text(json.dumps(frozen,indent=2))
# One concat picture clock; one previously composed 48kHz soundtrack. Two exports.
cmd=['ffmpeg','-hide_banner','-y','-threads','1','-f','concat','-safe','0','-i',str(B/'pictures.ffconcat'),'-i',str(B/'soundtrack.flac'),'-filter_complex','[0:v]fps=30,format=yuv420p,split=2[full][small];[small]scale=1280:720:flags=lanczos[hd]']
for stream,label,level in [('full','1080p','4.0'),('hd','720p','3.1')]:
 cmd+=['-map',f'[{stream}]','-map','1:a:0','-c:v','libx264','-profile:v','baseline','-level:v',level,'-preset','fast','-tune','stillimage','-crf',('28' if label=='1080p' else '24'),'-g','240','-pix_fmt','yuv420p','-threads','3','-c:a','aac','-b:a','112k','-ar','48000','-ac','2','-t',str(T['duration']),'-movflags','+faststart',str(B/f'STILLVEIL-BuildResearchDiary-00-{label}.mp4')]
with (B/'ffmpeg.log').open('w')as log:subprocess.run(cmd,stdout=log,stderr=log,check=True)
assert all(sha(Path(p))==value for p,value in frozen.items()),'Render inputs changed during export'
print('Export completed',T['duration'],flush=True)
