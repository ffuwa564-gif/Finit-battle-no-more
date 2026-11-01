"""Calibrate native audio against start/end visual markers before multiplexing.
Calibration overlays/tones are outside published gameplay. Timestamps preserve
all dropped-frame intervals; the same trims/speed factors apply to audio/video.
"""
import json,pathlib,sys,subprocess,wave,numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/diary-111/capture';ident=sys.argv[1];meta=json.loads((OUT/(ident+'.json')).read_text());folder=OUT/('frames-'+ident)
def ff(*args):subprocess.run(['ffmpeg','-v','error','-y',*map(str,args)],check=True)
wav=OUT/(ident+'-source.wav');ff('-i',OUT/(ident+'.webm'),'-af','aresample=async=1:first_pts=0','-ac',1,'-ar',48000,'-c:a','pcm_s16le',wav)
with wave.open(str(wav))as w:signal=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
meta['frames'].sort(key=lambda f:f['time'])
ordered=[]
for frame in meta['frames']:
 if ordered and frame['time']-ordered[-1]['time']<.001:ordered[-1]=frame
 else:ordered.append(frame)
meta['frames']=ordered
first=meta['frames'][0]['time'];meta['initialOffset']=first-meta['audioZero'];visual=[];active=False
for f in meta['frames']:
 if 5<f['time']-first<meta['frames'][-1]['time']-first-5:active=False;continue
 with Image.open(folder/f['file'])as im:
  x=int(im.width*20/450);y=int(im.height*20/800);r,g,b=im.getpixel((x,y));on=r>210 and b>210 and g<80
 if on and not active:visual.append(f['time']-first)
 active=on
assert len(visual)==2,visual
initial=meta['initialOffset'];pairs=[]
for v in visual:
 guess=v+initial;start=max(0,int((guess-.35)*48000));stop=int((guess+.35)*48000);clip=signal[start:stop]
 # The isolated 1 kHz calibration tone follows a silent margin and exceeds .1.
 hits=np.flatnonzero(np.abs(clip)>.12);assert len(hits)>100
 a=(start+hits[0])/48000;pairs.append({'videoMarker':v,'audioSourceMarker':a,'initialDifference':a-initial-v})
if all('domTime' in x for x in meta['markers']):
 paintDelays=[v+initial-mark['domTime']for v,mark in zip(visual,meta['markers'])]
 assert max(paintDelays)-min(paintDelays)<.18,('unstable calibration paint latency',paintDelays)
 meta['calibrationPaintLatencies']=paintDelays
diffs=[p['initialDifference']for p in pairs]
scale=(pairs[1]['audioSourceMarker']-pairs[0]['audioSourceMarker'])/(visual[1]-visual[0]);assert abs(scale-1)<.002,('excessive capture clock drift',scale)
offset=pairs[0]['audioSourceMarker']-scale*visual[0]
concat='ffconcat version 1.0\n'
for i,f in enumerate(meta['frames']):
 duration=max(.001,meta['frames'][i+1]['time']-f['time'])if i+1<len(meta['frames'])else .05;concat+=f"file '{f['file']}'\nduration {duration:.6f}\n"
concat+=f"file '{meta['frames'][-1]['file']}'\n";(folder/'frames.ffconcat').write_text(concat)
args=['-safe','0','-i',folder/'frames.ffconcat','-i',wav,'-map','0:v','-map','1:a','-vf','fps=30,setsar=1']
af=f'atrim=start={max(0,offset):.9f},asetpts=PTS-STARTPTS,atempo={scale:.12f}'
if offset<0:af+=f',adelay={-offset/scale*1000:.3f}:all=1'
args+=['-af',af]
args+=['-c:v','libx264','-threads','2','-preset','veryfast','-crf','22','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',OUT/(ident+'.mp4')];ff(*args)
meta.update(calibration=pairs,effectiveAudioTrim=offset,audioClockRatio=scale,fittedEndpointResidual=0,maxEndpointDrift=abs(diffs[0]-diffs[1]),gameplayWindow=[meta['gameplayStart']-initial,meta['gameplayEnd']-initial],syncMethod='Opus packet PTS preserved with async resampling; two-point linear audio clock calibration; identical AV edits',markerCorrection=float(np.mean(diffs)))
(OUT/(ident+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2));print('CAPTURE CALIBRATED',ident,'seconds',meta['duration'],'drift',meta['maxEndpointDrift'],'offset',offset)
# Keep raw inputs until independent encoded endpoint validation succeeds.
subprocess.run([sys.executable,str(pathlib.Path(__file__).with_name('check_sync.py')),ident],check=True)
import shutil;shutil.rmtree(folder);wav.unlink();(OUT/(ident+'.webm')).unlink()
