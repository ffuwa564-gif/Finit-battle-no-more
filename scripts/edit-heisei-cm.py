"""Build a 15-second Japanese TV-style spot from one Runway opening and existing game footage.
Runway generation is separate; this script never spends credits or uploads anything.
"""
import argparse,json,math,subprocess,wave
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--preview',action='store_true');p.add_argument('--audio-only',action='store_true');args=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'artifacts/heisei-cm';src=out/'source';work=out/('edit-720' if args.preview else 'edit-1080');work.mkdir(parents=True,exist_ok=True)
S=2/3 if args.preview else 1;W,H=int(1920*S),int(1080*S)
sans='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';bold='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';serif='/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc'
def n(x):return round(x*S)
def even(x):return round(x*S/2)*2
def ff(*a):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-filter_complex_threads','2',*map(str,a)],check=True,cwd=root)
def text(value,size,x,y,color='FFF9E9',font=serif,center=False,border=2,enable=None):
 f=work/f'text-{len(list(work.glob("text-*.txt"))):03d}.txt';f.write_text(value)
 t=f"drawtext=fontfile='{font}':textfile='{f}':fontsize={n(size)}:fontcolor=0x{color}:x={'(w-text_w)/2' if center else n(x)}:y={n(y)}:borderw={n(border)}:bordercolor=0x142035@0.85:shadowcolor=0x020815@0.8:shadowx={n(2)}:shadowy={n(4)}"
 return t+(f":enable='{enable}'" if enable else '')
def sparkles():
 return ','.join(f"drawtext=fontfile='{sans}':text='・':fontsize={n(12+(i%4)*5)}:fontcolor=0xEEDDB3:x={n((i*173+75)%1920)}:y='mod({n(i*89+35)}-t*{n(20+i*2)}+h*2,h)':alpha='0.16+0.18*sin(t*3+{i})'" for i in range(12))
def encode(inputs,graph,label,duration,target):
 ff(*inputs,'-filter_complex',graph+f';{label}setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.1[vout]','-map','[vout]','-frames:v',round(duration*30),'-t',duration,'-an','-c:v','libx264','-threads','4','-preset','fast','-crf','18','-pix_fmt','yuv420p',target)
def hero(art,start,duration,target,copy,extra=None,game=None):
 inputs=['-ss',start,'-i',root/'public/video'/art]
 graph=f'[0:v]split[b][a];[b]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur={n(28)}:2,eq=brightness=-0.17:saturation=0.75,setsar=1,fps=30[bg];[a]scale={even(860)}:{even(1290)},crop={even(860)}:{H}:0:0,setsar=1,fps=30[art];[bg][art]overlay={n(960)}:0[scene];'
 current='scene'
 if game:
  inputs+=['-ss',4.1,'-i',root/'artifacts/trailer/raw/battle/video.mp4']
  graph=f'[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur={n(24)}:2,eq=brightness=-0.22:saturation=0.75,setsar=1,fps=30[bg];[1:v]scale={even(520)}:{even(924)},setsar=1,fps=30[game];[bg]drawbox=x={n(1094)}:y={n(70)}:w={n(532)}:h={n(936)}:color=0xD6BD89:t={n(3)}[frame];[frame][game]overlay={n(1100)}:{n(76)}[scene];'
 filters=[f'drawbox=x=0:y=0:w={n(880)}:h=ih:color=0x06101F@0.32:t=fill',sparkles(),text(copy,82,130,410,font=bold,border=3)]
 if extra:filters.append(text(extra,30,140,550,'DFC89B',sans))
 if game:filters.append(text('ゲーム画面は開発中のものです。',20,1100,1025,font=sans,border=1))
 # Very short white bloom at the cut, like an early smartphone-game TV spot.
 filters += [f'drawbox=x=0:y=0:w=iw:h=ih:color=white@0.33:t=fill:enable=\'lt(t,0.045)\'']
 graph+=f'[{current}]'+','.join(filters)+'[v]'
 encode(inputs,graph,'[v]',duration,target)

