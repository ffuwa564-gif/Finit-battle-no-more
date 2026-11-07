"""Independent finished-MP4 source comparison. An unexecuted script is not a pass.
All audio references/backgrounds originate in frozen source files, never the movie.
"""
from pathlib import Path
import argparse,hashlib,importlib.util,json,subprocess,traceback
import numpy as np
from scipy.signal import fftconvolve,resample_poly
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-v2'
SR=48000;FPS=30;SPF=1600

def sha(p):
 h=hashlib.sha256()
 with open(p,'rb')as f:
  for x in iter(lambda:f.read(1048576),b''):h.update(x)
 return h.hexdigest()
def resolved(p):return ROOT/Path(p)
def run(cmd):return subprocess.check_output(cmd)
def probe(p):return json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(p)]))
def audio(p):return np.frombuffer(run(['ffmpeg','-v','error','-threads','1','-i',str(p),'-vn','-ar',str(SR),'-ac','2','-f','f32le','-']),'<f4').reshape(-1,2)
def gray(p,frame,count,box=None):
 vf=[]
 if box:vf.append('crop='+':'.join(map(str,[box[2],box[3],box[0],box[1]])))
 vf+=['scale=90:160','format=gray']
 raw=run(['ffmpeg','-v','error','-threads','1','-ss',f'{frame/FPS:.9f}','-i',str(p),'-vf',','.join(vf),'-frames:v',str(count),'-fps_mode','passthrough','-f','rawvideo','-'])
 x=np.frombuffer(raw,np.uint8)
 assert x.size==count*90*160,('Incomplete frame decode',str(p),frame,count,x.size)
 return x.reshape(count,160,90).astype(np.float32)
def corr(ref,candidate):
 a=resample_poly(np.mean(ref,axis=1),1,3);b=resample_poly(np.mean(candidate,axis=1),1,3)
 a=a.astype(np.float64);b=b.astype(np.float64);a=a-a.mean();b=b-b.mean()
 c=fftconvolve(b,a[::-1],mode='valid');e=fftconvolve(b*b,np.ones(len(a)),mode='valid')
 ref_energy=float(np.sum(a*a));assert ref_energy>1e-12
 c/=np.sqrt(np.maximum(1e-20,e*ref_energy));c[e<ref_energy*1e-6]=-1;i=int(np.argmax(c));assert c[i]<=1.00001
 return i/16000,float(c[i])
