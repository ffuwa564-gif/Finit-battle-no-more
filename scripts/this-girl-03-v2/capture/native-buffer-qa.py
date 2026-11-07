"""Match actual transparently observed native buffers, never replayed replacement SE.
Checks both continuous context PCM clock and the calibrated source against walltime.
"""
from pathlib import Path
import argparse,hashlib,json,subprocess,math
import numpy as np
from scipy.signal import fftconvolve,resample_poly
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03-v2'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def resample(x,sr):
 d=math.gcd(16000,sr);return resample_poly(x,16000//d,sr//d)
def correlation(ref,candidate):
 ref=ref.astype(np.float64);candidate=candidate.astype(np.float64);ref=ref-ref.mean();candidate=candidate-candidate.mean();c=fftconvolve(candidate,ref[::-1],mode='valid');energy=fftconvolve(candidate*candidate,np.ones(len(ref)),mode='valid');ref_energy=float(np.sum(ref*ref));assert ref_energy>1e-12;c/=np.sqrt(np.maximum(1e-20,energy*ref_energy));c[energy<ref_energy*1e-6]=-1;i=int(np.argmax(c));assert c[i]<=1.00001;return i/16000,float(c[i])
def main():
 ap=argparse.ArgumentParser();ap.add_argument('id');ap.add_argument('--raw-only',action='store_true');a=ap.parse_args();cp=O/'capture';mp=cp/f'{a.id}.json';m=json.loads(mp.read_text());assert m['audioCapture']['continuous'];assert a.raw_only or m['calibration']['passed'];ac=m['audioCapture'];sr=ac['sampleRate'];pcm=cp/f'{a.id}.pcm';assert sha(pcm)==ac['sha256'];raw=resample(np.fromfile(pcm,'<i2').reshape(-1,2).mean(axis=1).astype(np.float32)/32767,sr)
 movie=cp/f'{a.id}.mov';final=np.array([],dtype=np.float32)if a.raw_only else np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(movie),'-vn','-ar','16000','-ac','1','-f','f32le','-']),'<f4')
 refs={r['bufferId']:r for r in m['nativeReferenceBuffers']};entries=[];excluded=[]
 clocks=[]
 for chunk in ac['chunks']:
  if chunk['observedWallTime']>m['frames'][-1]['time']+1/30:continue
  stamp=chunk.get('outputTimestamp',{});origin=chunk.get('timeOrigin')
  if origin and stamp.get('contextTime',0)>0:
   wall=chunk['observedWallTime'];ctx=chunk['observedContextTime']
   if not clocks or(wall>clocks[-1][0]and ctx>clocks[-1][1]):clocks.append((wall,ctx))
 os_clock=m.get('calibration',{}).get('clockDomain','').startswith('native OS')
 if not a.raw_only and not os_clock:assert len(clocks)>=6,'Exact recorded graph-clock pairs required for final source QA'
 clock_wall=np.array([x[0]for x in clocks]);clock_ctx=np.array([x[1]for x in clocks])
 for idx,e in enumerate(m['nativeBufferStarts']):
  if e.get('cancelledBeforeStart'):
   excluded.append({'nativeIndex':idx,'sourceNodeId':e.get('sourceNodeId'),'reason':'Transparent native stop observed before scheduled start; source never played','stopObservations':e['stopObservations']});continue
  if e.get('loop'):
   excluded.append({'nativeIndex':idx,'reason':'Looped source is outside finite native combat-buffer eligibility'});continue
  p=ROOT/refs[e['bufferId']]['file'];assert sha(p)==refs[e['bufferId']]['sha256'];buf=np.fromfile(p,'<f4');offset=round(e['offset']*e['sampleRate']);buf=buf[offset:]
  if e['duration']is not None:buf=buf[:round(e['duration']*e['sampleRate'])]
  rate=e['playbackRate'];assert rate>0
  if rate!=1:buf=np.interp(np.arange(0,len(buf),rate),np.arange(len(buf)),buf).astype(np.float32)
  ref=resample(buf,e['sampleRate']);count=min(len(ref),round(.55*16000))
  if e.get('effectiveStopContextTime')is not None:
   active=e['effectiveStopContextTime']-e.get('effectiveStartContextTime',e['scheduledContextTime']);count=min(count,max(0,round((active-.015)*16000)))
  scheduled_now=e.get('effectiveStartContextTime',e['scheduledContextTime'])
  peers=[(j,z.get('effectiveStartContextTime',z['scheduledContextTime']))for j,z in enumerate(m['nativeBufferStarts'])if j!=idx and z['bufferId']==e['bufferId']and not z.get('cancelledBeforeStart')and not z.get('loop')]
  next_same=[t for _,t in peers if t>scheduled_now+1e-6]
  if next_same:count=min(count,max(0,round((min(next_same)-scheduled_now-.015)*16000)))
  ref=ref[:count]
  raw_expected=e.get('effectiveStartContextTime',max(e['scheduledContextTime'],e['contextTime']))-ac['startContextFrame']/sr
  wall_expected=e['wallTime']-m['audioZero']-m['initialOffset']+max(0,e['scheduledContextTime']-e['contextTime'])
  if count<round(.2*16000)or raw_expected<.65 or wall_expected<.65 or(not a.raw_only and wall_expected+.7>=len(final)/16000):
   excluded.append({'nativeIndex':idx,'reason':'Boundary/too short buffer','wallExpected':wall_expected});continue
  result={'nativeIndex':idx,'bufferId':e['bufferId'],'bufferSha256':sha(p),'scheduledContextTime':e['scheduledContextTime'],'wallExpected':wall_expected,'rawExpected':raw_expected}
  tests=[('rawClock',raw,raw_expected,ref)]
  if not a.raw_only and os_clock:
   graph_start=round(raw_expected*16000);graph_reference=raw[graph_start:graph_start+round(.5*16000)]
   assert len(graph_reference)==round(.5*16000)
   result['referenceClockTransform']={'method':'Independent actual post-limiter graph PCM mixture, fixed ctx scheduled sample index and500ms window; fixed sample-rate conversion only, no OS/final audio used as reference','graphReferenceStartSample16000':graph_start,'graphReferenceFrames16000':len(graph_reference)}
   tests.append(('calibratedWallClock',final,wall_expected,graph_reference))
  elif not a.raw_only:
   scheduled=e.get('effectiveStartContextTime',max(e['scheduledContextTime'],e['contextTime']));duration_ctx=count/16000
   hardware_start=np.interp(scheduled,clock_ctx,clock_wall);hardware_end=np.interp(scheduled+duration_ctx,clock_ctx,clock_wall)
   grid=np.arange(0,hardware_end-hardware_start,1/16000);context_grid=np.interp(hardware_start+grid,clock_wall,clock_ctx)-scheduled
   reference_wall=np.interp(context_grid*e['sampleRate'],np.arange(len(buf)),buf).astype(np.float64)
   result['referenceClockTransform']={'method':'Independent original buffer sampled through recorded pre-hardware graph-clock pairs; absolute search nominal remains separately observed native scheduling wall time','graphStartWallTime':float(hardware_start),'durationSeconds':len(reference_wall)/16000}
   tests.append(('calibratedWallClock',final,wall_expected,reference_wall))
  for name,samples,nominal,test_ref in tests:
   count=len(test_ref)
   pad=.08 if name=='rawClock'else .6
   start=round((nominal-pad)*16000);end=start+count+round(2*pad*16000)
   if end>len(samples):result[name]={'passed':False,'reason':'Incomplete search window'};continue
   pos,c=correlation(test_ref,samples[start:end]);lag=pos-pad;result[name]={'lagSeconds':lag,'correlation':c,'passed':bool(abs(lag)<=.08 and c>=.65)}
   if name=='rawClock':
    full_start=round((nominal-.6)*16000);full_end=full_start+count+round(1.2*16000);gpos,gcorr=correlation(test_ref,samples[full_start:full_end]);glag=gpos-.6
    competitors=[j for j,t in peers if abs((t-scheduled_now+.006)-glag)<.025]
    result[name].update(contextSearchPriorSeconds=.08,unrestrictedLagSeconds=glag,unrestrictedCorrelation=gcorr,competingObservedSameBufferStarts=competitors,referencePrefixFrames=count,scope='Original buffer consistency near observed native schedule; not a claim of unique source onset identity',ambiguousReuse=bool(competitors),priorReason='Exact native scheduled ctx time and continuous graph sample index bound the identity search; known other starts are reported rather than stolen')
    if abs(glag)>.08 and gcorr>c+.02 and not competitors:result[name]['passed']=False;result[name]['ambiguity']='Unexplained stronger waveform outside own scheduled context window'
  ctx=e['scheduledContextTime'];near=sorted(m['events'],key=lambda x:abs(x.get('audioContextTime',-999)-ctx));event=near[0]if near and abs(near[0].get('audioContextTime',-999)-ctx)<.15 else None;result['nativeCue']=event
  result['passed']=bool(result['rawClock']['passed']and(a.raw_only or result['calibratedWallClock']['passed']));entries.append(result)
 selected=[];gs,ge=m['gameplayWindow']
 for third in range(3):
  candidates=[e for e in entries if gs+(ge-gs)*third/3<=e['wallExpected']<gs+(ge-gs)*(third+1)/3];selected.append({'category':f'third-{third}','measurement':candidates[0]if candidates else None})
 ult=[e for e in entries if e['nativeCue']and e['nativeCue']['kind'].startswith('ultimate-')];selected.append({'category':'ultimate','measurement':ult[0]if ult else None})
 partial=m.get('partialPreflight',False)
 required=selected[:3]if partial else selected
 passed=all(e['passed']for e in entries)and bool(entries)if a.raw_only else all(s['measurement']and s['measurement']['passed']for s in required)and all(e['passed']for e in entries)
 report={'passed':bool(passed),'partialPreflight':partial,'rawOnly':a.raw_only,'sourceSha256':None if a.raw_only else sha(movie),'metadataSha256':sha(mp),'pcmSha256':sha(pcm),'codeSha256':sha(__file__),'nativeSampleRate':sr,'sampleContinuity':ac['continuous'],'selected':selected,'allMeasuredPassed':all(e['passed']for e in entries),'measurements':entries,'exclusions':excluded,'method':'Actual native AudioBufferSource.start transparently observed after scheduling, with original buffer bytes/rate/offset preserved. Native graph PCM vs context scheduled time and calibrated capture vs wallclock independently matched. Chronological first available per third and first actual ultimate; no replacement sound, no manual lag fitting. Fixed max80ms and correlation>=0.65. Partial development excludes missing ultimate only.'}
 (O/'research'/('native-buffer-'+('raw-'if a.raw_only else'qa-')+a.id+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'passed':report['passed'],'selected':selected,'measurementCount':len(entries)},ensure_ascii=False,indent=2))
 if not passed:raise SystemExit(1)
if __name__=='__main__':main()
