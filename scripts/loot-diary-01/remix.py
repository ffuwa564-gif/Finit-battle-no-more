"""Rebuild audio after independent native-clock calibration; retain the exact approved video frames."""
from pathlib import Path
import subprocess,json,math,hashlib,wave
import numpy as np
O=Path('artifacts/loot-diary-01');R=O/'render';SR=48000
p=json.loads((O/'timeline.json').read_text());gamecuts=p['gameCuts'];voices=p['voices'];timeline=p['chapters'];cursor=p['frames'];chapterfiles=[R/'op.mp4']+[R/(ch['id']+'.mp4')for ch in timeline]
def run(args):subprocess.run(['ffmpeg','-v','error','-y','-filter_complex_threads','1','-filter_threads','1',*map(str,args)],check=True)
def wt(p):
 with wave.open(str(p))as a:
  x=np.frombuffer(a.readframes(a.getnframes()),dtype='<i2').astype(np.float32)/32768
  return np.repeat(x[:,None],2,axis=1)if a.getnchannels()==1 else x.reshape(-1,2)
for cut in gamecuts:
 src=Path(cut['source']).with_suffix('.sync.wav');start=cut['sourceStartPTS'];length=cut['frames'];old=Path(cut['piece']);new=old.with_name(old.stem+'-sync.mov');run(['-i',old,'-i',src,'-filter_complex',f'[1:a]atrim=start={start}:end={start+length/30},asetpts=PTS-{start}/TB,aresample=48000:first_pts=0,lowpass=f=14000,apad,atrim=end_sample={length*1600}[a]','-map','0:v','-map','[a]','-c:v','copy','-c:a','pcm_s16le',new]);cut['piece']=str(new)
source=Path('scripts/loot-diary-01/edit.py').read_text();tail=source.split('# One common 48kHz sample clock; no separate AAC intermediates.')[1].split("(O/'Subtitles.srt')")[0];exec(tail)
p['gameCuts']=gamecuts;p['masterGain']=master;p['finalSha256']=hashlib.sha256(final.read_bytes()).hexdigest();p['nativeCalibration']='Native-Calibration.json';(O/'timeline.json').write_text(json.dumps(p,ensure_ascii=False,indent=2));print('REMIXED',cursor/30,p['finalSha256'])