def best_active_interval(component,a,b,seconds=2):
 length=seconds*SR;assert b-a>=length,'Insufficient source interval'
 choices=range(a,b-length+1,SR//4)
 start=max(choices,key=lambda i:float(np.mean(component[i:i+length]**2)))
 assert np.sqrt(np.mean(component[start:start+length]**2))>1e-5,'No active source audio'
 return start,length

def main():
 ap=argparse.ArgumentParser();ap.add_argument('movie');ap.add_argument('--timeline',default=str(O/'render/timeline.json'));ap.add_argument('--report',default=str(O/'research/final-independent-qa.json'));a=ap.parse_args()
 movie=Path(a.movie).resolve();tp=Path(a.timeline);report={'passed':False,'movie':str(movie),'movieSha256':sha(movie),'qaCodeSha256':sha(__file__),'timelineSha256':sha(tp),'audio':[],'video':[]}
 try:
  t=json.loads(tp.read_text());assert t['finalized']and t['episode']=='THIS-GIRL-002-V2';n=t['durationFrames']*SPF
  p=probe(movie);v=next(s for s in p['streams']if s['codec_type']=='video');au=next(s for s in p['streams']if s['codec_type']=='audio')
  assert (v['width'],v['height'])==(1920,1080)and v['avg_frame_rate']=='30/1'and int(v['nb_read_frames'])==t['durationFrames'];assert int(au['sample_rate'])==SR
  subprocess.run(['ffmpeg','-v','error','-xerror','-threads','1','-i',str(movie),'-f','null','-'],check=True)
  timestamps=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','json',str(movie)]))['frames']
  pts=np.array([float(f['best_effort_timestamp_time'])for f in timestamps]);assert len(pts)==t['durationFrames']
  assert np.max(np.abs(pts-np.arange(len(pts))/FPS))<=.001,'Final output is not on the30fps frame grid'
  report['constantFrameRateVerified']=True
  spec=importlib.util.spec_from_file_location('independent_source_mixer',ROOT/'scripts/this-girl-02-v2/editor/mixer.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  components=m.reconstruct_components(t);manifest=O/'research/audio-mix.json';report['audioMixSha256']=sha(manifest)
  final=audio(movie);assert len(final)>=n,'Truncated output audio';final=final[:n]
  assert all(len(x)==n for x in components.values());total=sum(components.values())
  sources={str(resolved(c['file'])) for c in t['gameCuts']};assert len(sources)>=2,'Two native comparison sources required'
  report['sourceHashes']={str(p):sha(p)for p in sorted(map(Path,sources))}
  # Every game cut: independently locate a genuinely changing source window in each third.
  for cut in t['gameCuts']:
   source=resolved(cut['file']);sa=cut['sourceStartFrame'];sb=cut['sourceEndFrame'];length=sb-sa;assert length>=45
   box=cut.get('box',t.get('gameBox'));assert box and len(box)==4,'Explicit game geometry required'
   assert box[2]*800==box[3]*450,'Native viewport aspect changed'
   x=gray(source,sa,length)
   assert 'fadeFrames'in cut or'gameFadeFrames'in t,'Renderer fade interval must be explicit'
   fade=cut.get('fadeFrames',t.get('gameFadeFrames',0));assert 0<=fade<=15
   visible=length-2*fade;assert visible>=27
   for third in range(3):
    lo=fade+third*visible//3;hi=fade+(third+1)*visible//3-9;assert hi>=lo
    candidates=range(lo,hi+1)
    off=max(candidates,key=lambda i:float(np.mean(np.abs(np.diff(x[i:i+9],axis=0)))))
    ref=x[off:off+9];activity=float(np.mean(np.abs(np.diff(ref,axis=0))))
    unique=len({f.tobytes()for f in ref})
    assert activity>.4 and unique>=2,('Static/non-discriminating native window',cut['id'],third,activity)
    target=cut['startFrame']+off;pad=min(18,target);right=min(18,t['durationFrames']-target-9);out=gray(movie,target-pad,9+pad+right,box)
    errors=[float(np.sqrt(np.mean((out[j:j+9]-ref)**2)))for j in range(len(out)-8)];idx=int(np.argmin(errors));lag=(idx-pad)/FPS
    outside=[error for j,error in enumerate(errors)if abs((j-pad)/FPS)>.08]
    assert outside,'Wrong-lag candidates required for timing discrimination'
    margin=min(outside)-errors[idx]
    passed=abs(lag)<=.08 and errors[idx]<=12 and margin>=1
    report['video'].append({'cut':cut['id'],'third':third,'sourceFrame':sa+off,'outputFrame':target,'nineFrameCount':9,'uniqueSourceFrames':unique,'sourceActivity':activity,'lagSeconds':lag,'rmse':errors[idx],'outside80msMinimumRmse':min(outside),'timingDiscriminationMargin':margin,'minimumMargin':1,'sourceOnlyWindowSelection':True,'visibleInterval':[sa+fade,sb-fade],'excludedFadeFramesPerEdge':fade,'fadeExclusionReason':'Renderer-declared paper alpha transition','thirdCandidateRange':[sa+lo,sa+hi],'passed':passed})
  # Per-component NCC against its frozen source-only reconstruction. Independent other sources cancel background.
  anchors=[]
  for cut in t['gameCuts']:
   start=cut['startFrame']*SPF;length=(cut['sourceEndFrame']-cut['sourceStartFrame'])*SPF
   for third in range(3):
    aa=start+third*length//3;bb=start+(third+1)*length//3
    at,count=best_active_interval(components['game'],aa,bb)
    anchors.append(('game',cut['id']+':'+str(third),at,count,.65))
  voice=t['voice'];assert len(voice)>=3
  for j in [0,len(voice)//2,len(voice)-1]:
   line=voice[j];at=line['startFrame']*SPF;end=at+len(audio(resolved(line['file'])))
   at,count=best_active_interval(components['voice'],at,end,seconds=1)
   anchors.append(('voice',line['lineId'],at,count,.72))
  for fraction in [.12,.48,.84]:
   center=int(n*fraction);at,count=best_active_interval(components['music'],max(SR,center-3*SR),min(n-SR,center+3*SR))
   anchors.append(('music',str(fraction),at,count,.72))
  for name,ident,at,count,threshold in anchors:
   pad=min(round(.6*SR),at,n-at-count);assert pad>=round(.12*SR)
   # Background is calculated only from the licensed raw voice/music/native sound sources.
   independent_background=total-components[name]
   candidate=final[at-pad:at+count+pad]-independent_background[at-pad:at+count+pad]
   lag,c= corr(components[name][at:at+count],candidate);lag-=pad/SR
   report['audio'].append({'component':name,'anchor':ident,'outputSample':at,'durationSamples':count,'lagSeconds':lag,'correlation':c,'minimumCorrelation':threshold,'passed':abs(lag)<=.08 and c>=threshold})
  assert sha(movie)==report['movieSha256']and sha(tp)==report['timelineSha256'],'Inputs changed during QA'
  report['passed']=all(x['passed']for x in report['audio']+report['video'])
  assert report['passed'],'One or more measured source sync checks failed'
  report['fullDecodePassed']=True;report['scope']='Finished H264/AAC movie source-frame and independent source-audio sync only; browser seek/playback requires separate browser-qa report bound to this same SHA.'
 except Exception as e:
  report['error']=str(e);report['traceback']=traceback.format_exc()
 finally:
  Path(a.report).parent.mkdir(parents=True,exist_ok=True);Path(a.report).write_text(json.dumps(report,ensure_ascii=False,indent=2));print('FINISHED SOURCE QA',report['passed'])
 if not report['passed']:raise SystemExit(1)
if __name__=='__main__':main()
