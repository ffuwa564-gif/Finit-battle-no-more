"""Fail-closed readback of the distributed file: changing game frames, native SE and all three voices."""
import sys,json,pathlib,subprocess
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,waveform_lag,sha256,command
O=ROOT/'artifacts/diary-part2-v2';MOV=O/'delivery/STILLVEIL-TowerDiary-Part2-v2.mp4';RATE=12000;FPS=30

def frames(path,start,duration,crop):
 raw=command(['ffmpeg','-v','error','-ss',str(max(0,start)),'-i',str(path),'-t',str(duration),'-an','-vf',f'crop={crop},scale=90:148,fps=30,format=gray','-f','rawvideo','pipe:1']);return np.frombuffer(raw,dtype='u1').reshape(-1,148,90).astype(float)

def audit():
 rows=json.loads((O/'edit-timeline.json').read_text());n=json.loads((O/'timeline-narration.json').read_text());manifest=json.loads((O/'mix-manifest.json').read_text());pcm=audio(MOV,RATE,1)[:,0];preEncoded=audio(O/'final-mix.flac',RATE,1)[:,0]
 def low(x):
  raw=subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar','48000','-ac','2','-i','pipe:0','-ar',str(RATE),'-ac','1','-f','f32le','pipe:1'],input=x.astype('<f4').tobytes(),stdout=subprocess.PIPE,check=True).stdout
  return np.frombuffer(raw,dtype='<f4').copy()
 # Reconstruct the other sources independently. Subtracting a target from the
 # recorded full mix could otherwise manufacture that target even if it was missing.
 count=manifest['samples'];expected=np.zeros((count,2),dtype=np.float32);opAudio=audio(ROOT/'artifacts/diary-part2/render/common-op.mov');expected[:23*48000]+=opAudio[:23*48000]*manifest['masterGain'];music=audio(ROOT/'public/audio/fjordnosundakaze.mp3');length=count-23*48000;expected[23*48000:]+=np.tile(music,(int(np.ceil(length/len(music))),1))[:length]*manifest['musicGain']
 for ch in n['chapters']:
  for l in ch['lines']:
   x=audio(ROOT/l['wav']);at=round(l['start']*48000);size=min(len(x),count-at);expected[at:at+size]+=x[:size]*manifest['voiceGain']
 bg=low(expected);env=np.ones(count,dtype=np.float32)
 for curve in manifest['gameDucking']:
  st=curve['startSample'];en=curve['endSample'];level=curve['relativeGain'];aa=max(0,st-curve['attackSamples']);bb=min(count,en+curve['releaseSamples'])
  if st>aa:env[aa:st]=np.minimum(env[aa:st],np.linspace(1,level,st-aa))
  env[st:en]=np.minimum(env[st:en],level)
  if bb>en:env[en:bb]=np.minimum(env[en:bb],np.linspace(level,1,bb-en))
 sources={}
 for r in rows:
  x=audio(ROOT/r['piece']);at=round(r['start']*48000);size=min(len(x),r['frames']*1600,count-at);x=x[:size]*env[at:at+size,None]*manifest['gameGain'];expected[at:at+size]+=x;sources[r['chapter']]=low(x)
 fullMix=low(expected);del expected,env
 reconstructionRmse=float(np.sqrt(np.mean((fullMix[:len(preEncoded)]-preEncoded)**2)));assert reconstructionRmse<.0001,('Independent source reconstruction differs from pre-encode mix',reconstructionRmse)
 def voice(l):return low(audio(ROOT/l['wav']))
 checks=[];fail=[];pre=lambda x:np.r_[0,np.diff(x)]
 for r in rows:
  ref=sources[r['chapter']];play=r['playDuration'];parts=3 if r['chapter'] in ['first','awake','battle1','battle2','battle3'] else 1
  for part in range(parts):
   win=min(1.8,play/parts*.65);lo=max(.1,play*part/parts+.05);hi=min(play-win-.08,play*(part+1)/parts-win)
   if hi<=lo:raise ValueError('Insufficient real source audio coverage')
   choices=np.arange(lo,hi,.15);u=float(max(choices,key=lambda t:np.mean(pre(ref[round(t*RATE):round((t+win)*RATE)])**2)));rr=ref[round(u*RATE):round((u+win)*RATE)];at=r['start']+u;left=max(0,at-.5);clip=pcm[round(left*RATE):round((at+win+.5)*RATE)];background=bg[round(left*RATE):round(left*RATE)+len(clip)];lag,corr=waveform_lag(pre(rr),pre(clip-background),RATE,0,at-left)
   vs=max(.1,u+.15);vf=frames(ROOT/r['piece'],vs,.7,'486:804:0:54');motion=np.mean(abs(np.diff(vf,axis=0)),axis=(1,2));k=int(np.argmax(motion))+1;local=round((vs+k/FPS)*FPS)/FPS;reference=frames(ROOT/r['piece'],local,.3,'486:804:0:54');anchor=r['start']+local;search=frames(MOV,anchor-.4,1.14,'486:804:310:120');err=np.array([np.mean((search[k:k+len(reference)]-reference)**2)for k in range(len(search)-len(reference)+1)]);best=int(np.argmin(err));vl=best/FPS-.4;rmse=float(np.sqrt(err[best]));passed=abs(lag)<=.08 and abs(vl)<=.08 and corr>=.25 and rmse<=12 and motion[k-1]>.05
   row={'chapter':r['chapter'],'part':part,'time':anchor,'audioLagMs':lag*1000,'audioCorrelation':corr,'videoLagMs':vl*1000,'frameRMSE':rmse,'changingFrameMotion':float(motion[k-1]),'passed':bool(passed)};checks.append(row);print(row,flush=True)
   if not passed:fail.append(row)
 op=ROOT/'artifacts/diary-part2/render/common-op.mov';opRef=audio(op,RATE,1)[:,0];opChecks=[]
 for t in[1.0,10.0,20.0]:
  length=1.5;rr=opRef[round(t*RATE):round((t+length)*RATE)];a=pcm[round((t-.4)*RATE):round((t+length+.4)*RATE)];lag,corr=waveform_lag(rr,a,RATE,0,.4);vf=frames(op,t,.6,'1920:1080:0:0');motion=np.mean(abs(np.diff(vf,axis=0)),axis=(1,2));k=int(np.argmax(motion))+1;anchor=round((t+k/FPS)*FPS)/FPS;ref=frames(op,anchor,.3,'1920:1080:0:0');search=frames(MOV,anchor-.4,1.14,'1920:1080:0:0');errors=np.array([np.mean((search[k:k+len(ref)]-ref)**2)for k in range(len(search)-len(ref)+1)]);best=int(np.argmin(errors));vl=best/FPS-.4;rmse=float(np.sqrt(errors[best]));passed=abs(lag)<=.08 and abs(vl)<=.08 and corr>=.6 and rmse<=12;row={'time':anchor,'audioLagMs':lag*1000,'audioCorrelation':corr,'videoLagMs':vl*1000,'frameRMSE':rmse,'passed':bool(passed)};opChecks.append(row)
  if not passed:fail.append(row)
 voices=[]
 for who in['z','m','t']:
  lines=[l for c in n['chapters']for l in c['lines']if l['speaker']==who]
  for l in[lines[0],lines[len(lines)//2],lines[-1]]:
   ref=voice(l)[:5*RATE];st=l['start'];left=max(0,round((st-.4)*RATE));cand=pcm[left:round((st+len(ref)/RATE+.4)*RATE)];offset=round(st*RATE)-left;target=np.zeros(len(cand));target[offset:offset+len(ref)]=ref*manifest['voiceGain'];_,rawCorr=waveform_lag(ref,cand,RATE,0,offset/RATE);background=fullMix[left:left+len(cand)]-target;lag,corr=waveform_lag(ref,cand-background,RATE,0,offset/RATE);passed=abs(lag)<=.08 and corr>=.6;row={'speaker':who,'time':st,'lagMs':lag*1000,'rawMixCorrelation':rawCorr,'correlation':corr,'isolation':'Other sources reconstructed independently from the original sources, on the unchanged common sample clock.','passed':bool(passed)};voices.append(row)
   if not passed:fail.append(row)
 uch=next(c for c in n['chapters']if c['id']=='ultimate');reactions=[]
 for l in[uch['lines'][2],uch['lines'][3]]:
  ref=voice(l);st=l['start'];left=round((st-.4)*RATE);a=pcm[left:round((st+len(ref)/RATE+.4)*RATE)];_,rawCorr=waveform_lag(ref,a,RATE,0,.4);target=np.zeros(len(a));target[round(.4*RATE):round(.4*RATE)+len(ref)]=ref*manifest['voiceGain'];background=fullMix[left:left+len(a)]-target;lag,corr=waveform_lag(ref,a-background,RATE,0,.4);passed=abs(lag)<=.08 and corr>=.6;row={'speaker':l['speaker'],'text':l['text'],'time':st,'audioLagMs':lag*1000,'rawMixCorrelation':rawCorr,'correlation':corr,'isolation':'Subtract independently reconstructed other sources at the common sample clock. This does not shift the candidate or lower the threshold.','passed':bool(passed)};reactions.append(row)
  if not passed:fail.append(row)
 cues=json.loads((O/'ultimate-cues.json').read_text());edit=next(r for r in rows if r['chapter']=='ultimate');finalFlash=uch['start']+cues['observedWhiteoutFrameTime']-edit['sourceStart'];spokenFinisher=uch['lines'][3]['start']+.06;cue={'observedFinisherMovieTime':finalFlash,'spokenReactionTime':spokenFinisher,'deltaMs':(spokenFinisher-finalFlash)*1000,'passed':abs(spokenFinisher-finalFlash)<=.08}
 if not cue['passed']:fail.append(cue)
 fm=json.loads((ROOT/'artifacts/diary-part2/capture/tower-1.json').read_text());fr=next(r for r in rows if r['chapter']=='fairy');fc=next(c for c in n['chapters']if c['id']=='fairy');nativeFairy=next(x['time']for x in fm['marks']if x['kind']=='battleFairy')-fm['initialOffset'];appearance=fr['start']+fr['leadInFrames']/30+(nativeFairy-fr['sourceStart'])/fr['rate'];fairyCue={'appearanceMovieTime':appearance,'spokenReactionTime':fc['lines'][1]['start'],'deltaMs':(fc['lines'][1]['start']-appearance)*1000,'passed':abs(fc['lines'][1]['start']-appearance)<=.08}
 if not fairyCue['passed']:fail.append(fairyCue)
 enough=len(checks)>=18 and all(sum(x['chapter']==c for x in checks)>=3 for c in['first','awake','battle1','battle2','battle3'])and len(voices)==9
 report={'passed':not fail and enough,'finishedSha256':sha256(MOV),'timelineSha256':sha256(O/'edit-timeline.json'),'narrationSha256':sha256(O/'timeline-narration.json'),'toleranceMs':80,'videoMatch':'Nine consecutive real frames (0.3 seconds), matched without moving the audio candidate; avoids ambiguous duplicate animation holds.','openingAnchors':opChecks,'gameAnchors':checks,'voiceAnchors':voices,'independentMixReconstructionRMSE':reconstructionRmse,'backgroundMethod':'Independent original-source reconstruction; never derive background by subtracting the target from the recorded full mix.','coveragePassed':enough,'fairyReaction':fairyCue,'ultimateReaction':cue,'reactionVoiceAnchors':reactions,'failures':fail,'processingSha256':sha256(__file__)};(O/'delivery/Finished-Movie-Sync.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));assert report['passed'],report
 print('FINISHED MOVIE SYNCHRONIZATION PASSED',flush=True)
if __name__=='__main__':audit()