picture=work/'picture.mp4'
if args.audio_only and not picture.exists():raise FileNotFoundError(picture)
if not args.audio_only:
 segments=[]
 # 0.0–2.8: new live-action opening. Preserve the generated woman's face and phone.
 f=work/'00-opening.mp4';chain=f'[0:v]scale={W}:{H},setsar=1,fps=30,eq=saturation=0.82:contrast=1.03,'+','.join([text('あの日、',64,150,390),text('忘れた約束を。',64,150,485),f"fade=t=out:st=2.66:d=0.14:color=white"] )+'[v]';encode(['-ss',1.85,'-i',src/'opening.mp4'],chain,'[v]',2.8,f);segments.append(f)
 shots=[
  ('01-seris','seris-awakened.mp4',0.2,2.3,'約束は、まだ。','……来てくれたんだ。',False),
  ('02-battle','seris-awakened.mp4',2,1.5,'戦う。','指示ひとつで、戦況が変わる。',True),
  ('03-kuzuha','kuzuha-awakened.mp4',2,0.9,'出逢いが、',None,False),
  ('04-goddess','gacha-amaterasu.mp4',3,0.9,'運命を変える。','女神たちとの、新たな出会い。',False),
  ('05-awaken','seris-awakened.mp4',4,1.8,'約束の、その先へ。','AWAKEN',False),
 ]
 for name,art,start,duration,copy,extra,game in shots:
  f=work/f'{name}.mp4';hero(art,start,duration,f,copy,extra,game);segments.append(f);print('Rendered',name,flush=True)
 # 10.2–15.0: title, cast, a nostalgic search window, and the real destination.
 f=work/'06-end.mp4'
 inputs=['-ss',3,'-i',root/'public/video/kuzuha-awakened.mp4','-ss',1,'-i',root/'public/video/home-portrait-anime.mp4']
 graph=f'[0:v]split[b][l];[b]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur={n(28)}:2,eq=brightness=-0.23:saturation=0.6,setsar=1,fps=30[bg];[l]scale={even(740)}:{even(1110)},crop={even(740)}:{H}:0:0,setsar=1,fps=30[left];[1:v]scale={even(1080)}:{H},crop={even(740)}:{H}:{n(170)}:0,setsar=1,fps=30[right];[bg][left]overlay=-{n(100)}:0[a];[a][right]overlay={n(1270)}:0[b];[b]drawbox=x=0:y=0:w=iw:h=ih:color=0x061022@0.35:t=fill,'
 filters=[sparkles(),text('静謐のダンジョンRPG',32,0,165,'F4DFB0',sans,True),text('STILLVEIL',154,0,246,'FFF9E9',serif,True,3),text('静謐の残響',48,0,449,'F4DFB0',serif,True),text('ブラウザで無料プレイ',38,0,601,'FFF9E9',bold,True),f"drawbox=x={n(520)}:y={n(720)}:w={n(880)}:h={n(115)}:color=0xF7F6EF:t=fill:enable='gte(t,2.15)'",f"drawbox=x={n(520)}:y={n(720)}:w={n(880)}:h={n(115)}:color=0xC9B68A:t={n(4)}:enable='gte(t,2.15)'",f"drawbox=x={n(1200)}:y={n(727)}:w={n(192)}:h={n(100)}:color=0x385975:t=fill:enable='gte(t,2.15)'",text('スティルヴェイル',43,562,747,'24313F',sans,border=0,enable='gte(t,2.15)'),text('検索',42,1245,747,'FFFFFF',bold,border=0,enable='gte(t,2.15)'),text('fluffy3546.itch.io/stillveil',32,0,883,'FFF9E9',sans,True),text('開発中',20,0,952,'D7DDE5',sans,True),text('音楽：甘茶の音楽工房（作曲：甘茶）',18,38,1026,'CCD3DF',sans,border=1)]
 filters += [f"drawbox=x={n(1200)}:y={n(727)}:w={n(192)}:h={n(100)}:color=0x253F54:t=fill:enable='between(t,4.35,4.47)'",text('検索',42,1247,749,'FFFFFF',bold,border=0,enable='between(t,4.35,4.47)')]
 graph+=','.join(filters)+',fade=t=out:st=4.66:d=0.14[v]';encode(inputs,graph,'[v]',4.8,f);segments.append(f)
 manifest=work/'segments.ffconcat';manifest.write_text('ffconcat version 1.0\n'+''.join(f"file '{f}'\n" for f in segments))
 picture=work/'picture.mp4'
 inputs=[]
 for f in segments:inputs+=['-i',f]
 joined=''.join(f'[{i}:v]settb=AVTB,setpts=PTS-STARTPTS[v{i}];' for i in range(len(segments)))+''.join(f'[v{i}]' for i in range(len(segments)))+f'concat=n={len(segments)}:v=1:a=0,fps=30[v]'
 ff(*inputs,'-filter_complex',joined,'-map','[v]','-frames:v',450,'-an','-c:v','libx264','-threads',4,'-preset','fast','-crf',18,'-pix_fmt','yuv420p',picture)
