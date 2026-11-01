import argparse,json,pathlib,subprocess,math,wave,textwrap,hashlib,shutil
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageEnhance
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/tower-builds'
RENDER=OUT/'render';RENDER.mkdir(exist_ok=True)
FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
GOLD='#dac39a';WHITE='#f2f2ec';MUTED='#a9b7c2';GREEN='#b8e391';PINK='#f2bed7'
CONTENT=json.loads((OUT/'content.json').read_text());CHARS={c['id']:c for c in CONTENT['characters']};ASSETS={a['id']:a for a in CONTENT['assets']};SKILLS={s['id']:s for s in CONTENT['skills']}
GEMS={'echo-shard':'残響石','night-dew':'夜露石','twin-tide':'双潮の記憶','dawn-crown':'暁冠の記憶','shield-break':'砕盾石','dream-lace':'夢織石','clear-tear':'祓いの涙石','rewind-thread':'巻戻しの石','star-furnace':'星炉の記憶','pale-ward':'白灯石'}
TRAITS={'chain':'連鎖','bulwark':'庇護','execution':'処刑','mercy':'慈雨','none':'付加なし'}
NOTES={
 'initial':['覚醒した初期4人','装備はT5・入門条件ではない'],
 'echo':['遅延ダメージ＋別の敵へ連鎖','追加攻撃からの無限連鎖はなし'],
 'shield':['障壁を消費して攻撃','防御と火力で資源を共有'],
 'drain':['吸収＋慈雨で継戦','行動できないと回復も止まる'],
 'dawn':['弱体＋防御無視','終盤は処刑も利用'],
 'area':['取り巻きをまとめて削る','守りと回復は残す'],
 'sleep':['行動停止を狙う','HPダメージで目覚める'],
 'confuse':['スキルを通常攻撃へ','50%で味方・それ以外は敵'],
 'paralysis':['行動時40%で停止','付与成功と停止は別の抽選'],
 'charm':['味方への通常攻撃に変化','付与者が倒れると解除'],
 'cleanse':['状態異常・防御低下を解除','攻撃機会との交換'],
 'regen':['再生＋吸収で継戦','一撃で倒されると戻せない'],
 'rewind':['他の味方の通常スキル短縮','石の技・必殺は対象外'],
 'battery':['体力を必殺ゲージに変換','実験型：安定性には課題'],
 'rally':['先頭の号令で攻撃支援','リーダーと先頭は別の役割'],
 'accel':['敵味方の攻撃が上がる','実験型：長引くほど危険'],
 'recycle':['障壁を回復へ再利用','障壁＋負傷の条件が必要'],
 'execute':['残りHP35%以下に上乗せ','序盤を越える耐久も必要'],
 'dream6':['夢織で本人の必殺＋45','抵抗されてもゲージ供給'],
}
def font(n,bold=False):return ImageFont.truetype(BOLD if bold else FONT,n)
def fit(text,size,width):
 while font(size,True).getlength(text)>width:size-=1
 return font(size,True)
