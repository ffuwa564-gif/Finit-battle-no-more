"""One common OS capture window; no dense warping or independent stream zeroing."""
from pathlib import Path
import sys,json,subprocess,hashlib,wave
import numpy as np
ROOT=Path(__file__).resolve().parents[3];sys.path.insert(0,str(ROOT/'tools/media-sync'))
from media_sync import marker_video,remove_clock_tone
O=ROOT/'artifacts/this-girl-02';C=O/'capture';ident=sys.argv[1];mp=C/(ident+'.json');m=json.loads(mp.read_text());raw=C/(ident+'-os-raw.mkv')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def ff(*args):subprocess.run(['ffmpeg','-v','error','-y','-threads','2','-filter_threads','1',*map(str,args)],check=True)
def packets(kind):
 r=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams',kind,'-show_packets','-show_entries','packet=pts_time,duration_time,size','-of','json',str(raw)]))
 return r['packets']
def tone_onsets(samples,marks):
 x=samples.mean(axis=1);size=240;window=np.hanning(size);spectrum=np.abs(np.fft.rfft(x[:len(x)//size*size].reshape(-1,size)*window,axis=1));freq=np.fft.rfftfreq(size,1/48000);band=spectrum[:,(freq>=15200)&(freq<=16800)];amp=2*band.max(axis=1)/window.sum();tone=np.sum(np.sort(band,axis=1)[:,-3:]**2,axis=1)/np.maximum(1e-20,np.sum(band**2,axis=1));out=[]
 for i,t in enumerate(marks):
  lower=max(t-.65,(marks[i-1]+t)/2)if i else t-.25;upper=min(t+.65,(t+marks[i+1])/2)if i+1<len(marks)else t+.25;lo=max(0,int(lower/.005));hi=min(len(amp),int(upper/.005));peak=float(amp[lo:hi].max());assert peak>=.008,('Missing OS audio marker',t,peak)
  hits=np.flatnonzero((amp[lo:hi]>max(.006,peak*.22))&(tone[lo:hi]>.65));groups=np.split(hits,np.flatnonzero(np.diff(hits)>3)+1);groups=[g for g in groups if len(g)>=4];assert groups,('No sustained OS marker',t);out.append((lo+groups[0][0])*.005)
 return np.array(out)
v=packets('v:0');a=packets('a:0');vstart=float(v[0]['pts_time']);vend=float(v[-1]['pts_time'])+float(v[-1].get('duration_time',1/30));astart=float(a[0]['pts_time']);assert 0<=vstart<15 and -1<=astart<15,('Common epoch unexpectedly normalized',vstart,astart)
count=round((vend-vstart)*30);assert count>0;duration=count/30;ns=count*1600;camera_epoch=m['camera']['wallEpoch']+vstart
cal=C/(ident+'-native-calibration.mov')
# The Pulse device has a fixed physical48kHz sample clock. Packet PTS is
# retained for the first offset and independent drift/gap diagnostics, never
# followed with interior waveform compensation.
a_pts=np.array([float(p['pts_time'])for p in a]);a_durations=np.array([int(p['size'])/4/48000 for p in a]);gaps=np.diff(a_pts)-a_durations[:-1];span=a_pts[-1]+a_durations[-1]-a_pts[0]
assert max(abs(gaps))<=.1 and abs(span-sum(a_durations))<=.08,('Acquisition packet clock has real gaps/drift',max(abs(gaps)),span-sum(a_durations))
input_pcm=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(raw),'-vn','-c:a','pcm_s16le','-ar','48000','-ac','2','-f','s16le','-']),'<i2').reshape(-1,2)
initial_offset=int(np.floor((astart-vstart)*48000));source_start=max(0,-initial_offset);dest_start=max(0,initial_offset);copied=min(len(input_pcm)-source_start,ns-dest_start);assert copied>0
cal_pcm=np.zeros((ns,2),dtype='<i2');cal_pcm[dest_start:dest_start+copied]=input_pcm[source_start:source_start+copied]
boundary_wave=C/(ident+'-common-boundary.wav')
with wave.open(str(boundary_wave),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(48000);f.writeframes(cal_pcm.tobytes())
boundary={'inputFrames':len(input_pcm),'sampleRate':48000,'initialOffsetSamples':initial_offset,'leadingZeroSamples':dest_start,'leadingTrimSamples':source_start,'copiedFrames':copied,'trailingZeroSamples':ns-dest_start-copied,'trailingTrimSamples':len(input_pcm)-source_start-copied,'rawCopiedSha256':hashlib.sha256(input_pcm[source_start:source_start+copied].tobytes()).hexdigest(),'placedCopiedSha256':hashlib.sha256(cal_pcm[dest_start:dest_start+copied].tobytes()).hexdigest(),'interiorSamplesInsertedOrDropped':0,'tempoMultiplier':1,'packetMaxAbsGapSeconds':float(max(abs(gaps))),'packetDurationMinusSampleSeconds':float(span-sum(a_durations))}
# One shared physical baseline: video vstart; audio retains astart-vstart then
# its unmodified hardware sample sequence. There is no async resampler.
ff('-copyts','-i',raw,'-i',boundary_wave,'-map','0:v:0','-map','1:a:0','-vf',f'setpts=PTS-({vstart})/TB,fps=30:start_time=0,setsar=1,tpad=stop_mode=clone:stop_duration=1','-frames:v',count,'-fps_mode','cfr','-r',30,'-c:v','libx264','-threads',2,'-preset','veryfast','-crf',17,'-pix_fmt','yuv420p','-c:a','pcm_s16le',cal)
check_pcm=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(cal),'-vn','-c:a','pcm_s16le','-f','s16le','-']),'<i2').reshape(-1,2);assert np.array_equal(check_pcm,cal_pcm),'Canonical PCM bytes changed'
boundary_wave.unlink()
video_marks,_=marker_video(cal);labels=m['markers'];assert len(video_marks)==len(labels)>=7,('Calibration count mismatch',len(video_marks),len(labels));assert all(any(x['label'].startswith(group+'-')for x in labels)for group in['start','interior','end']);warmup=None
samples=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(cal),'-vn','-ar','48000','-ac','2','-f','f32le','-']),'<f4').reshape(-1,2).copy();assert len(samples)==ns
observed=tone_onsets(samples,video_marks);residual=(observed-video_marks)*1000;assert len(video_marks)>=6 and max(abs(residual))<=80,('OS common-clock calibration failed',residual)
clean=remove_clock_tone(samples);wav=C/(ident+'-os-clean.wav')
with wave.open(str(wav),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(48000);f.writeframes((np.clip(clean,-1,1)*32767).astype('<i2').tobytes())
movie=C/(ident+'.mov');ff('-i',cal,'-i',wav,'-map','0:v:0','-map','1:a:0','-vf','crop=450:800:0:0,setsar=1','-c:v','libx264','-threads',2,'-preset','veryfast','-crf',17,'-pix_fmt','yuv420p','-c:a','pcm_s16le','-frames:v',count,movie)
for group in['events','battleEvents','ultimates','marks']:
 for e in m.get(group,[]):e['sourceFrame']=round((e['time']+m['audioZero']-camera_epoch)*30)
m.update(cameraEpochUnixSeconds=camera_epoch,initialOffset=camera_epoch-m['audioZero'],gameplayWindow=[m['gameplayStart']+m['audioZero']-camera_epoch,m['gameplayEnd']+m['audioZero']-camera_epoch],frames=[{'sourceFrame':i,'time':camera_epoch+i/30}for i in range(count)],duration=duration,calibration={'passed':True,'video':video_marks.tolist(),'audio':observed.tolist(),'encodedResidualMs':residual.tolist(),'firstObservedPulseExcludedBeforeGameplay':warmup,'markerCoverage':{'expected':len(labels),'observed':len(video_marks),'allLabelsMatched':True,'labels':[{'label':x['label'],'videoSeconds':float(v),'audioSeconds':float(a),'residualMs':float(r)}for x,v,a,r in zip(labels,video_marks,observed,residual)],'excludedMarkers':[]},'clockDomain':'native OS X11 and PulseAudio shared Unix demuxer timestamps','verificationMethod':'Independent first sustained16kHz carrier versus actual OS white-frame onset. No marker offset fit, no dense time warp.','boundaryAudio':boundary,'commonWindow':{'videoStartPts':vstart,'audioStartPts':astart,'cameraWallEpoch':m['camera']['wallEpoch'],'firstVideoWallTime':camera_epoch,'frames':count,'samples':ns},'audioPolicy':'Unchanged physical48kHz PCM sample clock; initial common-PTS boundary padding/trimming only, no interior compensation or tempo change.'},sourceHashes={'osRaw':sha(raw),'rawClock':sha(Path(str(raw)+'.clock.json')),'ffmpegDebug':sha(C/Path(m['camera']['log']).name),'graphPcm':sha(C/(ident+'.pcm'))},cleanSha256=sha(movie),processingSha256=sha(__file__),syncMethod='Native X11/Pulse OS common-clock record; common video/audio window, CFR30/48k; diagnostic strip crop and16k notch only; no audio time stretch',frameClockUsedForTiming=False)
mp.write_text(json.dumps(m,ensure_ascii=False,indent=2));print('NATIVE OS CALIBRATED',ident,count,float(max(abs(residual))),'ms',flush=True)
# Original OS movie and graph/reference bytes intentionally retained for reproducibility.
wav.unlink()
