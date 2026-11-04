"""Build an integer-frame timeline from reviewed editorial instructions and real voice.

No results are generated here. An editorial plan supplies evidence-bound art specs,
actual source frame intervals, and optionally voice offsets tied to native events.
"""
from pathlib import Path
import argparse,hashlib,json,math,re
from PIL import ImageFont
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-04';FPS=30
FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def wrap(text,width):
 face=ImageFont.truetype(FONT,46);lines=[];current=''
 for char in text:
  if char=='\n' or face.getlength(current+char)>width:
   if current:lines.append(current)
   current='' if char=='\n' else char
  else:current+=char
 if current:lines.append(current)
 # Balance two-line Japanese captions and keep closing punctuation off line starts.
 if len(lines)==2:
  whole=''.join(lines);closing='、。！？）」』】〕〉》,.!?';opening='（「『【〔〈《'
  choices=[i for i in range(1,len(whole))if whole[i]not in closing and whole[i-1]not in opening and face.getlength(whole[:i])<=width and face.getlength(whole[i:])<=width and not(whole[i-1].isascii()and whole[i].isascii()and whole[i-1].isalnum()and whole[i].isalnum())]
  if choices:
   at=min(choices,key=lambda i:abs(face.getlength(whole[:i])-face.getlength(whole[i:])))
   lines=[whole[:at],whole[at:]]
 return lines
def captions(text,start,end,battle):
 # Split only for reading, never imply a phoneme-accurate word alignment.
 chunks=[];part='';width=1110 if battle else 1710
 for token in re.findall(r'[^。！？]+[。！？]?|[。！？]',text):
  if part and len(wrap(part+token,width))>2:chunks.append(part);part=token
  else:part+=token
 if part:chunks.append(part)
 pages=[]
 for chunk in chunks:
  lines=wrap(chunk,width)
  while lines:pages.append('\n'.join(lines[:2]));lines=lines[2:]
 weight=sum(len(p.replace('\n',''))for p in pages);cursor=start;out=[]
 for i,p in enumerate(pages):
  last=end if i==len(pages)-1 else start+round((end-start)*sum(len(x.replace('\n',''))for x in pages[:i+1])/weight)
  assert last>cursor
  out.append({'startFrame':cursor,'endFrame':last,'text':p,'battle':battle});cursor=last
 return out
