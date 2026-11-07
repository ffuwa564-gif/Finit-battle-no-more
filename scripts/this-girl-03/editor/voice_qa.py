"""Source signal checks only; no claim of ASR, listening or finished-movie sync."""
from pathlib import Path
import argparse,hashlib,json,subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--draft',action='store_true');a=ap.parse_args()
 source=O/('narration-draft.json'if a.draft else'narration.json');data=json.loads(source.read_text());rows=[]
 assert data['episode']=='THIS-GIRL-003'and(a.draft or data['finalized'])
 for chapter in data['chapters']:
  for line in chapter['lines']:
   p=ROOT/line['file'];q=ROOT/line['queryFile'];assert sha(p)==line['sha256']and sha(q)==line['querySha256']
   raw=subprocess.check_output(['ffmpeg','-v','error','-threads','1','-i',str(p),'-ar','24000','-ac','1','-f','f32le','-']);x=np.frombuffer(raw,'<f4');active=np.flatnonzero(abs(x)>.01)
   assert len(active)>1000 and np.isfinite(x).all()and max(abs(x))<.999
   assert abs(len(x)/24000-line['duration'])<1/24000
   rows.append({'lineId':line['lineId'],'duration':len(x)/24000,'peak':float(max(abs(x))),'voicedRms':float(np.sqrt(np.mean(x[active]**2))),'leadingSilenceSeconds':float(active[0]/24000),'trailingSilenceSeconds':float((len(x)-1-active[-1])/24000),'text':line['text'],'ttsText':line['ttsText'],'sha256':line['sha256'],'querySha256':line['querySha256'],'passed':True})
 record={'passed':True,'scope':'Source integrity, recorded reading, non-silence, unclipped signal and actual duration only; not ASR, subjective listening or final-movie synchronization.','listeningReviewed':False,'finalized':False,'sourceNarrationSha256':sha(source),'codeSha256':sha(__file__),'voiceSeconds':sum(r['duration']for r in rows),'lines':rows}
 dest=O/'research'/('voice-draft-signal-qa.json'if a.draft else'voice-source-qa.json');dest.write_text(json.dumps(record,ensure_ascii=False,indent=2));print(len(rows),'source lines checked',record['voiceSeconds'])
if __name__=='__main__':main()
