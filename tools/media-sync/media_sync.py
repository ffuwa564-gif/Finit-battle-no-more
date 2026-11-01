"""Measured A/V synchronization and finished-media checks. No tail-length offsets."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
from scipy.signal import butter,sosfiltfilt,fftconvolve
SR=48000

def sha256(path):
 h=hashlib.sha256()
 with open(path,'rb')as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def command(args):return subprocess.check_output(args)
def audio(path,rate=SR,channels=2):
 x=command(['ffmpeg','-v','error','-i',str(path),'-vn','-af','aresample=async=1:first_pts=0','-ar',str(rate),'-ac',str(channels),'-f','f32le','pipe:1'])
 return np.frombuffer(x,dtype='<f4').reshape(-1,channels).copy()
def marker_video(path):
 frames=json.loads(command(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(path)]))['frames']
 t=np.array([float(f['best_effort_timestamp_time'])for f in frames]);gray=np.frombuffer(command(['ffmpeg','-v','error','-i',str(path),'-an','-vf','crop=128:16:0:800,scale=1:1,format=gray','-vsync','0','-f','rawvideo','pipe:1']),dtype='u1');assert len(t)==len(gray)
 on=t[np.flatnonzero((gray>160)&np.r_[True,gray[:-1]<=160])]
 return on,t[-1]+1/30

def tone_amplitude(samples,frequency=16000,rate=SR):
 x=samples.mean(axis=1)if samples.ndim==2 else samples;n=240 if rate==SR else max(24,round(rate*.005));w=np.hanning(n);k=w*np.exp(-2j*np.pi*(frequency or 16000)*np.arange(n)/rate)
 z=x[:len(x)//n*n].reshape(-1,n)
 if frequency is None:
  spectrum=np.abs(np.fft.rfft(z*w,axis=1));freq=np.fft.rfftfreq(n,1/rate);return 2*spectrum[:,(freq>=12000)&(freq<=19000)].max(axis=1)/np.sum(w),n/rate
 return 2*np.abs(z@k)/np.sum(w),n/rate

def marker_audio(samples,video_marks,frequency=16000):
 amp,step=tone_amplitude(samples,frequency);out=[]
 for index,v in enumerate(video_marks):
  lower=max(v-.65,(video_marks[index-1]+v)/2)if index else v-.25
  upper=min(v+.65,(v+video_marks[index+1])/2)if index+1<len(video_marks)else v+.25
  lo=max(0,int(lower/step));hi=min(len(amp),int(upper/step));local=amp[lo:hi];peak=float(local.max())
  if peak<.008:raise ValueError(f'Missing audio clock marker near {v:.3f}s; peak={peak}')
  found=np.flatnonzero(local>max(.006,peak*.22));groups=np.split(found,np.flatnonzero(np.diff(found)>3)+1);g=max(groups,key=lambda g:float(np.sum(local[g])))
  out.append((lo+g[0])*step)
 return np.array(out)

def linear_extrapolate(x,xp,fp):
 y=np.interp(x,xp,fp);lo=x<xp[0];hi=x>xp[-1];y[lo]=fp[0]+(x[lo]-xp[0])*(fp[1]-fp[0])/(xp[1]-xp[0]);y[hi]=fp[-1]+(x[hi]-xp[-1])*(fp[-1]-fp[-2])/(xp[-1]-xp[-2]);return y

def warp_audio(samples,video_marks,audio_marks,start,duration):
 if len(video_marks)!=len(audio_marks)or len(video_marks)<6:raise ValueError('Need start, interior and end calibration markers')
 if np.any(np.diff(audio_marks)<=0)or np.any(np.diff(video_marks)<=0):raise ValueError('Clock anchors are not monotonic')
 count=round(duration*SR);target=start+np.arange(count)/SR;lookup=linear_extrapolate(target,video_marks,audio_marks)*SR;result=np.empty((count,samples.shape[1]),np.float32);base=np.arange(len(samples))
 for ch in range(samples.shape[1]):result[:,ch]=np.interp(lookup,base,samples[:,ch],left=0,right=0)
 return result

def remove_clock_tone(samples):
 return sosfiltfilt(butter(8,[15200,16800],btype='bandstop',fs=SR,output='sos'),samples,axis=0).astype(np.float32)

def waveform_lag(reference,candidate,rate,nominal,pad):
 """Locate an actual reference waveform in a noisy encoded finished-movie window."""
 ref=reference.astype(float);x=candidate.astype(float);ref-=ref.mean();x-=x.mean();corr=fftconvolve(x,ref[::-1],mode='valid');energy=fftconvolve(x*x,np.ones(len(ref)),mode='valid');norm=corr/np.sqrt(np.maximum(1e-20,energy*np.sum(ref*ref)));best=int(np.argmax(norm));return (best/rate-pad),float(norm[best])
