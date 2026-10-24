"""Edit existing project animations and real CDP gameplay captures into a bilingual trailer.
Requires ffmpeg/ffprobe and Noto CJK fonts. No AI generation or external upload.
"""
import argparse,json,subprocess
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--preview',action='store_true');parser.add_argument('--resume',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
out=root/'artifacts/trailer';work=out/('edit-720' if args.preview else 'edit-1080');work.mkdir(parents=True,exist_ok=True)
S=2/3 if args.preview else 1
W,H=int(1920*S),int(1080*S)
serif='/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc'
sans='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
def n(v):return round(v*S)
def even(v):return round(v*S/2)*2
def run(cmd):subprocess.run(cmd,cwd=root,check=True)
def ff(*args):run(['ffmpeg','-hide_banner','-loglevel','error','-y','-filter_complex_threads','2',*map(str,args)])
def label(text,size,x,y,color='F3F1E9',font=serif,center=False):
 p=work/f'text-{len(list(work.glob("text-*.txt"))):03d}.txt';p.write_text(text)
 return f"drawtext=fontfile='{font}':textfile='{p}':fontsize={n(size)}:fontcolor=0x{color}:x={'(w-text_w)/2' if center else n(x)}:y={n(y)}:shadowcolor=black@0.35:shadowx=0:shadowy={max(1,n(2))}"
def caption(eyebrow,lines,ja,bottom=False):
 y=818 if bottom else 355
 result=[]
 if bottom:result+=[f'drawbox=x={n(80)}:y={n(776)}:w={n(880)}:h={n(304)}:color=0x101927@0.75:t=fill']
 result += [f'drawbox=x={n(120)}:y={n(y-28)}:w={n(80)}:h={max(1,n(2))}:color=0xC7AE7A:t=fill',label(eyebrow,20,120,y-70,'C7AE7A',sans)]
 for i,line in enumerate(lines):result.append(label(line,58 if bottom else 80,120,y+i*97))
 result.append(label(ja,29,120,988 if bottom else y+len(lines)*97+30,'CCD5E0',sans))
 return ','.join(result)
# Normalize the recorded variable frame cadence and keep genuine recorded SE in sync.
raws={}
for name in ['battle','loot','summon','boss','awaken']:
 d=out/'raw'/name;meta=json.loads((d/'metadata.json').read_text());v=d/'video.mp4';a=d/'audio.wav'
 # Frames may be overwritten by a new capture; always re-encode for this edit.
 if not (args.resume and v.exists()):ff('-f','concat','-safe','0','-i',d/'frames.ffconcat','-vf','fps=30,tpad=stop_mode=clone:stop_duration=3','-an','-c:v','libx264','-threads','4','-preset','fast','-crf','18','-pix_fmt','yuv420p',v)
 offset=meta['audioOffsetSeconds'];af=f'atrim=start={max(0,offset)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo'
 if offset<0:af+=f',adelay={round(-offset*1000)}:all=1'
 if not (d/'audio.webm').exists() or (d/'audio.webm').stat().st_size<100:raise RuntimeError(f'{name}: no recorded audio')
 if not (args.resume and a.exists()):ff('-i',d/'audio.webm','-af',af,'-c:a','pcm_s16le',a)
 raws[name]=(v,a,meta)
