"""Small synthetic clock test; tones are fixtures, never research evidence or video assets."""
from pathlib import Path
import importlib.util,json,tempfile,subprocess
import numpy as np
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('this_girl_mixer',HERE/'mixer.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def flac(p,x):
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar','48000','-ac','2','-i','-','-c:a','flac','-sample_fmt','s32',str(p)],input=x.astype('<f4').tobytes(),check=True)

def main():
 with tempfile.TemporaryDirectory(prefix='this-girl-mix-clock-')as folder:
  d=Path(folder);(d/'research').mkdir();m.O=d
  music=np.sin(2*np.pi*220*np.arange(48000*20)/48000).astype(np.float32)[:,None]*np.ones((1,2),np.float32)*.01
  voice=np.sin(2*np.pi*440*np.arange(24000)/48000).astype(np.float32)[:,None]*np.ones((1,2),np.float32)*.2
  game=np.zeros((48000*2,2),np.float32);game[10*1600]=.2
  for name,x in [('music',music),('voice',voice),('game',game)]:flac(d/(name+'.flac'),x)
  timeline={'finalized':True,'episode':'THIS-GIRL-001','durationFrames':240,'voice':[{'lineId':'synthetic-test-tone','file':str(d/'voice.flac'),'startFrame':90}],'gameCuts':[{'id':'test-cut','file':str(d/'game.flac'),'startFrame':20,'sourceStartFrame':5,'sourceEndFrame':35}],'music':{'file':str(d/'music.flac')}}
  components,info=m._components(timeline)
  assert components['game'].shape==(240*1600,2)
  expected=(20+10-5)*1600
  assert int(np.argmax(abs(components['game'][:,0])))==expected
  assert np.allclose(components['game'][expected],.2*.24*info['masterGain'],atol=2e-6)
  assert np.count_nonzero(components['game'][:,0])==1
  (d/'research/audio-mix.json').write_text(json.dumps(info))
  rebuilt=m.reconstruct_components(timeline)
  assert all(np.array_equal(components[k],rebuilt[k])for k in ['voice','game','music'])
  (d/'voice.flac').write_bytes(b'corrupt')
  try:m.reconstruct_components(timeline)
  except (AssertionError,subprocess.CalledProcessError):pass
  else:raise AssertionError('Changed audio source was silently accepted')
  result={'passed':True,'mixerCodeSha256':m.sha(HERE/'mixer.py'),'testCodeSha256':m.sha(__file__),'scope':'Synthetic fixture only. Exact frame-to-sample trim/placement; independent-source reconstruction; modified-source refusal. No game outcome or final-movie sync claim.','expectedImpulseSample':expected,'samplesPerFrame':1600}
  (HERE.parents[2]/'artifacts/this-girl-01/research/editor-mixer-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
if __name__=='__main__':main()
