from pathlib import Path
import sys,json,subprocess,math
import numpy as np
B=Path(__file__).resolve().parent;ROOT=B.parents[1];sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,sha256
T=json.loads((B/'timeline.json').read_text());SR=48000;N=T['durationFrames']*1600
musicPath=ROOT/'public/audio/fjordnosundakaze.mp3';song=audio(musicPath);song-=song.mean(axis=0,keepdims=True);rms=float(np.sqrt(np.mean(song**2)));song/=max(rms,.001)
bed=np.zeros((N,2),np.float32);cross=SR*2;step=len(song)-cross
for start in range(0,N,step):
 length=min(len(song),N-start);x=song[:length].copy()
 if start:fade=np.minimum(1,np.arange(length)/cross);x*=fade[:,None]
 if start+length<N:fade=np.minimum(1,(length-1-np.arange(length))/cross);x*=fade[:,None]
 bed[start:start+length]+=x
axis=np.arange(N,dtype=np.float32)/SR;gain=.018+.047*np.clip((axis-T['appendixStart'])/2,0,1);gain*=np.minimum(1,axis/1.2)*np.minimum(1,(T['duration']-axis)/2);bed*=gain[:,None]
combined=bed.copy();records=[]
for v in T['voices']:
 a=audio(v['source']);r=float(np.sqrt(np.mean(a*a)));g=min(.11/max(r,.001),.74/max(float(abs(a).max()),.001));i=v['atFrame']*1600;combined[i:i+len(a)]+=a*g;records.append({'id':v['id'],'atFrame':v['atFrame'],'source':v['source'],'sourceSha256':sha256(v['source']),'gain':g,'samples':len(a),'speaker':v['speaker']})
peak=float(abs(combined).max());master=min(1,.84/max(peak,.001));combined*=master;bed*=master

def flac(name,x):
 p=subprocess.Popen(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','flac','-sample_fmt','s32',str(B/name)],stdin=subprocess.PIPE);view=memoryview(x).cast('B')
 for i in range(0,len(view),4*1024*1024):p.stdin.write(view[i:i+4*1024*1024])
 p.stdin.close();assert p.wait()==0
flac('music-bed.flac',bed);flac('soundtrack.flac',combined)
manifest={'sampleRate':SR,'samples':N,'duration':N/SR,'masterGain':master,'rawPeak':peak,'narration':records,'musicSource':str(musicPath),'musicSha256':sha256(musicPath),'bodyMusicTargetRms':.018,'appendixMusicTargetRms':.065,'loopCrossfadeSeconds':2,'soundtrackSha256':sha256(B/'soundtrack.flac'),'backgroundSha256':sha256(B/'music-bed.flac'),'timelineSha256':sha256(B/'timeline.json')};(B/'soundtrack-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print('mixed',N/SR,'peak',peak,'master',master,flush=True)
