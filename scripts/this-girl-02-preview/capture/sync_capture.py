"""Measured source calibration. This code is not an executed QA report."""
import sys,json,pathlib,subprocess,wave,shutil
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'tools/media-sync'))
from media_sync import audio,marker_video,marker_audio,warp_audio,remove_clock_tone,sha256
import media_sync as _media_sync
def bounded_command(args):
 if args[0]=='ffmpeg':args=[args[0],'-threads','2','-filter_threads','1',*args[1:]]
 return subprocess.check_output(args)
_media_sync.command=bounded_command
O=ROOT/'artifacts/this-girl-02-preview/capture'
ident=sys.argv[1]
meta=json.loads((O/(ident+'.json')).read_text())
folder=O/('frames-'+ident)
def ff(*args):subprocess.run(['ffmpeg','-v','error','-y','-threads','2','-filter_threads','1',*map(str,args)],check=True)
def wav(path,x):
 with wave.open(str(path),'wb')as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(48000)
  f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
frames=sorted(meta['frames'],key=lambda x:x['time'])
if meta.get('captureSurface',{}).get('frameClock'):
 from PIL import Image
 delays=[]
 for frame in frames:
  pixels=np.asarray(Image.open(folder/frame['file']).convert('L'))
  assert pixels.shape==(848,450),('Unexpected capture dimensions',pixels.shape)
  values=[float(np.mean(pixels[830:842,i*8+2:i*8+6]))for i in range(56)]
  assert all(v<50 or v>205 for v in values),'Ambiguous in-frame clock cell'
  bits=''.join('1'if v>128 else'0'for v in values);assert bits[:6]=='101011','Missing in-frame clock prefix'
  epoch_ms=int(bits[6:48],2);checksum=int(bits[48:],2);n=epoch_ms;expected=0
  while n:expected^=n&255;n>>=8
  assert checksum==expected,'Corrupt in-frame clock checksum'
  protocol=frame.get('protocolTime',frame['time']);decoded=epoch_ms/1000
  assert -.05<=protocol-decoded<=.9,('Implausible clock/capture gap',protocol-decoded)
  frame['protocolTime']=protocol;frame['time']=decoded;delays.append((protocol-decoded)*1000)
 assert all(frames[i]['time']<=frames[i+1]['time']for i in range(len(frames)-1)),'In-frame clock reversed'
 meta['frameClockVerification']={'passed':True,'frames':len(frames),'checksum':'XOR of timestamp bytes,6-bit prefix','timestamp':'UTC milliseconds encoded by RAF in same captured image; CDP delivery metadata is diagnostic only','protocolMinusContentMs':{'min':float(min(delays)),'median':float(np.median(delays)),'max':float(max(delays))}}

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
pcm=O/(ident+'.pcm')
if meta.get('audioCapture',{}).get('kind')=='audio-worklet-pcm16':
 assert meta['audioCapture']['continuous']and meta['audioCapture']['sampleRate']in[44100,48000]
 raw=np.fromfile(pcm,dtype='<i2').reshape(-1,2).astype(np.float32)/32767
 assert len(raw)==meta['audioCapture']['totalFrames']
 if meta['audioCapture']['sampleRate']==44100:
  from scipy.signal import resample_poly
  raw=resample_poly(raw,160,147,axis=0)
else:raw=audio(O/(ident+'.webm'))
worklet=meta.get('audioCapture',{}).get('kind')=='audio-worklet-pcm16'
if worklet:
 ac=meta['audioCapture'];start_context=ac['startContextFrame']/ac['sampleRate'];dense=[]
 for c in ac['chunks']:
  if c['observedWallTime']>frames[-1]['time']+1/30:continue
  # The tap is graph output before the hardware queue. Use the concurrently
  # observed graph clock; outputTimestamp remains an independent latency diagnostic.
  v=c['observedWallTime']-frames[0]['time'];a=c['observedContextTime']-start_context
  if not dense or(v>dense[-1][0]and a>dense[-1][1]):dense.append((v,a))
 dense_video=np.array([x[0]for x in dense]);dense_audio=np.array([x[1]for x in dense]);assert len(dense)>=6
 from media_sync import linear_extrapolate
 raw_search=linear_extrapolate(video_marks,dense_video,dense_audio)
 audio_marks=sustained_clock(raw,raw_search)
 aligned=warp_audio(raw,dense_video,dense_audio,0,duration)
