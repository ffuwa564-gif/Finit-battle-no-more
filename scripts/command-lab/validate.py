"""Validate the complete deliverable; arithmetic examples are not combat tests."""
import hashlib,json,pathlib,subprocess,sys
from render import OUT,RENDER,probe,duration,complete_render

def validate():
 data=json.loads((OUT/'narration.json').read_text());movie=OUT/'STILLVEIL-Command-Doctrine-1080p.mp4';p=probe(movie);v=next(s for s in p['streams']if s['codec_type']=='video');a=next(s for s in p['streams']if s['codec_type']=='audio')
 assert len(data['chapters'])==14 and sum(len(ch['lines'])for ch in data['chapters'])==212
 assert v['width']==1920 and v['height']==1080 and v['r_frame_rate']=='30/1'and v['codec_name']=='h264'
 assert a['codec_name']=='aac'and a['sample_rate']=='48000'
 total=sum(duration(RENDER/(ch['id']+'.mp4'))for ch in data['chapters']);assert abs(duration(movie)-total)<.3
 assert total>1200 and movie.stat().st_size<100*1024**2
 source_ids={s['id']for s in json.loads((OUT/'delivery/Sources.json').read_text())};gaps=[];clock=0;previous=0
 for ch in data['chapters']:
  assert complete_render(RENDER/(ch['id']+'.mp4'),ch['duration'])
  assert set(ch.get('source_ids',[]))<=source_ids
  for line in ch['lines']:
   assert (pathlib.Path(__file__).resolve().parents[2]/line['wav']).exists()
   assert line['end']>line['start'] and 0<=line['phase']<len(ch['phases'])
   start=clock+line['start']-ch['start'];end=clock+line['end']-ch['start']
   gaps.append(start-previous);previous=end
  clock+=duration(RENDER/(ch['id']+'.mp4'))
 gaps.append(total-previous)
 assert max(gaps)<1.2
 # Decode every frame and audio packet; ffmpeg failure must be fatal.
 decode_cache=OUT/'delivery/Decode-Validation.json';sha=hashlib.sha256(movie.read_bytes()).hexdigest()
 if not(decode_cache.exists()and json.loads(decode_cache.read_text()).get('sha256')==sha and json.loads(decode_cache.read_text()).get('fullDecodePassed')is True):
  subprocess.run(['ffmpeg','-v','error','-xerror','-threads','2','-i',str(movie),'-map','0:v:0','-map','0:a:0','-f','null','-'],check=True)
  decode_cache.write_text(json.dumps({'sha256':sha,'fullDecodePassed':True,'decoder':'ffmpeg -xerror; all video frames and audio packets'}))
 loud=subprocess.run(['ffmpeg','-hide_banner','-nostats','-threads','2','-i',str(movie),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],check=True,capture_output=True,text=True)
 text=loud.stderr;(OUT/'audio-measurement.log').write_text(text);measure,_=json.JSONDecoder().raw_decode(text[text.rfind('{'):]);assert float(measure['input_tp'])<=-.5
 result={'complete':True,'chapters':14,'utterances':212,'duration':duration(movie),'bytes':movie.stat().st_size,'sha256':hashlib.sha256(movie.read_bytes()).hexdigest(),'video':{k:v[k]for k in ['codec_name','width','height','r_frame_rate']},'audio':{k:a[k]for k in ['codec_name','sample_rate','channels']},'maxScheduledSpeechGapSeconds':round(max(gaps),4),'audioMeasurement':measure,'fullDecodePassed':True,'newAbilitiesImplemented':False,'scope':'Video/source/timeline validation and separate arithmetic models; not a gameplay balance or win-rate test.'}
 (OUT/'delivery/Validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':validate()
