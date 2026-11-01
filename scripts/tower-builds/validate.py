import json,pathlib,subprocess,re,math
import numpy as np
from PIL import Image
from render import OUT,RENDER,duration
data=json.loads((OUT/'narration.json').read_text());checks=[];errors=[];frames=[]
def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
def fail(message):errors.append(message)
for c in data['chapters']:
 ident=c['id'];film=RENDER/(ident+'.mp4')
 if not film.exists():fail(ident+': render missing');continue
 try:info=probe(film)
 except subprocess.CalledProcessError:fail(ident+': invalid MP4');continue
 vs=next(s for s in info['streams']if s['codec_type']=='video');aus=next(s for s in info['streams']if s['codec_type']=='audio');dur=float(info['format']['duration'])
 if(vs['width'],vs['height'],vs['r_frame_rate'])!=(1280,720,'30/1'):fail(ident+': format mismatch')
 if abs(dur-c['duration'])>.12:fail(ident+': duration mismatch')
 shot_times=[1,c['duration']*.55,c['duration']-1.5]
 for n,t in enumerate(shot_times):
  path=RENDER/f'review-{ident}-{n}.png';subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(t),'-i',str(film),'-frames:v','1',str(path)],check=True)
  im=Image.open(path).convert('RGB');roi=np.asarray(im.crop((474,15,806,630)));stdev=float(roi.std())
  if stdev<9:fail(ident+': empty game viewport')
  small=im.resize((320,180));frames.append((ident+f' {t:.1f}s',small))
 item={'id':ident,'duration':dur,'codec':vs['codec_name'],'dimensions':[vs['width'],vs['height']],'frameRate':vs['r_frame_rate'],'audioCodec':aus['codec_name'],'sampleRate':aus['sample_rate']}
 if ident not in ['intro','outro']:
  meta=json.loads((OUT/'capture'/(ident+'.json')).read_text());p=json.loads((OUT/'proofs'/(ident+'.json')).read_text());item|={'nativeFullRunVerified':p['nativeVerified'],'nativeBrowserVerified':meta['nativeBrowserVerified'],'captureMethod':meta.get('recordingMethod','Complete native battle capture'),'sourcePhase':meta['phase']}
  if not p['nativeVerified']or not meta['nativeBrowserVerified']or meta['phase']!='reward':fail(ident+': native proof missing')
  edit=json.loads((RENDER/(ident+'-edit.json')).read_text());windows=edit['windows'];es=[x['event']for x in meta.get('battleEvents',[]) if any(start<=x['time']-meta['offset']<=start+length for start,length in windows)];party=lambda e:e.get('actorId','').startswith('party:');enemy=lambda e:e.get('actorId','').startswith('enemy:')
  keys={'shield':'shield-break','drain':'night-dew','dawn':'dawn-crown','sleep':'dream-lace','cleanse':'clear-tear','rewind':'rewind-thread','battery':'star-furnace','execute':'dawn-crown','dream6':'dream-lace','recycle':'barrier-mend','rally':'rally','regen':'regen'}
  if ident in keys and not any(party(e)and keys[ident]in e.get('skillId','')for e in es):fail(ident+': mechanism not filmed')
  if ident in ['confuse','charm','paralysis']:
   ail={'confuse':'confusion','charm':'charm','paralysis':'paralysis'}[ident];action='skip'if ident=='paralysis'else'friendly_fire'
   if not any(enemy(e)and e.get('ailment')==ail and e.get('statusAction')==action for e in es):fail(ident+': control outcome not filmed')
  if ident in ['battery','area']and not any(e.get('ultimate')and e.get('actorId')=='party:lunette-awakened'for e in es):fail(ident+': Lunette ultimate not filmed')
  raw=probe(OUT/'capture'/(ident+'.mp4'));av=[float(s.get('duration',0))for s in raw['streams']if s['codec_type']in ['audio','video']];item['sourceAVDurationDifference']=abs(av[0]-av[1]);item['sourceClockOffset']=meta['offset']
  if abs(meta['offset'])>.4:fail(ident+': source clocks not aligned')
  peak=subprocess.run(['ffmpeg','-hide_banner','-i',str(OUT/'capture'/(ident+'.mp4')),'-vn','-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True).stderr
  match=re.search(r'mean_volume: ([\-\d.]+) dB',peak);item['nativeSEMeanDB']=float(match.group(1))if match else -999
  if item['nativeSEMeanDB']<-45:fail(ident+': native SE too quiet or missing')
 checks.append(item)
from PIL import ImageDraw
sheet=Image.new('RGB',(320*5,205*math.ceil(len(frames)/5)),'#101520');draw=ImageDraw.Draw(sheet)
for i,(label,im)in enumerate(frames):x=i%5*320;y=i//5*205;sheet.paste(im,(x,y));draw.text((x+4,y+183),label,fill='white')
sheet.save(OUT/'delivery/Review-Contact.png')
gaps=[];prior=None
for c in data['chapters']:
 for line in c['lines']:
  if prior is not None:gaps.append(line['start']-prior)
  prior=line['end']
final=OUT/'STILLVEIL-Tower1-19Builds-720p.mp4';finalInfo={}
if final.exists():
 finalInfo=probe(final);actualDuration=float(finalInfo['format']['duration']);expectedDuration=sum(c['duration']for c in checks)
 if abs(actualDuration-expectedDuration)>.3:fail('final: incomplete concatenation')
 decoded=subprocess.run(['ffmpeg','-hide_banner','-nostats','-xerror','-i',str(final),'-threads','2','-af','volumedetect,silencedetect=noise=-50dB:d=2.5','-f','null','-'],capture_output=True,text=True)
 if decoded.returncode:fail('final: decode failed')
 peaks=re.findall(r'max_volume: ([\-\d.]+) dB',decoded.stderr);silences=re.findall(r'silence_duration: ([\d.]+)',decoded.stderr)
 finalInfo={'duration':actualDuration,'expectedDuration':expectedDuration,'bytes':final.stat().st_size,'fullyDecoded':decoded.returncode==0,'maxDBFS':float(peaks[-1])if peaks else None,'silencesOver2p5Seconds':silences,'masterTargetLUFS':-16,'masterTargetTruePeakDB':-1.5}
 if silences:fail('final: long silence detected')
else:fail('final: file missing')
result={'passed':not errors,'sourceCommit':'616a0747c4118a991770226d37347f34b31e2ec6','chapters':len(checks),'builds':len(checks)-2,'maxScheduledSpeechGap':max(gaps),'errors':errors,'checks':checks,'final':finalInfo}
(OUT/'delivery/Validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({'passed':result['passed'],'chapters':len(checks),'errors':errors},ensure_ascii=False),flush=True)
if errors:raise SystemExit(1)
