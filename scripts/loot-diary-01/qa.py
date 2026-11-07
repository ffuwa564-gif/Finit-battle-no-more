from pathlib import Path
import json,subprocess,hashlib,math
import numpy as np
from scipy.signal import correlate,resample_poly,butter,sosfiltfilt
from scipy.ndimage import uniform_filter1d
O=Path('artifacts/loot-diary-01');t=json.loads((O/'timeline.json').read_text());movie=O/'STILLVEIL-LootDiary-01.mp4';R=O/'render';report={'finishedSha256':hashlib.sha256(movie.read_bytes()).hexdigest(),'toleranceMs':80,'checks':[]}
def cmd(args):return subprocess.check_output(['ffmpeg','-v','error',*map(str,args)])
def sound(p,rate=12000):return np.frombuffer(cmd(['-i',p,'-vn','-f','f32le','-ar',rate,'-ac','1','pipe:1']),dtype='<f4')
def meta(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
def video(p,box=None):
 vf=(f'crop={box[2]}:{box[3]}:{box[0]}:{box[1]},'if box else'')+'scale=94:166,format=gray'
 return np.frombuffer(cmd(['-i',p,'-an','-vf',vf,'-f','rawvideo','pipe:1']),dtype='u1').reshape(-1,166,94)
def lag(ref,x,margin,rate=12000):
 cc=correlate(x,ref,mode='valid',method='fft');cs=np.r_[0,np.cumsum(x*x,dtype=np.float64)];ener=cs[len(ref):]-cs[:-len(ref)];score=cc/np.sqrt(np.maximum(1e-12,ener*np.dot(ref,ref)));i=int(np.argmax(score));return(i-margin)/rate,float(score[i])
probe=meta(movie);v=next(s for s in probe['streams']if s['codec_type']=='video');a=next(s for s in probe['streams']if s['codec_type']=='audio');assert(v['width'],v['height'],v['r_frame_rate'],a['sample_rate'])==(1920,1080,'30/1','48000')
# Full decoding occurs during these frame/PCM reads, rather than only checking the container header.
final=video(movie,[310,66,486,864]);pcm=sound(movie);assert len(final)==t['frames'],(len(final),t['frames']);report['fullDecodePassed']=True
# Every cut: beginning, middle and end, each matched as 9 consecutive actual frames.
for cut in t['gameCuts']:
 ref=video(cut['piece']);motion=np.mean(abs(np.diff(ref.astype(np.float32),axis=0)),axis=(1,2));n=min(len(ref),cut['frames'])
 for third in range(3):
  low=max(0,int(n*third/3));high=min(n-9,max(low+1,int(n*(third+1)/3)-9));local=low+int(np.argmax(motion[low:high+1]));expected=cut['startFrame']+local;candidates=[]
  for off in range(-3,4):
   if expected+off<0:continue
   got=final[expected+off:expected+off+9]
   if len(got)==9:candidates.append((float(np.sqrt(np.mean((got.astype(float)-ref[local:local+9])**2))),off))
  error,off=min(candidates);ok=abs(off/30)<=.08 and error<12 and float(motion[local])>.01
  report['checks'].append({'kind':'video','id':cut['id'],'third':third,'lagMs':off/30*1000,'RMSE':error,'motion':float(motion[local]),'passed':bool(ok)})
 print('VIDEO',cut['id'],flush=True)
# Independently reconstruct speech+music from originals, never subtract from the final to manufacture a reference.
rate=12000;N=math.ceil(t['frames']/30*rate);background=np.zeros(N,np.float32)
for voice in t['voices']:
 x=sound(voice['file']);start=round(voice['startFrame']/30*rate);end=min(N,start+len(x));background[start:end]+=x[:end-start]*.92
music=np.frombuffer(cmd(['-stream_loop','-1','-i','public/audio/tanoshiibouken.mp3','-t',str(N/rate),'-f','f32le','-ar',rate,'-ac','1','pipe:1']),dtype='<f4');background[:min(N,len(music))]+=music[:N]*.045
background*=t['masterGain'];residual=pcm[:N]-background[:len(pcm)]
for cut in t['gameCuts']:
 ref=sound(cut['piece'])*(.27*t['masterGain']);length=min(len(ref),round(cut['frames']/30*rate));window=min(24000,max(2400,length//3));hop=600
 # All major cuts have independent source-sound anchors at early/middle/late points.
 for third in range(3):
  lo=int(length*third/3);hi=min(length-window,int(length*(third+1)/3));starts=list(range(lo,max(lo+1,hi),hop));u=max(starts,key=lambda z:float(np.mean(ref[z:z+window]**2)));reference=ref[u:u+window];start=round(cut['startFrame']/30*rate)+u;margin=2400;x=residual[max(0,start-margin):start+len(reference)+margin];pad=start-max(0,start-margin)
  delta,corr=lag(reference,x,pad);ok=abs(delta)<=.08 and corr>=.25 and float(np.max(abs(reference)))>.001
  report['checks'].append({'kind':'game-audio','id':cut['id'],'third':third,'lagMs':delta*1000,'correlation':corr,'passed':bool(ok)})
for speaker in ['t','z','m']:
 rows=[v for v in t['voices']if v['speaker']==speaker]
 for v in [rows[0],rows[len(rows)//2],rows[-1]]:
  ref=sound(v['file'])[1200:25200];start=round(v['startFrame']/30*rate)+1200;margin=2400;x=pcm[start-margin:start+len(ref)+margin];delta,corr=lag(ref,x,margin);report['checks'].append({'kind':'voice','speaker':speaker,'time':start/rate,'lagMs':delta*1000,'correlation':corr,'passed':bool(abs(delta)<=.08 and corr>=.6)})
# Native-source flash/tone calibration: both streams retain the same Unix epoch.
cal=[]
for raw in sorted((O/'capture').glob('*-raw.mkv')):
 info=meta(raw);vs=next(x for x in info['streams']if x['codec_type']=='video');aus=next(x for x in info['streams']if x['codec_type']=='audio');frames=np.frombuffer(cmd(['-i',raw,'-an','-vf','crop=8:8:4:972,format=gray','-fps_mode','passthrough','-f','rawvideo','pipe:1']),dtype='u1').reshape(-1,64);bright=frames.mean(axis=1)>220;ix=np.flatnonzero(bright & ~np.r_[False,bright[:-1]])
 pts=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',str(raw)],text=True);times=np.array([float(x.split(',')[0])for x in pts.splitlines()if x and x.split(',')[0]])
 x=sound(raw.with_suffix('.sync.wav'),48000);filtered=sosfiltfilt(butter(3,[15500,16500],btype='bandpass',fs=48000,output='sos'),x);energy=np.sqrt(np.maximum(0,uniform_filter1d(filtered**2,size=480)));hot=energy>.008;edges=np.diff(np.r_[False,hot,False].astype(int));ss=np.flatnonzero(edges==1);ee=np.flatnonzero(edges==-1);merged=[]
 for a,b in zip(ss,ee):
  if merged and a-merged[-1][1]<480:merged[-1][1]=b
  else:merged.append([int(a),int(b)])
 starts=np.array([a/48000 for a,b in merged if b-a>2400]);starts=np.r_[starts[:3],starts[-3:]];lags=[]
 for frame,at in zip(ix[2:],starts[2:]):
  d=float(at-times[frame]-.005);lags.append(d*1000)
 ok=len(lags)==4 and max(abs(x)for x in lags)<=80;cal.append({'file':raw.name,'lagMs':lags,'passed':bool(ok),'scope':'stabilized source interval: final start flash and three end flashes; first two capture warm-up flashes excluded'})
 print('CAL',raw.name,lags,flush=True)
report['nativeCalibration']=cal;report['passed']=all(x['passed']for x in report['checks'])and all(x['passed']for x in cal);report['failures']=[x for x in report['checks']if not x['passed']];(O/'Final-QA.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('QA',report['passed'],len(report['checks']),'checks',flush=True)
if not report['passed']:raise SystemExit(1)
