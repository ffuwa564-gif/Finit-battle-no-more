"""Quiet solo narration; immutable line cache and explicit draft/final distinction.
Raw voice files remain local; distribute text, parameters, and regeneration code.
"""
from pathlib import Path
import argparse,hashlib,json,subprocess,urllib.request,urllib.parse
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-preview'
PARAMS={'speedScale':.98,'pitchScale':-.015,'intonationScale':.85,'prePhonemeLength':.08,'postPhonemeLength':.15,'outputSamplingRate':24000,'volumeScale':1.0}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def reading(text):
 for old,new in [('1.12','いってんいちに'),('Tier3','ティア三'),('Tier4','ティア四'),('コノハナサクヤヒメ','このはなさくやひめ'),('SSR','エスエスアール'),('SR','エスアール'),('XR','エックスアール'),('白灯石','はくとうせき'),('桜の返礼','さくらのへんれい'),('花宴の循環','かえんのじゅんかん'),('庇護','ひご'),('慈雨','じう'),('残響石','ざんきょうせき'),('Tier6','ティア六'),('T6','ティア六'),('T4','ティア四'),('T3','ティア三'),('HP','エイチピー')]:text=text.replace(old,new)
 return text

def call(path,data=b''):
 req=urllib.request.Request('http://127.0.0.1:50021'+path,data=data,headers={'Content-Type':'application/json'})
 return urllib.request.urlopen(req,timeout=180).read()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('story');ap.add_argument('--draft',action='store_true');a=ap.parse_args();p=Path(a.story);story=json.loads(p.read_text());assert story['episode']=='THIS-GIRL-002';assert a.draft or story['finalized'],'Final narration requires an evidence-reviewed story';story_sha=sha(p);code_sha=sha(__file__)
 version=json.loads(urllib.request.urlopen('http://127.0.0.1:50021/version',timeout=30).read());assert version=='0.26.0',version
 (O/'speech').mkdir(exist_ok=True)
 for chapter in story['chapters']:
  for index,line in enumerate(chapter['lines']):
   tts=reading(line['text']);contract={'text':line['text'],'reading':tts,'speaker':8,'parameters':PARAMS,'engineVersion':version,'codeSha256':code_sha};key=hashlib.sha256(json.dumps(contract,ensure_ascii=False,sort_keys=True).encode()).hexdigest();dst=O/'speech'/(key+'.flac');marker=dst.with_suffix('.cache.json');query_path=dst.with_suffix('.query.json')
   cached=False
   if dst.exists()and marker.exists()and query_path.exists():
    try:
     m=json.loads(marker.read_text());cached=m.get('key')==key and m.get('sha256')==sha(dst) and m.get('querySha256')==sha(query_path)
    except (ValueError,OSError):pass
   if not cached:
    query=json.loads(call('/audio_query?'+urllib.parse.urlencode({'text':tts,'speaker':8})));query.update(PARAMS);query_path.write_text(json.dumps(query,ensure_ascii=False,indent=2));raw=call('/synthesis?speaker=8',json.dumps(query).encode());wav=dst.with_suffix('.wav');wav.write_bytes(raw);subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a','flac',str(dst)],check=True);wav.unlink();marker.write_text(json.dumps({'key':key,'sha256':sha(dst),'querySha256':sha(query_path)},indent=2))
   duration=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(dst)]))['format']['duration']);line.update(ttsText=tts,file=str(dst.relative_to(ROOT)),sha256=sha(dst),queryFile=str(query_path.relative_to(ROOT)),querySha256=sha(query_path),duration=duration,voiceId=8,lineId=chapter['id']+f'-{index:02d}')
  print(chapter['id'],round(sum(line['duration']for line in chapter['lines']),2),flush=True)
 assert sha(p)==story_sha and sha(__file__)==code_sha,'Narration inputs changed during synthesis'
 record={'finalized':bool(story['finalized']),'episode':story['episode'],'storySha256':story_sha,'codeSha256':code_sha,'engine':version,'speaker':story['speaker'],'parameters':PARAMS,'chapters':story['chapters']}
 (O/('narration-draft.json'if a.draft else'narration.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2));print('Voice seconds',sum(line['duration']for c in story['chapters']for line in c['lines']),flush=True)
if __name__=='__main__':main()
