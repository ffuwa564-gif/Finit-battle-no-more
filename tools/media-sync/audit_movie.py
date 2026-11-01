"""Read back the actual distributed movie and compare it with muxed edit sources."""
from pathlib import Path
import json,sys,subprocess
import numpy as np
from scipy.signal import butter,sosfiltfilt,resample_poly
from media_sync import audio,command,waveform_lag,sha256
RATE=12000;FPS=30;W=94;H=166

def frames(path,start,duration,crop):
 filters=f'crop={crop},scale={W}:{H},fps=30,format=gray'
 raw=command(['ffmpeg','-v','error','-ss',str(max(0,start)),'-i',str(path),'-t',str(duration),'-an','-vf',filters,'-f','rawvideo','pipe:1'])
 return np.frombuffer(raw,dtype='u1').reshape(-1,H,W).astype(np.float32)

def remove_background(candidate,background):
 gain=float(np.dot(candidate,background)/max(1e-15,np.dot(background,background)))
 return candidate-gain*background,gain

def audit(movie,timeline,narration,out):
 movie=Path(movie);rows=json.loads(Path(timeline).read_text());n=json.loads(Path(narration).read_text());pcm=audio(movie,RATE,1)[:,0];background=audio(Path(timeline).parent/'edit/background.wav',RATE,1)[:,0];pre=lambda x:np.r_[0,np.diff(x)]
 results=[];failures=[]
 chosen=[r for r in rows if r['item']['kind']=='video'and r['item']['name']in['win','baseline','farm-1','farm-50','farm-100','attempt-one']and r['item'].get('side')]
 for r in chosen:
  piece=Path(r['piece']);ref=audio(piece,RATE,1)[:,0];play=min(r['duration'],(r['sourceEnd']-r['sourceStart'])/r['rate']);window=min(2.0,play/4)
  if window<.8:continue
  thirds=3 if r['item']['name']=='win'else 1
  for part in range(thirds):
   lo=max(.12,play*part/thirds+.05);hi=min(play-window-.05,play*(part+1)/thirds-window*.15)
   if hi<=lo:continue
   candidates=np.arange(lo,hi,.10);energies=[float(np.mean(ref[round(t*RATE):round((t+window)*RATE)]**2))for t in candidates];u=float(candidates[int(np.argmax(energies))]);rr=ref[round(u*RATE):round((u+window)*RATE)];globalTime=r['start']+u;pad=1.0;left=round((globalTime-pad)*RATE);a=pcm[left:round((globalTime+window+pad)*RATE)]
   bg=background[left:left+len(a)];residual,bgGain=remove_background(pre(a),pre(bg));lag,corr=waveform_lag(pre(rr),residual,RATE,0,pad)
   # Choose a changing real frame near the same sound, then locate it in the final pane.
   vstart=max(.05,u+.25);vf=frames(piece,vstart,.7,'281:500:0:0');motion=np.mean(abs(np.diff(vf,axis=0)),axis=(1,2));k=int(np.argmax(motion))+1;localFrame=round((vstart+k/FPS)*FPS)/FPS
   reference=frames(piece,localFrame,1/FPS,'281:500:0:0')[0];anchor=r['start']+localFrame;search=frames(movie,anchor-.4,.84,'281:500:260:92');errors=np.mean((search-reference)**2,axis=(1,2));best=int(np.argmin(errors));vlag=best/FPS-.4;rmse=float(np.sqrt(errors[best]));observedMotion=float(motion[k-1]);passed=abs(lag)<=.08 and abs(vlag)<=.08 and corr>=.25 and rmse<=10 and observedMotion>=.05
   entry={'section':r['section'],'shot':r['item']['name'],'part':part,'finishedTime':anchor,'audioLagMs':lag*1000,'audioCorrelation':corr,'backgroundFitGain':bgGain,'videoLagMs':vlag*1000,'frameRMSE':rmse,'referenceMotion':observedMotion,'pieceSha256':r['pieceHash'],'passed':bool(passed)};results.append(entry);print(entry,flush=True)
   if not passed:failures.append(entry)
 # Voice waveform checks are a separate requirement from gameplay sound.
 voices=[]
 for ident,li in [('intro',0),('farm',4),('opening',2),('finish',7),('ending',3),('ending',8)]:
  section=next(s for s in n['sections']if s['id']==ident);l=section['lines'][li];ref=audio(l['path'],RATE,1)[:min(round(l['duration']*RATE),6*RATE),0];st=l['start'];left=max(0,st-.4);clip=pcm[round(left*RATE):round((st+len(ref)/RATE+.4)*RATE)];lag,corr=waveform_lag(ref,clip,RATE,0,st-left);passed=abs(lag)<=.08 and corr>.6;entry={'section':ident,'time':st,'lagMs':lag*1000,'correlation':corr,'passed':bool(passed)};voices.append(entry)
  if not passed:failures.append(entry)
 required={(r['section'],r['part'])for r in results if r['shot']=='win'};enough=all((s,p)in required for s in['opening','middle','finish']for p in range(3))and len(results)>=12
 passed=not failures and enough and all(v['passed']for v in voices)
 report={'passed':bool(passed),'finishedFile':str(movie),'finishedSha256':sha256(movie),'backgroundSha256':sha256(Path(timeline).parent/'edit/background.wav'),'timelineSha256':sha256(timeline),'narrationSha256':sha256(narration),'toleranceMs':80,'minimumAudioCorrelation':.25,'gameAnchors':results,'voiceAnchors':voices,'coveragePassed':enough,'failures':failures,'rule':'This report reads the actual finished movie, not only a calibration fixture or browser metadata.'};Path(out).write_text(json.dumps(report,ensure_ascii=False,indent=2));return report

if __name__=='__main__':
 result=audit(*sys.argv[1:5]);print('FINISHED MOVIE SYNC',result['passed']);sys.exit(0 if result['passed']else 1)
