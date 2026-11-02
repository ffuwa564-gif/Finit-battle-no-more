"""Render the reusable kawaii laboratory OP on the final 30fps/48kHz clock.

The delivery episode must use opening.mov (PCM), never an AAC OP intermediate.
Animation/card art is composed from original images; all graph motion is procedural.
"""
from pathlib import Path
import json,hashlib,subprocess,sys,math,platform
import PIL
import numpy as np
from PIL import Image
import opening_visuals as V
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-02';R=O/'render/opening'
FPS=30;SR=48000;FRAMES=768;DURATION=FRAMES/FPS
CODE=[Path(__file__),Path(__file__).with_name('opening_visuals.py')]
def rel(p):
 p=Path(p);return str(p.relative_to(ROOT))if p.is_relative_to(ROOT)else str(p)
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb')as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()
def ff(*args):subprocess.run(['ffmpeg','-v','error','-y','-filter_threads','1','-filter_complex_threads','1',*map(str,args)],check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
def cached(p,key):
 marker=p.with_suffix(p.suffix+'.cache.json')
 if not(p.exists()and marker.exists()):return False
 m=json.loads(marker.read_text());return m.get('key')==key and m.get('sha256')==sha(p)
def mark(p,key):p.with_suffix(p.suffix+'.cache.json').write_text(json.dumps({'key':key,'sha256':sha(p)},indent=2))
def beat_aid(music):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(music),'-vn','-af','aresample=async=1:first_pts=0','-ar','22050','-ac','1','-f','f32le','pipe:1']);x=np.frombuffer(raw,dtype='<f4');n=1024;hop=220
 if len(x)<n*2:return{'estimatedBpm':None,'phaseSeconds':0,'method':'Insufficient source length'}
 windows=np.lib.stride_tricks.sliding_window_view(x,n)[::hop];spec=np.abs(np.fft.rfft(windows*np.hanning(n),axis=1));flux=np.maximum(0,np.diff(spec,axis=0)).sum(axis=1);flux=flux/(np.max(flux)+1e-12);flux=np.maximum(0,flux-np.median(flux));step=hop/22050
 scores=[]
 for bpm in np.arange(125,176,.25):
  lag=60/bpm/step;i=int(lag);r=lag-i;s=(1-r)*np.dot(flux[i:],flux[:-i])+r*np.dot(flux[i+1:],flux[:-i-1]);scores.append((float(s),float(bpm)))
 score,bpm=max(scores);period=60/bpm;times=np.arange(len(flux))*step;phases=np.arange(0,period,.005);phase=float(max(phases,key=lambda p:np.interp(np.arange(p,times[-1],period),times,flux).sum()));confidence=float(score/(np.median([v[0]for v in scores])+1e-12))
 return{'estimatedBpm':bpm,'phaseSeconds':phase,'onsetContrastRatio':confidence,'method':'STFT positive spectral-flux autocorrelation in125–175BPM; production timing aid, not a manually verified beat transcription.'}
def scene_bounds(beat):
 canonical=[0,6.4,12.8,20.8,DURATION];bounds=canonical[:];bpm=beat.get('estimatedBpm')
 if bpm and beat.get('onsetContrastRatio',0)>1.02:
  period=60/bpm;phase=beat['phaseSeconds']
  for i,target in enumerate(canonical[1:-1],1):
   near=round((phase+round((target-phase)/period)*period)*FPS)/FPS
   if abs(near-target)<=.22:bounds[i]=near
 return bounds

def dependencies(rows,draft):
 files=[*CODE,O/'asset-reuse.json',R/'registry-input.json',O/'assets/opening-original.mp3',Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'),Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')]
 for name in['t-research-happy','t-research-think','t-research-determined','research-lab']:files.append(V.asset_file(name,draft))
 for name in['z-happy','m-happy']:
  p=O/'assets'/(name+'.png');files.append(p)
 files.extend(Path(v['artFile'])for v in V.selected_rows(rows));return list(dict.fromkeys(files))

