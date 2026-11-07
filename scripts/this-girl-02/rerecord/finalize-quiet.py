"""Final-only encode from frozen silent deck and original FLAC, with quiet ending.
No prior distribution video or AAC is used as a media source.
"""
from pathlib import Path
import json,hashlib,subprocess,sys
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02';sys.path.insert(0,str(ROOT/'scripts/this-girl-02/editor'));import freeze
sha=freeze.sha
tp=O/'render/timeline.json';t=json.loads(tp.read_text());old=json.loads((O/'research/render-manifest.json').read_text());assert old['renderComplete']and old['timelineSha256']==sha(tp)
for p in old['pages']:assert sha(ROOT/p['file'])==p['sha256'],'Cached deck page changed'
mi=json.loads((O/'research/audio-mix.json').read_text());assert sha(O/'render/master.flac')==mi['outputSha256']
frozen=freeze.freeze_inputs(t,tp)
for p in [O/'render/deck.mp4',O/'render/subtitles.ass']:frozen[str(p.relative_to(ROOT))]=sha(p)
movie=O/'render/ThisGirl-02.mp4';temp=O/'render/quiet-final.mp4';seconds=t['durationFrames']/30;vf=f"subtitles=filename='{O/'render/subtitles.ass'}':fontsdir='/usr/share/fonts/opentype/noto',fade=t=out:st={seconds-1}:d=1:color=0x211b17"
subprocess.run(['ffmpeg','-v','warning','-y','-threads','2','-i',str(O/'render/deck.mp4'),'-i',str(O/'render/master.flac'),'-vf',vf,'-map','0:v:0','-map','1:a:0','-frames:v',str(t['durationFrames']),'-c:v','libx264','-threads','2','-preset','fast','-profile:v','baseline','-level:v','4.0','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-movflags','+faststart',str(temp)],check=True)
temp.replace(movie);freeze.verify_and_save(frozen,movie)
record={**old,'finalized':False,'finalQaComplete':False,'sha256':sha(movie),'finalOnlyCodeSha256':sha(__file__),'finalVideoFilter':vf,'mediaSources':['render/deck.mp4','render/master.flac'],'previousFinishedMovieUsedAsSource':False,'endingFadeSeconds':1}
(O/'research/render-manifest.json').write_text(json.dumps(record,ensure_ascii=False,indent=2));print('Quiet final encoded',record['sha256'],flush=True)
