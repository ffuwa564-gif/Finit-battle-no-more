import concurrent.futures,hashlib,json,pathlib,urllib.request,urllib.parse,wave,time
from dialogue import CHAPTERS
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/tower-builds';CACHE=OUT/'speech';CACHE.mkdir(exist_ok=True)
API='http://127.0.0.1:50021'
def request(path,data,ctype):
    return urllib.request.urlopen(urllib.request.Request(API+path,data=data,headers={'Content-Type':ctype}),timeout=180).read()
def generate(item):
    speaker,text=item;speaker_id=3 if speaker=='z' else 2
    # Display text is preserved; only a few abbreviations are expanded for speech.
    spoken=text.replace('T6','ティア六').replace('STILLVEIL','スティルヴェイル').replace('第一区画','第一層')
    key=hashlib.sha256(json.dumps([speaker_id,spoken,1.10 if speaker=='z' else 1.07],ensure_ascii=False).encode()).hexdigest()[:20]
    path=CACHE/(key+'.wav')
    if not path.exists():
        q=json.loads(request('/audio_query?'+urllib.parse.urlencode({'text':spoken,'speaker':speaker_id}),b'','application/json'))
        q.update(speedScale=1.10 if speaker=='z' else 1.07,intonationScale=1.15 if speaker=='z' else 1.08,volumeScale=1.0,prePhonemeLength=.06,postPhonemeLength=.10,outputSamplingRate=24000)
        data=request('/synthesis?speaker='+str(speaker_id),json.dumps(q).encode(),'application/json');path.write_bytes(data)
    with wave.open(str(path)) as w:duration=w.getnframes()/w.getframerate()
    return {'speaker':speaker,'text':text.replace('第一区画','第1層'),'wav':str(path.relative_to(ROOT)),'duration':duration}
all_items=[tuple(line.split('|',1)) for _,_,body in CHAPTERS for line in body.strip().splitlines()]
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for i,result in enumerate(pool.map(generate,all_items)):
        results.append(result)
        if i%10==0:print('speech',i+1,'/',len(all_items),flush=True)
cursor=0;chapters=[];zero=0
for ident,title,body in CHAPTERS:
    count=len(body.strip().splitlines());lines=results[cursor:cursor+count];cursor+=count
    start=zero+.55
    for line in lines:line['start']=round(start,4);line['end']=round(start+line['duration'],4);start+=line['duration']+.16
    duration=round(start-zero+.55,4)
    chapters.append({'id':ident,'title':title,'start':round(zero,4),'duration':duration,'lines':lines});zero+=duration
manifest={'duration':round(zero,4),'voicevoxVersion':'0.26.0','speakers':{'z':{'name':'ずんだもん','id':3},'m':{'name':'四国めたん','id':2}},'chapters':chapters}
(OUT/'narration.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('TOTAL',zero,'seconds',zero/60,'minutes',flush=True)
