"""Single48kHz linear mix, with source-only component reconstruction for final QA.

No component is reconstructed from the finished movie. Raw licensed music/voice
waves remain local; only the completed video and regeneration code are delivered.
"""
from pathlib import Path
import argparse,hashlib,json,subprocess
import numpy as np
from scipy.ndimage import uniform_filter1d
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-05'
SR=48000;FPS=30;SPF=1600

def sha(path):
 h=hashlib.sha256()
 with open(path,'rb')as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()
def canonical(timeline):return hashlib.sha256(json.dumps(timeline,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def path(value):return ROOT/value
def audio(file):
 raw=subprocess.check_output(['ffmpeg','-v','error','-threads','1','-i',str(file),'-vn','-ar',str(SR),'-ac','2','-f','f32le','-'])
 return np.frombuffer(raw,'<f4').reshape(-1,2).copy()

def _components(timeline,frozen=None):
 assert timeline['finalized']and timeline['episode']=='THIS-GIRL-005'
 n=timeline['durationFrames']*SPF
 assert n>0
 voice=np.zeros((n,2),np.float32);game=np.zeros_like(voice);music=np.zeros_like(voice);occupied=np.zeros(n,np.float32)
 voices=[];games=[];hashes={};seen=set()
 frozen_voices={v['lineId']:v for v in frozen['voice']}if frozen else{}
 for line in timeline['voice']:
  ident=line['lineId'];assert ident not in seen;seen.add(ident)
  p=path(line['file']);hashes[line['file']]=sha(p);x=audio(p)
  if frozen:
   old=frozen_voices[ident];assert old['sourceSha256']==hashes[line['file']];gain=old['mixGain']
  else:
   voiced=np.max(abs(x),axis=1)>.012
   assert np.any(voiced),('Missing narration',ident)
   rms=float(np.sqrt(np.mean(x[voiced]**2)));assert rms>.001
   gain=min(1.7,max(.65,.12/rms));gain=min(gain,.76/max(.0001,float(abs(x).max())))
  a=line['startFrame']*SPF;b=a+len(x)
  assert 0<=a<b<=n,'Narration may not be truncated'
  voice[a:b]+=x*gain
  occupied[max(0,a-round(.12*SR)):min(n,b+round(.18*SR))]=1
  voices.append({**line,'mixGain':gain,'sampleStart':a,'sampleEnd':b,'sourceSha256':hashes[line['file']]})
 duck=np.clip(uniform_filter1d(occupied,size=round(.12*SR),mode='constant'),0,1)
 for cut in timeline['gameCuts']:
  p=path(cut['file']);hashes[cut['file']]=sha(p);x=audio(p)
  offset=cut.get('audioSourceOffsetSamples',0);assert isinstance(offset,int),'One fixed integer sample offset per shot'
  if offset or cut.get('audioCalibrationEvidence'):
   evidence=cut['audioCalibrationEvidence'];ep=path(evidence['file']);hashes[evidence['file']]=sha(ep)
   assert hashes[evidence['file']]==evidence['sha256'],'Audio calibration evidence changed'
   assert json.loads(ep.read_text())['passed']is True,'Used-source synchronization has not passed'
  video_a=cut['sourceStartFrame']*SPF;video_b=cut['sourceEndFrame']*SPF
  # Positive reads later original audio, advancing it relative to the video.
  # Every sample retains its original order/spacing; no per-cue warp is used.
  a=video_a+offset;b=video_b+offset;start=cut['startFrame']*SPF;count=video_b-video_a
  assert 0<=a<b<=len(x)and start+count<=n,'Invalid common-clock game cut'
  envelope=.24-(.24-.14)*duck[start:start+count]
  game[start:start+count]+=x[a:b]*envelope[:,None]
  games.append({**cut,'baseGain':.24,'duringVoiceGain':.14,'sampleStart':start,'sampleEnd':start+count,'sourceVideoSampleStart':video_a,'sourceVideoSampleEnd':video_b,'audioSourceOffsetSamples':offset,'sourceSampleStart':a,'sourceSampleEnd':b,'sourceSha256':hashes[cut['file']]})
 p=path(timeline['music']['file']);hashes[timeline['music']['file']]=sha(p);x=audio(p)
 rms=float(np.sqrt(np.mean(x*x)));assert rms>.00001
 gain=frozen['music']['rmsGain']if frozen else 10**(-35/20)/rms
 x*=gain
 overlap=8*SR;assert len(x)>2*overlap
 positions=[];step=len(x)-overlap
 for start in range(0,n,step):
  count=min(len(x),n-start);envelope=np.ones(count,np.float32)
  if start:envelope[:min(overlap,count)]=np.sin(np.linspace(0,np.pi/2,min(overlap,count),dtype=np.float32))
  if start+len(x)<n:envelope[-overlap:]=np.cos(np.linspace(0,np.pi/2,overlap,dtype=np.float32))
  music[start:start+count]+=x[:count]*envelope[:,None];positions.append(start)
 music*=((1-.35*duck)[:,None]);fadein=min(n,2*SR);fadeout=min(n,6*SR)
 music[:fadein]*=np.linspace(0,1,fadein,dtype=np.float32)[:,None]
 music[-fadeout:]*=np.linspace(1,0,fadeout,dtype=np.float32)[:,None]
 peak=float(abs(voice+game+music).max())
 master=frozen['masterGain']if frozen else min(1,.85/max(.00001,peak))
 components={'voice':voice*master,'game':game*master,'music':music*master}
 if frozen:assert hashes==frozen['inputHashes'],'Frozen audio sources changed'
 info={'sampleRate':SR,'fps':FPS,'samplesPerFrame':SPF,'sampleCount':n,'voice':voices,'gameCuts':games,'music':{'file':timeline['music']['file'],'sourceSha256':hashes[timeline['music']['file']],'rmsGain':gain,'overlapSamples':overlap,'loopStartSamples':positions,'baseRmsDbFS':-35,'duringVoiceFactor':.65,'fadeInSamples':fadein,'fadeOutSamples':fadeout},'masterGain':master,'preMasterPeak':peak,'outputPeak':float(abs(components['voice']+components['game']+components['music']).max()),'inputHashes':hashes,'canonicalTimelineSha256':canonical(timeline),'codeSha256':sha(__file__),'ffmpegVersion':subprocess.check_output(['ffmpeg','-version']).decode().splitlines()[0],'policy':'Each game shot shares its video frame interval plus one independently measured fixed audio-source sample offset. All sources share sample0 at48kHz; waveform spacing/order, tempo and pitch are preserved. No per-cue warp or nonlinear post-mix repair. Background components come only from independent raw source files.'}
 return components,info

def reconstruct_components(timeline):
 """Return master-scaled full-length stereo components from frozen source files only."""
 manifest=json.loads((O/'research/audio-mix.json').read_text())
 assert manifest['canonicalTimelineSha256']==canonical(timeline),'Timeline changed after mix'
 assert manifest['codeSha256']==sha(__file__),'Mixer changed after mix'
 for name,expected in manifest['inputHashes'].items():assert sha(path(name))==expected,'Frozen audio source changed: '+name
 components,_=_components(timeline,manifest)
 return components

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--timeline',default=str(O/'render/timeline.json'));a=ap.parse_args()
 p=Path(a.timeline);t=json.loads(p.read_text());code=sha(__file__);timeline_sha=sha(p)
 components,info=_components(t);mixed=(components['voice']+components['game']+components['music']).astype('<f4')
 out=O/'render/master.flac'
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24',str(out)],input=mixed.tobytes(),check=True)
 assert code==sha(__file__)and timeline_sha==sha(p),'Mix inputs changed during processing'
 info.update(timelineFileSha256=timeline_sha,outputSha256=sha(out))
 (O/'research/audio-mix.json').write_text(json.dumps(info,ensure_ascii=False,indent=2))
 print('One48kHz mix',info['sampleCount'],info['outputPeak'],flush=True)
if __name__=='__main__':main()
