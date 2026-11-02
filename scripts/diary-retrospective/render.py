"""A pastel re-edit with semantic shot changes, safe character bobs and one final 48kHz mix."""
from pathlib import Path
import sys,json,math,subprocess,hashlib,wave
import numpy as np
from visuals import plate,avatar,phase_for,illustration_for,poses,font,wrap,COL,NAMES
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-retrospective';OLD=ROOT/'artifacts/diary-part2';R=O/'render';R.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,sha256
FPS=30;SR=48000;GAME=[310,66,486,864];CODE=[Path(__file__),Path(__file__).with_name('visuals.py')]

def ff(*args):subprocess.run(['ffmpeg','-v','error','-y','-filter_complex_threads','1','-filter_threads','1',*map(str,args)],check=True)
CODE_HASHES={p.name:sha256(p)for p in CODE}
def key(inputs,edit):return hashlib.sha256(json.dumps({'inputs':{str(p):sha256(p)for p in inputs},'edit':edit,'code':CODE_HASHES},sort_keys=True).encode()).hexdigest()
def valid(out,k):
 p=out.with_suffix(out.suffix+'.key');return out.exists()and p.exists()and p.read_text()==k
def cache(out,k):out.with_suffix(out.suffix+'.key').write_text(k)
def tm(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02d}:{n//100%60:02d}.{n%100:02d}'

def prepare_timeline():
 import copy
 source=json.loads((O/'narration.json').read_text());chapters=[]
 for c in source['chapters']:
  if c['id']=='recap':c['clip']=None
  if c['id']=='build':
   for id,title,lines,clip in [('build_intro','作りたくなる瞬間は？',c['lines'][:1],None),('build','守る行動を、次の回復へ',c['lines'][1:4],'rewind'),('build_flower','今の小さな回復が、あとで咲く',c['lines'][4:],'flower')]:
    cc={**copy.deepcopy(c),'id':id,'title':title,'lines':copy.deepcopy(lines),'clip':clip};chapters.append(cc)
  elif c['id']=='difficulty':
   chapters.append({**copy.deepcopy(c),'lines':copy.deepcopy(c['lines'][:4]),'clip':None});chapters.append({**copy.deepcopy(c),'id':'difficulty_result','title':'第二層、40Rと25Rの意味','lines':copy.deepcopy(c['lines'][4:]),'clip':'failure'})
  else:chapters.append(copy.deepcopy(c))
 n={**source,'chapters':chapters};m=json.loads((OLD/'capture/tower-1.json').read_text());off=m['initialOffset'];event=next(e for e in m['battleEvents']if e['event'].get('ultimate')and e['event'].get('actorId')=='party:lunette-awakened');on=min((v['time']for v in m['ultimates']if v['on']),key=lambda v:abs(v-event['time']));ss=on-off-.25;flash=json.loads((OLD/'ultimate-cues.json').read_text())['observedWhiteoutFrameTime'];fm=json.loads((OLD/'capture/first-try.json').read_text());firstEnd=fm['gameplayWindow'][1]
 clips={'rewind':('artifacts/diary-111/delivery/FullReplay-rewind.mp4',17,29,2),'flower':('artifacts/diary-111/delivery/FullReplay-flower.mp4',64,80,1),'failure':('artifacts/diary-part2/capture/first-try.mkv',firstEnd-18,firstEnd,2),'pilot':('artifacts/diary-part2/capture/tower-1.mkv',8,28,2),'ultimate':('artifacts/diary-part2/capture/tower-1.mkv',ss,ss+8,2)}
 op=OLD/'render/common-op.mov';probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,r_frame_rate,nb_frames','-of','json',str(op)]));v=next(x for x in probe['streams']if x['codec_type']=='video');assert v['r_frame_rate']=='30/1';opDuration=int(v['nb_frames'])/30;assert abs(opDuration-23)<1e-6
 at=opDuration;rows=[]
 for ch in n['chapters']:
  local=1.0 if ch['id']=='opening'else .18
  for i,l in enumerate(ch['lines']):
   if ch['id']=='ultimate'and i==2:local=max(local,flash-.06-ss)
   l.update(start=at+local,end=at+local+l['duration']);local+=l['duration']+.11
  duration=math.ceil((local+(.9 if ch['id']=='ending'else .27))*30)/30
  if ch['id']=='ultimate':
   assert local<=19.73,('20 second corner overflows',local);duration=20.0
  ch.update(start=at,duration=duration);at+=duration
  if ch.get('clip'):
   path,start,end,appSpeed=clips[ch['clip']];frames=round((end-start)*30);assert frames<=round(duration*30);play=frames/30;ch.update(rate=1,playDuration=play,sourceApplicationSpeed=appSpeed)
   rows.append({'chapter':ch['id'],'start':ch['start'],'duration':duration,'source':path,'sourceStart':start,'sourceEnd':end,'rate':1,'sourceApplicationSpeed':appSpeed,'leadInFrames':0,'frames':frames,'playDuration':play,'piece':str((R/(ch['id']+'-game.mov')).relative_to(ROOT)),'gameRect':GAME})
 n.update(sourceGames={'Part1.1.1':'dec20ebbfb8d139713ffe847ebc48eefe8ff54ca','Part2':'1f4e970117c95a11ef38c8f1e12fe232e5a7b964'},duration=at,commonOpening={'duration':opDuration,'frames':round(opDuration*30),'sourceCommit':'017a0ccca241d1ec6a72b8a73f63188fc1043875'},templateCommit='745c2d099d3c0a99f6a2eb1cd3a93a87147c27e6');n['chapters'].insert(0,{'id':'series-op','title':'共通オープニング v4','start':0,'duration':opDuration,'lines':[]});(O/'timeline-narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2));(O/'edit-timeline.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(O/'ultimate-cues.json').write_text(json.dumps({'observedWhiteoutFrameTime':flash,'sourceClipStart':ss,'reactionIndex':2,'finisherReactionRelative':flash-.06-ss},indent=2));return n,rows

def make_piece(row):
 src=ROOT/row['source'];out=ROOT/row['piece']
 if '--use-approved-cuts'in sys.argv:
  manifest=json.loads((O/'approved-cuts.json').read_text());entry=manifest[row['chapter']];conditions={k:row[k]for k in['sourceStart','sourceEnd','rate','leadInFrames','frames','gameRect']};assert conditions==entry['conditions']and sha256(out)==entry['sha256'],'Cut or edit conditions changed';row['pieceHash']=sha256(out);return
 k=key([src],row)
 if not valid(out,k):
  ff('-ss',row['sourceStart'],'-i',src,'-t',row['frames']/30,'-vf',f'setpts=(PTS-STARTPTS)/{row["rate"]},fps=30,scale=486:864,setsar=1,tpad=start_mode=clone:start_duration={row["leadInFrames"]/30}','-af',f'atempo={row["rate"]},adelay={row["leadInFrames"]/30*1000:.6f}:all=1,aresample=48000,apad,atrim=end_sample={row["frames"]*1600},asetpts=N/SR/TB','-frames:v',row['frames'],'-c:v','libx264','-threads',2,'-preset','veryfast','-crf',22,'-pix_fmt','yuv420p','-c:a','pcm_s16le',out);cache(out,k)
 row['pieceHash']=sha256(out)

def concat_file(path,segments):
 # Every duration is quantized to whole final video frames.
 text='ffconcat version 1.0\n'
 for file,duration in segments:
  if duration>0:text+=f"file '{str(Path(file).resolve())}'\nduration {duration:.9f}\n"
 text+=f"file '{str(Path(segments[-1][0]).resolve())}'\n";path.write_text(text)

def material(ch):
 shots=[];last=None;raw=[]
 for i,l in enumerate(ch['lines']):
  phase=phase_for(ch,l,i);ill=illustration_for(ch,l,i);v=(phase,ill,False);t=round((l['start']-ch['start'])*30)/30
  if v!=last:raw.append((0 if not raw else t,v));last=v
 play=ch.get('playDuration');
 if play is not None and play<ch['duration']-.1:raw.append((play,(99,None,True)))
 raw.sort(key=lambda x:x[0]);filtered=[]
 for t,v in raw:
  if play is not None and t>=play and v[2]is False:v=(99,None,True)
  if filtered and filtered[-1][1]==v:continue
  if filtered and abs(t-filtered[-1][0])<1/60:filtered[-1]=(t,v)
  else:filtered.append((t,v))
 for i,(t,(p,ill,full))in enumerate(filtered):
  end=filtered[i+1][0]if i+1<len(filtered)else ch['duration'];png=R/f"{ch['id']}-scene-{i}.png";plate(ch,p,png,full or not bool(ch.get('clip')),ill);shots.append((png,end-t));
 concat_file(R/(ch['id']+'-plates.ffconcat'),shots)
 # Actors change expression at conversational boundaries. They disappear during full-scene illustrations.
 left=[];right=[];timeline=[]
 for i,l in enumerate(ch['lines']):
  begin=0 if i==0 else round((l['start']-ch['start'])*30)/30;end=round((ch['lines'][i+1]['start']-ch['start'])*30)/30 if i+1<len(ch['lines'])else ch['duration'];ill=illustration_for(ch,l,i);z,g=poses(ch,l,i)
  if ill or ch['id']=='opening':z=g='blank'
  left.append((O/'assets'/(z+'-avatar.png'),end-begin));right.append((O/'assets'/(g+'-avatar.png'),end-begin));timeline.append({'start':begin,'end':end,'left':z,'right':g,'speaker':l['speaker']})
 concat_file(R/(ch['id']+'-left.ffconcat'),left);concat_file(R/(ch['id']+'-right.ffconcat'),right)
 (R/(ch['id']+'-visual.json')).write_text(json.dumps({'scenes':[{'start':filtered[i][0],'phase':filtered[i][1][0],'illustration':filtered[i][1][1],'fullDiagram':filtered[i][1][2],'duration':d,'path':str(p.relative_to(ROOT))}for i,(p,d)in enumerate(shots)],'actors':timeline},ensure_ascii=False,indent=2));return [p for p,d in shots]

def subtitles(ch):
 p=R/(ch['id']+'.ass');s='''[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Talk,Noto Sans CJK JP,48,&H00502B63,&H00FFFFFF,&H00F9FFFC,&H00000000,1,0,0,0,100,100,1,0,1,3,0,2,60,60,19,1\nStyle: Info,Noto Sans CJK JP,24,&H00634B75,&H00FFFFFF,&H00F9FFFC,&H00000000,1,0,0,0,100,100,0,0,1,2,0,7,0,0,0,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
 for l in ch['lines']:
  color=COL[l['speaker']].lstrip('#');color=color[4:]+color[2:4]+color[:2];wrapped=wrap(l['text'],48,1720);pages=[wrapped[i:i+2]for i in range(0,len(wrapped),2)];st=l['start']-ch['start'];en=l['end']-ch['start'];cursor=st
  for page in pages:
   txt='\\N'.join(page);length=(en-st)*sum(len(v)for v in page)/max(1,len(l['text']));s+=f"Dialogue: 3,{tm(cursor)},{tm(min(en,cursor+length))},Talk,,0,0,0,,{{\\c&H{color}&}}{txt}\n";cursor+=length
  s+=f"Dialogue: 4,{tm(st)},{tm(en)},Info,,0,0,0,,{{\\pos(36,939)\\fs22\\c&H{color}&}}{NAMES[l['speaker']]}\n"
  punch=None
  if '締め切り' in l['text']:punch='締め切りも守ろう。'
  elif '二個足りない' in l['text']:punch='あと2個！'
  elif 'レシート' in l['text']:punch='返品は、お店へ。'
  elif '統率めっちゃ' in l['text']:punch='うさぎたち、統率◎'
  elif '補正はない' in l['text']:punch='※ギャル補正はありません'
  if ch['id']=='opening'and'リコーダー'in l['text']:punch='反省するのは、音程じゃない。'
  if punch:s+=f"Dialogue: 5,{tm(st+.08)},{tm(en)},Info,,0,0,0,,{{\\an5\\pos(1220,855)\\fs40\\bord4\\c&H824BB8&\\fad(60,120)}}{punch}\n"
 if ch.get('clip'):
  label='既存実戦の再掲 / 元録画：速度'+str(ch.get('sourceApplicationSpeed',1))
  if ch.get('rate',1)>1.01:label+=f" / {ch['rate']:.2f}倍速"
  s+=f"Dialogue: 1,0:00:00.00,{tm(ch['playDuration'])},Info,,0,0,0,,{{\\pos(320,71)\\fs18\\c&HFFFFFF&\\3c&H3E2936&}}{label}\n"
 p.write_text(s);return p

def render_chapter(ch,row,asset_files):
 if row:make_piece(row)
 plates=material(ch);ass=subtitles(ch);out=R/(ch['id']+'.mp4');inputs=[*plates,ass,R/(ch['id']+'-plates.ffconcat'),R/(ch['id']+'-left.ffconcat'),R/(ch['id']+'-right.ffconcat'),*asset_files]+([ROOT/row['piece']]if row else[]);k=key(inputs,{'chapter':ch,'frames':round(ch['duration']*30),'game':GAME})
 if not valid(out,k):
  dense=[]
  for side in ['plates','left','right']:
   listing=R/(ch['id']+'-'+side+'.ffconcat');dst=R/(ch['id']+'-'+side+'-dense'+('.mkv'if side=='plates'else'.mov'));dk=key([listing,*plates,*asset_files],{'frames':round(ch['duration']*30),'side':side,'denseFps':30})
   if not valid(dst,dk):
    ff('-safe',0,'-i',listing,'-vf','fps=30,format='+('yuv420p'if side=='plates'else'argb'),'-frames:v',round(ch['duration']*30),'-an','-c:v','libx264'if side=='plates'else'qtrle','-threads',1,*(['-preset','ultrafast','-crf',18]if side=='plates'else[]),dst);cache(dst,dk)
   dense.append(dst)
  args=['-i',dense[0],'-i',dense[1],'-i',dense[2]]
  act=lambda who:'+'.join(f'between(t,{l["start"]-ch["start"]:.5f},{l["end"]-ch["start"]:.5f})'for l in ch['lines']if (l['speaker']=='z')==who)or'0'
  f=f"[0:v]fps=30,setsar=1[b];[1:v]fps=30,format=rgba[l];[2:v]fps=30,format=rgba[r];[b][l]overlay=0:y='470-3*sin(2*PI*t*2)*min(1,{act(True)})'[b1];[b1][r]overlay=1600:y='470-3*sin(2*PI*t*2)*min(1,{act(False)})'[b2];"
  if row:args+=['-i',ROOT/row['piece']];f+=f"[3:v]tpad=stop_mode=clone:stop_duration={ch['duration']}[g];[b2][g]overlay=310:66:enable='lt(t,{ch['playDuration']})'[b3];[b3]ass={ass}[v]"
  else:f+=f'[b2]ass={ass}[v]'
  ff(*args,'-filter_complex',f,'-map','[v]','-frames:v',round(ch['duration']*30),'-an','-c:v','libx264','-threads',2,'-preset','veryfast','-crf',26,'-pix_fmt','yuv420p',out);cache(out,k)
  for p in dense:
   p.unlink();p.with_suffix(p.suffix+'.key').unlink()
 print('RENDERED',ch['id'],round(ch['duration'],2),flush=True)

def envelope(n,count):
 env=np.ones(count,dtype=np.float32);curves=[]
 for ch in n['chapters']:
  for i,l in enumerate(ch['lines']):
   s=round(l['start']*SR);e=round(l['end']*SR);level=.46 if ch['id']=='ultimate'and i<4 else .72;a=max(0,s-960);b=min(count,e+3840)
   if s>a:env[a:s]=np.minimum(env[a:s],np.linspace(1,level,s-a))
   env[s:e]=np.minimum(env[s:e],level)
   if b>e:env[e:b]=np.minimum(env[e:b],np.linspace(level,1,b-e))
   curves.append({'startSample':s,'endSample':e,'relativeGain':level,'attackSamples':960,'releaseSamples':3840})
 return env,curves

def music_signal(n,count):
 music=audio(O/'assets/nandeshou-recorder.mp3');cross=round(.25*SR);length=count-23*SR;body=np.zeros((length+len(music),2),np.float32);at=0
 while at<length:
  chunk=music.copy()
  if at>0:chunk[:cross]*=np.linspace(0,1,cross)[:,None]
  chunk[-cross:]*=np.linspace(1,0,cross)[:,None];body[at:at+len(chunk)]+=chunk;at+=len(chunk)-cross
 body=body[:length];env=np.ones(count,np.float32);curves=[]
 for ch in n['chapters']:
  for l in ch['lines']:
   s=round(l['start']*SR);e=round(l['end']*SR);aa=max(0,s-2400);bb=min(count,e+9600)
   if s>aa:env[aa:s]=np.minimum(env[aa:s],np.linspace(1,.75,s-aa))
   env[s:e]=np.minimum(env[s:e],.75)
   if bb>e:env[e:bb]=np.minimum(env[e:bb],np.linspace(.75,1,bb-e))
   curves.append({'startSample':s,'endSample':e,'relativeGain':.75,'attackSamples':2400,'releaseSamples':9600})
 u=next(c for c in n['chapters']if c['id']=='ultimate');env[round(u['start']*SR):round((u['start']+8)*SR)]*=.35;body*=env[23*SR:,None];body[:round(.6*SR)]*=np.linspace(0,1,round(.6*SR))[:,None];body[-SR:]*=np.linspace(1,0,SR)[:,None];result=np.zeros((count,2),np.float32);result[23*SR:]=body;return result,curves

def mix(n,rows):
 count=round(n['duration']*SR);signal=np.zeros((count,2),np.float32);op=audio(OLD/'render/common-op.mov');signal[:23*SR]+=op[:23*SR];music,curves=music_signal(n,count);signal+=music*.115;del music;env,gameCurves=envelope(n,count)
 for row in rows:
  x=audio(ROOT/row['piece']);s=round(row['start']*SR);length=min(len(x),row['frames']*1600,count-s);signal[s:s+length]+=x[:length]*(env[s:s+length,None]*.5)
 for ch in n['chapters']:
  for l in ch['lines']:
   x=audio(ROOT/l['wav']);s=round(l['start']*SR);length=min(len(x),count-s);signal[s:s+length]+=x[:length]*.98
 peak=float(np.max(abs(signal)));gain=min(1,.91/max(peak,.0001));signal*=gain;out=O/'final-mix.flac';pcm=(np.clip(signal,-1,1)*32767).astype('<i2');subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','2','-i','pipe:0','-c:a','flac',str(out)],input=pcm.tobytes(),check=True)
 m={'sampleRate':48000,'startSample':0,'samples':count,'gameGain':.5*gain,'voiceGain':.98*gain,'musicGain':.115*gain,'masterGain':gain,'gameDucking':gameCurves,'musicDucking':curves,'musicPlan':{'source':'assets/nandeshou-recorder.mp3','sourceSha256':sha256(O/'assets/nandeshou-recorder.mp3'),'offsetSeconds':23,'loopCrossfadeSeconds':.25,'fadeInSeconds':.6,'fadeOutSeconds':1,'ultimateRelativeGain':.35},'mixSha256':sha256(out),'processingSha256':sha256(__file__),'voiceInputs':{l['wav']:sha256(ROOT/l['wav'])for c in n['chapters']for l in c['lines']},'rule':'OP, recorder BGM, native game SE and three voices mixed once on the common 48kHz sample clock; AAC only at the final mux.'};(O/'mix-manifest.json').write_text(json.dumps(m,indent=2))

def build():
 n,rows=prepare_timeline();by={r['chapter']:r for r in rows};assets=[];bounds={}
 from PIL import Image
 for id in['z-happy','z-panic','m-happy','m-deadpan','t-happy','t-think']:
  p=O/'assets'/(id+'-avatar.png');bounds[id]=avatar(id,p);assets.append(p)
 blank=O/'assets/blank-avatar.png';Image.new('RGBA',(320,440)).save(blank);assets.append(blank);(O/'head-safety.json').write_text(json.dumps({'passed':True,'avatarCanvas':[320,440],'placements':[[0,470],[1600,470]],'opaqueBounds':bounds,'bobMaxPixels':3,'minimumInnerPadding':30,'method':'Padded contain. No cover crop, no zoom beyond the safe avatar canvas.'},indent=2))
 for ch in n['chapters']:
  if ch['id']=='series-op':continue
  render_chapter(ch,by.get(ch['id']),assets)
 (O/'edit-timeline.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(O/'approved-cuts.json').write_text(json.dumps({r['chapter']:{'sha256':sha256(ROOT/r['piece']),'conditions':{k:r[k]for k in['sourceStart','sourceEnd','rate','leadInFrames','frames','gameRect']}}for r in rows},indent=2));op=R/'op-video.mp4';k=key([OLD/'render/common-op.mov'],{'videoOnly':True})
 if not valid(op,k):ff('-i',OLD/'render/common-op.mov','-map','0:v','-an','-c:v','copy',op);cache(op,k)
 (R/'movie.ffconcat').write_text('ffconcat version 1.0\n'+f"file '{op.resolve()}'\n"+''.join(f"file '{(R/(ch['id']+'.mp4')).resolve()}'\n"for ch in n['chapters']if ch['id']!='series-op'));ff('-safe',0,'-f','concat','-i',R/'movie.ffconcat','-c:v','copy','-an',O/'silent.mp4');mix(n,rows);ff('-i',O/'silent.mp4','-i',O/'final-mix.flac','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-ar',48000,'-movflags','+faststart',O/'delivery/STILLVEIL-TowerDiary-Retrospective.mp4');print('MOVIE READY',n['duration'],flush=True)
if __name__=='__main__':build()
