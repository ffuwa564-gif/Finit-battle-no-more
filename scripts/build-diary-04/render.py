"""A pastel re-edit with semantic shot changes, safe character bobs and one final 48kHz mix."""
from pathlib import Path
import sys,json,math,subprocess,hashlib,wave,csv
import numpy as np
from visuals import plate,avatar,phase_for,illustration_for,poses,font,wrap,COL,NAMES,CUE_Y
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-04';OLD=ROOT/'artifacts/diary-part2';R=O/'render';R.mkdir(exist_ok=True)
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

def render_plan():
 p=O/'render-plan.json'
 assert p.exists(),'Create reviewed Part 2 render-plan.json before rendering'
 plan=json.loads(p.read_text());assert plan.get('finalized')is True and plan.get('episode')=='BRD-004','Await explicitly finalized Part4 render plan'
 assert 45<=float(plan.get('rosterTargetSeconds',55))<=60
 for name,digest in plan.get('inputHashes',{}).items():assert sha256(ROOT/name)==digest,('Render-plan input changed',name)
 return plan

def event_matches(v,rule):
 e=v['event'];text=e.get('text','')
 return ('textContains'not in rule or rule['textContains']in text)and('skillId'not in rule or rule['skillId']==e.get('skillId'))and('round'not in rule or rule['round']==v.get('round'))

