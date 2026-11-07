"""Source-only onset diagnosis against actual native event wall times.
No timing repair is performed. Reports every candidate and explicit exclusions.
"""
from pathlib import Path
import argparse,hashlib,json,subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 a=argparse.ArgumentParser();a.add_argument('id');v=a.parse_args();p=O/'capture'/f'{v.id}.mov';mp=O/'capture'/f'{v.id}.json';m=json.loads(mp.read_text());assert m['calibration']['passed']
 raw=subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(p),'-vn','-ac','1','-ar','16000','-f','f32le','-']);x=np.frombuffer(raw,'<f4');step=32;rate=16000;rms=np.sqrt(np.mean(x[:len(x)//step*step].reshape(-1,step)**2,axis=1))
 events=m['events'];records=[]
 for i,e in enumerate(events):
  t=e['time']-m['initialOffset'];prev=events[i-1]['time']-m['initialOffset']if i else -99;next=events[i+1]['time']-m['initialOffset']if i+1<len(events)else 1e9
  buffered=bool(e.get('signature'))or e['kind'].startswith('ultimate-')or (e.get('skill',e['kind'])in['attack','area','pierce','shatter','drain','dawn','guard','barrier'])
  rec={'index':i,'time':t,'kind':e['kind'],'skill':e.get('skill'),'sourceFrame':e['sourceFrame'],'bufferedImmediateScheduling':buffered}
  if not buffered:rec['excluded']='UI/musical lookahead or unsupported synth scheduling; not an immediate PCM onset'
  elif t-prev<1.2 or next-t<.8:rec['excluded']='Another native cue is too close for isolated onset attribution'
  elif t<.5 or t+.5>=len(x)/rate:rec['excluded']='Boundary'
  else:
   lo=round((t-.35)/.002);hi=round((t+.4)/.002);a0=round((t-.35)/.002);a1=round((t-.18)/.002)
   noise=float(np.max(rms[a0:a1]));peak=float(np.max(rms[round((t-.12)/.002):hi]));threshold=max(.0004,peak*.025,noise*6)
   rec.update(baselineRmsPeak=noise,localRmsPeak=peak,onsetThreshold=threshold)
   if noise>peak*.015:rec['excluded']='Preceding native tail is not quiet enough for independent onset isolation'
   elif peak<.004:rec['excluded']='Insufficient active native signal'
   else:
    hit=rms[lo:hi]>threshold;starts=np.flatnonzero(hit&np.r_[True,~hit[:-1]])
    starts=[j for j in starts if np.sum(hit[j:j+8])>=6]
    if not starts:rec['excluded']='No sustained isolated onset'
    else:
     onset=(lo+starts[0])*.002;rec.update(observedOnsetSeconds=onset,deltaMs=(onset-t)*1000,within80ms=bool(abs(onset-t)<=.08))
  records.append(rec)
 valid=[r for r in records if 'observedOnsetSeconds'in r];selected=[]
 for third in range(3):
  lo=m['gameplayWindow'][0]+(m['gameplayWindow'][1]-m['gameplayWindow'][0])*third/3;hi=m['gameplayWindow'][0]+(m['gameplayWindow'][1]-m['gameplayWindow'][0])*(third+1)/3
  cand=[r for r in valid if lo<=r['time']<hi]
  selected.append({'category':f'third-{third}','event':cand[0]if cand else None})
 ult=[r for r in valid if r['kind'].startswith('ultimate-')];selected.append({'category':'ultimate','event':ult[0]if ult else None})
 passed=all(s['event']and s['event']['within80ms']for s in selected)
 report={'passed':bool(passed),'sourceSha256':sha(p),'metadataSha256':sha(mp),'codeSha256':sha(__file__),'id':v.id,'selected':selected,'allCandidates':records,'method':'Native game:se wallclock versus first sustained real-audio RMS onset. Candidate choice is chronological first isolated eligible cue per third plus first ultimate. No lag fitting, manual offsets or relaxed80ms threshold. All exclusions retained. PCM sources scheduled immediate+5ms, UI musical-lookahead excluded. Diagnostic only until reviewed; broad RMS detection does not prove exact PCM identity.'}
 (O/'research'/f'native-se-onset-{v.id}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'passed':report['passed'],'selected':selected,'eligible':len(valid)},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
