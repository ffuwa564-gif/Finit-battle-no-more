"""Move only Part2 B event captions, recomposing from clean sources and copying AAC."""
from pathlib import Path
import json,subprocess
import render as r
ROOT=r.ROOT;O=r.O;ORIGINAL_R=r.R;D=O/'delivery';FINAL=D/'STILLVEIL-BuildResearchDiary-02.mp4';FIX=ORIGINAL_R/'cue-fix';CHAPTER='lab-victory-b'

def audio_digest(path,copy=False):
 args=['ffmpeg','-v','error','-i',str(path),'-map','0:a:0']
 if copy:args+=['-c:a','copy']
 else:args+=['-c:a','pcm_s16le']
 return subprocess.check_output(args+['-f','hash','-hash','sha256','-'],text=True).strip()

def main():
 assert not(O/'post-cue-fix.json').exists(),'Correction is an explicit one-time stage'
 freeze=json.loads((O/'render-input-freeze.json').read_text());assert freeze['inputsUnchangedAfterRender'];before=r.sha256(FINAL);assert before==freeze['finishedSha256'],'Start from the approved uncorrected final'
 original_inputs=freeze['inputs']
 for path,digest in original_inputs.items():assert r.sha256(path)==digest,('Original frozen input changed',path)
 n=json.loads((O/'timeline-narration.json').read_text());rows=json.loads((O/'edit-timeline.json').read_text());ch=next(c for c in n['chapters']if c['id']==CHAPTER);row=next(x for x in rows if x['chapter']==CHAPTER);approved=json.loads((O/'approved-cuts.json').read_text())[CHAPTER];plan=json.loads((O/'render-plan.json').read_text());spec=plan['clips'][ch['clip']];piece=ROOT/row['piece'];source=ROOT/row['source'];old_chapter=ORIGINAL_R/(CHAPTER+'.mp4');old_ass=ORIGINAL_R/(CHAPTER+'.ass')
 condition_keys=['sourceStart','sourceEnd','rate','leadInFrames','frames','gameRect'];conditions={k:row[k]for k in condition_keys};assert conditions==approved['conditions'];assert r.sha256(piece)==approved['sha256']==row['pieceHash'];assert r.sha256(source)==spec['sourceSha256'];r.validate_capture(source)
 assets=[O/'assets'/(id+'-avatar.png')for id in ['z-happy','z-panic','m-happy','m-deadpan','t-research-happy','t-research-think','t-research-determined','t-research-care','blank']]
 inputs=[Path(__file__),O/'render-input-freeze.json',O/'approved-cuts.json',O/'timeline-narration.json',O/'edit-timeline.json',O/'render-plan.json',O/'event-cues.json',old_chapter,old_ass,piece,source,*assets,*r.CODE]
 segments=[]
 for chapter in n['chapters']:
  p=ORIGINAL_R/'op-video.mp4'if chapter['id']=='series-op'else ORIGINAL_R/(chapter['id']+'.mp4');inputs.append(p)
 input_hashes={str(p.relative_to(ROOT)):r.sha256(p)for p in sorted(set(inputs))};helper_sha=r.sha256(__file__);r.R=FIX;FIX.mkdir(exist_ok=True);r.CODE_HASHES={**r.CODE_HASHES,'cue_fix.py':helper_sha};original_subtitles=r.subtitles;changes=[]
 def fixed_subtitles(current):
  assert current['id']==CHAPTER;p=original_subtitles(current);text=p.read_text();assert text==old_ass.read_text(),'Regenerated base captions must equal the approved original'
  old='\\pos(1200,825)';new='\\pos(1200,765)';out=[]
  for line in text.splitlines(keepends=True):
   if line.startswith('Dialogue: 5,')and old in line:changes.append(line.rstrip());line=line.replace(old,new)
   out.append(line)
  assert changes,'Expected actual B event captions';fixed=''.join(out);assert fixed.replace(new,old)==text,'Only event cue coordinates may change';p.write_text(fixed);return p
 def approved_piece(current):
  assert current['chapter']==CHAPTER;assert {k:current[k]for k in condition_keys}==conditions,'Cut conditions changed';assert r.sha256(source)==spec['sourceSha256'],'Capture changed';assert r.sha256(piece)==approved['sha256'],'Approved native piece changed';current['pieceHash']=approved['sha256']
 r.subtitles=fixed_subtitles;r.make_piece=approved_piece
 # Recreate the same clean base figures; avoid decoding/re-encoding the old B video.
 plates=r.material(ch)
 for p in plates:assert r.sha256(p)==r.sha256(ORIGINAL_R/p.name),('Clean plate differs',p.name)
 r.render_chapter(ch,row,assets);new_chapter=FIX/(CHAPTER+'.mp4')
 for p in plates:assert r.sha256(p)==r.sha256(ORIGINAL_R/p.name),('Clean plate changed',p.name)
 for name in ['left','right']:assert r.sha256(FIX/f'{CHAPTER}-{name}.ffconcat')==r.sha256(ORIGINAL_R/f'{CHAPTER}-{name}.ffconcat'),'Actor source/intervals changed'
 assert r.sha256(piece)==approved['sha256'],'Native piece changed during recomposition'
 for chapter in n['chapters']:
  p=ORIGINAL_R/'op-video.mp4'if chapter['id']=='series-op'else new_chapter if chapter['id']==CHAPTER else ORIGINAL_R/(chapter['id']+'.mp4');segments.append(p)
 listing=FIX/'movie.ffconcat';listing.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.resolve()}'\n"for p in segments));silent=FIX/'silent.mp4';r.ff('-safe',0,'-f','concat','-i',listing,'-c:v','copy','-an',silent)
 output=FIX/'final.mp4';r.ff('-i',silent,'-i',FINAL,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',output)
 packet=audio_digest(FINAL,True);pcm=audio_digest(FINAL);assert audio_digest(output,True)==packet,'AAC packet payload changed';assert audio_digest(output)==pcm,'Decoded audio changed'
 def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,nb_frames,r_frame_rate,avg_frame_rate,duration_ts,time_base','-of','json',str(path)]))
 vp=next(s for s in probe(output)['streams']if s['codec_type']=='video');assert int(vp['nb_frames'])==round(n['duration']*30)and vp['avg_frame_rate']==vp['r_frame_rate']=='30/1','Final frame clock changed'
 for path,digest in original_inputs.items():assert r.sha256(path)==digest,('Original input changed during correction',path)
 for path,digest in input_hashes.items():assert r.sha256(ROOT/path)==digest,('Correction input/helper changed',path)
 assert r.sha256(FINAL)==before,'Original final changed during correction';preserved=ORIGINAL_R/'pre-cue-correction.mp4';assert not preserved.exists();FINAL.replace(preserved);output.replace(FINAL)
 input_hashes[str(preserved.relative_to(ROOT))]=before;report={'passed':True,'sourceFinishedSha256':before,'finishedSha256':r.sha256(FINAL),'sourceMoviePreserved':str(preserved.relative_to(ROOT)),'processingSha256':helper_sha,'inputHashes':input_hashes,'chapterRepair':{'chapter':CHAPTER,'originalChapterSha256':r.sha256(old_chapter),'originalPieceSha256':approved['sha256'],'sourceCaptureSha256':spec['sourceSha256'],'editConditions':conditions,'output':str(new_chapter.relative_to(ROOT)),'outputSha256':r.sha256(new_chapter),'frames':round(ch['duration']*30),'sourceAssSha256':r.sha256(old_ass),'fixedAssSha256':r.sha256(FIX/(CHAPTER+'.ass')),'cuePositions':{'from':[1200,825],'to':[1200,765],'changedLines':len(changes)},'cleanPlatesMatchOriginal':True,'nativePieceUnchanged':True},'audioDecodedSha256':pcm,'audioPacketSha256':packet,'audioPacketsAndDecodedSamplesUnchanged':True,'originalFrozenInputsUnchanged':True,'finalFrames':int(vp['nb_frames']),'reason':'Gold B event cues overlapped the grey average-potion note; move those event cues upward 60px.','rule':'Only B is recomposed from clean original figures, actors and the approved native cut. All other chapter video and every original AAC packet are copied. Original render inputs and their historical freeze remain unchanged.'};(O/'post-cue-fix.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('CUE FIX READY',report['finishedSha256'],flush=True)
if __name__=='__main__':main()
