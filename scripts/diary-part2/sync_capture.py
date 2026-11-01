"""Piecewise measured capture calibration, 30fps / 48kHz PCM, no diagnostic strip in public source."""
import sys,json,pathlib,subprocess,wave,shutil
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/media-sync'))
from media_sync import audio,marker_video,marker_audio,warp_audio,remove_clock_tone,sha256
O=ROOT/'artifacts/diary-part2/capture';ident=sys.argv[1];meta=json.loads((O/(ident+'.json')).read_text());folder=O/('frames-'+ident)
def ff(*x):subprocess.run(['ffmpeg','-v','error','-y',*map(str,x)],check=True)
def wav(path,x):
 with wave.open(str(path),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(48000);f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
frames=sorted(meta['frames'],key=lambda x:x['time']);ordered=[]
for f in frames:
 if ordered and f['time']-ordered[-1]['time']<.001:ordered[-1]=f
 else:ordered.append(f)
frames=ordered;first=frames[0]['time'];initial=first-meta['audioZero'];lst='ffconcat version 1.0\n'
for i,f in enumerate(frames):lst+=f"file '{f['file']}'\nduration {max(.001,frames[i+1]['time']-f['time'])if i+1<len(frames)else .05:.6f}\n"
lst+=f"file '{frames[-1]['file']}'\n";(folder/'frames.ffconcat').write_text(lst)
cal=O/(ident+'-calibration.mp4');ff('-safe',0,'-i',folder/'frames.ffconcat','-vf','fps=30,setsar=1','-c:v','libx264','-threads',2,'-preset','veryfast','-crf',22,'-an',cal)
v,dur=marker_video(cal);warmup=float(v[0]);v=v[1:];raw=audio(O/(ident+'.webm'));a=marker_audio(raw,v+initial);aligned=warp_audio(raw,v,a,0,dur);wav(O/(ident+'-cal.wav'),aligned)
# Independently measure the encoded calibration image/PCM output.
calmov=O/(ident+'-calibration.mov');ff('-i',cal,'-i',O/(ident+'-cal.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','pcm_s16le','-shortest',calmov)
v2,_=marker_video(calmov);v2=v2[1:];a2=marker_audio(audio(calmov),v2,frequency=None);residual=(a2-v2)*1000
assert len(v2)>=6 and abs(residual).max()<=80,(v2,residual)
calmov.unlink();(O/(ident+'-cal.wav')).unlink()
clean=warp_audio(remove_clock_tone(raw),v,a,0,dur);wav(O/(ident+'-clean.wav'),clean)
mov=O/(ident+'.mov');ff('-i',cal,'-i',O/(ident+'-clean.wav'),'-vf','crop=450:800:0:0','-map','0:v','-map','1:a','-c:v','libx264','-threads',2,'-crf',21,'-preset','veryfast','-c:a','pcm_s16le','-shortest',mov)
meta.update(initialOffset=initial,gameplayWindow=[meta['gameplayStart']-initial,meta['gameplayEnd']-initial],duration=dur,calibration={'warmupPulseExcludedBeforeGameplay':warmup,'video':v.tolist(),'audio':a.tolist(),'encodedResidualMs':residual.tolist(),'passed':True},cleanSha256=sha256(mov),processingSha256=sha256(__file__),sourceHashes={'webm':sha256(O/(ident+'.webm'))},syncMethod='Start/interior/end 16k diagnostic markers; piecewise measured 48kHz clock warp; strip cropped and diagnostic band removed; 30fps PCM MOV')
(O/(ident+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2));print('CALIBRATED',ident,len(v),'anchors',float(abs(residual).max()),'ms',flush=True)
shutil.rmtree(folder)
for p in[cal,O/(ident+'-clean.wav'),O/(ident+'.webm')]:p.unlink()
