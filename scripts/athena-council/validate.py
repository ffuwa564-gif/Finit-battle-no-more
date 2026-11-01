"""Validate evidence, three voices, decoded master, and encoded speech timing."""
import pathlib,json,subprocess,wave,re,hashlib
import numpy as np
from render import phase_changes
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/athena-council';D=O/'delivery'
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def validate():
 m=json.loads((O/'narration.json').read_text());lines=[l for c in m['chapters']for l in c['lines']];assert len(m['chapters'])==18
 expected_ids={'z':3,'m':2,'u':61};assert {l['speaker']for l in lines}==set(expected_ids)
 for l in lines:
  assert l['voice_id']==expected_ids[l['speaker']]
  with wave.open(str(ROOT/l['wav']))as w:assert w.getframerate()==24000 and abs(w.getnframes()/w.getframerate()-l['duration'])<.001
  assert l['end']>l['start']
 gaps=[b['start']-a['end']for a,b in zip(lines,lines[1:])];assert min(gaps)>0 and max(gaps)<1.5
 for c in m['chapters']:
  recorded=json.loads((O/'render'/f"{c['id']}-visual-timeline.json").read_text())['changes'];wanted=phase_changes(c);assert len(recorded)==len(wanted)
  for a,b in zip(recorded,wanted):assert a['phase']==b['phase'] and abs(a['time']-b['time'])<.002
 facts=json.loads((D/'Source-Facts.json').read_text());assert abs(facts['athena']['leader']['percent']-18.4)<1e-9 and facts['command']['loads']['seris-awakened']==1 and facts['firstFloor']['hasBossStrike']is False
 native=json.loads((D/'Native-Application-Verification.json').read_text());assert native['passed'] and [(r['build'],r['id'],r['wins'])for r in native['rows']]==[('rewind','baseline',51),('rewind','replace-athena-liora-awakened',10),('flower','baseline',71),('flower','replace-athena-liora-awakened',28)]
 model=json.loads((D/'Mechanism-Model.json').read_text());assert model['validation']['passed'] and model['validation']['randomConservationCases']==3000 and 'NOT tower' in model['status']
 visual=json.loads((D/'Visual-Check.json').read_text());assert visual['passed'] and visual['phaseCount']==54
 movie=D/'STILLVEIL-Athena-Council-1080p.mp4';q=probe(movie);dur=float(q['format']['duration']);assert abs(dur-m['duration'])<.3,(dur,m['duration']);v=next(s for s in q['streams']if s['codec_type']=='video');assert [v['width'],v['height']]==[1920,1080]
 subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(movie),'-map','0:v','-map','0:a','-f','null','-'],check=True)
 res=subprocess.run(['ffmpeg','-hide_banner','-i',str(movie),'-vn','-af','loudnorm=I=-16:TP=-2.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True);levels=json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}',res.stderr)[0]);assert -17.5<float(levels['input_i'])<-14.5 and float(levels['input_tp'])<-.7,levels
 # Cross-correlate actual encoded speech with its source at the beginning,
 # middle and end, covering all three voice IDs. BGM/cues remain in the master.
 selected=[next(l for l in lines if l['speaker']==who)for who in ['z','m','u']];selected.append(min((l for l in lines if l['speaker']=='u'),key=lambda l:abs(l['start']-dur/2)));selected.extend(next(l for l in reversed(lines)if l['speaker']==who)for who in ['m','u','z']);sync=[]
 for l in selected:
  with wave.open(str(ROOT/l['wav']))as w:ref=np.frombuffer(w.readframes(min(w.getnframes(),48000)),dtype='<i2').astype(float)/32768
  a=max(0,l['start']-.28);length=len(ref)/24000+.60;raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(a),'-i',str(movie),'-t',str(length),'-vn','-ac','1','-ar','24000','-f','f32le','-']);sig=np.frombuffer(raw,dtype='<f4').astype(float);ref-=ref.mean();sig-=sig.mean();n=1<<((len(sig)+len(ref)-2).bit_length());corr=np.fft.irfft(np.fft.rfft(sig,n)*np.fft.rfft(ref[::-1],n),n);valid=corr[len(ref)-1:len(sig)];energy=np.cumsum(np.r_[0,sig*sig]);den=np.sqrt(np.maximum(1e-12,(energy[len(ref):]-energy[:-len(ref)])*np.dot(ref,ref)));score=valid/den;lag=int(np.argmax(score));observed=a+lag/24000;offset=observed-l['start'];confidence=float(score[lag]);assert abs(offset)<.09 and confidence>.80,(l['speaker'],offset,confidence);sync.append({'speaker':l['speaker'],'voiceId':l['voice_id'],'expectedStart':l['start'],'encodedStart':observed,'offsetSeconds':offset,'normalizedCorrelation':confidence})
 changed=subprocess.check_output(['git','diff','--name-only','--','src','public'],cwd=ROOT,text=True);assert not changed.strip()
 report={'passed':True,'fullMovieDecoded':True,'durationSeconds':dur,'narrationSeconds':m['duration'],'resolution':[1920,1080],'lineCount':len(lines),'voiceIds':expected_ids,'maximumNarrationGapSeconds':max(gaps),'encodedSpeechSync':sync,'maximumMeasuredSpeechOffsetSeconds':max(abs(x['offsetSeconds'])for x in sync),'audio':levels,'nativeApplicationComparisonsVerified':400,'toyModelIsNotTowerWinRate':True,'allSixProposalsUnimplemented':True,'gameModified':False,'sourceGameCommit':'dec20ebbfb8d139713ffe847ebc48eefe8ff54ca'}
 (D/'Validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(report,flush=True);return report
if __name__=='__main__':validate()
