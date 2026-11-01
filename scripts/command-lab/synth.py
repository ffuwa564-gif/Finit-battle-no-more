"""Incremental VOICEVOX synthesis; reruns reuse content-addressed speech."""
import concurrent.futures,hashlib,json,pathlib,runpy,time,urllib.request,urllib.parse,wave,re
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/command-lab';CACHE=OUT/'speech';CACHE.mkdir(exist_ok=True)
SCRIPT=pathlib.Path(__file__).with_name('chapters.py');API='http://127.0.0.1:50021'
def params(line):
 who=line['speaker'];speaker=3 if who=='z'else 6 if line.get('mood')=='firm'else 2
 text=line.get('spoken',line['text']);text=text.replace('STILLVEIL','スティルヴェイル').replace('T6','ティア六').replace('T3','ティア三').replace('HP','体力').replace('CD','待ち時間').replace('神名','しんめい').replace('分け杯','わけさかずき')
 text=re.sub(r'(\d+)R',r'\1ラウンド',text)
 setting={'speedScale':1.09 if who=='z'else 1.06,'intonationScale':1.15 if who=='z'else 1.08,'prePhonemeLength':.06,'postPhonemeLength':.10,'outputSamplingRate':24000,'volumeScale':1.0}
 key=hashlib.sha256(json.dumps([speaker,text,setting],ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:24]
 return speaker,text,setting,CACHE/(key+'.wav')
def call(path,data):return urllib.request.urlopen(urllib.request.Request(API+path,data=data,headers={'Content-Type':'application/json'}),timeout=240).read()
def synth(line):
 speaker,text,setting,path=params(line)
 if not path.exists():
  q=json.loads(call('/audio_query?'+urllib.parse.urlencode({'text':text,'speaker':speaker}),b''));q.update(setting)
  payload=call('/synthesis?speaker='+str(speaker),json.dumps(q).encode());temp=path.with_suffix('.tmp');temp.write_bytes(payload);temp.replace(path)
 with wave.open(str(path))as f:dur=f.getnframes()/f.getframerate()
 return {**line,'voice_id':speaker,'spoken':text,'wav':str(path.relative_to(ROOT)),'duration':dur}
def timeline(chapters):
 out=[];clock=0;complete=True
 for ch in chapters:
  lines=[];local=.45
  for original in ch['lines']:
   _,_,_,p=params(original)
   if not p.exists():complete=False;break
   line=synth(original);line.update(start=round(clock+local,4),end=round(clock+local+line['duration'],4));local+=line['duration']+.17;lines.append(line)
  if len(lines)!=len(ch['lines']):break
  dur=round(local+.45,4);out.append({**ch,'start':round(clock,4),'duration':dur,'lines':lines});clock+=dur
 data={'duration':round(clock,4),'chapters':out,'unimplemented':True,'sourceGameCommit':'616a0747c4118a991770226d37347f34b31e2ec6','voicevoxVersion':'0.26.0'}
 (OUT/'narration-partial.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));return data,complete
if __name__=='__main__':
 while True:
  doc=runpy.run_path(str(SCRIPT));chapters=doc['CHAPTERS'];missing=[line for ch in chapters for line in ch['lines']if not params(line)[3].exists()]
  if missing:
   with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
    for i,_ in enumerate(pool.map(synth,missing[:24])):
     if i%10==0:print('SYNTH',i+1,'/',min(24,len(missing)),flush=True)
     timeline(chapters)
  data,complete=timeline(chapters)
  if doc['FINAL'] and complete:
   (OUT/'narration.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));print('NARRATION COMPLETE',data['duration']/60,'minutes',flush=True);break
  time.sleep(3)
