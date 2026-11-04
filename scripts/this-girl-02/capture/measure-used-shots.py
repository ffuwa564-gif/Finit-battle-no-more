"""Independently measure every observed native source touching frozen shot bounds.
References originate exclusively in separate post-limiter graph PCM, never OS/final audio.
"""
from pathlib import Path
import json,hashlib,importlib.util,subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02';fp=O/'capture/used-intervals.json';cp=O/'research/source-catalog.json'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('sourceqa',ROOT/'scripts/this-girl-02/capture/native-buffer-qa.py');qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
frozen=json.loads(fp.read_text());catalog=json.loads(cp.read_text());assert frozen['selectionFinalized'];cache={};shots=[]
for shot in frozen['shots']:
 logical='reference'if shot['id']=='battle-reference'else'sakuya';src=catalog['sources'][logical];mp=ROOT/shot['metadata'];movie=ROOT/shot['file'];assert sha(mp)==shot['metadataSha256']and sha(movie)==shot['sourceSha256']
 if logical not in cache:
  m=json.loads(mp.read_text());ac=m['audioCapture'];p=ROOT/src['graphPcm'];assert sha(p)==ac['sha256'];graph=qa.resample(np.fromfile(p,'<i2').reshape(-1,2).mean(axis=1).astype(np.float32)/32767,ac['sampleRate']);os=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(movie),'-vn','-ar','16000','-ac','1','-f','f32le','-']),'<f4');cache[logical]=(m,graph,os)
 m,graph,os=cache[logical];ac=m['audioCapture'];lo=shot['sourceStartFrame']/30;hi=shot['sourceEndFrame']/30;eligible=[];measurements=[];exclusions=[]
 for idx,e in enumerate(m['nativeBufferStarts']):
  start_ctx=e.get('effectiveStartContextTime',max(e['scheduledContextTime'],e['contextTime']));wall=e['wallTime']-m['audioZero']-m['initialOffset']+max(0,start_ctx-e['contextTime']);raw=start_ctx-ac['startContextFrame']/ac['sampleRate']
  if e.get('cancelledBeforeStart'):
   exclusions.append({'nativeIndex':idx,'reason':'Observed native stop cancels source before its effective start','status':'out-of-used-range','cancelledBeforeStart':True});continue
  natural=max(0,e['frames']/e['sampleRate']-e['offset'])/e['playbackRate']
  if e['duration']is not None:natural=min(natural,e['duration']/e['playbackRate'])
  if e.get('loop'):
   duration=None
  else:duration=natural
  if e.get('effectiveStopContextTime')is not None:duration=min(duration,e['effectiveStopContextTime']-start_ctx)if duration is not None else e['effectiveStopContextTime']-start_ctx
  if duration is None and e.get('endedObservedContextTime')is not None:duration=e['endedObservedContextTime']-start_ctx
  if duration is None:
   if wall<=hi+.08:eligible.append(idx);exclusions.append({'nativeIndex':idx,'reason':'Loop has no observed stop/end, so audible tail bound cannot be established','status':'unverifiable'})
   else:exclusions.append({'nativeIndex':idx,'reason':'Starts after frozen used range','status':'out-of-used-range'})
   continue
  duration=max(0,duration)
  if wall+duration<lo-.08 or wall>hi+.08:
   exclusions.append({'nativeIndex':idx,'reason':'Metadata effective active span does not intersect frozen shot plus80ms boundary guard','status':'out-of-used-range','wallExpected':wall,'durationSeconds':duration});continue
  eligible.append(idx)
  # Measure the part actually used; finite short sounds are still represented in
  # their actual500ms mixed context, with the shot boundary clipping explicit.
  ref_start=max(wall,lo);ref_end=min(ref_start+.5,hi)
  if ref_start>=ref_end:
   # A near-boundary onset outside the visible interval is conservatively
   # measured in its full context to verify its head cannot drift into the cut.
   ref_start=wall;ref_end=wall+.5;boundary_guard=True
  else:boundary_guard=False
  length=round((ref_end-ref_start)*16000);raw_start=round((raw+ref_start-wall)*16000)
  record={'nativeIndex':idx,'sourceNodeId':e.get('sourceNodeId'),'bufferId':e['bufferId'],'wallExpected':wall,'durationSeconds':duration,'activeSpan':[wall,wall+duration],'loop':bool(e.get('loop')),'rawContextExpectedSeconds':raw,'referenceStartWallSeconds':ref_start,'referenceEndWallSeconds':ref_end,'graphReferenceStartSample16000':raw_start,'graphReferenceLength16000':length,'referenceClippedToUsedShot':not boundary_guard,'boundaryGuardOnly':boundary_guard,'crossesStartBoundary':wall<lo,'crossesEndBoundary':wall+duration>hi,'independentGraphReference':True,'referenceScope':'Separately captured actual post-limiter graphPCM mixture at the observed native ctx sample index; not OS or finished audio','ambiguous':False}
  if length<160 or raw_start<0 or raw_start+length>len(graph):
   exclusions.append({'nativeIndex':idx,'reason':'Insufficient captured graph context at frozen boundary','status':'unverifiable'});record.update(lagSeconds=None,correlation=None,ambiguous=True);measurements.append(record);continue
  ref=graph[raw_start:raw_start+length];rms=float(np.sqrt(np.mean(ref.astype(np.float64)**2)));record['referenceRms']=rms
  a=round((ref_start-.6)*16000);b=a+length+19200
  if a<0 or b>len(os)or rms<1e-5:
   exclusions.append({'nativeIndex':idx,'reason':'Insufficient real mixed signal or OS search window','status':'unverifiable'});record.update(lagSeconds=None,correlation=None,ambiguous=True);measurements.append(record);continue
  pos,c=qa.correlation(ref,os[a:b]);record.update(lagSeconds=pos-.6,correlation=c);measurements.append(record)
 shots.append({'id':shot['id'],'tailsIncluded':True,'sourceMovieSha256':sha(movie),'sourceMetadataSha256':sha(mp),'eligibleNativeIndices':eligible,'measurements':measurements,'exclusions':exclusions,'coverage':{'allMetadataEligibleIncluded':len(measurements)==len(eligible),'independentGraphReferences':all(x['independentGraphReference']for x in measurements),'boundaryTailsIncluded':True}})
r={'episode':'THIS-GIRL-002','finalized':True,'shotFreezeSha256':sha(fp),'sourceCatalogSha256':sha(cp),'codeSha256':sha(__file__),'shots':shots,'method':'Frozen editorial intervals precede measurements. Metadata effective start/stop or natural duration establishes eligibility, expanded80ms at each boundary. Short and finite-loop sounds are included. No cue/shot offset has been fitted here; planner separately computes one constant sample shift per frozen shot. Every reference is independently recorded graph PCM.'};out=O/'research/used-shot-audio-measurements.json';out.write_text(json.dumps(r,ensure_ascii=False,indent=2));print(out)
for x in shots:print(x['id'],'eligible',len(x['eligibleNativeIndices']),'measured',len(x['measurements']),'range',[(round(z['lagSeconds']*1000,2),round(z['correlation'],3))for z in x['measurements']if z.get('lagSeconds')is not None])
