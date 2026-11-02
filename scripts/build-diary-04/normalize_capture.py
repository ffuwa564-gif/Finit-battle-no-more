"""Normalize calibrated captures to an exact 30fps/48kHz frame clock; preserve PCM and timing.
The original source MOV/JSON are retained with .tmporiginal suffixes. A/V calibration
remains valid because audio samples are copied, presentation time starts at0, and the
CFR source is checked against every old source frame on the same30fps time grid.
"""
from pathlib import Path
import sys,json,hashlib,subprocess,shutil
import numpy as np
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-04';C=O/'capture';CODE=Path(__file__)
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb')as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def call(args):return subprocess.check_output([str(v)for v in args])
def probe(p):return json.loads(call(['ffprobe','-v','error','-show_streams','-show_format','-of','json',p]))
def audio_hash(p):return call(['ffmpeg','-v','error','-threads','2','-i',p,'-map','0:a:0','-c:a','pcm_s16le','-f','hash','-hash','sha256','-']).decode().strip()
def gray_frames(p):
 raw=call(['ffmpeg','-v','error','-threads','2','-i',p,'-an','-vf','fps=30,scale=45:80,format=gray','-fps_mode','passthrough','-f','rawvideo','-'])
 assert len(raw)%(45*80)==0
 return np.frombuffer(raw,np.uint8).reshape(-1,80,45)
def main():
 reports=[]
 for ident in sys.argv[1:]or['live-fio','lab-victory','lab-counter']:
  src=C/(ident+'.mov');meta=C/(ident+'.json');oldsrc=src.with_suffix(src.suffix+'.tmporiginal');oldmeta=meta.with_suffix(meta.suffix+'.tmporiginal')
  assert src.exists()and meta.exists();m=json.loads(meta.read_text());assert m['calibration']['passed']
  # Explicitly this is a new normalization action, not an exists-only render cache.
  if oldsrc.exists()or oldmeta.exists():raise RuntimeError('Original backups already exist; review before re-running '+ident)
  current=probe(src);v=next(s for s in current['streams']if s['codec_type']=='video');a=next(s for s in current['streams']if s['codec_type']=='audio');assert a['codec_name']=='pcm_s16le'and a['time_base']=='1/48000'
  samples=int(a['duration_ts']);assert samples%1600==0,(ident,samples);count=samples//1600;duration=count/30
  assert abs(float(current['format']['duration'])-duration)<.001;assert sha(src)==m['cleanSha256']
  shutil.copy2(src,oldsrc);shutil.copy2(meta,oldmeta);dst=src.with_name(ident+'-cfr.mov')
  args=['ffmpeg','-v','error','-y','-filter_threads','1','-threads','2','-i',oldsrc,'-map','0:v:0','-map','0:a:0','-vf','fps=30,setsar=1,tpad=stop_mode=clone:stop_duration=1','-frames:v',count,'-fps_mode','cfr','-r','30','-c:v','libx264','-threads','2','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-c:a','copy',dst];subprocess.run([str(v)for v in args],check=True)
  q=probe(dst);nv=next(s for s in q['streams']if s['codec_type']=='video');na=next(s for s in q['streams']if s['codec_type']=='audio');assert nv['r_frame_rate']==nv['avg_frame_rate']=='30/1';assert int(nv['nb_frames'])==count;assert int(na['duration_ts'])==samples;assert float(nv['start_time'])==float(na['start_time'])==0;assert abs(float(nv['duration'])-duration)<.001
  before_audio=audio_hash(oldsrc);after_audio=audio_hash(dst);assert before_audio==after_audio,'PCM changed'
  ref=gray_frames(oldsrc);out=gray_frames(dst);assert len(ref)==len(out)==count,(ident,len(ref),len(out),count)
  # All source timestamps are compared on the same global grid, not by matching only still anchors.
  error=np.sqrt(np.mean((ref.astype(np.float32)-out.astype(np.float32))**2,axis=(1,2)));assert float(error.max())<=12,(ident,float(error.max()))
  subprocess.run(['ffmpeg','-v','error','-xerror','-threads','2','-i',str(dst),'-f','null','-'],check=True)
  rec={'passed':True,'inputSha256':sha(oldsrc),'outputSha256':sha(dst),'originalMovie':str(oldsrc.relative_to(ROOT)),'originalMetadata':str(oldmeta.relative_to(ROOT)),'originalProcessingSha256':m.get('processingSha256'),'processingSha256':sha(CODE),'videoFrames':count,'audioSamples':samples,'samplesPerFrame':1600,'duration':duration,'inputAverageFrameRate':v['avg_frame_rate'],'outputAverageFrameRate':nv['avg_frame_rate'],'pcmSha256':after_audio,'pcmIdentical':True,'allFramesCompared':count,'allFrameMaximumRMSE':float(error.max()),'allFrameMeanRMSE':float(error.mean()),'audioOffsetIntroducedMs':0,'videoTimestampGridSeconds':1/30,'method':'Audio stream copy. fps30 at unchanged PTS/start0, explicit CFR, exact frame count. Every source frame compared on the same30fps grid.','originalCalibrationPreserved':True,'fullDecodePassed':True}
  dst.replace(src);m['cleanSha256']=rec['outputSha256'];m['sourceNormalization']=rec;m['processingHistory']=[{'stage':'calibrated-source','processingSha256':m.get('processingSha256'),'cleanSha256':rec['inputSha256']},{'stage':'cfr-normalization','processingSha256':rec['processingSha256'],'cleanSha256':rec['outputSha256']}];m['processingSha256']=rec['processingSha256'];m['constantFrameRate']=True;meta.write_text(json.dumps(m,ensure_ascii=False,indent=2));reports.append({'id':ident,**rec});print('CFR SOURCE PASSED',ident,count,samples,round(float(error.max()),4),flush=True)
 (O/'research/capture-cfr-normalization.json').write_text(json.dumps({'passed':True,'captures':reports,'processingSha256':sha(CODE)},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
