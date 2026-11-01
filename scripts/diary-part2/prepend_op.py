"""Prepend the user's common OP v4 on the same 30fps/48k clock; retain its own soundtrack."""
import pathlib,json,subprocess,sys,wave,shutil,math
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2';D=O/'delivery';A=O/'assets';sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,sha256
SOURCE=A/'STILLVEIL-TowerDiary-Opening-v4-1080p.mp4';FRAMES=690;DURATION=23;SR=48000

def ff(*args):subprocess.run(['ffmpeg','-v','error','-y',*map(str,args)],check=True)
def prepend():
 movie=D/'STILLVEIL-TowerDiary-Part2.mp4';marker=O/'op-applied.json';n=json.loads((O/'timeline-narration.json').read_text())
 if n['chapters'][0]['id']=='series-op':
  previous=json.loads(marker.read_text());assert previous['finishedSha256']==sha256(movie)and previous['sourceSha256']==sha256(SOURCE)and previous['processingSha256']==sha256(__file__)and previous['bodyPcmSha256']==sha256(O/'body-mix.wav')and previous['bodyVideoSha256']==sha256(O/'silent.mp4'),'OP inputs changed: rerender the body first';return
 # Keep body PCM as the only body sound source: never decode the temporary body AAC.
 shutil.copy2(O/'timeline-narration.json',O/'body-narration.json');shutil.copy2(O/'edit-timeline.json',O/'body-edit-timeline.json');shutil.copy2(O/'mix-manifest.json',O/'body-mix-manifest.json')
 (O/'mix.wav').replace(O/'body-mix.wav');body=audio(O/'body-mix.wav');op=audio(SOURCE);expected=FRAMES*1600;op=np.pad(op,((0,max(0,expected-len(op))),(0,0)))[:expected]
 # The original OP is a self-contained 23-second film. Preserve all of it, with 24->30 fps duplication only.
 clean=O/'render/common-op.mov';ff('-i',SOURCE,'-vf','fps=30,setsar=1','-af',f'aresample=48000,apad,atrim=end_sample={expected},asetpts=N/SR/TB','-frames:v',FRAMES,'-c:v','libx264','-threads',2,'-preset','veryfast','-crf',23,'-pix_fmt','yuv420p','-c:a','pcm_s16le',clean)
 opSilent=O/'render/common-op-silent.mp4';ff('-i',clean,'-map','0:v','-an','-c:v','copy',opSilent)
 concat=O/'render/op-body.ffconcat';concat.write_text("ffconcat version 1.0\nfile 'common-op-silent.mp4'\nfile '../silent.mp4'\n");ff('-safe',0,'-f','concat','-i',concat,'-map','0:v','-c:v','copy',O/'op-silent.mp4')
 with wave.open(str(O/'mix.wav'),'wb')as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(np.concatenate([op,body]),-1,1)*32767).astype('<i2').tobytes())
 ff('-i',O/'op-silent.mp4','-i',O/'mix.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-ar',SR,'-movflags','+faststart',movie)
 for ch in n['chapters']:
  ch['start']+=DURATION
  for l in ch['lines']:l['start']+=DURATION;l['end']+=DURATION
 n['duration']+=DURATION;n['chapters'].insert(0,{'id':'series-op','title':'00 共通オープニング v4','start':0,'duration':DURATION,'lines':[],'clip':None,'bullets':[]});n['commonOpening']={'sourceCommit':'017a0ccca241d1ec6a72b8a73f63188fc1043875','file':SOURCE.name,'duration':DURATION,'originalFps':24,'outputFps':30}
 (O/'timeline-narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2));rows=json.loads((O/'edit-timeline.json').read_text())
 for row in rows:row['start']+=DURATION
 (O/'edit-timeline.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));m=json.loads((O/'mix-manifest.json').read_text());m.update(samples=len(body)+expected,mixSha256=sha256(O/'mix.wav'),openingFrames=FRAMES,openingSourceSha256=sha256(SOURCE),openingProcessingSha256=sha256(__file__),openingAudio='Original OP soundtrack preserved, concatenated to the body PCM; final AAC encoded once');(O/'mix-manifest.json').write_text(json.dumps(m,indent=2))
 marker.write_text(json.dumps({'sourceCommit':'017a0ccca241d1ec6a72b8a73f63188fc1043875','sourceSha256':sha256(SOURCE),'processingSha256':sha256(__file__),'frames':FRAMES,'duration':DURATION,'finishedSha256':sha256(movie),'bodyPcmSha256':sha256(O/'body-mix.wav'),'bodyVideoSha256':sha256(O/'silent.mp4'),'referenceSha256':sha256(clean),'reference':str(clean.relative_to(ROOT))},indent=2));print('PREPENDED COMMON OP v4: 23 seconds',flush=True)
if __name__=='__main__':prepend()
