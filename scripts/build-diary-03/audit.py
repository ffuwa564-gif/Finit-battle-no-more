"""Fail-closed readback of the distributed file: changing game frames, native SE and all three voices."""
import sys,json,pathlib,subprocess
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,waveform_lag,sha256,command
O=ROOT/'artifacts/build-diary-03';MOV=O/'delivery/STILLVEIL-BuildResearchDiary-03.mp4';RATE=12000;FPS=30

# Same readback/resampling contract as media_sync.audio; bound this process only.
def audio(path,rate=48000,channels=2):
 raw=command(['ffmpeg','-threads','2','-filter_threads','1','-v','error','-i',str(path),'-vn','-af','aresample=async=1:first_pts=0','-ar',str(rate),'-ac',str(channels),'-f','f32le','pipe:1'])
 return np.frombuffer(raw,dtype='<f4').reshape(-1,channels).copy()

def frames(path,start,duration,crop):
 raw=command(['ffmpeg','-threads','2','-filter_threads','1','-v','error','-ss',str(max(0,start)),'-i',str(path),'-t',str(duration),'-an','-vf',f'crop={crop},scale=90:148,fps=30,format=gray','-f','rawvideo','pipe:1']);return np.frombuffer(raw,dtype='u1').reshape(-1,148,90).astype(float)

def independent_music(n,count,plan):
 # Intentionally does not import rendering code or use the recorded mix.
 assert plan['source']=='public/audio/fjordnosundakaze.mp3' and plan['offsetSeconds']==0
 assert plan['loopCrossfadeSeconds']==.25 and plan['fadeInSeconds']==.6 and plan['fadeOutSeconds']==1
 source=audio(ROOT/plan['source']);cross=12000;body=np.zeros((count+len(source),2),np.float32);position=0
 while position<count:
  chunk=source.copy()
  if position:chunk[:cross]*=np.linspace(0,1,cross)[:,None]
  chunk[-cross:]*=np.linspace(1,0,cross)[:,None];body[position:position+len(chunk)]+=chunk;position+=len(source)-cross
 body=body[:count];level=np.ones(count,np.float32)
 for chapter in n['chapters']:
  for line in chapter['lines']:
   a=round(line['start']*48000);b=round(line['end']*48000);left=max(0,a-2400);right=min(count,b+9600)
   if a>left:level[left:a]=np.minimum(level[left:a],np.linspace(1,.75,a-left))
   level[a:b]=np.minimum(level[a:b],.75)
   if right>b:level[b:right]=np.minimum(level[b:right],np.linspace(.75,1,right-b))
 opening=n['commonOpening'];assert plan['mutedOpening']==opening
 a=round(opening['start']*48000);b=a+round(opening['duration']*48000);level[a:b]=0
 left=max(0,a-cross);right=min(count,b+cross)
 level[left:a]*=np.linspace(1,0,a-left);level[b:right]*=np.linspace(0,1,right-b)
 body*=level[:,None];body[:28800]*=np.linspace(0,1,28800)[:,None];body[-48000:]*=np.linspace(1,0,48000)[:,None]
 return body

