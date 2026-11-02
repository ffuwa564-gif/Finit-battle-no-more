from pathlib import Path
import json,hashlib,urllib.request,urllib.parse,subprocess,math
from story import CH, STORY_FINALIZED, ROSTER_TARGET_SECONDS
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-04'
CODE_SHA=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
STORY_SHA=hashlib.sha256(Path(__file__).with_name('story.py').read_bytes()).hexdigest()
def assert_inputs_unchanged():
 if hashlib.sha256(Path(__file__).read_bytes()).hexdigest()!=CODE_SHA or hashlib.sha256(Path(__file__).with_name('story.py').read_bytes()).hexdigest()!=STORY_SHA:raise RuntimeError('Synthesis inputs changed while running; stop before publishing narration.')
def tts_text(text):
 # Display captions remain unchanged. Review new skill/stone readings against final evidence.
 return text.replace('白灯石','はくとうせき').replace('薬布','やくふ').replace('祈り手','いのりて').replace('余花','よか').replace('標を','しるしを').replace('名札','なふだ').replace('残響石','ざんきょうせき').replace('祓いの涙石','はらいのなみだいし').replace('差戻し','さしもどし').replace('誤撃','ごげき').replace('札','ふだ').replace('休番','きゅうばん').replace('連勤','れんきん').replace('HP','エイチピー').replace('二人回復案','ふたり回復案').replace('灯','あかり').replace('SSR','エスエスアール').replace('BD001','ビー・ディー・ゼロ・ゼロ・イチ').replace('BD069','ビー・ディー・ゼロ・ロク・キュウ').replace('BD070','ビー・ディー・ゼロ・ナナ・ゼロ').replace('BD071','ビー・ディー・ゼロ・ナナ・イチ').replace('Rの','アールの').replace('灯を返す夜番','あかりを返す夜番').replace('1.11版','バージョンいってんいちいち').replace('1.10版','バージョンいってんいちぜろ').replace('夜継ぎ','よつぎ').replace('十二点三六','12.36').replace('六点三八','6.38').replace('八点九三','8.93').replace('九点六六','9.66').replace('九点七〇ラウンド','9.7ラウンド')
def synth(l):
 assert_inputs_unchanged()
 ttsText=tts_text(l['text'])
 who=l['speaker'];speaker={'z':3,'m':2,'t':8}[who];params={'speedScale':{'z':1.10,'m':1.07,'t':1.10}[who],'intonationScale':1.14,'prePhonemeLength':.045,'postPhonemeLength':.07,'outputSamplingRate':24000,'volumeScale':1.0};key=hashlib.sha256(json.dumps({'text':l['text'],'ttsText':ttsText,'speaker':speaker,'params':params,'engine':'0.26.0','code':CODE_SHA,'story':STORY_SHA},ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:24];p=O/'speech'/(key+'.flac');mark=p.with_suffix('.key')
 def call(path,data):return urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:50021'+path,data=data,headers={'Content-Type':'application/json'}),timeout=180).read()
 if not(p.exists()and mark.exists()and mark.read_text()==key):
  q=json.loads(call('/audio_query?'+urllib.parse.urlencode({'text':ttsText,'speaker':speaker}),b''));q.update(params);raw=call('/synthesis?speaker='+str(speaker),json.dumps(q).encode());w=p.with_suffix('.wav');w.write_bytes(raw);subprocess.run(['ffmpeg','-v','error','-y','-i',str(w),'-c:a','flac',str(p)],check=True);w.unlink();mark.write_text(key)
 dur=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(p)]))['format']['duration']);return{**l,'speaker':who,'ttsText':ttsText,'wav':str(p.relative_to(ROOT)),'duration':dur,'voiceId':speaker}
def write_roster_ready(c):
 voice=sum(l['duration']for l in c['lines']);count=len(c['lines']);gap=max(.14,min(1.4,(ROSTER_TARGET_SECONDS-.8-voice)/max(1,count-1)))
 duration=math.ceil(max(.4+voice+count*gap+.35,ROSTER_TARGET_SECONDS)*30)/30
 ready={'chapter':c,'voiceSeconds':voice,'gap':gap,'duration':duration,'frames':round(duration*30),
        'synthSha256':CODE_SHA,'storySha256':STORY_SHA,
        'inputAudioHashes':{l['wav']:hashlib.sha256((ROOT/l['wav']).read_bytes()).hexdigest()for l in c['lines']}}
 (O/'roster-ready.json').write_text(json.dumps(ready,ensure_ascii=False,indent=2))
 print('ROSTER READY',round(voice,3),round(duration,3),flush=True)
def main():
 assert STORY_FINALIZED,'Research evidence and critic review must be finalized before synthesis.'
 (O/'speech').mkdir(parents=True,exist_ok=True)
 engine=json.loads(urllib.request.urlopen('http://127.0.0.1:50021/version',timeout=30).read());assert engine=='0.26.0',engine
 for c in CH:
  c['lines']=[synth(l)for l in c['lines']]
  if c['id']=='roster':write_roster_ready(c)
  print('VOICE READY',c['id'],round(sum(l['duration']for l in c['lines']),1),flush=True)
 assert_inputs_unchanged()
 n={'processingSha256':CODE_SHA,'storySha256':STORY_SHA,'chapters':CH,'sourceGameCommit':'489d5a4b15f02385c7229a2b2ff29f76da0abf44','appVersion':'1.11.0','voicevoxVersion':'0.26.0','scope':'Current app footage plus explicitly labelled prototype log playback. Research commentary after the native engine tests.'};(O/'narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2));print('SPEECH COMPLETE',sum(l['duration']for c in CH for l in c['lines']),sum(len(c['lines'])for c in CH),flush=True)
if __name__=='__main__':main()