def previews(rows,draft,bounds=None):
 R.mkdir(parents=True,exist_ok=True);contact=Image.new('RGB',(1280,720),'white');paths=[]
 for i,t in enumerate([2.,9.,18.7,24.]):
  im=V.frame(t,rows,draft,bounds);p=R/f'preview-{i+1}.jpg';im.save(p,quality=94);small=im.copy();small.thumbnail((640,360));contact.paste(small,(i%2*640,i//2*360));paths.append(str(p.relative_to(ROOT)))
 contact.save(R/'opening-contact.jpg',quality=93);return paths

def opening_qc(video,audio,mov,music):
 sys.path.insert(0,str(ROOT/'tools/media-sync'))
 from media_sync import audio as decode,waveform_lag
 def payload(path,kind):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:'+kind,'-c:v','copy']+([]if kind=='v:0'else['-c:a','pcm_s16le'])+['-f','hash','-hash','sha256','-']).decode().strip()
 videoHash=payload(video,'v:0');assert videoHash==payload(mov,'v:0'),'OP mux changed encoded video packets';audioHash=payload(audio,'a:0');assert audioHash==payload(mov,'a:0'),'OP mux changed PCM audio'
 source=decode(music)[:FRAMES*1600];expected=np.zeros((FRAMES*1600,2),np.float32);expected[:len(source)]=source*.70;env=np.ones(len(expected));fadeIn=round(.06*SR);env[:fadeIn]=np.arange(fadeIn)/fadeIn;start=round(24.8*SR);fadeOut=round(.8*SR);env[start:start+fadeOut]=1-np.arange(fadeOut)/fadeOut;expected*=env[:,None];actual=decode(mov);assert len(actual)==len(expected);rmse=float(np.sqrt(np.mean((actual-expected)**2)));assert rmse<.00005,rmse
 refs=expected.mean(axis=1);candidate=actual.mean(axis=1);anchors=[]
 for t in[1.,12.,23.]:
  st=round(t*SR);n=round(1.2*SR);pad=round(.25*SR);lag,corr=waveform_lag(refs[st:st+n],candidate[st-pad:st+n+pad],SR,0,.25);passed=abs(lag)<=.08 and corr>=.95;anchors.append({'time':t,'lagMs':lag*1000,'correlation':corr,'passed':passed});assert passed,anchors[-1]
 result={'passed':True,'openingMovSha256':sha(mov),'videoPacketHash':videoHash,'pcmAudioPayloadHash':audioHash,'independentMusicPlanRMSE':rmse,'audioAnchors':anchors,'expectedSamples':FRAMES*1600,'note':'Source MP3 reconstructed independently with the declared gain/fades, before any final episode mix; no timing adjustment of the candidate.'};(R/'Opening-QC.json').write_text(json.dumps(result,indent=2));return result

def build():
 draft='--draft'in sys.argv;rows=V.registry_rows(draft);music=O/'assets/opening-original.mp3';R.mkdir(parents=True,exist_ok=True)
 if '--preview'in sys.argv:
  previews(rows,draft);print('OPENING PREVIEWS READY',flush=True);return
 assert not draft,'Draft artwork cannot be used for the final opening';assert music.exists(),'Awaiting original opening music'
 rows=V.selected_rows(rows);curationSource={'registry':'artifacts/build-diary-02/registry.json','readSha256':sha(O/'registry.json'),'purpose':'Only IDs, names and original art paths are used. Certification badges and statuses do not appear in this metaphorical OP.'};descriptor=[{'characterId':v.get('characterId',v.get('id')),'seriesId':v['seriesId'],'name':v['name'],'artPath':rel(v['artFile'])}for v in rows];(R/'registry-input.json').write_text(json.dumps({'entries':descriptor},ensure_ascii=False,indent=2));files=dependencies(rows,False);snapshot={rel(p):sha(p)for p in files};beat=beat_aid(music);bounds=scene_bounds(beat);params={'size':[1920,1080],'fps':30,'frames':FRAMES,'duration':DURATION,'sampleRate':SR,'samples':FRAMES*1600,'boundaries':bounds,'music':{'sourceOffsetSeconds':0,'gain':.70,'fadeInSeconds':.06,'fadeOutStartSeconds':24.8,'fadeOutSeconds':.8},'draft':False,'renderEnvironment':{'python':platform.python_version(),'Pillow':PIL.__version__,'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]}};key=hashlib.sha256(json.dumps({'files':snapshot,'params':params},sort_keys=True).encode()).hexdigest()
 video=R/'op-video.mp4';audio=R/'opening-audio.wav';mov=R/'opening.mov'
 if not cached(video,key):
  cmd=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','pipe:0','-frames:v',str(FRAMES),'-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(video)];proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
  try:
   for i in range(FRAMES):
    proc.stdin.write(V.frame(i/FPS,rows,False,bounds).tobytes())
    if i%120==0:print('OP FRAME',i,'/',FRAMES,flush=True)
   proc.stdin.close();status=proc.wait();assert status==0,status
  except BaseException:
   proc.kill();proc.wait();raise
  assert snapshot=={rel(p):sha(p)for p in files},'Inputs/code changed during rendering; no cache marker will be published'
  mark(video,key)
 if not cached(audio,key):
  ff('-i',music,'-vn','-af',f'aresample=48000:async=1:first_pts=0,volume=0.70,apad,atrim=end_sample={FRAMES*1600},asetpts=N/SR/TB,afade=t=in:st=0:d=0.06,afade=t=out:st=24.8:d=0.8','-ac',2,'-ar',48000,'-c:a','pcm_s16le',audio);mark(audio,key)
 ap=next(v for v in probe(audio)['streams']if v['codec_type']=='audio');assert int(ap['duration_ts'])==FRAMES*1600,('OP WAV sample count',ap['duration_ts'])
 if not cached(mov,key):ff('-i',video,'-i',audio,'-map','0:v','-map','1:a','-c:v','copy','-c:a','pcm_s16le','-shortest',mov);mark(mov,key)
 p=probe(mov);v=next(v for v in p['streams']if v['codec_type']=='video');a=next(v for v in p['streams']if v['codec_type']=='audio');assert v['r_frame_rate']=='30/1'and int(v['nb_frames'])==FRAMES;assert a['sample_rate']=='48000'and a['codec_name']=='pcm_s16le';assert int(a['duration_ts'])==FRAMES*1600,(a['duration_ts'],FRAMES*1600)
 qc=opening_qc(video,audio,mov,music);previewPaths=previews(rows,False,bounds);manifest={'passed':True,'type':'Reusable standalone series opening, original KFB score and illustrated procedural motion','inputs':snapshot,'curationSource':curationSource,'conditions':params,'openingQC':qc,'beatTimingAid':beat,'sourceVideoSha256':sha(video),'sourceAudioSha256':sha(audio),'openingMovSha256':sha(mov),'openingMov':str(mov.relative_to(ROOT)),'previewFrames':previewPaths,'scenes':[{'name':name,'start':bounds[i],'end':bounds[i+1]}for i,name in enumerate(['少女の立ち絵が流れる','熱心なつむぎの研究室','枝分かれの先の輝く可能性','シリーズタイトル'])],'safeArtwork':'All generated full heads and original character illustrations contained with padding; no cover crop. Graph gem lights are visual metaphors, not certification awards.','audioPlan':'Original MP3 decoded once to common48kHz PCM; gain0.70/fades declared above. Root must mix this MOV before the single final AAC encode.','encoder':'H264 veryfast CRF22, two threads, RGB24 procedural original frames, yuv420p output'};(R/'provenance.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print('OPENING READY',DURATION,sha(mov),flush=True)
if __name__=='__main__':build()
