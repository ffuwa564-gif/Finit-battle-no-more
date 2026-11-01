"""Fail-closed readback of the distributed file: changing game frames, native SE and all three voices."""
import sys,json,pathlib,subprocess
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,waveform_lag,sha256,command
O=ROOT/'artifacts/diary-part2';MOV=O/'delivery/STILLVEIL-TowerDiary-Part2.mp4';RATE=12000;FPS=30

def frames(path,start,duration,crop):
 raw=command(['ffmpeg','-v','error','-ss',str(max(0,start)),'-i',str(path),'-t',str(duration),'-an','-vf',f'crop={crop},scale=90:148,fps=30,format=gray','-f','rawvideo','pipe:1']);return np.frombuffer(raw,dtype='u1').reshape(-1,148,90).astype(float)

def audit():
 from prepend_op import prepend
 prepend()
 rows=json.loads((O/'edit-timeline.json').read_text());n=json.loads((O/'timeline-narration.json').read_text());manifest=json.loads((O/'mix-manifest.json').read_text());pcm=audio(MOV,RATE,1)[:,0];bg=audio(O/'mix.wav',RATE,1)[:,0];fullMix=bg.copy();sources={r['chapter']:audio(ROOT/r['piece'],RATE,1)[:,0]for r in rows}
 for r in rows:
  x=sources[r['chapter']];at=round(r['start']*RATE);length=min(len(x),round(r['playDuration']*RATE),len(bg)-at);bg[at:at+length]-=x[:length]*manifest['gameGain']
 checks=[];fail=[];pre=lambda x:np.r_[0,np.diff(x)]
 for r in rows:
  ref=sources[r['chapter']];play=r['playDuration'];parts=3 if play>9 else 1
  for part in range(parts):
   win=min(1.8,play/parts*.65);lo=max(.1,play*part/parts+.05);hi=min(play-win-.08,play*(part+1)/parts-win)
   if hi<=lo:raise ValueError('Insufficient real source audio coverage')
   choices=np.arange(lo,hi,.15);u=float(max(choices,key=lambda t:np.mean(pre(ref[round(t*RATE):round((t+win)*RATE)])**2)));rr=ref[round(u*RATE):round((u+win)*RATE)];at=r['start']+u;left=max(0,at-.5);clip=pcm[round(left*RATE):round((at+win+.5)*RATE)];background=bg[round(left*RATE):round(left*RATE)+len(clip)];lag,corr=waveform_lag(pre(rr),pre(clip-background),RATE,0,at-left)
   vs=max(.1,u+.15);vf=frames(ROOT/r['piece'],vs,.7,'450:740:0:60');motion=np.mean(abs(np.diff(vf,axis=0)),axis=(1,2));k=int(np.argmax(motion))+1;local=round((vs+k/FPS)*FPS)/FPS;reference=frames(ROOT/r['piece'],local,1/FPS,'450:740:0:60')[0];anchor=r['start']+local;search=frames(MOV,anchor-.4,.84,'450:740:640:165');err=np.mean((search-reference)**2,axis=(1,2));best=int(np.argmin(err));vl=best/FPS-.4;rmse=float(np.sqrt(err[best]));passed=abs(lag)<=.08 and abs(vl)<=.08 and corr>=.25 and rmse<=12 and motion[k-1]>.05
   row={'chapter':r['chapter'],'part':part,'time':anchor,'audioLagMs':lag*1000,'audioCorrelation':corr,'videoLagMs':vl*1000,'frameRMSE':rmse,'changingFrameMotion':float(motion[k-1]),'passed':bool(passed)};checks.append(row);print(row,flush=True)
   if not passed:fail.append(row)
 op=O/'render/common-op.mov';opRef=audio(op,RATE,1)[:,0];opChecks=[]
 for t in[1.0,10.0,20.0]:
  length=1.5;rr=opRef[round(t*RATE):round((t+length)*RATE)];a=pcm[round((t-.4)*RATE):round((t+length+.4)*RATE)];lag,corr=waveform_lag(rr,a,RATE,0,.4);vf=frames(op,t,.6,'1920:1080:0:0');motion=np.mean(abs(np.diff(vf,axis=0)),axis=(1,2));k=int(np.argmax(motion))+1;anchor=round((t+k/FPS)*FPS)/FPS;ref=frames(op,anchor,1/FPS,'1920:1080:0:0')[0];search=frames(MOV,anchor-.4,.84,'1920:1080:0:0');errors=np.mean((search-ref)**2,axis=(1,2));best=int(np.argmin(errors));vl=best/FPS-.4;rmse=float(np.sqrt(errors[best]));passed=abs(lag)<=.08 and abs(vl)<=.08 and corr>=.6 and rmse<=12;row={'time':anchor,'audioLagMs':lag*1000,'audioCorrelation':corr,'videoLagMs':vl*1000,'frameRMSE':rmse,'passed':bool(passed)};opChecks.append(row)
  if not passed:fail.append(row)
 voices=[]
 for who in['z','m','t']:
  lines=[l for c in n['chapters']for l in c['lines']if l['speaker']==who]
  for l in[lines[0],lines[len(lines)//2],lines[-1]]:
   ref=audio(ROOT/l['wav'],RATE,1)[:5*RATE,0];st=l['start'];left=max(0,st-.4);cand=pcm[round(left*RATE):round((st+len(ref)/RATE+.4)*RATE)];lag,corr=waveform_lag(ref,cand,RATE,0,st-left);passed=abs(lag)<=.08 and corr>=.6;row={'speaker':who,'time':st,'lagMs':lag*1000,'correlation':corr,'passed':bool(passed)};voices.append(row)
   if not passed:fail.append(row)
 uch=next(c for c in n['chapters']if c['id']=='ultimate');reactions=[]
 for l in[uch['lines'][2],uch['lines'][3]]:
  ref=audio(ROOT/l['wav'],RATE,1)[:,0];st=l['start'];left=round((st-.4)*RATE);a=pcm[left:round((st+len(ref)/RATE+.4)*RATE)];_,rawCorr=waveform_lag(ref,a,RATE,0,.4);target=np.zeros(len(a));target[round(.4*RATE):round(.4*RATE)+len(ref)]=ref*manifest['voiceGain'];background=fullMix[left:left+len(a)]-target;lag,corr=waveform_lag(ref,a-background,RATE,0,.4);passed=abs(lag)<=.08 and corr>=.6;row={'speaker':l['speaker'],'text':l['text'],'time':st,'audioLagMs':lag*1000,'rawMixCorrelation':rawCorr,'correlation':corr,'isolation':'Subtract the other pre-encode mix sources at the common sample clock; keep the target voice and AAC residual. This does not shift the candidate or lower the threshold.','passed':bool(passed)};reactions.append(row)
  if not passed:fail.append(row)
 cues=json.loads((O/'ultimate-cues.json').read_text());edit=next(r for r in rows if r['chapter']=='ultimate');finalFlash=uch['start']+cues['observedWhiteoutFrameTime']-edit['sourceStart'];spokenFinisher=uch['lines'][3]['start']+.06;cue={'observedFinisherMovieTime':finalFlash,'spokenReactionTime':spokenFinisher,'deltaMs':(spokenFinisher-finalFlash)*1000,'passed':abs(spokenFinisher-finalFlash)<=.08}
 if not cue['passed']:fail.append(cue)
 enough=len(checks)>=16 and all(sum(x['chapter']==c for x in checks)>=3 for c in['battle1','battle2','battle3'])and len(voices)==9
 report={'passed':not fail and enough,'finishedSha256':sha256(MOV),'timelineSha256':sha256(O/'edit-timeline.json'),'narrationSha256':sha256(O/'timeline-narration.json'),'toleranceMs':80,'openingAnchors':opChecks,'gameAnchors':checks,'voiceAnchors':voices,'coveragePassed':enough,'ultimateReaction':cue,'reactionVoiceAnchors':reactions,'failures':fail,'processingSha256':sha256(__file__)};(O/'delivery/Finished-Movie-Sync.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));assert report['passed'],report
 print('FINISHED MOVIE SYNCHRONIZATION PASSED',flush=True)
if __name__=='__main__':audit()