else:
 audio_marks=sustained_clock(raw,video_marks+initial)
 aligned=warp_audio(raw,video_marks,audio_marks,0,duration)
wav(O/(ident+'-cal.wav'),aligned)
calmov=O/(ident+'-calibration.mov')
ff('-i',cal,'-i',O/(ident+'-cal.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','pcm_s16le','-shortest',calmov)
measured_video,_=marker_video(calmov)
measured_video=measured_video[1:]
encoded=audio(calmov)
measured_audio=sustained_clock(encoded,measured_video)
residual=(measured_audio-measured_video)*1000
broadband=(marker_audio(encoded,measured_video,frequency=None)-measured_video)*1000
assert len(measured_video)>=6 and float(abs(residual).max())<=80,(measured_video,residual)
calmov.unlink();(O/(ident+'-cal.wav')).unlink()
clean=warp_audio(remove_clock_tone(raw),dense_video if worklet else video_marks,dense_audio if worklet else audio_marks,0,duration)
wav(O/(ident+'-clean.wav'),clean)
mov=O/(ident+'.mov')
ff('-i',cal,'-i',O/(ident+'-clean.wav'),'-vf','crop=450:800:0:0','-map','0:v','-map','1:a','-c:v','libx264','-threads',2,'-crf',17,'-preset','veryfast','-c:a','pcm_s16le','-shortest',mov)
for group in ['events','battleEvents','ultimates','marks']:
 for event in meta.get(group,[]):
  event['sourceFrame']=round((event['time']-initial)*30)
meta.update(initialOffset=initial,gameplayWindow=[meta['gameplayStart']-initial,meta['gameplayEnd']-initial],duration=duration,calibration={'clockDomain':'graph-pre-hardware-output'if worklet else'legacy-recorder','clockMapping':'Dense concurrently observed graph currentTime/wallTime; tap precedes hardware queue, outputTimestamp retained as latency diagnostic; independent of diagnostic positions'if worklet else'Measured diagnostic anchor fit','denseClockObservationCount':len(dense)if worklet else 0,'denseClockObservationsDiscarded':len(meta['audioCapture']['chunks'])-len(dense)if worklet else 0,'firstObservedPulseExcludedBeforeGameplay':warmup,'video':video_marks.tolist(),'audio':audio_marks.tolist(),'encodedResidualMs':residual.tolist(),'broadbandDiagnosticResidualMs':broadband.tolist(),'rawMarkerMethod':'First sustained tone onset; rejects largest-energy-segment substitution across MediaRecorder timestamp gaps','verificationMethod':'First sustained narrowband pulse >20ms, spectral concentration >0.65, full unshifted 12-19kHz search interval','passed':True},cleanSha256=sha256(mov),processingSha256=sha256(__file__),sourceHashes=({'pcm':sha256(pcm)}if pcm.exists()else{'webm':sha256(O/(ident+'.webm'))}),syncMethod=('Continuous native AudioWorklet PCM, dense pre-hardware graph clock mapping independent of16kHz verification pulses, explicit44.1kHz to48kHz resample if needed, diagnostic strip/band removed;30fps PCM MOV'if worklet else'Measured start/interior/end16kHz diagnostics; piecewise48kHz clock warp; diagnostic strip cropped and band removed;30fps PCM MOV'))
(O/(ident+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('CALIBRATED',ident,len(video_marks),'anchors',float(abs(residual).max()),'ms',flush=True)
shutil.rmtree(folder)
for path in[cal,O/(ident+'-clean.wav')]:path.unlink()
# Raw native PCM and per-buffer references are retained for independent source-clock QA.
if(O/(ident+'.webm')).exists():(O/(ident+'.webm')).unlink()