# Synthetic transition accents: wind rises, short low impacts, a glistening search click.
sr=48000;mix=np.zeros((15*sr,2),dtype=np.float64);rng=np.random.default_rng(2013)
def add(at,y,pan=0):
 start=round(at*sr);count=min(len(y),len(mix)-start)
 if count>0:mix[start:start+count,0]+=y[:count]*math.sqrt((1-pan)/2);mix[start:start+count,1]+=y[:count]*math.sqrt((1+pan)/2)
for at in [2.64,5.05,6.55,7.45,8.35,10.14]:
 t=np.arange(round(.34*sr))/sr;env=np.sin(np.pi*np.clip(t/.34,0,1))**2;noise=rng.normal(0,1,len(t));noise=np.convolve(noise,np.ones(4)/4,mode='same');add(at-.16,noise*env*.20)
 t=np.arange(round(.4*sr))/sr;phase=np.cumsum(65+200*np.exp(-t*28))*2*np.pi/sr;add(at,np.sin(phase)*np.exp(-t*13)*.55)
for i,hz in enumerate([587.33,880,1174.66,1396.91]):
 t=np.arange(round(.55*sr))/sr;add(12.36+i*.055,(np.sin(2*np.pi*hz*t)+.2*np.sin(4*np.pi*hz*t))*np.exp(-t*9)*.045,(-1)**i*.25)
