"""Check every utterance and every frozen inset on the exact distribution MP4."""
from pathlib import Path
import json,sys,hashlib,subprocess
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03';sys.path.insert(0,str(ROOT/'scripts/this-girl-03/editor'));import mixer
sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import waveform_lag
movie=O/'render/ThisGirl-03.mp4';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();T=json.loads((O/'render/timeline.json').read_text());C=mixer.reconstruct_components(T);raw=mixer.audio(movie);total=C['voice']+C['music']+C['game'];voices=[];pauses=[];voice_background=total-C['voice']
assert len(raw)>=len(total)
for v in T['voice']:
 a=v['startFrame']*1600;b=a+round(float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(ROOT/v['file'])]))['format']['duration'])*48000);b=min(b,len(total));count=min(48000,b-a);choices=range(a,b-count+1,4000);at=max(choices,key=lambda x:float(np.mean(C['voice'][x:x+count]**2)));pad=min(12000,at,len(total)-at-count);ref=C['voice'][at:at+count].mean(axis=1);bg=voice_background;candidate=raw[at-pad:at+count+pad].mean(axis=1)-bg[at-pad:at+count+pad].mean(axis=1);lag,corr=waveform_lag(ref,candidate,48000,at/48000,pad/48000);voices.append({'id':v['lineId'],'lagSeconds':lag,'correlation':corr,'passed':abs(lag)<=.08 and corr>=.8})
def still(frame):
 data=subprocess.check_output(['ffmpeg','-v','error','-threads','1','-ss',str(frame/30),'-i',str(movie),'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-']);return np.frombuffer(data,np.uint8).reshape(1080,1920,3)
def roi(x,rect):
 a,b,w,h=rect;im=Image.fromarray(x[b:b+h,a:a+w]);return np.array(im.resize((120,120),Image.Resampling.BOX),dtype=float)
for p in T['pages']:
 if p['spec']['kind']!='battle-pause':continue
 plate=O/'render/plates'/(p['id']+'.png');expected=np.array(Image.open(plate).convert('RGB'));side=json.loads(Path(str(plate)+'.json').read_text());assert sha(ROOT/p['spec']['freeze']['file'])==p['spec']['freeze']['sha256'];assert side['sourceFrame']==p['spec']['freeze']['sourceFrame']
 x,y,w,h=side['insetOutput'];regions={'native':[40,28,576,1024],'inset':[x+5,y+5,w-10,h-10]};checks=[]
 for local in [18,p['durationFrames']//2,p['durationFrames']-18]:
  actual=still(p['startFrame']+local)
  for name,rect in regions.items():
   err=float(np.mean(abs(roi(actual,rect)-roi(expected,rect))));checks.append({'frame':p['startFrame']+local,'region':name,'meanAbsoluteError':err,'passed':err<7})
 a=(p['startFrame']+30)*1600;b=a+24000;assert not np.any(C['game'][p['startFrame']*1600:(p['startFrame']+p['durationFrames'])*1600]);rms=float(np.sqrt(np.mean((raw[a:b]-C['voice'][a:b]-C['music'][a:b])**2)));pauses.append({'id':p['id'],'actualSourceFrame':side['sourceFrame'],'sourceMovieSha256':side['sourceSha256'],'checks':checks,'noContinuingGameAudioResidualRms':rms,'passed':all(c['passed']for c in checks)and rms<.01})
plan=json.loads((O/'research/used-audio-offset-plan.json').read_text());assert plan['passed']
global_checks={id:json.loads((O/f'capture/{id}.json').read_text())['calibration']['passed']for id in ['reference','tikka']};assert all(global_checks.values())
report={'passed':all(v['passed']for v in voices)and len(pauses)==4 and all(p['passed']for p in pauses),'movieSha256':sha(movie),'qaCodeSha256':sha(__file__),'voiceChecks':voices,'pauseChecks':pauses,'usedIntervalsPlanSha256':sha(O/'research/used-audio-offset-plan.json'),'rawGlobalCalibration':global_checks,'scope':'All actual utterances and four freeze pages at early/middle/late positions; actual source/inset binding and no continuing game audio. Separate finished-file native sync and browser tests remain required.'}
(O/'research/freeze-and-voice-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('EXTRA QA',report['passed'],len(voices),len(pauses),flush=True);assert report['passed']
