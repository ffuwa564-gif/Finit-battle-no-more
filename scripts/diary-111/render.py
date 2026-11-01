"""Reference-style discussion board + maximum-height native portrait footage.
No invented battle VFX. All native AV edits share one scale and one trim.
"""
import json,pathlib,subprocess,math,wave,sys,textwrap,functools
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/diary-111';R=OUT/'render';R.mkdir(exist_ok=True)
FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';BOLD=FONT.replace('Regular','Bold')
GOLD='#d9c195';WHITE='#f0f2f4';MUTED='#a8b8c7';GREEN='#b8e391';PINK='#f2bed7';W,H=1600,900
C=json.loads((OUT/'content.json').read_text());CHARS={x['id']:x for x in C['characters']};ASSETS={x['id']:x for x in C['assets']}
def ff(*a):subprocess.run(['ffmpeg','-hide_banner','-v','error','-y',*map(str,a)],check=True)
@functools.lru_cache(maxsize=128)
def font(n,b=False):return ImageFont.truetype(BOLD if b else FONT,n)
def tc(t,ass=False):
 h=int(t//3600);m=int(t//60)%60;s=t%60
 return f'{h}:{m:02d}:{s:05.2f}'if ass else f'{h:02d}:{m:02d}:{int(s):02d},{int(round(s%1*1000)):03d}'
def wrap(t,n):return [t[i:i+n]for i in range(0,len(t),n)]
def fit(t,size,width):
 while font(size,True).getlength(t)>width:size-=1
 return font(size,True)
def sprite(base,path,box):
 im=Image.open(path).convert('RGBA');im=im.crop(im.getbbox());im.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS);base.alpha_composite(im,(box[0]+(box[2]-im.width)//2,box[1]+box[3]-im.height))
def board(ch,idx,n):
 base=Image.new('RGBA',(W,H),'#0c1523');d=ImageDraw.Draw(base)
 for y in range(H):d.line((0,y,W,y),fill=(12+int(8*y/H),21+int(10*y/H),35+int(13*y/H)))
 d.line((30,55,1570,55),fill=GOLD,width=2);d.text((30,12),'白亜の塔 攻略日記  Part1.1.1',font=font(26,True),fill=GOLD);d.text((1285,19),f'v1.10.0  /  {idx+1:02d} / {n}',font=font(20),fill=MUTED)
 d.text((35,70),ch['title'],font=fit(ch['title'],36,530 if ch.get('footage') else 1490),fill=WHITE)
 film=ch.get('footage')
 if film:
  d.rounded_rectangle((590,65,1010,795),radius=16,fill='#050a12',outline=GOLD,width=2)
  cfg=json.loads((OUT/'proofs'/(film['id']+'.json')).read_text())['config']
  d.text((1040,140),'今回の編成',font=font(25,True),fill=GOLD)
  for i,cid in enumerate(cfg['party']):
   c=CHARS[cid];portrait=ROOT/'public'/ASSETS[c['portraitId']]['path'];im=Image.open(portrait).convert('RGBA');side=min(im.size);im=im.crop(((im.width-side)//2,(im.height-side)//2,(im.width+side)//2,(im.height+side)//2)).resize((65,65));base.alpha_composite(im,(1040,188+i*83));name=c['name']+('［長］'if cid==cfg['leader']else'')+('〈先頭〉'if i==0 else'');d.text((1120,201+i*83),name,font=fit(name,25,420),fill=WHITE)
  y=150
  for p in ch['points']:
   for t in wrap(p,19):d.text((35,y),t,font=font(25,True),fill=WHITE);y+=40
   y+=20
  sprite(base,OUT/'assets/zunmon003.png',(55,470,270,315));sprite(base,OUT/'assets/met002_cr.png',(1240,475,285,310))
 else:
  d.rounded_rectangle((295,145,1305,734),radius=20,fill='#172638',outline='#52687e',width=2)
  d.text((325,170),'作戦ボード',font=font(24),fill=GOLD)
  y=240
  for i,p in enumerate(ch['points']):
   d.ellipse((330,y+10,342,y+22),fill=GREEN)
   for t in wrap(p,27):d.text((365,y),t,font=font(30,True),fill=WHITE);y+=49
   y+=37
  from visuals import draw
  draw(base,ch,ROOT,OUT,font,CHARS,ASSETS)
  d.text((330,680),'条件・装備・操作記録は GitHub の付属資料へ',font=font(23),fill=MUTED)
  sprite(base,OUT/'assets/zunmon003.png',(15,300,280,485));sprite(base,OUT/'assets/met002_cr.png',(1305,300,280,485))
 d.rectangle((0,800,W,H),fill='#070e18');d.line((30,801,1570,801),fill='#677b8e',width=1)
 for j in range(n):d.rectangle((30+j*103,790,30+j*103+92,794),fill=GOLD if j<=idx else'#2c4054')
 p=R/(ch['id']+'-board.png');base.convert('RGB').save(p);return p
HEADER='''[Script Info]\nScriptType: v4.00+\nPlayResX: 1600\nPlayResY: 900\nWrapStyle: 2\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Z,Noto Sans CJK JP,32,&H00F7FFF0,&H000000FF,&H001D2516,&H70000000,1,0,0,0,100,100,0,0,1,1.7,0,2,50,50,12,1\nStyle: M,Noto Sans CJK JP,32,&H00FFF3FC,&H000000FF,&H002C1828,&H70000000,1,0,0,0,100,100,0,0,1,1.7,0,2,50,50,12,1\nStyle: Note,Noto Sans CJK JP,25,&H00FFFFFF,&H000000FF,&H00101828,&H90000000,1,0,0,0,100,100,0,0,3,6,0,7,1040,40,550,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
def subtitles(ch,edit=None):
 s=HEADER
 for l in ch['lines']:
  name='ずんだもん'if l['speaker']=='z'else'めたん';col='&H0091E3B8&'if l['speaker']=='z'else'&H00D7BEF2&';t=l['text'];parts=wrap(t,42);assert len(parts)<=2,(len(t),t)
  text=r'{\fs18\c'+col+'}'+name+r'{\r}\h\h'+r'\N'.join(parts)
  s+=f"Dialogue: 2,{tc(l['start']-ch['start'],True)},{tc(l['end']-ch['start'],True)},{l['speaker'].upper()},,0,0,0,,{text}\n"
 if edit:
  label="結果画面・本走を振り返る" if edit.get("resultStill") else f"抜粋 {edit['speed']:.2f}倍／アプリ{edit['applicationSpeed']}"
  s+=f"Dialogue: 1,0:00:00.00,{tc(ch['duration'],True)},Note,,0,0,0,,{{\\pos(1040,110)}}{label}\n"
  for note in edit['notes']:
   s+=f"Dialogue: 1,{tc(note['start'],True)},{tc(note['end'],True)},Note,,0,0,0,,{{\\pos(35,430)}}{note['text']}\n"
 p=R/(ch['id']+'.ass');p.write_text(s);return p
 def_unused=0
def voice(ch):
 rate=24000;x=np.zeros(math.ceil((ch['duration']+.1)*rate),dtype=np.float32)
 for l in ch['lines']:
  with wave.open(str(ROOT/l['wav']))as w:a=np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(float)/32768
  start=round((l['start']-ch['start'])*rate);x[start:start+len(a)]+=a*.85
 p=R/(ch['id']+'-voice.wav')
 with wave.open(str(p),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes((np.clip(x,-.94,.94)*32767).astype('<i2').tobytes())
 return p
def atempo(r):
 a=[]
 while r>2:a.append('atempo=2');r/=2
 while r<.5:a.append('atempo=0.5');r/=.5
 return ','.join(a+[f'atempo={r:.10f}'])
def footage(ch):
 f=ch['footage'];m=json.loads((OUT/'capture'/(f['id']+'.json')).read_text());start,end=m['gameplayWindow']
 if f['section']=='late':
  edit=dict(resultStill=True,source=f['id']+'-result.png',applicationSpeed=m.get('applicationSpeed',1),speed=1,notes=[],windows=[])
 else:
  candidates=[(start,min(end,start+35)),(max(start,end-35),end)]
  for e in m.get('battleEvents',[]):
   v=e['event'];text=v.get('text','');skill=v.get('skillId','');t=e['time']-m['initialOffset']
   important=('rewind-thread' in skill)if f['id']=='rewind'else('実行した防御' in text or '余り布が障壁' in text)
   if important:candidates.append((max(start,t-3),min(end,t+7)))
  windows=[]
  for a,b in sorted(candidates):
   if windows and a<=windows[-1][1]:windows[-1][1]=max(windows[-1][1],b)
   else:windows.append([a,b])
  r=sum(b-a for a,b in windows)/ch['duration'];notes=[];elapsed=0
  for a,b in windows:
   for e in m.get('battleEvents',[]):
    t=e['time']-m['initialOffset'];v=e['event'];label=None
    if not a<=t<b:continue
    cid=v.get('actorId','').replace('party:','');name=CHARS.get(cid,{}).get('name',cid)
    if v.get('ultimate')and cid in CHARS:label=name+'：必殺'
    elif 'white-flower-seed' in v.get('skillId',''):label='摘まない白花：種を預ける'
    elif 'rewind-thread' in v.get('skillId',''):label='巻戻し：通常スキルを短縮'
    elif v.get('text','').startswith('摘まない白花 — 実行した防御'):label='白花：実回復'+str(v.get('amount',0))
    elif '余り布が障壁' in v.get('text',''):label='余り布：追加障壁5'
    if label:
     ts=(elapsed+t-a)/r;notes.append(dict(start=ts,end=min(ts+1.6,ch['duration']),text=label))
   elapsed+=b-a
  for i,note in enumerate(notes[:-1]):note['end']=min(note['end'],notes[i+1]['start'])
  notes=[n for n in notes if n['end']-n['start']>.12]
  edit=dict(resultStill=False,applicationSpeed=m.get('applicationSpeed',1),source=f['id']+'.mp4',windows=windows,duration=ch['duration'],speed=r,identicalAVRate=True,notes=notes,chronologicalExcerpts=True)
 (R/(ch['id']+'-edit.json')).write_text(json.dumps(edit,ensure_ascii=False,indent=2));return edit
def render(ch,idx,n):
 dest=R/(ch['id']+'.mp4')
 if dest.exists():return dest
 bg=board(ch,idx,n);edit=footage(ch)if ch.get('footage')else None;ass=subtitles(ch,edit);v=voice(ch);dur=ch['duration']
 args=['-filter_complex_threads','1','-loop','1','-framerate','1','-i',bg,'-i',v,'-stream_loop','-1','-ss',ch['start']%130,'-i',ROOT/'public/audio/fjordnosundakaze.mp3']
 graph='[0:v]fps=30,setsar=1[b];[1:a]aformat=sample_rates=48000:channel_layouts=stereo[voice];[2:a]volume=0.045[bgm];'
 if edit and edit.get('resultStill'):
  args+=['-loop','1','-framerate','1','-i',OUT/'capture'/edit['source']]
  graph+=f"[3:v]fps=30,scale=405:720,setsar=1[g];[b][g]overlay=597:70,ass={ass}[v];[voice][bgm]amix=inputs=2:normalize=0,alimiter=limit=0.94:level=false[a]"
 elif edit:
  vs=[];aud=[]
  for j,(a,b)in enumerate(edit['windows']):
   index=3+j;length=b-a;args+=['-threads','1','-ss',a,'-t',length,'-i',OUT/'capture'/edit['source']]
   graph+=f"[{index}:v]setpts=(PTS-STARTPTS)/{edit['speed']},scale=405:720,setsar=1,fps=30[v{j}];[{index}:a]asetpts=PTS-STARTPTS,{atempo(edit['speed'])},aresample=48000[a{j}];"
   vs.append(f'[v{j}]');aud.append(f'[a{j}]')
  graph+=''.join(v+a for v,a in zip(vs,aud))+f"concat=n={len(vs)}:v=1:a=1[g][native];[b][g]overlay=597:70,ass={ass}[v];[native]volume=0.38,apad=whole_dur={dur}[se];[voice][bgm][se]amix=inputs=3:normalize=0,alimiter=limit=0.94:level=false[a]"
 else:graph+=f'[b]ass={ass}[v];[voice][bgm]amix=inputs=2:normalize=0,alimiter=limit=0.94:level=false[a]'
 ff(*args,'-filter_complex',graph,'-map','[v]','-map','[a]','-t',dur,'-r','30','-c:v','libx264','-threads','2','-preset','veryfast','-crf','27','-pix_fmt','yuv420p','-c:a','aac','-b:a','112k','-movflags','+faststart',dest);print('RENDER',ch['id'],dur,flush=True);return dest
if __name__=='__main__':
 m=json.loads((OUT/'narration.json').read_text());files=[]
 for i,ch in enumerate(m['chapters']):
  if len(sys.argv)>1 and ch['id']!=sys.argv[1]:continue
  files.append(render(ch,i,len(m['chapters'])))
 if len(sys.argv)==1:
  p=R/'chapters.txt';p.write_text(''.join(f"file '{x.name}'\n"for x in files));ff('-f','concat','-safe','0','-i',p,'-c:v','copy','-c:a','aac','-b:a','128k','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-movflags','+faststart',OUT/'delivery/STILLVEIL-TowerDiary-Part1.1.1.mp4')
