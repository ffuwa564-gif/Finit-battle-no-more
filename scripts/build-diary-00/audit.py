from pathlib import Path
import json,subprocess,sys,concurrent.futures,bisect
import numpy as np
from PIL import Image
B=Path(__file__).resolve().parent;ROOT=B.parents[1];sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,sha256,waveform_lag
T=json.loads((B/'timeline.json').read_text());M=json.loads((B/'soundtrack-manifest.json').read_text());C=json.loads((B/'catalogue.json').read_text());FPS=30;RATE=12000
assert M['timelineSha256']==sha256(B/'timeline.json')and M['soundtrackSha256']==sha256(B/'soundtrack.flac')
base=audio(B/'music-bed.flac',RATE,1).mean(axis=1);starts=[p['atFrame']for p in T['pictures']]
refs={};
def reference(path,w=192,h=108):
 key=(path,w,h)
 if key not in refs:refs[key]=np.array(Image.open(path).convert('RGB').resize((w,h),Image.Resampling.BOX),dtype=float)
 return refs[key]
def still(path,at,w=192,h=108,frames=1):
 raw=subprocess.check_output(['ffmpeg','-v','error','-threads','1','-ss',str(at),'-i',str(path),'-an','-frames:v',str(frames),'-vf',f'scale={w}:{h}:flags=area','-pix_fmt','rgb24','-threads','1','-f','rawvideo','-']);return np.frombuffer(raw,np.uint8).reshape(-1,h,w,3).astype(float)
def match(ref,actual):
 error=float(np.mean(abs(ref-actual)));a=actual.ravel();r=ref.ravel();corr=float(np.corrcoef(a,r)[0,1])if np.std(r)>1 else 1.;return {'error':error,'correlation':corr,'passed':error<5 and corr>.98}
results=[]
for label in ['1080p','720p']:
 movie=B/f'STILLVEIL-BuildResearchDiary-00-{label}.mp4';decoded=audio(movie,RATE,1).mean(axis=1);voiceChecks=[]
 for v in T['voices']:
  at=v['at'];ref=audio(v['source'],RATE,1).mean(axis=1);lo=max(0,round((at-.25)*RATE));hi=min(len(decoded),round((at+len(ref)/RATE+.25)*RATE));clean=decoded[lo:hi]-base[lo:hi];pad=at-lo/RATE;lag,corr=waveform_lag(ref,clean,RATE,at,pad);voiceChecks.append({'id':v['id'],'speaker':v['speaker'],'at':at,'lagSeconds':lag,'correlation':corr,'passed':abs(lag)<=.08 and corr>.92})
  assert sha256(v['source'])==v['sourceSha256']
 print(label,'voices',len(voiceChecks),sum(r['passed']for r in voiceChecks),flush=True)
 if label=='1080p':targets=[p for p in T['pictures']if p['kind']in ['dialogue','character','gem','ultimate','reference']]
 else:targets=[p for p in T['pictures']if p['kind']in ['character','gem','ultimate','reference']or p['kind']=='dialogue'and p['id'].endswith('-00')]
 def check(p):
  at=(p['atFrame']+15)/FPS;actual=still(movie,at)[0];ref=reference(p['path']);r=match(ref,actual);regions=[]
  if p['kind']in ['character','gem','ultimate','reference']:
   for name,x,y,w,h in [('name',55,10,130,10),('art',4,14,46,82),('body',55,25,130,66)]:regions.append({'region':name,**match(ref[y:y+h,x:x+w],actual[y:y+h,x:x+w])})
  else:regions.append({'region':'subtitle',**match(ref[92:107,:],actual[92:107,:])})
  return {'id':p['id'],'kind':p['kind'],'at':at,**r,'regions':regions,'passed':r['passed']and all(r['passed']for r in regions)}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4)as ex:frames=list(ex.map(check,targets))
 print(label,'frames',len(frames),sum(r['passed']for r in frames),flush=True)
 transitions=[]
 for ch in [T['chapters'][i]for i in [1,3,5,7]]:
  n=ch['atFrame'];expected=np.array([reference(T['pictures'][bisect.bisect_right(starts,n+k)-1]['path'],96,54)for k in range(9)]);candidate=still(movie,(n-2)/FPS,96,54,13);scores=[(float(np.mean(abs(expected-candidate[j:j+9]))),j-2)for j in range(5)];best=min(scores);variation=float(np.mean(abs(expected[1:]-expected[:-1])));transitions.append({'chapter':ch['id'],'atFrame':n,'bestOffsetFrames':best[1],'meanError':best[0],'variation':variation,'passed':abs(best[1])/FPS<=.08 and best[0]<5 and variation>.15})
 negative=[]
 for v in [T['voices'][i]for i in [7,37,70]]:
  at=v['at'];ref=audio(v['source'],RATE,1).mean(axis=1);pad=.4;lo=round((at-pad-.2)*RATE);hi=round((at+len(ref)/RATE+pad-.2)*RATE);clean=decoded[lo:hi]-base[lo:hi];lag,corr=waveform_lag(ref,clean,RATE,at,pad);negative.append({'id':v['id'],'injectedSeconds':.2,'detectedSeconds':lag,'correlation':corr,'passed':abs(lag-.2)<.02 and abs(lag)>.08})
 coverage={'characterIds':[p['id']for p in T['pictures']if p['kind']=='character'],'gemIds':[p['id']for p in T['pictures']if p['kind']=='gem']};coverage['passed']=set(coverage['characterIds'])=={c['id']for c in C['characters']}and set(coverage['gemIds'])=={'gem-'+g['id']+'-'+g['variant']for g in C['gems']}
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(movie)]));video=next(s for s in info['streams']if s['codec_type']=='video');sound=next(s for s in info['streams']if s['codec_type']=='audio');media={'width':video['width'],'height':video['height'],'frames':int(video['nb_frames']),'duration':float(info['format']['duration']),'codec':video['codec_name'],'audio':sound['codec_name'],'rate':sound['sample_rate']};media['passed']=media['frames']==T['durationFrames']and abs(media['duration']-T['duration'])<.1 and media['rate']=='48000'and media['width']==(1920 if label=='1080p'else 1280)
 passed=all(r['passed']for r in voiceChecks+frames+transitions+negative)and coverage['passed']and media['passed'];result={'label':label,'finishedFile':movie.name,'finishedSha256':sha256(movie),'timelineSha256':sha256(B/'timeline.json'),'soundtrackSha256':M['soundtrackSha256'],'voiceChecks':voiceChecks,'frameChecks':frames,'transitionChecks':transitions,'negativeControl':negative,'coverage':coverage,'media':media,'passed':passed};results.append(result)
 (B/'finished-audit.partial.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(label,'PASS'if passed else'FAIL',flush=True)
(B/'Finished-Movie-Sync.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));assert all(r['passed']for r in results),'Finished-file audit failed'