def paste_fit(canvas,im,box):
 im=im.convert('RGBA');im=im.crop(im.getbbox());im.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS);canvas.alpha_composite(im,(box[0]+(box[2]-im.width)//2,box[1]+box[3]-im.height))
def board(chapter,proof=None):
 ident=chapter['id'];base=Image.open(OUT/'capture/echo-start.png').convert('RGB').resize((1280,2363)).crop((0,450,1280,1170)).filter(ImageFilter.GaussianBlur(32));base=ImageEnhance.Brightness(base).enhance(.35).convert('RGBA');base=Image.alpha_composite(base,Image.new('RGBA',base.size,(6,14,25,130)));d=ImageDraw.Draw(base)
 d.line((34,45,409,45),fill=GOLD,width=1);d.text((34,12),'STILLVEIL  /  IVORY TOWER 1F',font=font(18),fill=GOLD)
 d.rounded_rectangle((461,0,819,642),radius=19,fill='#080e19',outline='#9aa5af',width=1)
 title=chapter['title'];clean=title[3:] if proof else title
 if proof:
  d.text((34,66),title[:2]+' / 19',font=font(19),fill=GREEN)
  lines=textwrap.wrap(clean,12)
  for i,line in enumerate(lines):d.text((34,96+i*39),line,font=font(30,True),fill=WHITE)
  top=178 if len(lines)==1 else 213
  d.text((34,top),f"別乱数 {proof['holdoutWins']} / {proof['holdoutCount']} 成功",font=font(25,True),fill=GOLD)
  d.text((34,top+36),'固定の装備・操作方針で検証',font=font(16),fill=MUTED)
  for i,note in enumerate(NOTES[ident]):d.text((34,top+67+i*27),note,font=fit(note,20,380),fill=WHITE)
  d.text((853,16),'FORMATION  &  MEMORY GEMS',font=font(17),fill=GOLD)
  d.text((853,43),f"装備 T{proof['tier']} ｜ 持込薬 最大5個",font=font(19,True),fill=WHITE)
  for i,cid in enumerate(proof['config']['party']):
   y=86+i*52;c=CHARS[cid];g=proof['config']['gems'][i];portrait=ROOT/'public'/ASSETS[c['portraitId']]['path']
   if portrait.exists():
    im=Image.open(portrait).convert('RGBA');side=min(im.size);im=im.crop(((im.width-side)//2,(im.height-side)//2,(im.width+side)//2,(im.height+side)//2)).resize((42,42),Image.Resampling.LANCZOS);base.alpha_composite(im,(853,y))
   leader='［長］' if cid==proof['config']['leader'] else '';pilot='〈先頭〉' if i==0 else ''
   name=c['name']+leader+pilot;d.text((905,y-2),name,font=fit(name,19,345),fill=WHITE)
   gear=GEMS[g['defId']]+' / '+TRAITS[g['roll']['trait']];d.text((905,y+23),gear,font=fit(gear,16,345),fill=GOLD)
  d.text((850,303),f"撮影例 {proof['rounds']}R ／ {proof['survivors']}人生存 ／ 薬{proof['potions']}個",font=font(19),fill=WHITE)
 else:
  d.text((34,78),'ずんだもん × 四国めたん',font=font(25,True),fill=WHITE)
  titles=['同じ第1層を','19編成で攻略'] if ident=='intro' else ['好きな勝ち方を','ひとつ選ぼう。']
  for i,t in enumerate(titles):d.text((34,123+i*46),t,font=font(35,True),fill=WHITE)
  for i,t in enumerate(['実アプリの戦闘とSE','異なる乱数60通りで比較','装備・操作記録を同梱'] if ident=='intro' else ['立ち絵：東北ずん子・ずんだもんPJ','音楽：甘茶の音楽工房','フィヨルドの澄んだ風']):d.text((34,229+i*27),t,font=font(20),fill=MUTED)
  right=['連鎖・障壁・吸収','睡眠・混乱・麻痺・魅了','再生・解除・巻戻し','必殺供給・号令・加速','終盤火力・T6の変化'] if ident=='intro' else ['勝利例と安定性は別','装備の準備難度にも注意','手持ちの土台を残して試す','説明欄に比較表と記録','VOICEVOX:ずんだもん','VOICEVOX:四国めたん']
  for i,t in enumerate(right):d.text((857,90+i*35),t,font=fit(t,23,389),fill=WHITE if i<4 else GOLD)
 # Official standing illustrations, resized only. Subtitles occupy a separate footer.
 paste_fit(base,Image.open(OUT/'assets/zunmon003.png'),(65,308,310,330))
 paste_fit(base,Image.open(OUT/'assets/met012.png'),(875,338,300,300))
 d.rectangle((0,644,1280,720),fill=(6,13,22,235));d.line((34,645,1246,645),fill=(145,159,174,100),width=1)
 d.text((849,627),'検証用装備 ｜ 戦闘は2倍速・抜粋',font=font(15),fill=MUTED)
 path=RENDER/(ident+'-board.png');base.convert('RGB').save(path);return path
def timecode(t,ass=False):
 h=int(t//3600);m=int(t//60)%60;s=t%60
 return f'{h}:{m:02d}:{s:05.2f}' if ass else f'{h:02d}:{m:02d}:{int(s):02d},{round((s%1)*1000):03d}'
def subtitles(chapter):
 header='''[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 2\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Z,Noto Sans CJK JP,30,&H00F7FFF0,&H000000FF,&H001D2516,&H70000000,1,0,0,0,100,100,0,0,1,2.6,1,2,42,42,9,1\nStyle: M,Noto Sans CJK JP,30,&H00FFF3FC,&H000000FF,&H002C1828,&H70000000,1,0,0,0,100,100,0,0,1,2.6,1,2,42,42,9,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
 for line in chapter['lines']:
  text=line['text'];parts=[text] if len(text)<=34 else [text[:len(text)//2],text[len(text)//2:]]
  name='ずんだもん' if line['speaker']=='z' else 'めたん';color='&H0091E3B8&' if line['speaker']=='z' else '&H00D7BEF2&'
  text=r'{\fs17\c'+color+'}'+name+r'{\r}\h\h'+r'\N'.join(parts)
  header+=f"Dialogue: 2,{timecode(line['start']-chapter['start'],True)},{timecode(line['end']-chapter['start'],True)},{line['speaker'].upper()},,0,0,0,,{text}\n"
 path=RENDER/(chapter['id']+'.ass');path.write_text(header);return path
def audio(chapter):
 rate=24000;mix=np.zeros((math.ceil((chapter['duration']+.1)*rate),2),dtype=np.float32)
 for line in chapter['lines']:
  with wave.open(str(ROOT/line['wav'])) as w:data=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
  start=round((line['start']-chapter['start'])*rate);mix[start:start+len(data)]+=data[:,None]*.85
 # Speech is normalized before mixing, leaving room for native SE and BGM.
 peak=np.max(np.abs(mix));mix*=min(1.0,.83/max(peak,.001))
 path=RENDER/(chapter['id']+'-voice.wav')
 with wave.open(str(path),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes((mix*32767).astype('<i2').tobytes())
 return path
def duration(path):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)]))
def mechanism(ident,e):
 s=e.get('skillId','');template=SKILLS.get(s,{}).get('template');actor=e.get('actorId','').startswith('party:')
 if ident in ['confuse','paralysis','charm']:
  ail={'confuse':'confusion','paralysis':'paralysis','charm':'charm'}[ident];action='skip' if ident=='paralysis' else 'friendly_fire'
  return e.get('actorId','').startswith('enemy:') and e.get('ailment')==ail and e.get('statusAction')==action
 if ident=='area':return e.get('ultimate') and e.get('actorId')=='party:lunette-awakened'
 if not actor:return False
 keys={'echo':'echo-shard','shield':'shield-break','drain':'night-dew','dawn':'dawn-crown','sleep':'dream-lace','cleanse':'clear-tear','rewind':'rewind-thread','battery':'star-furnace','execute':'dawn-crown','dream6':'dream-lace'}
 if ident in keys:return ('memory:'+keys[ident]+':') in s
 if ident in ['confuse','paralysis','charm']:return e.get('ailment')=={'confuse':'confusion','paralysis':'paralysis','charm':'charm'}[ident] and e.get('statusAction')=='inflict'
 if ident=='regen':return template=='regen'
 if ident=='rally':return template=='rally'
 if ident=='recycle':return template=='barrier_mend'
 return bool(e.get('ultimate'))
def combat(chapter,proof):
 ident=chapter['id'];raw=OUT/'capture'/(ident+'.mp4');meta=json.loads((OUT/'capture'/(ident+'.json')).read_text());total=duration(raw)
 setup=chapter['lines'][3]['start']-chapter['start'];result=chapter['lines'][-3]['start']-chapter['start'];playtime=result-setup
 if meta.get('recordingMethod') and total<=playtime:
  p=RENDER/(ident+'-combat.mp4');subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-vf',f'tpad=stop_mode=clone:stop_duration={playtime-total+.1}','-af',f'apad=whole_dur={playtime}','-t',str(playtime),'-c:v','libx264','-threads','1','-preset','veryfast','-crf','21','-c:a','aac','-b:a','96k',str(p)],check=True)
  (RENDER/(ident+'-edit.json')).write_text(json.dumps({'setup':setup,'result':result,'windows':[[0,total]],'postClearHold':playtime-total,'raw':str(raw),'sourceOffset':offset if 'offset' in locals() else 0,'footage':meta['recordingMethod']},indent=2));return p,setup,result
 offset=meta['offset'];markers=meta['marks'];rounds=[m for m in markers if m['kind']=='round'];opening_end=min(total,rounds[min(3,len(rounds)-1)]['time']-offset)
 final_start=max(0,rounds[-1 if meta.get('recordingMethod') else -2]['time']-offset) if len(rounds)>1 else total-12
 candidates=[max(0,e['time']-offset-1) for e in meta.get('battleEvents',[]) if mechanism(ident,e['event']) and (meta.get('recordingMethod') or e['round']<=4 or e['round']>=proof['rounds']-2)]
 core=candidates[0] if candidates else min(12,opening_end/2)
 # Three chronological excerpts. Every time jump is explicitly labeled as an excerpt.
 one=min(10,playtime*.26,opening_end);last=min(16,playtime*.40,total-final_start)
 middle=playtime-one-last
 core=max(one,min(core,max(one,final_start-middle)))
 windows=[(0,one),(core,middle),(max(final_start,total-last-.15),last)]
 # Avoid overlap; prefer early continuous combat when the source has room.
 if windows[1][0]<windows[0][1]:windows[1]=(windows[0][1],middle)
 if windows[1][0]+middle>windows[2][0]:windows[1]=(max(one,windows[2][0]-middle),middle)
 if ident=='battery':
  setup=chapter['lines'][4]['start']-chapter['start'];result=chapter['lines'][-3]['start']-chapter['start'];playtime=result-setup
  star=next(e['time']-offset for e in meta['battleEvents'] if 'memory:star-furnace:' in e['event'].get('skillId',''))
  rabbit=next(e['time']-offset for e in meta['battleEvents'] if e['event'].get('ultimate') and e['event'].get('actorId')=='party:lunette-awakened')
  star_len=4.6;rabbit_len=5.4;first=max(3,chapter['lines'][6]['start']-chapter['start']-setup-.3-star_len)
  last=playtime-first-star_len-rabbit_len
  if last<2:first-=2-last;last=2
  windows=[(0,first),(max(0,star-.3),star_len),(max(0,rabbit-.3),rabbit_len),(max(0,total-last-.1),last)]
 pieces=[]
 for i,(start,length) in enumerate(windows):
  p=RENDER/f'{ident}-cut{i}.mp4';subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(max(0,start)),'-i',str(raw),'-t',str(length),'-c:v','libx264','-threads','1','-preset','veryfast','-crf','21','-c:a','aac','-b:a','96k',str(p)],check=True);pieces.append(p)
 concat=RENDER/(ident+'-cuts.txt');concat.write_text(''.join(f"file '{p.name}'\n" for p in pieces));p=RENDER/(ident+'-combat.mp4')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy',str(p)],check=True)
 (RENDER/(ident+'-edit.json')).write_text(json.dumps({'setup':setup,'result':result,'windows':windows,'raw':str(raw),'sourceOffset':offset,'footage':'native app, speed setting 2; excerpts; no replay speed changes'},indent=2))
 return p,setup,result
def render(chapter):
 ident=chapter['id'];dest=RENDER/(ident+'.mp4')
 if dest.exists():
  try:
   if abs(duration(dest)-chapter['duration'])<.15:return dest
  except subprocess.CalledProcessError:pass
  dest.unlink()
 proof=json.loads((OUT/'proofs'/(ident+'.json')).read_text()) if ident not in ['intro','outro'] else None
 bg=board(chapter,proof);ass=subtitles(chapter);voice=audio(chapter);dur=chapter['duration']
 args=['ffmpeg','-hide_banner','-loglevel','error','-y','-filter_complex_threads','1','-loop','1','-framerate','1','-i',str(bg)]
 if proof:
  film,setup,result=combat(chapter,proof)
  args+=['-i',str(film),'-loop','1','-framerate','1','-i',str(OUT/'capture'/(ident+'-start.png')),'-loop','1','-framerate','1','-i',str(OUT/'capture'/(ident+'-result.png')),'-i',str(voice),'-stream_loop','-1','-ss',str(chapter['start']%duration(ROOT/'public/audio/fjordnosundakaze.mp3')),'-i',str(ROOT/'public/audio/fjordnosundakaze.mp3')]
  graph=f'[0:v]fps=30,setsar=1[b];[2:v]scale=342:632,setsar=1[s];[3:v]scale=342:632,setsar=1[r];[1:v]scale=342:632,setsar=1,setpts=PTS-STARTPTS+{setup}/TB[g];[b][s]overlay=469:5:enable=\'lt(t,{setup})\'[b1];[b1][g]overlay=469:5:enable=\'between(t,{setup},{result})\'[b2];[b2][r]overlay=469:5:enable=\'gte(t,{result})\'[b3];[b3]ass={ass}[v];[1:a]adelay={round(setup*1000)}:all=1,volume=0.40,apad=whole_dur={dur}[se];[4:a]aformat=sample_rates=48000:channel_layouts=stereo[voice];[5:a]volume=0.055,afade=t=in:d=1,afade=t=out:st={dur-1}:d=1[bgm];[voice][se][bgm]amix=inputs=3:normalize=0,alimiter=limit=0.95:level=false[a]'
 else:
  args+=(['-ss',str(max(0,duration(OUT/'capture/echo.mp4')-dur))] if ident=='outro' else [])+['-i',str(OUT/'capture/echo.mp4'),'-i',str(voice),'-stream_loop','-1','-ss',str(chapter['start']%duration(ROOT/'public/audio/fjordnosundakaze.mp3')),'-i',str(ROOT/'public/audio/fjordnosundakaze.mp3')]
  graph=f'[0:v]fps=30,setsar=1[b];[1:v]scale=342:632,setsar=1[g];[b][g]overlay=469:5[b1];[b1]ass={ass}[v];[1:a]volume=0.14,apad=whole_dur={dur}[se];[2:a]aformat=sample_rates=48000:channel_layouts=stereo[voice];[3:a]volume=0.055,afade=t=in:d=1,afade=t=out:st={dur-1}:d=1[bgm];[voice][se][bgm]amix=inputs=3:normalize=0,alimiter=limit=0.95:level=false[a]'
 temporary=RENDER/(ident+'.rendering.mp4')
 args+=['-filter_complex',graph,'-map','[v]','-map','[a]','-t',str(dur),'-r','30','-c:v','libx264','-threads','2','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-ar','48000','-movflags','+faststart',str(temporary)]
 subprocess.run(args,check=True);temporary.replace(dest);print('RENDERED',ident,dur,flush=True);return dest
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--chapter');parser.add_argument('--partial',action='store_true');args=parser.parse_args()
 manifest=json.loads((OUT/('narration-partial.json' if args.partial else 'narration.json')).read_text());files=[]
 for ch in manifest['chapters']:
  if not args.chapter or args.chapter==ch['id']:files.append(render(ch))
 if not args.chapter and not args.partial:
  concat=RENDER/'chapters.txt';concat.write_text(''.join(f"file '{p.name}'\n" for p in files));dest=OUT/'STILLVEIL-Tower1-19Builds-720p.mp4'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-xerror','-y','-f','concat','-safe','0','-i',str(concat),'-c:v','copy','-c:a','aac','-b:a','128k','-ar','48000','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-movflags','+faststart',str(dest)],check=True)
  expected=sum(duration(p) for p in files)
  if abs(duration(dest)-expected)>.3:raise RuntimeError('Final duration differs from complete chapters')
  print('FINAL',dest,duration(dest),dest.stat().st_size,flush=True)
