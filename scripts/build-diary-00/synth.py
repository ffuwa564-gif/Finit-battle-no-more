from pathlib import Path
import json,hashlib,wave,importlib.metadata
from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
B=Path(__file__).resolve().parent;R=Path('/workspace/Finit-battle-no-more/artifacts/tower-diary-01/voice-runtime');(B/'speech').mkdir(exist_ok=True)
codeHash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest();storyHash=hashlib.sha256((B/'story.json').read_bytes()).hexdigest();engine=Synthesizer(Onnxruntime.load_once(filename=str(next((R/'ort').rglob('libvoicevox_onnxruntime.so.1.17.3')))),OpenJtalk(str(R/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=3)
with VoiceModelFile.open(str(R/'0.vvm'))as m:engine.load_voice_model(m)
chapters=json.loads((B/'story.json').read_text());rows=[]
for ci,ch in enumerate(chapters):
 for li,line in enumerate(ch['lines']):
  assert hashlib.sha256((B/'story.json').read_bytes()).hexdigest()==storyHash
  who=line['speaker'];text=line['text'];spoken=text
  for a,b in [('一・一〇','いってんいちぜろ'),('ＲＰＧ','アールピージー'),('スティルヴェイル','スティルヴェイル'),('ＨＰ','エイチピー'),('ＳＳＲ','エスエスアール'),('ＸＲ','エックスアール'),('ＳＲ','エスアール'),('Ｒが','アールが'),('記憶石','きおくせき'),('白灯石','はくとうせき'),('残響石','ざんきょうせき'),('星図','せいず'),('桜花','おうか'),('一手','いって'),('二百','にひゃく'),('Δ','デルタ')]:spoken=spoken.replace(a,b)
  style={'t':8,'z':3,'m':2}[who];params={'speed':1.06 if who!='z'else 1.09,'intonation':1.10,'pre':.055,'post':.085};key=hashlib.sha256(json.dumps([spoken,style,params,codeHash,storyHash],ensure_ascii=False).encode()).hexdigest();path=B/'speech'/f'{ci:02}-{li:02}-{key[:12]}.wav'
  if not(path.exists()and path.with_suffix('.key').exists()and path.with_suffix('.key').read_text()==key):
   q=engine.create_audio_query(spoken,style);q.speed_scale=params['speed'];q.intonation_scale=params['intonation'];q.pre_phoneme_length=params['pre'];q.post_phoneme_length=params['post'];path.write_bytes(engine.synthesis(q,style));path.with_suffix('.key').write_text(key)
  with wave.open(str(path),'rb')as f:duration=f.getnframes()/f.getframerate()
  rows.append({**line,'id':f'{ci:02}-{li:02}','chapter':ch['id'],'chapterTitle':ch['title'],'source':str(path),'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'duration':duration,'spoken':spoken,'style':style});print(ci,li,round(duration,2),text,flush=True)
(B/'narration.json').write_text(json.dumps({'storySha256':storyHash,'codeSha256':codeHash,'voicevoxCoreVersion':importlib.metadata.version('voicevox_core'),'modelSha256':hashlib.sha256((R/'0.vvm').read_bytes()).hexdigest(),'lines':rows},ensure_ascii=False,indent=2));print('speech total',sum(r['duration']for r in rows),flush=True)