# A short mechanical mouse-down/up pair, after the final spoken word.
click_time=14.55
t=np.arange(round(.055*sr))/sr
noise=rng.normal(0,1,len(t));crisp=noise-np.convolve(noise,np.ones(5)/5,mode='same')
add(click_time,crisp*np.exp(-t*430)*.35+np.sin(2*np.pi*2400*t)*np.exp(-t*250)*.28+np.sin(2*np.pi*780*t)*np.exp(-t*170)*.18)
add(click_time+.024,crisp*np.exp(-t*520)*.24+np.sin(2*np.pi*3300*t)*np.exp(-t*320)*.18)
with wave.open(str(work/'accents.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(mix,-.98,.98)*32767).astype('<i2').tobytes())
# Trim only outer silence, retaining pauses and complete words. Never cut a line to fit.
placements=[('intro',.15,2.40),('seris',3.0,1.95),('title',9.1,3.05),('cta',13.0,1.45)]
voice_pace={'intro':0.94,'seris':0.86,'title':0.86,'cta':1.0}
def read_pcm(path):
 with wave.open(str(path)) as f:
  assert f.getframerate()==48000 and f.getnchannels()==2 and f.getsampwidth()==2, path
  return np.frombuffer(f.readframes(f.getnframes()),'<i2').reshape(-1,2).astype(np.float64)/32768

def write_pcm(path, samples):
 with wave.open(str(path),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(48000)
  f.writeframes((np.clip(samples,-1,1-1/32768)*32768).astype('<i2').tobytes())

def place_pcm(source,destination,start):
 # Materialize leading silence as PCM samples. FFmpeg 7.1.5's adelay can emit
 # missing/discontinuous PTS after loudnorm, and WAV then loses the intended gap.
 samples=read_pcm(source);placed=np.zeros((15*sr,2));offset=round(start*sr)
 count=min(len(samples),len(placed)-offset);placed[offset:offset+count]=samples[:count]
 write_pcm(destination,placed)
 return samples,placed

voice_mix=np.zeros((15*sr,2));timing=[]
for name,start,window in placements:
 trimmed=work/f'{name}-trim.wav'
 trim='silenceremove=start_periods=1:start_duration=0.015:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB,areverse'
 ff('-i',src/f'{name}.mp3','-af',trim,'-ar',48000,'-ac',2,trimmed)
 dur=len(read_pcm(trimmed))/sr;tempo=max(voice_pace[name],dur/window)
 normalized=work/f'{name}-normalized.wav';dest=work/f'{name}.wav'
 ff('-i',trimmed,'-af',f'atempo={tempo},highpass=f=85,lowpass=f=11500,equalizer=f=240:t=q:w=0.8:g=-1.5,equalizer=f=2900:t=q:w=1:g=1.8,acompressor=threshold=0.13:ratio=2.5:attack=5:release=85:makeup=1.25,loudnorm=I=-17:TP=-2.5:LRA=5,aresample=48000,asetpts=N/SR/TB','-ar',48000,'-ac',2,normalized)
 samples,placed=place_pcm(normalized,dest,start)
 if len(samples)/sr>window+.04:raise RuntimeError(f'{name}: voice exceeds its time window')
 active=np.flatnonzero(np.max(np.abs(placed),axis=1)>.003)
 if not len(active):raise RuntimeError(f'{name}: silent voice')
 timing.append(dict(name=name,start=round(active[0]/sr,3),end=round((active[-1]+1)/sr,3)))
 voice_mix+=placed
for left,right in zip(timing,timing[1:]):
 if left['end']+.10>right['start']:raise RuntimeError(f'Voice overlap: {left} / {right}')
if timing[-1]['end']+.10>click_time:raise RuntimeError('Final voice overlaps the mouse click')
write_pcm(work/'voices.wav',voice_mix)
(work/'voice-timing.json').write_text(json.dumps(timing,ensure_ascii=False,indent=2)+'\n')
print('Verified non-overlapping voice intervals:',timing,flush=True)

# Place music and gameplay using the same sample-accurate PCM method.
ff('-i',root/'public/audio/kanashiminoaimainataishou.mp3','-af','atrim=duration=3.1,asetpts=N/SR/TB,lowpass=f=1500,volume=0.35,afade=t=out:st=2.5:d=0.6','-ar',48000,'-ac',2,work/'piano-clip.wav')
place_pcm(work/'piano-clip.wav',work/'piano.wav',0)
ff('-i',root/'public/audio/kiheisen.mp3','-af','atrim=duration=12.2,asetpts=N/SR/TB,volume=0.65,afade=t=in:d=0.12,afade=t=out:st=10.9:d=1.3','-ar',48000,'-ac',2,work/'orchestra-clip.wav')
place_pcm(work/'orchestra-clip.wav',work/'orchestra.wav',2.8)
ff('-i',root/'artifacts/trailer/raw/battle/audio.wav','-af','atrim=start=4.1:duration=1.5,asetpts=N/SR/TB,volume=0.8,afade=t=out:st=1.35:d=0.15','-ar',48000,'-ac',2,work/'game-clip.wav')
place_pcm(work/'game-clip.wav',work/'game.wav',5.1)
inputs=['-i',picture,'-i',work/'voices.wav','-i',work/'piano.wav','-i',work/'orchestra.wav','-i',work/'accents.wav','-i',work/'game.wav']
graph='[2:a][3:a]amix=inputs=2:normalize=0[music];[1:a]asplit[voice][side];[music][side]sidechaincompress=threshold=0.025:ratio=5:attack=15:release=160[duck];[duck][voice][4:a][5:a]amix=inputs=4:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=8,afade=t=out:st=14.82:d=0.18[a]'
target=out/('stillveil-heisei-cm-v3-720p.mp4' if args.preview else 'stillveil-heisei-cm-v3-1080p.mp4');ff(*inputs,'-filter_complex',graph,'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-ar',48000,'-ac',2,'-t',15,'-movflags','+faststart',target)
print('Finished',target,flush=True)