def prepare_timeline():
 plan=render_plan();n=json.loads((O/'narration.json').read_text());clipSpecs=plan.get('clips',{});metas={};clips={}
 for name,spec in clipSpecs.items():
  id=spec['sourceId']
  if 'sourceSha256'in spec:assert sha256(O/'capture'/f'{id}.mov')==spec['sourceSha256'],('Capture differs from finalized render plan',id)
  if id not in metas:metas[id]=json.loads((O/'capture'/f'{id}.json').read_text())
  m=metas[id];st,en=m['gameplayWindow'];st=spec.get('sourceStart',st);en=spec.get('sourceEnd',en)
  for field,mark in [('startRound','start'),('endRound','end')]:
   if field in spec:
    t=next(x['time']-m['initialOffset']for x in m['marks']if x['kind']=='round'and x['round']==spec[field]);t=round(t*30)/30
    if mark=='start':st=t
    else:en=t
  assert en>st>=0,(name,st,en)
  assert all(abs(t*30-round(t*30))<1e-5 for t in [st,en]),('Cuts must lie on common 30fps frame boundaries',name,st,en)
  clips[name]=(id,st,en)
 at=0.;rows=[];chapters=[];opStart=None
 for ch in n['chapters']:
  clip=clips.get(ch.get('clip'));spec=clipSpecs.get(ch.get('clip'),{});play=round((clip[2]-clip[1])*30)/30 if clip else 0
  assert not ch.get('clip')or clip is not None,('Unknown chapter clip in render plan',ch['id'],ch.get('clip'))
  order=plan.get('lineOrder',{}).get(ch['id'])
  if order is not None:
   assert sorted(order)==list(range(len(ch['lines'])));original=ch['lines'];ch['lines']=[original[i]for i in order]
  local=.4;voice=sum(l['duration']for l in ch['lines']);target=float(plan.get('rosterTargetSeconds',55))if ch['id']=='roster'else float(plan.get('chapterTargetSeconds',{}).get(ch['id'],37))if ch['id']=='next-episode'else play;gap=max(.14,min(1.4,(target-.8-voice)/max(1,len(ch['lines'])-1)))
  for l in ch['lines']:l.update(start=at+local,end=at+local+l['duration']);local+=l['duration']+gap
  for cue in plan.get('reactions',[]):
   if cue['chapter']!=ch['id']:continue
   assert clip,'An actual-event reaction requires a clip'
   m=metas[clip[0]];events=[v for v in m['battleEvents']if event_matches(v,cue['event'])and clip[1]<=v['time']-m['initialOffset']<clip[2]];assert events,('Reaction event not found',cue)
   event=events[cue.get('eventOccurrence',0)];reaction=event['time']-m['initialOffset']-clip[1]+cue.get('offsetSeconds',.1);index=next(i for i,l in enumerate(ch['lines'])if cue['lineTextContains']in l['text']);prefix=ch['lines'][:index]
   spacing=(reaction-.4-sum(l['duration']for l in prefix))/max(1,len(prefix));exact=.08<=spacing<=cue.get('maxPrefixSpacing',1.5)
   mode=cue.get('mode','exact');use_exact=mode=='exact'or(mode=='auto'and exact);ref={'eventLocalTime':reaction-cue.get('offsetSeconds',.1),'lineTextContains':cue['lineTextContains'],'mode':'exact-event-offset'if use_exact else'retrospective-commentary','event':cue['event']}
   ch.setdefault('reactionReferences',[]).append(ref)
   if not use_exact:
    ref.update(voiceLocalTime=ch['lines'][index]['start']-at,reason='The approved speech is retrospective record explanation; preserve natural pacing instead of forcing a long or negative prefix gap.')
    continue
   if prefix:
    spacing=(reaction-.4-sum(l['duration']for l in prefix))/len(prefix);assert .08<=spacing<=cue.get('maxPrefixSpacing',4.2),('Actual-event reaction prefix does not fit',ch['id'],spacing)
    cursor=.4
    for l in prefix:l.update(start=at+cursor,end=at+cursor+l['duration']);cursor+=l['duration']+spacing
   cursor=reaction
   for l in ch['lines'][index:]:l.update(start=at+cursor,end=at+cursor+l['duration']);cursor+=l['duration']+.14
   local=cursor;ref['voiceLocalTime']=reaction
  duration=math.ceil(max(local+.35,play+.1,target if ch['id']in ['roster','next-episode']else 0)*30)/30
  if ch['id']=='roster':assert 45<=duration<=60,('Shorten opening dialogue to 45–60 seconds',duration,voice)
  if ch['id']=='next-episode':assert 30<=duration<=45,('Keep the independent next-episode preview between30–45sec',duration,voice)
  ch.update(start=at,duration=duration);at+=duration;chapters.append(ch)
  if clip:
   id,st,en=clip;frames=round((en-st)*30);lab=bool(spec.get('logPlayback',False));label=spec.get('shortLabel','研究試作・ログ再生'if lab else'現行版・実戦収録');assert '\n'not in label and font(18).getlength(label)<=450,('Clip label must be a short single line',label)
   ch.update(rate=1,playDuration=frames/30,sourceApplicationSpeed=spec.get('sourceApplicationSpeed',1),logPlayback=lab,lab=lab,clipLabel=label,clipDisclosure=spec.get('disclosure',''))
   rows.append({'chapter':ch['id'],'start':ch['start'],'duration':duration,'source':f'artifacts/build-diary-04/capture/{id}.mov','sourceStart':st,'sourceEnd':en,'rate':1,'sourceApplicationSpeed':ch['sourceApplicationSpeed'],'leadInFrames':0,'frames':frames,'playDuration':frames/30,'piece':str((R/(ch['id']+'-game.mov')).relative_to(ROOT)),'gameRect':GAME,'logPlayback':lab})
  if ch['id']==plan.get('insertOpAfter','roster'):
   chapters.append({'id':'series-op','title':'ビルド研究日誌 OP','start':at,'duration':25.6,'lines':[]});opStart=at;at+=25.6
 assert opStart is not None,'OP insertion chapter missing'
 preview=plan.get('nextEpisodePreview',{});registered=json.loads((O/'registry.json').read_text()).get('nextEpisodePreview',{})
 assert preview.get('chapter')=='next-episode'and preview.get('newCertificationGranted')is False,'Final plan must declare an unverified next-episode preview'
 for field in ['characterId','seriesId','question']:assert preview.get(field)==registered.get(field),('Plan/registry preview mismatch',field)
 assert chapters[-1]['id']=='next-episode','Preview must be the last independent chapter'
 chapters[-1]['previewQuestion']=preview['question']
 n.update(chapters=chapters,duration=at,commonOpening={'start':opStart,'duration':25.6,'frames':768,'source':'artifacts/build-diary-04/render/opening/opening.mov'},templateCommit=plan.get('templateCommit','b070d39c312faf72b02ca20dc78bc597223699fb'),renderPlanSha256=sha256(O/'render-plan.json'))
 cues=[]
 for row in rows:
  source=Path(row['source']).stem;m=metas[source]
  for v in m.get('battleEvents',[]):
   t=v['time']-m['initialOffset']
   if not row['sourceStart']<=t<row['sourceEnd']:continue
   for rule in plan.get('eventLabels',[]):
    if rule.get('sourceId',source)==source and event_matches(v,rule):cues.append({'chapter':row['chapter'],'localTime':round((t-row['sourceStart'])*30)/30,'sourceTime':t,'label':rule['label'],'round':v['round']})
 (O/'timeline-narration.json').write_text(json.dumps(n,ensure_ascii=False,indent=2));(O/'edit-timeline.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(O/'event-cues.json').write_text(json.dumps({'scope':'Actual capture/log event times; labels are declared in the finalized episode render plan.','actualEventCues':cues},ensure_ascii=False,indent=2))
 with(O/'storyboard.csv').open('w',newline='')as f:
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
 src=ROOT/row['source'];out=ROOT/row['piece'];sourceClock=validate_capture(src);assert 0<=round(row['sourceStart']*30)<round(row['sourceEnd']*30)<=sourceClock['frames'],('Cut outside source clock',row)
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
  # One short line only: extra disclosure belongs in the right-side figure.
  label=ch['clipLabel'];assert '\n'not in label and font(18).getlength(label)<=450
  s+=f"Dialogue: 1,0:00:00.00,{tm(ch['playDuration'])},Info,,0,0,0,,{{\\pos(320,71)\\fs18\\c&HFFFFFF&\\3c&H3E2936&}}{label}\n"
 for cue in json.loads((O/'event-cues.json').read_text()).get('actualEventCues',[]):
  if cue['chapter']==ch['id']:
   st=cue['localTime'];label=cue['label'];s+=f"Dialogue: 5,{tm(st)},{tm(min(ch['duration'],st+2.5))},Info,,0,0,0,,{{\\an5\\pos(1200,{CUE_Y})\\fs34\\bord4\\c&H397FBB&\\fad(50,150)}}{label}\n"
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
 (R/'movie.ffconcat').write_text('ffconcat version 1.0\n'+''.join(f"file '{(op if ch['id']=='series-op' else R/(ch['id']+'.mp4')).resolve()}'\n"for ch in n['chapters']));ff('-safe',0,'-f','concat','-i',R/'movie.ffconcat','-c:v','copy','-an',R/'silent.mp4');mix(n,rows);ff('-i',R/'silent.mp4','-i',R/'final-mix.flac','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-ar',48000,'-movflags','+faststart',O/'delivery/STILLVEIL-BuildResearchDiary-04.mp4');print('MOVIE READY',n['duration'],flush=True)
if __name__=='__main__':build()
