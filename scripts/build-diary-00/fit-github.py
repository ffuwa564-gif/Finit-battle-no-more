from pathlib import Path
import subprocess,json,hashlib
B=Path(__file__).resolve().parent;p=B/'STILLVEIL-BuildResearchDiary-00-1080p.mp4';duration=json.loads((B/'timeline.json').read_text())['duration'];before=p.stat().st_size
# Losslessly retain all video frames. Encode from the original single mix, not from an AAC transcode.
if before>=100*1024*1024:
 target=B/'1080p-fitted.mp4'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-i',str(B/'soundtrack.flac'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','80k','-ar','48000','-ac','2','-t',str(duration),'-movflags','+faststart',str(target)],check=True)
 assert target.stat().st_size<100*1024*1024
 target.replace(p)
(B/'Size-Adjustment.json').write_text(json.dumps({'beforeBytes':before,'afterBytes':p.stat().st_size,'nativeVideoResolution':'1920x1080','losslessVideoRemux':before>=100*1024*1024,'audioSource':'original single 48kHz mix','finalSha256':hashlib.sha256(p.read_bytes()).hexdigest()},indent=2))
print('GitHub-compatible 1080p bytes',p.stat().st_size,flush=True)
