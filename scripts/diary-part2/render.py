"""Frame/sample-addressed video edit. Reuse requires inputs + edit + code hashes."""
import json,math,pathlib,subprocess,sys,wave,hashlib
import numpy as np
from scipy.signal import resample_poly
from visuals import plate,wrap,COL,NAMES
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2';R=O/'render';R.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,sha256
FPS=30;SR=48000

def ff(*a):subprocess.run(['ffmpeg','-v','error','-y',*map(str,a)],check=True)
def duration(p):return float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(p)]))['format']['duration'])
def key(inputs,edit):return hashlib.sha256(json.dumps({'inputs':{str(p):sha256(p)for p in inputs},'edit':edit,'code':sha256(__file__),'graphics':sha256(pathlib.Path(__file__).with_name('visuals.py'))},sort_keys=True).encode()).hexdigest()
def cached(out,k):
 p=out.with_suffix(out.suffix+'.key');return out.exists()and p.exists()and p.read_text()==k

def clock(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02d}:{n//100%60:02d}.{n%100:02d}'
def ass(ch,path):
 s='''[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Noto Sans CJK JP,40,&H00F5F2E8,&H00FFFFFF,&H00201610,&H80000000,1,0,0,0,100,100,1,0,1,3,1,2,70,70,25,1\nStyle: Info,Noto Sans CJK JP,19,&H00F2E0AD,&H00FFFFFF,&H00100B05,&H80000000,0,0,0,0,100,100,0,0,1,2,0,7,0,0,0,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
 for l in ch['lines']:
  color=COL[l['speaker']].lstrip('#');color=color[4:6]+color[2:4]+color[0:2];txt='\\N'.join(wrap(l['text'],40,1720));txt='{\\c&H'+color+'&}'+txt
  s+=f"Dialogue: 2,{clock(l['start']-ch['start'])},{clock(l['end']-ch['start'])},Default,,0,0,0,,{txt}\n"
  s+=f"Dialogue: 3,{clock(l['start']-ch['start'])},{clock(l['end']-ch['start'])},Info,,0,0,0,,{{\\fs25\\pos(60,943)\\c&H{color}&}}{NAMES[l['speaker']]}\n"
 label='実機映像'if ch.get('clip')else'解説：実機画面を静止表示'
 if ch.get('rate',1)>1.01:label+=f" / AV同時 {ch['rate']:.2f}倍速"
 if ch['id']=='ultimate':label='必殺技の場面を再掲 / 実機の演出速度'
 s+=f"Dialogue: 1,0:00:00.00,{clock(ch['duration'])},Info,,0,0,0,,{{\\pos(650,109)}}{label}\n"
 if ch.get('playDuration',ch['duration'])<ch['duration']-.1:
  s+=f"Dialogue: 1,{clock(ch['playDuration'])},{clock(ch['duration'])},Info,,0,0,0,,{{\\pos(650,139)}}解説のため一時停止\n"
 path.write_text(s)

def build():
 partial='--partial'in sys.argv;n=json.loads((O/('narration-partial.json'if partial else'narration.json')).read_text());meta=json.loads((O/'capture/tower-1.json').read_text());start,end=meta['gameplayWindow'];marks=meta['marks'];off=meta['initialOffset'];r8=next(m['time']-off for m in marks if m['kind']=='round'and m['round']==8);r18=next(m['time']-off for m in marks if m['kind']=='round'and m['round']==18)
 le=next(e for e in meta['battleEvents']if e['event'].get('ultimate')and e['event'].get('actorId')=='party:lunette-awakened');on=min((x['time']for x in meta['ultimates']if x['on']),key=lambda x:abs(x-le['time']));ultstart=max(start,on-off-.25);probeStart=on-off+4.6
 brightness=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(probeStart),'-i',str(O/'capture/tower-1.mov'),'-t','1.0','-vf','crop=400:500:25:50,scale=1:1,format=gray','-an','-f','rawvideo','pipe:1']),dtype='u1');white=np.flatnonzero(brightness>220);assert len(white),'No observed Lunette finishing flash';observedWhiteout=round((probeStart+int(white[0])/FPS)*FPS)/FPS;impact=observedWhiteout-.06
 (O/'ultimate-cues.json').write_text(json.dumps({'source':'capture/tower-1.mov','sourceSha256':sha256(O/'capture/tower-1.mov'),'observedWhiteoutFrameTime':observedWhiteout,'narrationFinisherStart':impact,'voicePrePhonemeSeconds':.06,'method':'First measured full finishing whiteout frame, not inferred from a speech length or film duration'},indent=2))
 clips={'main-early':('tower-1',start,r8),'main-middle':('tower-1',r8,r18),'main-late':('tower-1',r18,end),'ultimate':('tower-1',ultstart,ultstart+8)}
 for ident in['first-try','heart-3']:
  m=json.loads((O/f'capture/{ident}.json').read_text());clips[ident]=(ident,*m['gameplayWindow'])
 # Keep commentary continuous; the short ultimate reaction is placed at actual damage timing.
 total=0
 for ch in n['chapters']:
  local=.3
  for j,l in enumerate(ch['lines']):
   if ch['id']=='ultimate'and j==2:local=max(local,on-off+4.275/1.25+.12-ultstart)
   if ch['id']=='ultimate'and j==3:local=max(local,impact-ultstart)
   l.update(start=total+local,end=total+local+l['duration']);local+=l['duration']+.14
  ch.update(start=total,duration=math.ceil((local+.35)*FPS)/FPS);total+=ch['duration']
 n['duration']=total;(O/'timeline-narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2))
 timeline=[]
 for ch in n['chapters']:
  ident=ch['id'];shot=O/'capture'/('first-try-result.png'if ident=='first'else'heart-3-result.png'if ident=='awake'else'tower-1-result.png'if ident in['battle3','review','ending']else'tower-1-start.png')
  piece=None
  if ch['clip']:
   src,ss,ee=clips[ch['clip']];source=O/f'capture/{src}.mov';target=ch['duration']
   if ident=='battle3':target=ch['lines'][9]['start']-ch['start']-.3
   if ident=='first':target=ch['lines'][5]['start']-ch['start']-.3
   rate=max(1,(ee-ss)/target)if ch['id']!='ultimate'else 1;play=min(ch['duration'],(ee-ss)/rate);frames=round(play*FPS);play=frames/FPS
   piece=R/(ident+'-game.mov');edit={'ss':ss,'end':ee,'rate':rate,'frames':frames};k=key([source],edit)
   if not cached(piece,k):
    ff('-ss',ss,'-i',source,'-t',ee-ss,'-vf',f'setpts=(PTS-STARTPTS)/{rate},fps=30','-af',f'atempo={rate},aresample=48000,apad,atrim=end_sample={frames*1600},asetpts=N/SR/TB','-frames:v',frames,'-c:v','libx264','-threads',2,'-crf',23,'-preset','veryfast','-c:a','pcm_s16le',piece);piece.with_suffix('.mov.key').write_text(k)
   ch.update(rate=rate,playDuration=play);timeline.append({'chapter':ident,'start':ch['start'],'duration':ch['duration'],'playDuration':play,'piece':str(piece.relative_to(ROOT)),'pieceHash':sha256(piece),'source':str(source.relative_to(ROOT)),'sourceStart':ss,'sourceEnd':ee,'rate':rate,'gameCrop':'450:800:640:105'})
  png=R/(ident+'.png');plate(ch,png,shot);subs=R/(ident+'.ass');ass(ch,subs);out=R/(ident+'.mp4');k=key([png,subs]+([piece]if piece else[]),{'frames':round(ch['duration']*FPS)})
  if not cached(out,k):
   args=['-loop',1,'-framerate',FPS,'-i',png]
   if piece:args+=['-i',piece];filt=f'[1:v]tpad=stop_mode=clone:stop_duration={ch["duration"]}[g];[0:v][g]overlay=640:105:shortest=1,ass={subs}[v]'
   else:filt=f'[0:v]ass={subs}[v]'
   ff(*args,'-filter_complex',filt,'-map','[v]','-frames:v',round(ch['duration']*FPS),'-an','-c:v','libx264','-threads',2,'-preset','veryfast','-crf',26,'-pix_fmt','yuv420p',out);out.with_suffix('.mp4.key').write_text(k)
  print('RENDERED',ident,ch['duration'],flush=True)
 (O/'edit-timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2));(O/'timeline-narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2))
 if partial:return
 (R/'movie.ffconcat').write_text('ffconcat version 1.0\n'+''.join(f"file '{ch['id']}.mp4'\n"for ch in n['chapters']));ff('-safe',0,'-f','concat','-i',R/'movie.ffconcat','-c','copy',O/'silent.mp4')
 mix(n,timeline)
 ff('-i',O/'silent.mp4','-i',O/'mix.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-ar',48000,'-movflags','+faststart',O/'delivery/STILLVEIL-TowerDiary-Part2.mp4')

def mix(n,timeline):
 count=round(n['duration']*SR);signal=np.zeros((count,2),np.float32)
 music=audio(ROOT/'public/audio/fjordnosundakaze.mp3');music=np.tile(music,(math.ceil(count/len(music)),1))[:count];signal+=music*.055
 for row in timeline:
  x=audio(ROOT/row['piece']);at=round(row['start']*SR);length=min(len(x),round(row['playDuration']*SR),count-at);signal[at:at+length]+=x[:length]*.52
 for ch in n['chapters']:
  for l in ch['lines']:
   x=audio(ROOT/l['wav']);at=round(l['start']*SR);length=min(len(x),count-at);signal[at:at+length]+=x[:length]*.90
 # Fixed gain preserves relative cues; a transparent ceiling catches only rare peaks.
 peak=float(np.max(abs(signal)));gain=min(1,.89/max(peak,.0001));signal*=gain
 with wave.open(str(O/'mix.wav'),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(signal,-1,1)*32767).astype('<i2').tobytes())
 (O/'mix-manifest.json').write_text(json.dumps({'sampleRate':SR,'startSample':0,'samples':count,'gameGain':.52*gain,'voiceGain':.90*gain,'musicGain':.055*gain,'ceilingGain':gain,'mixSha256':sha256(O/'mix.wav'),'codeSha256':sha256(__file__),'voiceInputs':{l['wav']:sha256(ROOT/l['wav'])for c in n['chapters']for l in c['lines']}},indent=2))
if __name__=='__main__':build()
