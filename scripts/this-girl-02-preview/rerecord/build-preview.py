"""Add a short preview using approved silent pages and original PCM sources.
Never use the old distribution MP4 or AAC as media inputs.
"""
from pathlib import Path
import json,hashlib,sys,subprocess,shutil
ROOT=Path(__file__).resolve().parents[3];OLD=ROOT/'artifacts/this-girl-02';O=ROOT/'artifacts/this-girl-02-preview';sys.path.insert(0,str(ROOT/'scripts/this-girl-02-preview/editor'));import plan,render,freeze,mixer
sha=freeze.sha
old=json.load(open(OLD/'research/render-manifest.json'));assert old['finalized']and old['finalQaComplete'];pages={Path(p['file']).stem.removeprefix('page-'):p for p in old['pages']}
n=json.load(open(OLD/'narration.json'));extra=json.load(open(O/'narration-extra.json'));n['chapters']+=extra['chapters'];n['revision']='Preview added; original48 utterances unchanged,3 new preview utterances';(O/'narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2))
e=json.load(open(OLD/'editorial.json'));new={'id':'next-preview','chapter':'次回予告：ティッカ','spec':{'kind':'preview','title':'次回、その一拍で、救えるかな。','characterId':'tikka','status':'次回の研究対象 · 未検証','body':['R · 秒針ジャミング','遅らせるのは、通常スキル。','予告大技・ビットは止められない。']},'lines':[f'preview-{i:02}'for i in range(3)],'leadSeconds':.4,'tailSeconds':1.2};e['pages'].insert(-1,new);(O/'editorial.json').write_text(json.dumps(e,ensure_ascii=False,indent=2));t=plan.build(e,n);t['inputHashes'].update(editorial=sha(O/'editorial.json'),narration=sha(O/'narration.json'));tp=O/'render/timeline.json';tp.write_text(json.dumps(t,ensure_ascii=False,indent=2));plan.deliver(t)
# Original page bitstreams are immutable and authorized source assets. Their inputs
# and results remain linked to the original episode02 manifest, not a new run.
files=[]
for p in t['pages']:
 if p['id']=='next-preview':f=render.render_page(p,None,t)
 else:
  r=pages[p['id']];f=ROOT/r['file'];assert sha(f)==r['sha256'],'Original silent page differs'
 render.inspect_page(f,p['durationFrames']);files.append(f)
listing=O/'render/pages.txt';listing.write_text(''.join("file '"+str(f)+"'\n"for f in files));render.run(['-f','concat','-safe','0','-i',listing,'-c','copy',O/'render/deck.mp4']);render.subtitles(t)
subprocess.run([sys.executable,str(ROOT/'scripts/this-girl-02-preview/editor/mixer.py')],check=True)
frozen=freeze.freeze_inputs(t,tp)
for f in [O/'render/deck.mp4',O/'render/subtitles.ass',OLD/'research/render-manifest.json',*files]:frozen[str(f.relative_to(ROOT))]=sha(f)
movie=O/'render/ThisGirl-02-Preview.mp4';duration=t['durationFrames']/30;ass=O/'render/subtitles.ass';render.run(['-i',O/'render/deck.mp4','-i',O/'render/master.flac','-vf',f"subtitles=filename='{ass}':fontsdir='/usr/share/fonts/opentype/noto',fade=t=out:st={duration-1}:d=1:color=0x211b17",'-map','0:v:0','-map','1:a:0','-frames:v',t['durationFrames'],'-c:v','libx264','-threads','2','-preset','fast','-profile:v','baseline','-level:v','4.0','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-movflags','+faststart',movie]);freeze.verify_and_save(frozen,movie)
(O/'delivery/ThisGirl-02-Preview.mp4').symlink_to(movie.resolve());(O/'research/render-manifest.json').write_text(json.dumps({'renderComplete':True,'finalized':False,'finalQaComplete':False,'sha256':sha(movie),'timelineSha256':sha(tp),'codeSha256':sha(__file__),'pages':[{'file':str(f.relative_to(ROOT)),'sha256':sha(f)}for f in files],'sourceEpisode02ManifestSha256':sha(OLD/'research/render-manifest.json'),'narrationLines':51,'originalFinishedVideoUsedAsSource':False,'scope':'Same original research and48 original utterances,3 new preview utterances inserted before ledger. No game replay or study rerun claimed.'},indent=2));print('Preview revision rendered',duration,flush=True)