def audit():
 rows=json.loads((O/'edit-timeline.json').read_text());n=json.loads((O/'timeline-narration.json').read_text());manifest=json.loads((O/'mix-manifest.json').read_text());pcm=audio(MOV,RATE,1)[:,0];preEncoded=audio(O/'render/final-mix.flac',RATE,1)[:,0]
 def low(x):
  raw=subprocess.run(['ffmpeg','-threads','2','-filter_threads','1','-v','error','-f','f32le','-ar','48000','-ac','2','-i','pipe:0','-ar',str(RATE),'-ac','1','-f','f32le','pipe:1'],input=x.astype('<f4').tobytes(),stdout=subprocess.PIPE,check=True).stdout
  return np.frombuffer(raw,dtype='<f4').copy()
 # Reconstruct the other sources independently. Subtracting a target from the
 # recorded full mix could otherwise manufacture that target even if it was missing.
 assert sha256(O/'render/final-mix.flac')==manifest['mixSha256']
 assert sha256(ROOT/'scripts/build-diary-03/render.py')==manifest['processingSha256'], 'Renderer changed after mix'
 for wav,hash in manifest['voiceInputs'].items():assert sha256(ROOT/wav)==hash,('Changed voice input',wav)
 from qa_contract import contract
 plan,coverage=contract(n,rows,sha256)
 count=manifest['samples'];assert count==round(n['duration']*48000)
 expected=np.zeros((count,2),dtype=np.float32);op=n['commonOpening'];opPath=ROOT/op['source'];opAudio=audio(opPath);opAt=round(op['start']*48000);opN=round(op['duration']*48000)
 assert op['duration']==25.6 and op['frames']==768
 expected[opAt:opAt+opN]+=opAudio[:opN]*manifest['masterGain']
 assert sha256(ROOT/manifest['musicPlan']['source'])==manifest['musicPlan']['sourceSha256']
 music=independent_music(n,count,manifest['musicPlan']);musicReference=low(music)*manifest['musicGain'];expected+=music*manifest['musicGain'];del music
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
  assert sha256(ROOT/r['piece'])==r['pieceHash'],('Changed game piece',r['chapter'])
  x=audio(ROOT/r['piece']);at=round(r['start']*48000);size=min(len(x),r['frames']*1600,count-at);x=x[:size]*env[at:at+size,None]*manifest['gameGain'];expected[at:at+size]+=x;sources[r['chapter']]=low(x)
 fullMix=low(expected);del expected,env
 reconstructionRmse=float(np.sqrt(np.mean((fullMix[:len(preEncoded)]-preEncoded)**2)));assert reconstructionRmse<.0001,('Independent source reconstruction differs from pre-encode mix',reconstructionRmse)
 def voice(l):return low(audio(ROOT/l['wav']))
 checks=[];fail=[];pre=lambda x:np.r_[0,np.diff(x)]
 for r in rows:
  ref=sources[r['chapter']];play=r['playDuration'];parts=3
  for part in range(parts):
   win=min(1.8,play/parts*.65);lo=max(.1,play*part/parts+.05);hi=min(play-win-.08,play*(part+1)/parts-win)
   if hi<=lo:raise ValueError('Insufficient real source audio coverage')
   choices=np.arange(lo,hi,.15);u=float(max(choices,key=lambda t:np.mean(pre(ref[round(t*RATE):round((t+win)*RATE)])**2)));rr=ref[round(u*RATE):round((u+win)*RATE)];at=r['start']+u;left=max(0,at-.5);clip=pcm[round(left*RATE):round((at+win+.5)*RATE)];background=bg[round(left*RATE):round(left*RATE)+len(clip)];lag,corr=waveform_lag(pre(rr),pre(clip-background),RATE,0,at-left)
   # Video evidence is selected independently from the SE peak. LAB updates
   # are discrete; an audio-peak+offset window could miss every visible update.
   # Enumerate this entire third at the native final frame rate and retain four
   # preceding frames so the 9-frame reference straddles a real transition.
   vstart=max(0,round(play*part/parts*FPS));vend=min(r['frames'],round(play*(part+1)/parts*FPS))
   vf=frames(ROOT/r['piece'],vstart/FPS,(vend-vstart)/FPS,'486:804:0:54')
   motion=np.mean(abs(np.diff(vf,axis=0)),axis=(1,2));eligible=np.arange(4,len(vf)-4)
   assert len(eligible),'Insufficient source video coverage'
   k=int(max(eligible,key=lambda idx:motion[idx-1]));local=(vstart+k-4)/FPS
   reference=frames(ROOT/r['piece'],local,.3,'486:804:0:54');anchor=r['start']+local
   search=frames(MOV,anchor-.4,1.14,'486:804:310:120');err=np.array([np.mean((search[j:j+len(reference)]-reference)**2)for j in range(len(search)-len(reference)+1)]);best=int(np.argmin(err));vl=best/FPS-.4;rmse=float(np.sqrt(err[best]));passed=abs(lag)<=.08 and abs(vl)<=.08 and corr>=.25 and rmse<=12 and motion[k-1]>.05
   row={'chapter':r['chapter'],'part':part,'time':anchor,'audioReferenceTime':at,'videoReferenceTime':anchor,'sourceTransitionTime':(vstart+k)/FPS,'audioLagMs':lag*1000,'audioCorrelation':corr,'videoLagMs':vl*1000,'frameRMSE':rmse,'changingFrameMotion':float(motion[k-1]),'passed':bool(passed)};checks.append(row);print(row,flush=True)
   if not passed:fail.append(row)
 op=opPath;opOffset=n['commonOpening']['start'];opRef=audio(op,RATE,1)[:,0]*manifest['masterGain'];opChecks=[]
 for t in[1.0,12.0,23.0]:
  length=1.5;rr=opRef[round(t*RATE):round((t+length)*RATE)];a=pcm[round((opOffset+t-.4)*RATE):round((opOffset+t+length+.4)*RATE)];lag,corr=waveform_lag(rr,a,RATE,0,.4);vf=frames(op,t,.6,'1920:1080:0:0');motion=np.mean(abs(np.diff(vf,axis=0)),axis=(1,2));k=int(np.argmax(motion))+1;anchor=round((t+k/FPS)*FPS)/FPS;ref=frames(op,anchor,.3,'1920:1080:0:0');search=frames(MOV,opOffset+anchor-.4,1.14,'1920:1080:0:0');errors=np.array([np.mean((search[k:k+len(ref)]-ref)**2)for k in range(len(search)-len(ref)+1)]);best=int(np.argmin(errors));vl=best/FPS-.4;rmse=float(np.sqrt(errors[best]));passed=abs(lag)<=.08 and abs(vl)<=.08 and corr>=.6 and rmse<=12;row={'time':opOffset+anchor,'audioLagMs':lag*1000,'audioCorrelation':corr,'videoLagMs':vl*1000,'frameRMSE':rmse,'passed':bool(passed)};opChecks.append(row)
  if not passed:fail.append(row)
 voices=[]
 for who in['z','m','t']:
  lines=[l for c in n['chapters']for l in c['lines']if l['speaker']==who]
  assert len(lines)>=3,('Voice coverage missing',who)
  for l in[lines[0],lines[len(lines)//2],lines[-1]]:
   ref=voice(l)[:5*RATE];st=l['start'];left=max(0,round((st-.4)*RATE));cand=pcm[left:round((st+len(ref)/RATE+.4)*RATE)];offset=round(st*RATE)-left;target=np.zeros(len(cand));target[offset:offset+len(ref)]=ref*manifest['voiceGain'];_,rawCorr=waveform_lag(ref,cand,RATE,0,offset/RATE);background=fullMix[left:left+len(cand)]-target;lag,corr=waveform_lag(ref,cand-background,RATE,0,offset/RATE);passed=abs(lag)<=.08 and corr>=.6;row={'speaker':who,'time':st,'lagMs':lag*1000,'rawMixCorrelation':rawCorr,'correlation':corr,'isolation':'Other sources reconstructed independently from the original sources, on the unchanged common sample clock.','passed':bool(passed)};voices.append(row)
   if not passed:fail.append(row)
 musicChecks=[]
 musicTimes=[33.0,n['duration']/2,n['duration']-8]
 musicTimes=[t if not opOffset-.5<t<opOffset+25.6+.5 else opOffset+28 for t in musicTimes]
 for st in musicTimes:
  length=2;left=round((st-.4)*RATE);end=round((st+length+.4)*RATE);ref=musicReference[round(st*RATE):round((st+length)*RATE)];a=pcm[left:end];target=np.zeros(len(a));target[round(.4*RATE):round(.4*RATE)+len(ref)]=ref;background=fullMix[left:left+len(a)]-target;lag,corr=waveform_lag(ref,a-background,RATE,0,.4);rms=float(np.sqrt(np.mean(ref**2)));passed=abs(lag)<=.08 and corr>=.6 and rms>.001;row={'time':st,'audioLagMs':lag*1000,'correlation':corr,'referenceRms':rms,'passed':bool(passed)};musicChecks.append(row)
  if not passed:fail.append(row)

 enough=len(rows)==coverage['gameCutCount'] and len(opChecks)==coverage['openingAnchors'] and len(checks)==coverage['gameCutCount']*coverage['gameAnchorsPerCut'] and all(sum(x['chapter']==r['chapter'] for x in checks)==3 for r in rows)and len(voices)==9 and len(musicChecks)==3
 report={'passed':not fail and enough,'finishedSha256':sha256(MOV),'timelineSha256':sha256(O/'edit-timeline.json'),'narrationSha256':sha256(O/'timeline-narration.json'),'toleranceMs':80,'videoMatch':'Nine consecutive real frames (0.3 seconds) straddling the strongest actual visible transition in each third, independently selected from the audio peak; audio candidate is never moved to manufacture a match.','openingAnchors':opChecks,'gameAnchors':checks,'voiceAnchors':voices,'independentMixReconstructionRMSE':reconstructionRmse,'backgroundMethod':'Independent original-source reconstruction; never derive background by subtracting the target from the recorded full mix.','coveragePassed':enough,'requiredCoverage':coverage,'renderPlanSha256':sha256(O/'render-plan.json'),'fjordMusicAnchors':musicChecks,'failures':fail,'sourceOpeningSha256':sha256(opPath),'sourceMixSha256':sha256(O/'render/final-mix.flac'),'processingSha256':sha256(__file__)};(O/'delivery/Finished-Movie-Sync.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));assert report['passed'],report
 print('FINISHED MOVIE SYNCHRONIZATION PASSED',flush=True)
if __name__=='__main__':audit()
