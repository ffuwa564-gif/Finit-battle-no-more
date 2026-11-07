"""CFR normalization with an unchanged PCM stream and a comparison of every frame."""
from pathlib import Path
import sys,json,hashlib,subprocess,shutil
import numpy as np
ROOT=Path(__file__).resolve().parents[3]
O=ROOT/'artifacts/this-girl-02-preview';C=O/'capture'
def sha(path):
 h=hashlib.sha256()
 with open(path,'rb')as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()
def call(args):return subprocess.check_output([str(v)for v in args])
def probe(path):return json.loads(call(['ffprobe','-v','error','-show_streams','-show_format','-of','json',path]))
def audio_hash(path):return call(['ffmpeg','-v','error','-threads','2','-i',path,'-map','0:a:0','-c:a','pcm_s16le','-f','hash','-hash','sha256','-']).decode().strip()
def gray_frames(path):
 raw=call(['ffmpeg','-v','error','-threads','2','-i',path,'-an','-vf','fps=30,scale=45:80,format=gray','-fps_mode','passthrough','-f','rawvideo','-'])
 assert len(raw)%(45*80)==0
 return np.frombuffer(raw,np.uint8).reshape(-1,80,45)
def main():
 reports=[]
 for ident in sys.argv[1:]or['reference','sakuya']:
  src=C/(ident+'.mov');metadata=C/(ident+'.json')
  original=src.with_suffix('.mov.tmporiginal');original_metadata=metadata.with_suffix('.json.tmporiginal')
  assert src.exists()and metadata.exists()
  m=json.loads(metadata.read_text());assert m['calibration']['passed']
  if original.exists()or original_metadata.exists():raise RuntimeError('Review previous normalization backups first: '+ident)
  current=probe(src);video=next(s for s in current['streams']if s['codec_type']=='video');audio=next(s for s in current['streams']if s['codec_type']=='audio')
  assert audio['codec_name']=='pcm_s16le'and audio['time_base']=='1/48000'
  samples=int(audio['duration_ts']);assert samples%1600==0,(ident,samples)
  count=samples//1600;duration=count/30
  assert abs(float(current['format']['duration'])-duration)<.001 and sha(src)==m['cleanSha256']
  shutil.copy2(src,original);shutil.copy2(metadata,original_metadata)
  dst=C/(ident+'-cfr.mov')
  subprocess.run([str(v)for v in['ffmpeg','-v','error','-y','-filter_threads','1','-threads','2','-i',original,'-map','0:v:0','-map','0:a:0','-vf','fps=30,setsar=1,tpad=stop_mode=clone:stop_duration=1','-frames:v',count,'-fps_mode','cfr','-r','30','-c:v','libx264','-threads','2','-preset','veryfast','-crf','17','-pix_fmt','yuv420p','-c:a','copy',dst]],check=True)
  result=probe(dst);v=next(s for s in result['streams']if s['codec_type']=='video');a=next(s for s in result['streams']if s['codec_type']=='audio')
  assert v['r_frame_rate']==v['avg_frame_rate']=='30/1'and int(v['nb_frames'])==count
  assert int(a['duration_ts'])==samples and float(v['start_time'])==float(a['start_time'])==0
  assert abs(float(v['duration'])-duration)<.001
  before=audio_hash(original);after=audio_hash(dst);assert before==after,'PCM changed'
  reference=gray_frames(original);output=gray_frames(dst)
  assert len(reference)==len(output)==count
  errors=np.sqrt(np.mean((reference.astype(np.float32)-output.astype(np.float32))**2,axis=(1,2)))
  assert float(errors.max())<=12,(ident,float(errors.max()))
  subprocess.run(['ffmpeg','-v','error','-xerror','-threads','2','-i',str(dst),'-f','null','-'],check=True)
  report={'passed':True,'inputSha256':sha(original),'outputSha256':sha(dst),'originalMovie':str(original.relative_to(ROOT)),'originalMetadata':str(original_metadata.relative_to(ROOT)),'processingSha256':sha(__file__),'videoFrames':count,'audioSamples':samples,'samplesPerFrame':1600,'duration':duration,'inputAverageFrameRate':video['avg_frame_rate'],'outputAverageFrameRate':v['avg_frame_rate'],'pcmSha256':after,'pcmIdentical':True,'allFramesCompared':count,'allFrameMaximumRMSE':float(errors.max()),'allFrameMeanRMSE':float(errors.mean()),'audioOffsetIntroducedMs':0,'originalCalibrationPreserved':True,'fullDecodePassed':True}
  dst.replace(src);m['cleanSha256']=report['outputSha256'];m['sourceNormalization']=report
  m['processingHistory']=[{'stage':'calibrated-source','processingSha256':m.get('processingSha256'),'cleanSha256':report['inputSha256']},{'stage':'cfr-normalization','processingSha256':report['processingSha256'],'cleanSha256':report['outputSha256']}]
  m['processingSha256']=report['processingSha256'];m['constantFrameRate']=True
  metadata.write_text(json.dumps(m,ensure_ascii=False,indent=2))
  research=O/'research';research.mkdir(exist_ok=True)
  (research/('capture-source-'+ident+'.json')).write_text(json.dumps(m,ensure_ascii=False,indent=2))
  reports.append({'id':ident,**report});print('CFR SOURCE PASSED',ident,count,samples,float(errors.max()),flush=True)
 (O/'research/capture-cfr-normalization.json').write_text(json.dumps({'passed':True,'captures':reports,'processingSha256':sha(__file__)},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
