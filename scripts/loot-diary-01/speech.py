from pathlib import Path
import json,hashlib,urllib.request,urllib.parse,subprocess,time
O=Path('artifacts/loot-diary-01');D=O/'speech';D.mkdir(exist_ok=True)
story=json.loads((O/'story.json').read_text());ids={'t':8,'z':3,'m':2}
replacements={'STILLVEIL':'スティルヴェイル','サクヤヒメ':'サクヤヒメ','ノクス':'ノクス','暁冠':'ギョウカン','慈雨':'ジウ','SR':'エスアール','T7':'ティア七','T6':'ティア六','HP':'エイチピー','1.30':'一点三十'}
def call(path,data=None):return urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:50021'+path,data=data,headers={'Content-Type':'application/json'}),timeout=180).read()
version=json.loads(call('/version'));assert version=='0.26.0'
for ch in story:
 for i,line in enumerate(ch['lines']):
  reading=line['text']
  for a,b in replacements.items():reading=reading.replace(a,b)
  params={'speedScale':1.12,'intonationScale':1.04,'pitchScale':0.0,'prePhonemeLength':.06,'postPhonemeLength':.10,'volumeScale':1.0,'outputSamplingRate':48000}
  key=hashlib.sha256(json.dumps([reading,ids[line['speaker']],params,version],ensure_ascii=False,sort_keys=True).encode()).hexdigest();p=D/(key+'.wav')
  if not p.exists():
   q=json.loads(call('/audio_query?'+urllib.parse.urlencode({'text':reading,'speaker':ids[line['speaker']]}),b''));q.update(params)
   if '慈雨' in line['text']:
    for phrase in q['accent_phrases']:
     for mora in phrase['moras']:
      if mora['text']=='ウ':mora['vowel']='u';mora['vowel_length']=max(.14,mora['vowel_length'])
   (D/(key+'.query.json')).write_text(json.dumps(q,ensure_ascii=False));p.write_bytes(call('/synthesis?speaker='+str(ids[line['speaker']]),json.dumps(q).encode()))
  duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(p)]));line.update(path=str(p),duration=duration,reading=reading,voiceId=ids[line['speaker']],sha256=hashlib.sha256(p.read_bytes()).hexdigest())
 print(ch['id'],sum(l['duration'] for l in ch['lines']),flush=True)
 (O/'narration.json').write_text(json.dumps(story,ensure_ascii=False,indent=2))
print('TOTAL',sum(l['duration']for c in story for l in c['lines']),flush=True)
