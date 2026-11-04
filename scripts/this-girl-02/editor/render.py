"""Render reviewed notebook pages and native footage, then one final AAC encode.

All cuts and audio use the same integer frame ranges. Input/code hashes guard
reuse. This does not certify research results or replace final movie QA.
"""
from pathlib import Path
import argparse,hashlib,json,subprocess,sys,shutil
import freeze,data_plates
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'rerecord'));import pause
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02'
sys.path.insert(0,str(ROOT/'scripts/this-girl-02/art'));import visuals,roster
FPS=30
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb')as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def run(args):subprocess.run(['ffmpeg','-v','warning','-y','-threads','2',*map(str,args)],check=True)
def key(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
def cached(path,contract):
 marker=path.with_suffix('.cache.json')
 if path.exists()and marker.exists():
  m=json.loads(marker.read_text())
  if m.get('key')==key(contract)and m.get('sha256')==sha(path):return True
 return False
def finish(path,contract):path.with_suffix('.cache.json').write_text(json.dumps({'key':key(contract),'sha256':sha(path),'contract':contract},ensure_ascii=False,indent=2))
def inspect_page(path,count):
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,time_base,nb_frames,pix_fmt','-of','json',str(path)]))['streams'][0]
 assert data['width']==1920 and data['height']==1080 and data['r_frame_rate']=='30/1'
 assert data['time_base']=='1/15360' and int(data['nb_frames'])==count and data['pix_fmt']=='yuv420p',('Incompatible page clock',data)
def ass_time(frame):
 cs=round(frame*100/30);h,cs=divmod(cs,360000);m,cs=divmod(cs,6000);s,cs=divmod(cs,100);return f'{h}:{m:02}:{s:02}.{cs:02}'
def subtitles(t):
 header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Quiet,Noto Sans CJK JP,46,&H00384659,&H00384659,&H00F2FAFF,&H00000000,0,0,0,0,100,100,0,0,1,3,0,2,100,100,30,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
 events=[]
 for c in t['captions']:
  text=c['text'].replace('\\','＼').replace('{','｛').replace('}','｝').replace('\n','\\N')
  # Two explicitly wrapped lines; fixed bottom anchor, no opaque subtitle box.
  position=r'{\an2\pos(1245,1052)}'if c['battle']else r'{\an2\pos(960,1052)}'
  events.append(f"Dialogue: 0,{ass_time(c['startFrame'])},{ass_time(c['endFrame'])},Quiet,,0,0,0,,{position}{text}")
 p=O/'render/subtitles.ass';p.write_text(header+'\n'.join(events)+'\n');return p
def render_page(page,game,t):
 out=O/'render'/('page-'+page['id']+'.mp4');spec=page['spec'];kind=spec['kind'];count=page['durationFrames'];seconds=count/30
 contract={'page':page,'code':sha(__file__),'artCode':sha(visuals.__file__),'rosterCode':sha(roster.__file__),'dataPlateCode':sha(data_plates.__file__),'font':sha('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')}
 if kind=='roster':
  judgment=ROOT/spec['judgment'];contract['judgment']=sha(judgment)
  if not cached(out,contract):
   report=O/'research/roster-visibility.json';reused=False
   if report.exists():
    r=json.loads(report.read_text());source=O/'render/roster-input.mp4';expected={'code':sha(roster.__file__),'visuals':sha(visuals.__file__),'oldRegistry':sha(O/'assets/reference-roster-05.json'),'judgment':sha(judgment)}
    if r['frames']==count and r['inputHashes']==expected and not source.exists():
     original=Path(r['renderedFile'])
     if original.is_file()and sha(original)==r['sha256']:shutil.copyfile(original,source)
    if r['frames']==count and r['inputHashes']==expected and source.is_file()and sha(source)==r['sha256']:
     if out.resolve()!=source.resolve():shutil.copyfile(source,out)
     reused=True
   if not reused:roster.render(judgment,duration=seconds,path=out)
   finish(out,contract)
  return out
 plate=O/'render/plates'/(page['id']+'.png');plate.parent.mkdir(exist_ok=True)
 if kind=='battle-pause':pause.render(spec,plate)
 elif kind=='data-table':data_plates.render_scene(spec,plate)
 elif kind=='mechanism-note':data_plates.render_mechanism_note(spec,plate)
 else:visuals.render_scene(spec,plate)
 contract['plate']=sha(plate)
 if kind=='battle-pause':contract['pauseCode']=sha(pause.__file__)
 args=['-loop','1','-framerate',30,'-i',plate]
 filter_='[0:v]format=yuv420p[v]'
 if game:
  source=ROOT/game['file'];contract['gameSha256']=sha(source)
  args+=['-i',source]
  a=game['sourceStartFrame'];b=game['sourceEndFrame'];x,y,w,h=game.get('box',t['gameBox'])
  filter_=f'[1:v]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS,scale={w}:{h}:flags=lanczos,setsar=1[g];[0:v][g]overlay={x}:{y}:shortest=1,format=yuv420p[v]'
  if page.get('flow'):
   flow=O/'render'/('flow-'+page['id']+'.png');binding=data_plates.render_flow(page['flow'],flow,game)
   contract['flow']={'sha256':sha(flow),'binding':binding};args+=['-loop','1','-framerate',30,'-i',flow]
   filter_+=f";[v][2:v]overlay=0:0:enable='gte(n,{binding['startFrame']})*lt(n,{binding['endFrame']})'[vflow]"
 if cached(out,contract):return out
 # Slow fades to paper at page edges; native content is never spatially cropped.
 fade=min(.45,seconds/5);last=page['id']==t['pages'][-1]['id'];outfade=min(2.5,seconds/3)if last else fade;color='0x211b17'if last else'0xfffaf2'
 label='vflow'if game and page.get('flow')else'v'
 filter_+=f';[{label}]null[out]' if kind in ['battle','battle-pause'] else f';[{label}]fade=t=in:st=0:d={fade}:color=0xfffaf2,fade=t=out:st={seconds-outfade}:d={outfade}:color={color}[out]'
 run([*args,'-filter_complex_threads','1','-filter_complex',filter_,'-map','[out]','-an','-frames:v',count,'-r',30,'-c:v','libx264','-threads','2','-preset','fast','-crf','19','-pix_fmt','yuv420p','-video_track_timescale','15360',out]);finish(out,contract);return out
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--timeline',default=str(O/'render/timeline.json'));ap.add_argument('--static-only',action='store_true');a=ap.parse_args();p=Path(a.timeline);t=json.loads(p.read_text());assert t['episode']=='THIS-GIRL-002';initial=sha(p);code=sha(__file__)
 if a.static_only:
  assert json.loads((O/'narration.json').read_text())['finalized'];files=[]
  for page in t['pages']:
   if page['spec']['kind']=='battle':continue
   result=render_page(page,None,t);inspect_page(result,page['durationFrames']);files.append({'id':page['id'],'file':str(result.relative_to(ROOT)),'sha256':sha(result)});print('Static cache',page['id'],flush=True)
  assert code==sha(__file__)and initial==sha(p),'Static plan changed while caching'
  (O/'research/static-cache-manifest.json').write_text(json.dumps({'passed':True,'movieComplete':False,'timelineSha256':initial,'rendererSha256':code,'files':files,'scope':'Static pages only. Native cuts, fixed audio offsets, final assembly and final-file QA remain pending.'},ensure_ascii=False,indent=2));return
 assert t['finalized']and not t.get('pendingCalibration')
 frozen=freeze.freeze_inputs(t,p)
 cuts={c['id']:c for c in t['gameCuts']};files=[]
 for page in t['pages']:
  rendered=render_page(page,cuts.get(page['id']),t);inspect_page(rendered,page['durationFrames']);files.append(rendered);print('Rendered',page['id'],flush=True)
 listing=O/'render/pages.txt';listing.write_text(''.join("file '"+str(f).replace("'","'\\''")+"'\n"for f in files))
 deck=O/'render/deck.mp4';run(['-f','concat','-safe','0','-i',listing,'-c','copy',deck])
 ass=subtitles(t);master=O/'render/master.flac';assert master.exists(),'Run mixer.py first'
 mix=json.loads((O/'research/audio-mix.json').read_text());assert sha(master)==mix['outputSha256']
 movie=O/'render/ThisGirl-01.mp4'
 # The final encode is the only AAC generation. No post-sync repair is applied.
 run(['-i',deck,'-i',master,'-vf',f"subtitles=filename='{ass}':fontsdir='/usr/share/fonts/opentype/noto'",'-map','0:v:0','-map','1:a:0','-frames:v',t['durationFrames'],'-c:v','libx264','-threads','2','-preset','fast','-profile:v','baseline','-level:v','4.0','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-movflags','+faststart',movie])
 delivery=O/'delivery/ThisGirl-01.mp4'
 if delivery.is_symlink():delivery.unlink()
 assert not delivery.exists(),'Refuse to overwrite an unrelated delivery file'
 delivery.symlink_to(movie.resolve())
 assert initial==sha(p)and code==sha(__file__),'Render inputs changed'
 freeze.verify_and_save(frozen,movie)
 record={'finalized':False,'renderComplete':True,'finalQaComplete':False,'episode':t['episode'],'movie':str(movie.relative_to(ROOT)),'sha256':sha(movie),'timelineSha256':initial,'rendererSha256':code,'audioMixSha256':sha(O/'research/audio-mix.json'),'captionAssSha256':sha(ass),'pages':[{'file':str(f.relative_to(ROOT)),'sha256':sha(f)}for f in files],'note':'Unverified render; distribution requires independent final-file sync, decode, browser, caption and head-framing QA.'}
 (O/'research/render-manifest.json').write_text(json.dumps(record,ensure_ascii=False,indent=2));print(json.dumps(record,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
