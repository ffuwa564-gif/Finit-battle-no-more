from pathlib import Path
import json,hashlib,subprocess,wave,importlib.metadata,sys,dataclasses
from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-03-v2';R=O/'rerecord';V=Path('/workspace/Finit-battle-no-more/artifacts/tower-diary-01/voice-runtime');sys.path.insert(0,str(ROOT/'scripts/this-girl-03-v2/editor'));from synth import reading,PARAMS
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();code=sha(__file__);source=R/'story.json';sh=sha(source);story=json.loads(source.read_text());out=O/'speech';out.mkdir(exist_ok=True)
e=Synthesizer(Onnxruntime.load_once(filename=str(next((V/'ort').rglob('libvoicevox_onnxruntime.so.1.17.3')))),OpenJtalk(str(V/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=3)
with VoiceModelFile.open(str(V/'0.vvm'))as m:e.load_voice_model(m)
model=sha(V/'0.vvm')
for c in story['chapters']:
 for i,l in enumerate(c['lines']):
  ident=c['id']+f'-{i:02d}';spoken=reading(l['text']);contract={'text':l['text'],'spoken':spoken,'style':8,'parameters':PARAMS,'model':model,'code':code};key=hashlib.sha256(json.dumps(contract,sort_keys=True,ensure_ascii=False).encode()).hexdigest();p=out/(key+'.flac');qfile=out/(key+'.query.json');cache=out/(key+'.cache.json')
  if not(p.exists()and cache.exists()and qfile.exists()and json.loads(cache.read_text()).get('sha256')==sha(p)):
   q=e.create_audio_query(spoken,8);q.speed_scale=.98;q.pitch_scale=-.015;q.intonation_scale=.85;q.pre_phoneme_length=.08;q.post_phoneme_length=.15;q.output_sampling_rate=24000
   corrections=[]
   if '慈雨'in l['text']:
    for a in q.accent_phrases:
     for j in range(len(a.moras)-1):
      if a.moras[j].text=='ジ' and a.moras[j+1].text in ['イ','ウ']:
       corrections.append({'before':[a.moras[j].text,a.moras[j+1].text]});a.moras[j+1].text='ウ';a.moras[j+1].vowel='u'
    assert corrections,'Explicit ジ・ウ phoneme pair required'
   raw=e.synthesis(q,8);wav=p.with_suffix('.wav');wav.write_bytes(raw);subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a','flac',str(p)],check=True);wav.unlink();qfile.write_text(json.dumps(dataclasses.asdict(q),ensure_ascii=False,indent=2));cache.write_text(json.dumps({'key':key,'contract':contract,'sha256':sha(p),'querySha256':sha(qfile),'pronunciationCorrections':corrections},ensure_ascii=False,indent=2))
  dur=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(p)]))['format']['duration']);l.update(lineId=ident,file=str(p.relative_to(ROOT)),sha256=sha(p),queryFile=str(qfile.relative_to(ROOT)),querySha256=sha(qfile),duration=dur,voiceId=8,ttsText=spoken)
  print(ident,round(dur,2),flush=True)
 assert sha(source)==sh and sha(__file__)==code
n={**story,'engine':'VOICEVOX Core '+importlib.metadata.version('voicevox_core'),'modelSha256':model,'parameters':PARAMS,'storySha256':sh,'codeSha256':code};(O/'narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2));print('TOTAL VOICE',sum(l['duration']for c in story['chapters']for l in c['lines']),flush=True)