print('Gameplay and real SE normalized.',flush=True)
loot_meta=raws['loot'][2]
rare=next(e for e in loot_meta['events'] if e['kind']=='drop' and e.get('rarity')=='rare')
loot_start=max(0,(rare['at']/1000-loot_meta['firstFrame'])-.8)
shots=[
 dict(id='intro',duration=3.5,art='home-portrait-anime.mp4',start=0),
 dict(id='battle',duration=7.5,game='battle',start=.2,art='seris-awakened.mp4',eye='STRATEGY',en=['COMMAND','EVERY ROUND'],ja='作戦ひとつで、戦況が変わる。'),
 dict(id='loot',duration=5.5,game='loot',start=loot_start,art='home-portrait-anime.mp4',eye='COMPANIONS',en=['COLLECT.','RECRUIT.'],ja='素材を集め、敵を仲間に。'),
 dict(id='summon',duration=6.5,game='summon',start=2.3,art='gacha-athena-anime.mp4',hero=True,eye='GODDESS COLLECTIONS',en=['GODDESSES AWAIT'],ja='女神たちとの、新たな出会い。'),
 dict(id='boss',duration=6,game='boss',start=.2,art='kuzuha-awakened.mp4',hero=True,eye='THE NINE-TAILED FOX',en=['BEYOND THE VEIL'],ja='九尾の姫、その覚醒の先へ。'),
 dict(id='awaken',duration=6,game='awaken',start=.4,art='seris-awakened.mp4',hero=True,eye='MEMORIES OF DAWN',en=['AWAKEN THE DAWN'],ja='記憶を辿り、約束の朝へ。'),
 dict(id='end',duration=5.5,art='home-portrait-anime.mp4',start=4),
]
segments=[]
for idx,shot in enumerate(shots):
 dur=shot['duration'];art=root/'public/video'/shot['art'];target=work/f'{idx:02d}-{shot["id"]}.mp4';sound=work/f'{idx:02d}-{shot["id"]}.wav'
 if args.resume and target.exists() and sound.exists():
  segments.append((target,sound,dur));continue
 if 'game' not in shot:
  chain=f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}:0:{n(170)},fps=30,setsar=1,eq=brightness=-0.19:saturation=0.75'
  if shot['id']=='intro':
   chain+=','+','.join([label('BENEATH THE SILENT MOON',21,135,288,'C7AE7A',sans),label('STILLVEIL',118,125,350),label('静謐の残響',32,135,520,'CCD5E0'),label('A promise beyond the endless night.',29,135,614,'F3F1E9',sans)])
  else:
   chain+=',drawbox=x=0:y=0:w=iw:h=ih:color=0x101927@0.30:t=fill,'+','.join([label('STILLVEIL',120,0,310,center=True),label('静謐の残響',38,0,485,'CCD5E0',center=True),label('PLAY FREE IN YOUR BROWSER',29,0,645,'C7AE7A',sans,True),label('fluffy3546.itch.io/stillveil',30,0,708,'F3F1E9',sans,True),label('In development  /  開発中',21,0,925,'CCD5E0',sans,True),label('Music: Amacha Music Studio / 甘茶の音楽工房',20,0,987,'CCD5E0',sans,True)])
  ff('-ss',shot['start'],'-i',art,'-t',dur,'-vf',chain,'-an','-c:v','libx264','-threads','4','-preset','fast','-crf','19','-pix_fmt','yuv420p',target)
  ff('-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',dur,'-c:a','pcm_s16le',sound)
 else:
  v,a,_=raws[shot['game']]
  graph=f'[1:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps=30,setsar=1,boxblur={n(35)}:2,eq=brightness=-0.24:saturation=0.55[bg];'
  if shot.get('hero'):
   graph+=f'[1:v]scale={even(880)}:{even(1320)},crop={even(880)}:{H}:0:0,setsar=1,fps=30[hero];[bg][hero]overlay={n(80)}:0[base];'
  else:graph+='[bg]null[base];'
  graph+=f'[0:v]scale={even(540)}:{H-n(120)},setsar=1,fps=30[game];[base]drawbox=x={n(1127)}:y={n(57)}:w={n(546)}:h={n(966)}:color=0xC7BAA1@0.7:t={max(1,n(2))}[frame];[frame][game]overlay={n(1130)}:{n(60)}[screen];[screen]'+caption(shot['eye'],shot['en'],shot['ja'],shot.get('hero',False))+'[v]'
  ff('-ss',shot['start'],'-i',v,'-stream_loop','-1','-i',art,'-filter_complex',graph,'-map','[v]','-t',dur,'-an','-c:v','libx264','-threads','4','-preset','fast','-crf','19','-pix_fmt','yuv420p',target)
  ff('-ss',shot['start'],'-i',a,'-af',f'apad=whole_dur={dur},atrim=duration={dur},afade=t=in:d=0.08,afade=t=out:st={dur-.12}:d=0.12','-t',dur,'-c:a','pcm_s16le',sound)
 segments.append((target,sound,dur));print('Rendered',shot['id'],flush=True)
# Matching crossfades for the image and genuine gameplay audio.
video=work/'picture.mp4';se=work/'se.wav';fade=.45
inputs=[]
for v,a,d in segments:inputs+=['-i',str(v)]
chain=''
current='0:v';elapsed=segments[0][2]
for i in range(1,len(segments)):
 chain+=f'[{current}][{i}:v]xfade=transition=fade:duration={fade}:offset={elapsed-fade}[x{i}];';current=f'x{i}';elapsed+=segments[i][2]-fade
chain=chain.rstrip(';')
ff(*inputs,'-filter_complex',chain,'-map',f'[{current}]','-an','-c:v','libx264','-threads','4','-preset','fast','-crf','19','-pix_fmt','yuv420p',video)
inputs=[]
for v,a,d in segments:inputs+=['-i',str(a)]
chain='';current='0:a'
for i in range(1,len(segments)):
 chain+=f'[{current}][{i}:a]acrossfade=d={fade}:c1=tri:c2=tri[a{i}];';current=f'a{i}'
ff(*inputs,'-filter_complex',chain.rstrip(';'),'-map',f'[{current}]','-c:a','pcm_s16le',se)
output=out/('stillveil-trailer-preview-720p.mp4' if args.preview else 'stillveil-trailer-1080p.mp4')
# Existing game music, mixed under recorded game SE. The ending fades naturally.
ff('-i',video,'-i',se,'-stream_loop','-1','-i',root/'public/audio/uzumaki.mp3','-filter_complex',f'[1:a]volume=1.4[se];[2:a]atrim=duration={elapsed},asetpts=PTS-STARTPTS,volume=0.40,afade=t=in:d=1.4,afade=t=out:st={elapsed-2.8}:d=2.8[music];[se][music]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=10[a]','-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart','-t',elapsed,output)
(out/'edit-list.json').write_text(json.dumps({'resolution':[W,H],'fps':30,'duration':elapsed,'transition':fade,'shots':shots,'music':'渦巻き / 甘茶の音楽工房','newVideoGeneration':False},ensure_ascii=False,indent=2)+'\n')
print('Trailer:',output,round(elapsed,2),'seconds',flush=True)
