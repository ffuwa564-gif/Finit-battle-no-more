"""A pastel re-edit with semantic shot changes, safe character bobs and one final 48kHz mix."""
from pathlib import Path
import sys,json,math,subprocess,hashlib,wave,csv
import numpy as np
from visuals import plate,avatar,phase_for,illustration_for,poses,font,wrap,COL,NAMES
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-01';OLD=ROOT/'artifacts/diary-part2';R=O/'render';R.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import audio,sha256
FPS=30;SR=48000;GAME=[310,66,486,864];CODE=[Path(__file__),Path(__file__).with_name('visuals.py'),Path(__file__).with_name('roster.py'),Path(__file__).with_name('story.py')]

def ff(*args):subprocess.run(['ffmpeg','-v','error','-y','-filter_complex_threads','1','-filter_threads','1',*map(str,args)],check=True)
CODE_HASHES={p.name:sha256(p)for p in CODE}
def key(inputs,edit):return hashlib.sha256(json.dumps({'inputs':{str(p):sha256(p)for p in inputs},'edit':edit,'code':CODE_HASHES},sort_keys=True).encode()).hexdigest()
def valid(out,k):
 p=out.with_suffix(out.suffix+'.key');return out.exists()and p.exists()and p.read_text()==k
def cache(out,k):out.with_suffix(out.suffix+'.key').write_text(k)
def tm(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02d}:{n//100%60:02d}.{n%100:02d}'

def prepare_timeline():
 n=json.loads((O/'narration.json').read_text());metas={id:json.loads((O/'capture'/f'{id}.json').read_text())for id in['live-ruka','lab-victory','lab-counter']}
 def window(m):return m['gameplayWindow']
 st,en=window(metas['lab-victory']);m=metas['lab-victory'];off=m['initialOffset'];split=round((next(x['time'] for x in m['marks'] if x['kind']=='round' and x['round']==6)-off)*30)/30
 clips={'live-ruka':('live-ruka',*window(metas['live-ruka'])),'lab-victory-a':('lab-victory',st,split),'lab-victory-b':('lab-victory',split,en),'lab-no-ruka':('lab-counter',*window(metas['lab-counter']))}
 at=0.;rows=[];chapters=[]
 for ch in n['chapters']:
  clip=clips.get(ch.get('clip'));play=round((clip[2]-clip[1])*30)/30 if clip else 0
  if ch['id']=='lab-victory-a':
   old=ch['lines'];ch['lines']=[old[i] for i in [0,1,2,3,7,8,9,4,5,6]]
  local=.4;voice=sum(l['duration']for l in ch['lines']);target=140 if ch['id']=='roster' else play
  gap=max(.14,min(1.4,(target-.8-voice)/max(1,len(ch['lines'])-1)))
  for l in ch['lines']:l.update(start=at+local,end=at+local+l['duration']);local+=l['duration']+gap
  if ch['id']=='lab-victory-a':
   m=metas['lab-victory'];reaction=next(v['time']-m['initialOffset']-clip[1]+.1 for v in m['battleEvents'] if '傷の巻戻しを阻止' in v['event'].get('text',''));prefix=ch['lines'][:5];pre=sum(l['duration']for l in prefix);spacing=(reaction-.4-pre)/5
   assert .08<=spacing<=4.2,('Actual wound reaction prefix does not fit',spacing)
   cursor=.4
   for l in prefix:l.update(start=at+cursor,end=at+cursor+l['duration']);cursor+=l['duration']+spacing
   cursor=reaction
   for l in ch['lines'][5:]:l.update(start=at+cursor,end=at+cursor+l['duration']);cursor+=l['duration']+.14
   local=cursor
  duration=math.ceil(max(local+.35,play+.1,target if ch['id']=='roster' else 0)*30)/30;ch.update(start=at,duration=duration);at+=duration;chapters.append(ch)
  if clip:
   id,st,en=clip;frames=round((en-st)*30);lab=id.startswith('lab-');ch.update(rate=1,playDuration=frames/30,sourceApplicationSpeed=1 if lab else 2,logPlayback=lab)
   rows.append({'chapter':ch['id'],'start':ch['start'],'duration':duration,'source':f'artifacts/build-diary-01/capture/{id}.mov','sourceStart':st,'sourceEnd':en,'rate':1,'sourceApplicationSpeed':ch['sourceApplicationSpeed'],'leadInFrames':0,'frames':frames,'playDuration':frames/30,'piece':str((R/(ch['id']+'-game.mov')).relative_to(ROOT)),'gameRect':GAME,'logPlayback':lab})
  if ch['id']=='roster':
   chapters.append({'id':'series-op','title':'ビルド研究日誌 OP','start':at,'duration':25.6,'lines':[]});opStart=at;at+=25.6
 n.update(chapters=chapters,duration=at,commonOpening={'start':opStart,'duration':25.6,'frames':768,'source':'artifacts/build-diary-01/render/opening/opening.mov'},templateCommit='745c2d099d3c0a99f6a2eb1cd3a93a87147c27e6')
 cues=[]
 for r in rows:
  if 'lab-victory' not in r['chapter']:continue
  m=metas['lab-victory']
  for v in m['battleEvents']:
   e=v['event'];t=v['time']-m['initialOffset'];label='残る障壁 → 残り糸'if '残り糸へ継いだ'in e.get('text','')else '留め縫い 発動'if e.get('skillId')=='research-ruka-backstitch'else '周期回復の巻戻しを阻止！'if '傷の巻戻しを阻止'in e.get('text','')else None
   if label and r['sourceStart']<=t<r['sourceEnd']:cues.append({'chapter':r['chapter'],'localTime':round((t-r['sourceStart'])*30)/30,'sourceTime':t,'label':label,'round':v['round']})
 (O/'timeline-narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2));(O/'edit-timeline.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(O/'event-cues.json').write_text(json.dumps({'scope':'Native current-app recording and clearly labelled prototype log visualization','labChronologicalSplit':split,'actualEventCues':cues},indent=2));
 with (O/'storyboard.csv').open('w',newline='') as f:
  writer=csv.writer(f);writer.writerow(['chapter','start','end','speaker','text','visualTopic','sourceClip','sourceStart','sourceEnd'])
  for ch in chapters:
   row=next((r for r in rows if r['chapter']==ch['id']),{})
   for l in ch['lines']:writer.writerow([ch['id'],l['start'],l['end'],l['speaker'],l['text'],ch.get('topic'),row.get('source'),row.get('sourceStart'),row.get('sourceEnd')])
 return n,rows

def validate_capture(src):
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,sample_rate,avg_frame_rate,r_frame_rate,nb_frames,duration_ts,time_base,start_time','-of','json',str(src)]));vs=[s for s in probe['streams']if s['codec_type']=='video'];aa=[s for s in probe['streams']if s['codec_type']=='audio'];assert len(vs)==len(aa)==1,('Expected one AV stream',str(src));v,a=vs[0],aa[0]
 assert v['avg_frame_rate']==v['r_frame_rate']=='30/1',('Capture must be explicit CFR30 before cutting',str(src),v)
 assert a['sample_rate']=='48000'and a['codec_name'].startswith('pcm_')and a['time_base']=='1/48000',('Capture must use 48kHz PCM',str(src),a)
 assert int(v['nb_frames'])*1600==int(a['duration_ts']),('Capture frame/sample clock mismatch',str(src),v,a)
 assert float(v['start_time'])==float(a['start_time'])==0,('Capture must begin on common zero clock',str(src))
 return {'source':str(src.relative_to(ROOT)),'sha256':sha256(src),'frames':int(v['nb_frames']),'samples':int(a['duration_ts']),'passed':True}

def make_piece(row):
 src=ROOT/row['source'];out=ROOT/row['piece'];validate_capture(src)
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
  if ill:z=g='blank'
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
 if ch.get('clip'):
  label='研究試作・実ログ再生 / 新技・試練は未実装' if ch.get('logPlayback') else '最新版1.11 実戦 / 比較用所持データ / ゲーム速度2'
  if ch['id']=='no-ruka':label+=' / 1〜5R抜粋・全記録10R全滅'
  if ch['id']=='lab-victory-b':label+=' / 前半からの続き'
  label='\\N'.join(wrap(label,18,450))
  s+=f"Dialogue: 1,0:00:00.00,{tm(ch['playDuration'])},Info,,0,0,0,,{{\\pos(320,71)\\fs18\\c&HFFFFFF&\\3c&H3E2936&}}{label}\n"
 for cue in json.loads((O/'event-cues.json').read_text()).get('actualEventCues',[]):
  if cue['chapter']==ch['id']:
   st=cue['localTime'];label=cue['label'];s+=f"Dialogue: 5,{tm(st)},{tm(min(ch['duration'],st+2.5))},Info,,0,0,0,,{{\\an5\\pos(1200,825)\\fs34\\bord4\\c&H397FBB&\\fad(50,150)}}{label}\n"
 p.write_text(s);return p

def render_chapter(ch,row,asset_files):
 if row:make_piece(row)
 plates=material(ch);ass=subtitles(ch);out=R/(ch['id']+'.mp4');inputs=[*plates,ass,R/(ch['id']+'-plates.ffconcat'),R/(ch['id']+'-left.ffconcat'),R/(ch['id']+'-right.ffconcat'),*asset_files]+([ROOT/row['piece']]if row else[]);inputs+=([R/'roster-background.mp4']if ch['id']=='roster'else[]);k=key(inputs,{'chapter':ch,'frames':round(ch['duration']*30),'game':GAME})
 if not valid(out,k):
  dense=[]
  for side in ['plates','left','right']:
   listing=R/(ch['id']+'-'+side+'.ffconcat');dst=R/(ch['id']+'-'+side+'-dense'+('.mkv'if side=='plates'else'.mov'));dk=key([listing,*plates,*asset_files],{'frames':round(ch['duration']*30),'side':side,'denseFps':30})
   if not valid(dst,dk):
    ff('-safe',0,'-i',listing,'-vf','fps=30,format='+('yuv420p'if side=='plates'else'argb'),'-frames:v',round(ch['duration']*30),'-an','-c:v','libx264'if side=='plates'else'qtrle','-threads',1,*(['-preset','ultrafast','-crf',18]if side=='plates'else[]),dst);cache(dst,dk)
   dense.append(dst)
  args=['-i',R/'roster-background.mp4' if ch['id']=='roster' else dense[0],'-i',dense[1],'-i',dense[2]]
  act=lambda who:'+'.join(f'between(t,{l["start"]-ch["start"]:.5f},{l["end"]-ch["start"]:.5f})'for l in ch['lines']if (l['speaker']=='t')==who)or'0'
  f=f"[0:v]fps=30,setsar=1[b];[1:v]fps=30,format=rgba[l];[2:v]fps=30,format=rgba[r];[b][l]overlay=0:y='470-3*sin(2*PI*t*2)*min(1,{act(True)})'[b1];[b1][r]overlay=1600:y='470-3*sin(2*PI*t*2)*min(1,{act(False)})'[b2];"
  if row:args+=['-i',ROOT/row['piece']];f+=f"[3:v]tpad=stop_mode=clone:stop_duration={ch['duration']}[g];[b2][g]overlay=310:66:enable='lt(t,{ch['playDuration']})'[b3];[b3]ass={ass}[v]"
  else:f+=f'[b2]ass={ass}[v]'
  ff(*args,'-filter_complex',f,'-map','[v]','-frames:v',round(ch['duration']*30),'-an','-c:v','libx264','-threads',2,'-preset','veryfast','-crf',28,'-pix_fmt','yuv420p',out);cache(out,k)
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
 music=audio(ROOT/'public/audio/fjordnosundakaze.mp3');cross=12000;body=np.zeros((count+len(music),2),np.float32);at=0
 while at<count:
  chunk=music.copy()
  if at>0:chunk[:cross]*=np.linspace(0,1,cross)[:,None]
  chunk[-cross:]*=np.linspace(1,0,cross)[:,None];body[at:at+len(chunk)]+=chunk;at+=len(chunk)-cross
 body=body[:count];env=np.ones(count,np.float32);curves=[]
 for ch in n['chapters']:
  for l in ch['lines']:
   s=round(l['start']*SR);e=round(l['end']*SR);aa=max(0,s-2400);bb=min(count,e+9600)
   if s>aa:env[aa:s]=np.minimum(env[aa:s],np.linspace(1,.75,s-aa))
   env[s:e]=np.minimum(env[s:e],.75)
   if bb>e:env[e:bb]=np.minimum(env[e:bb],np.linspace(.75,1,bb-e))
   curves.append({'startSample':s,'endSample':e,'relativeGain':.75,'attackSamples':2400,'releaseSamples':9600})
 op=n['commonOpening'];st=round(op['start']*SR);en=st+round(op['duration']*SR);env[st:en]=0
 env[max(0,st-12000):st]*=np.linspace(1,0,min(12000,st));env[en:en+12000]*=np.linspace(0,1,min(12000,count-en))
 body*=env[:,None];body[:28800]*=np.linspace(0,1,28800)[:,None];body[-SR:]*=np.linspace(1,0,SR)[:,None];return body,curves

def mix(n,rows):
 count=round(n['duration']*SR);signal=np.zeros((count,2),np.float32);op=audio(R/'opening/opening.mov');opAt=round(n['commonOpening']['start']*SR);opN=round(25.6*SR);signal[opAt:opAt+opN]+=op[:opN];music,curves=music_signal(n,count);signal+=music*.045;del music;env,gameCurves=envelope(n,count)
 for row in rows:
  x=audio(ROOT/row['piece']);s=round(row['start']*SR);length=min(len(x),row['frames']*1600,count-s);signal[s:s+length]+=x[:length]*(env[s:s+length,None]*.5)
 for ch in n['chapters']:
  for l in ch['lines']:
   x=audio(ROOT/l['wav']);s=round(l['start']*SR);length=min(len(x),count-s);signal[s:s+length]+=x[:length]*.98
 peak=float(np.max(abs(signal)));gain=min(1,.91/max(peak,.0001));signal*=gain;out=R/'final-mix.flac';pcm=(np.clip(signal,-1,1)*32767).astype('<i2');subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','2','-i','pipe:0','-c:a','flac',str(out)],input=pcm.tobytes(),check=True)
 m={'sampleRate':48000,'startSample':0,'samples':count,'gameGain':.5*gain,'voiceGain':.98*gain,'musicGain':.045*gain,'masterGain':gain,'gameDucking':gameCurves,'musicDucking':curves,'musicPlan':{'source':'public/audio/fjordnosundakaze.mp3','sourceSha256':sha256(ROOT/'public/audio/fjordnosundakaze.mp3'),'offsetSeconds':0,'mutedOpening':n['commonOpening'],'loopCrossfadeSeconds':.25,'fadeInSeconds':.6,'fadeOutSeconds':1,'ultimateRelativeGain':1},'mixSha256':sha256(out),'processingSha256':sha256(__file__),'voiceInputs':{l['wav']:sha256(ROOT/l['wav'])for c in n['chapters']for l in c['lines']},'rule':'OP, Fjord BGM, native game SE and three voices mixed once on the common 48kHz sample clock; AAC only at the final mux.'};(O/'mix-manifest.json').write_text(json.dumps(m,indent=2))

def build():
 n,rows=prepare_timeline();from roster import render_roster;render_roster(next(c['duration'] for c in n['chapters'] if c['id']=='roster'));by={r['chapter']:r for r in rows};assets=[];bounds={}
 from PIL import Image
 for id in['z-happy','z-panic','m-happy','m-deadpan','t-research-happy','t-research-think','t-research-determined','t-research-care']:
  p=O/'assets'/(id+'-avatar.png');bounds[id]=avatar(id,p);assets.append(p)
 blank=O/'assets/blank-avatar.png';Image.new('RGBA',(320,440)).save(blank);assets.append(blank);(O/'head-safety.json').write_text(json.dumps({'passed':True,'avatarCanvas':[320,440],'placements':[[0,470],[1600,470]],'opaqueBounds':bounds,'bobMaxPixels':3,'minimumInnerPadding':30,'method':'Padded contain. No cover crop, no zoom beyond the safe avatar canvas.'},indent=2))
 for ch in n['chapters']:
  if ch['id']=='series-op':continue
  render_chapter(ch,by.get(ch['id']),assets)
 if '--chapters-only'in sys.argv:return
 (O/'edit-timeline.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(O/'approved-cuts.json').write_text(json.dumps({r['chapter']:{'sha256':sha256(ROOT/r['piece']),'conditions':{k:r[k]for k in['sourceStart','sourceEnd','rate','leadInFrames','frames','gameRect']}}for r in rows},indent=2));op=R/'op-video.mp4';k=key([R/'opening/opening.mov'],{'videoOnly':True})
 if not valid(op,k):ff('-i',R/'opening/opening.mov','-map','0:v','-an','-c:v','copy',op);cache(op,k)
 (R/'movie.ffconcat').write_text('ffconcat version 1.0\n'+''.join(f"file '{(op if ch['id']=='series-op' else R/(ch['id']+'.mp4')).resolve()}'\n"for ch in n['chapters']));ff('-safe',0,'-f','concat','-i',R/'movie.ffconcat','-c:v','copy','-an',R/'silent.mp4');mix(n,rows);ff('-i',R/'silent.mp4','-i',R/'final-mix.flac','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-ar',48000,'-movflags','+faststart',O/'delivery/STILLVEIL-BuildResearchDiary-01.mp4');print('MOVIE READY',n['duration'],flush=True)
if __name__=='__main__':build()