def build(editorial,narration,pending_calibration=False):
 assert editorial['episode']==narration['episode']=='THIS-GIRL-004'
 assert narration['finalized']and(editorial['finalized']or pending_calibration),'Final reviewed dialogue is required; pending calibration may only prepare static caches'
 lines={l['lineId']:l for c in narration['chapters']for l in c['lines']};used=set();cursor=0
 timeline={'episode':'THIS-GIRL-004','finalized':not pending_calibration,'pendingCalibration':pending_calibration,'fps':30,'sampleRate':48000,'gameBox':[40,28,576,1024],'gameFadeFrames':0,'pages':[],'voice':[],'gameCuts':[],'captions':[],'music':editorial['music'],'chapters':[]}
 for page_index,page in enumerate(editorial['pages']):
  local=round(page.get('leadSeconds',.25)*30);voices=[];battle=page['spec']['kind'] in ['battle','battle-pause']
  for ref in page.get('lines',[]):
   ref={'lineId':ref}if isinstance(ref,str)else ref;ident=ref['lineId'];assert ident not in used;used.add(ident);line=lines[ident]
   assert sha(ROOT/line['file'])==line['sha256'],'Narration changed'
   at=ref.get('offsetFrames',local);duration=math.ceil(line['duration']*30)
   assert at>=local or ref.get('allowOverlap',False),'Unintended overlapping narration'
   row={'lineId':ident,'file':line['file'],'startFrame':cursor+at,'durationFrames':duration,'text':line['text']}
   voices.append(row);local=max(local,at+duration+round(page.get('lineGapSeconds',.2)*30))
  duration=page.get('durationFrames',local+round(page.get('tailSeconds',.35)*30))
  if page.get('allowVoiceCarry'):
   following=editorial['pages'][page_index+1]
   assert battle and following['id']==page['carryIntoPageId']and not following.get('lines')
   assert following['spec']['kind']=='mechanism-note'and local-duration<following['durationFrames']
  else:assert duration>=local-8
  if page['spec']['kind']=='roster':assert duration>=26*30
  cut=page.get('gameCut')
  if page['spec']['kind']=='battle':
   assert cut and cut['sourceEndFrame']-cut['sourceStartFrame']==duration,'Whole battle page must share exact video/audio interval'
   assert duration>=180,'A major native cut needs room for independent thirds-based sync QA'
   assert 'sourceApplicationSpeed'in cut,'Disclose the recorded application speed separately from editorial speed'
   if not pending_calibration:assert isinstance(cut.get('audioSourceOffsetSamples'),int)and cut.get('audioCalibrationEvidence'),'Freeze source synchronization evidence and one fixed audio sample offset per shot'
   timeline['gameCuts'].append({**cut,'id':page['id'],'startFrame':cursor,'editorialPlaybackRate':1})
  else:assert cut is None
  timeline['pages'].append({**page,'startFrame':cursor,'durationFrames':duration})
  if page.get('chapter'):timeline['chapters'].append({'startFrame':cursor,'title':page['chapter']})
  timeline['voice']+=voices
  for row in voices:timeline['captions']+=captions(row['text'],row['startFrame'],row['startFrame']+row['durationFrames'],battle)
  cursor+=duration
 assert used==set(lines),'Every narration line must appear exactly once'
 timeline['durationFrames']=cursor
 ordered=sorted(timeline['voice'],key=lambda v:v['startFrame'])
 assert all(a['startFrame']+a['durationFrames']<=b['startFrame']for a,b in zip(ordered,ordered[1:])),'Unintended cross-page narration overlap'
 timeline['inputHashes']={'editorialCode':sha(__file__),'captionFont':sha(FONT)}
 return timeline
def srt_time(frame):
 ms=round(frame*1000/30);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02},{ms:03}'
def deliver(timeline):
 d=O/'delivery';d.mkdir(exist_ok=True)
 (d/'Subtitles-ja.srt').write_text('\n\n'.join(f"{i}\n{srt_time(c['startFrame'])} --> {srt_time(c['endFrame'])}\n{c['text']}"for i,c in enumerate(timeline['captions'],1))+'\n')
 (d/'Chapters.txt').write_text('\n'.join(srt_time(c['startFrame']).split(',')[0]+' '+c['title']for c in timeline['chapters'])+'\n')
 out=['# この子で、勝ちたい。','', 'みんなが輝くRPGをつくる研究独白 #04 【STILLVEIL】','', '音声：VOICEVOX:春日部つむぎ。字幕のページ分けは発話全体の読書用タイミングで、単語単位の強制アライメントではありません。','']
 for page in timeline['pages']:
  out+=['## '+page.get('chapter',page['id']),'', '映像：`'+json.dumps(page['spec'],ensure_ascii=False)+'`','']
  for row in timeline['voice']:
   if page['startFrame']<=row['startFrame']<page['startFrame']+page['durationFrames']:out+=[srt_time(row['startFrame'])+'　つむぎ「'+row['text']+'」','']
 (d/'Script.md').write_text('\n'.join(out))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('editorial');ap.add_argument('--pending-calibration',action='store_true');a=ap.parse_args();p=Path(a.editorial);n=O/'narration.json'
 t=build(json.loads(p.read_text()),json.loads(n.read_text()),a.pending_calibration);t['inputHashes'].update(editorial=sha(p),narration=sha(n));(O/'render').mkdir(exist_ok=True);(O/'render/timeline.json').write_text(json.dumps(t,ensure_ascii=False,indent=2));deliver(t)
 print('Timeline frames',t['durationFrames'],'seconds',t['durationFrames']/30)
if __name__=='__main__':main()
