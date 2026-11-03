"""Measured source calibration. This code is not an executed QA report."""
import sys,json,pathlib,subprocess,wave,shutil
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'tools/media-sync'))
from media_sync import audio,marker_video,marker_audio,warp_audio,remove_clock_tone,sha256
O=ROOT/'artifacts/this-girl-01/capture'
ident=sys.argv[1]
meta=json.loads((O/(ident+'.json')).read_text())
folder=O/('frames-'+ident)
def ff(*args):subprocess.run(['ffmpeg','-v','error','-y',*map(str,args)],check=True)
def wav(path,x):
 with wave.open(str(path),'wb')as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(48000)
  f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
frames=sorted(meta['frames'],key=lambda x:x['time'])
ordered=[]
for f in frames:
 if ordered and f['time']-ordered[-1]['time']<.001:ordered[-1]=f
 else:ordered.append(f)
frames=ordered
assert frames,'No actual screen frames'
initial=frames[0]['time']-meta['audioZero']
listing='ffconcat version 1.0\n'
for i,f in enumerate(frames):
 duration=max(.001,frames[i+1]['time']-f['time'])if i+1<len(frames)else .05
 listing+=f"file '{f['file']}'\nduration {duration:.6f}\n"
listing+=f"file '{frames[-1]['file']}'\n"
(folder/'frames.ffconcat').write_text(listing)
cal=O/(ident+'-calibration.mp4')
ff('-safe',0,'-i',folder/'frames.ffconcat','-vf','fps=30,setsar=1','-c:v','libx264','-threads',2,'-preset','veryfast','-crf',17,'-an',cal)
video_marks,duration=marker_video(cal)
assert len(video_marks)>=7,'Insufficient video calibration pulses'
warmup=float(video_marks[0])
video_marks=video_marks[1:]
raw=audio(O/(ident+'.webm'))
audio_marks=marker_audio(raw,video_marks+initial)
aligned=warp_audio(raw,video_marks,audio_marks,0,duration)
wav(O/(ident+'-cal.wav'),aligned)
calmov=O/(ident+'-calibration.mov')
ff('-i',cal,'-i',O/(ident+'-cal.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','pcm_s16le','-shortest',calmov)
measured_video,_=marker_video(calmov)
measured_video=measured_video[1:]
encoded=audio(calmov)
def sustained_clock(samples,marks):
 x=samples.mean(axis=1);size=240;window=np.hanning(size)
 spectrum=np.abs(np.fft.rfft(x[:len(x)//size*size].reshape(-1,size)*window,axis=1))
 frequencies=np.fft.rfftfreq(size,1/48000);band=spectrum[:,(frequencies>=12000)&(frequencies<=19000)]
 amplitude=2*band.max(axis=1)/window.sum()
 tonality=np.sum(np.sort(band,axis=1)[:,-3:]**2,axis=1)/np.maximum(1e-20,np.sum(band**2,axis=1))
 output=[]
 for i,t in enumerate(marks):
  lower=max(t-.65,(marks[i-1]+t)/2)if i else t-.25
  upper=min(t+.65,(t+marks[i+1])/2)if i+1<len(marks)else t+.25
  lo=max(0,int(lower/.005));hi=min(len(amplitude),int(upper/.005));peak=float(amplitude[lo:hi].max())
  assert peak>=.008,('Missing audio diagnostic',t,peak)
  found=np.flatnonzero((amplitude[lo:hi]>max(.006,peak*.22))&(tonality[lo:hi]>.65))
  groups=np.split(found,np.flatnonzero(np.diff(found)>3)+1)
  groups=[g for g in groups if len(g)>=4]
  assert groups,('Missing sustained audio diagnostic',t)
  output.append((lo+groups[0][0])*.005)
 return np.array(output)
measured_audio=sustained_clock(encoded,measured_video)
residual=(measured_audio-measured_video)*1000
broadband=(marker_audio(encoded,measured_video,frequency=None)-measured_video)*1000
assert len(measured_video)>=6 and float(abs(residual).max())<=80,(measured_video,residual)
calmov.unlink();(O/(ident+'-cal.wav')).unlink()
clean=warp_audio(remove_clock_tone(raw),video_marks,audio_marks,0,duration)
wav(O/(ident+'-clean.wav'),clean)
mov=O/(ident+'.mov')
ff('-i',cal,'-i',O/(ident+'-clean.wav'),'-vf','crop=450:800:0:0','-map','0:v','-map','1:a','-c:v','libx264','-threads',2,'-crf',17,'-preset','veryfast','-c:a','pcm_s16le','-shortest',mov)
for group in ['events','battleEvents','ultimates','marks']:
 for event in meta.get(group,[]):
  event['sourceFrame']=round((event['time']-initial)*30)
meta.update(initialOffset=initial,gameplayWindow=[meta['gameplayStart']-initial,meta['gameplayEnd']-initial],duration=duration,calibration={'firstObservedPulseExcludedBeforeGameplay':warmup,'video':video_marks.tolist(),'audio':audio_marks.tolist(),'encodedResidualMs':residual.tolist(),'broadbandDiagnosticResidualMs':broadband.tolist(),'verificationMethod':'First sustained narrowband pulse >20ms, spectral concentration >0.65, full unshifted 12-19kHz search interval','passed':True},cleanSha256=sha256(mov),processingSha256=sha256(__file__),sourceHashes={'webm':sha256(O/(ident+'.webm'))},syncMethod='Measured start/interior/end16kHz diagnostics; piecewise48kHz clock warp; diagnostic strip cropped and band removed; 30fps PCM MOV')
(O/(ident+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('CALIBRATED',ident,len(video_marks),'anchors',float(abs(residual).max()),'ms',flush=True)
shutil.rmtree(folder)
for path in[cal,O/(ident+'-clean.wav'),O/(ident+'.webm')]:path.unlink()
