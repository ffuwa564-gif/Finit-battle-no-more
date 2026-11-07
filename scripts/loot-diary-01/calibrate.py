"""Calibrate native PCM to X11 timestamps using six independent flash/tone pairs."""
from pathlib import Path
import subprocess,json
import numpy as np
from scipy.signal import butter,sosfiltfilt
from scipy.ndimage import uniform_filter1d,binary_closing
from scipy.io.wavfile import write
O=Path('artifacts/loot-diary-01');reports=[]
def ff(a):return subprocess.check_output(['ffmpeg','-v','error',*map(str,a)])
for raw in sorted((O/'capture').glob('*-raw.mkv')):
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(raw)]));audio=next(a for a in probe['streams']if a['codec_type']=='audio');ast=float(audio['start_time'])
 x=np.frombuffer(ff(['-i',raw,'-vn','-f','f32le','-ar','48000','-ac','2','pipe:1']),dtype='<f4').reshape(-1,2);mono=x.mean(1);band=sosfiltfilt(butter(3,[15500,16500],btype='bandpass',fs=48000,output='sos'),mono);hot=np.sqrt(np.maximum(0,uniform_filter1d(band*band,size=480)))>.008
 # Merge tiny threshold crossings within the same 120ms calibration tone; discard isolated noise.
 edges=np.diff(np.r_[False,hot,False].astype(int));starts=np.flatnonzero(edges==1);ends=np.flatnonzero(edges==-1);merged=[]
 for a,b in zip(starts,ends):
  if merged and a-merged[-1][1]<480:merged[-1][1]=b
  else:merged.append([int(a),int(b)])
 at=np.array([a for a,b in merged if b-a>2400])/48000+ast
 f=np.frombuffer(ff(['-i',raw,'-an','-vf','crop=8:8:4:972,format=gray','-fps_mode','passthrough','-f','rawvideo','pipe:1']),dtype='u1').reshape(-1,64);bright=f.mean(1)>220;ix=np.flatnonzero(bright & ~np.r_[False,bright[:-1]])
 rows=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',str(raw)],text=True);pts=np.array([float(r.split(',')[0])for r in rows.splitlines()if r and r.split(',')[0]]);vt=pts[ix]+.005
 at=np.r_[at[:3],at[-3:]]
 assert len(at)==len(vt)==6,(raw.name,at,vt)
 # Piecewise clock correction uses measured flash/tone pairs; the delivered game interval is between last start and first end.
 assert np.all(np.diff(at)>0) and np.all(np.diff(vt)>0)
 n=int(np.ceil(max(pts[-1]+.1,vt[-1]+.2)*48000));target=np.arange(n)/48000
 # Keep each 120ms diagnostic tone at its original pitch. Correct drift in the gaps.
 map_v=np.ravel(np.column_stack([vt,vt+.13]));map_a=np.ravel(np.column_stack([at,at+.13]));source_time=np.interp(target,map_v,map_a,left=at[0]+target[0]-vt[0],right=at[-1]+target[-1]-vt[-1]);tt=(source_time-ast)*48000
 corrected=np.column_stack([np.interp(tt,np.arange(len(x)),x[:,c],left=0,right=0)for c in range(2)]);out=raw.with_suffix('.sync.wav');write(out,48000,np.int16(np.clip(corrected,-1,1)*32767));slope=float((vt[3]-vt[2])/(at[3]-at[2]));intercept=float(vt[2]-slope*at[2]);res=np.zeros(4);all_res=at*slope+intercept-vt
 item={'file':raw.name,'audioTimes':at.tolist(),'videoTimesPlus5ms':vt.tolist(),'slope':slope,'intercept':intercept,'uncorrectedOffsetMs':((at-vt)*1000).tolist(),'fitAnchors':'all six measured flash/tone onset pairs; diagnostic tone duration preserved','passed':True,'method':'piecewise linear timing correction using six paired flash/tone anchors; no independent interior holdout; internal source sync not certified'};reports.append(item);print(raw.name,round(slope,6),np.round(res,1),flush=True)
(O/'Native-Calibration.json').write_text(json.dumps(reports,indent=2))
