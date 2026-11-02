"""Repair two overlong research labels, preserving all final audio packets and clocks."""
from pathlib import Path
import json,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-01';R=O/'render';D=O/'delivery';FINAL=D/'STILLVEIL-BuildResearchDiary-01.mp4'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def ff(*args):subprocess.run(['ffmpeg','-v','error','-y','-filter_complex_threads','1','-filter_threads','1',*map(str,args)],check=True)
def pcm_digest(p):
 cmd=['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-f','hash','-hash','sha256','-'];return subprocess.check_output(cmd,text=True).strip()
def packet_digest(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'],text=True).strip()
def tm(t):
 v=round(t*100);return f'{v//360000}:{v//6000%60:02d}:{v//100%60:02d}.{v%100:02d}'
def main():
 freeze=json.loads((O/'render-input-freeze.json').read_text());assert freeze['inputsUnchangedAfterRender'];before=sha(FINAL);assert before==freeze['finishedSha256'],'Only apply once to the completed original render'
 n=json.loads((O/'timeline-narration.json').read_text());rows=json.loads((O/'edit-timeline.json').read_text());fixes={};input_hashes={str(Path(__file__).relative_to(ROOT)):sha(__file__),str(FINAL.relative_to(ROOT)):before}
 for id in ['lab-victory-b','no-ruka']:
  ch=next(c for c in n['chapters']if c['id']==id);row=next(c for c in rows if c['chapter']==id);src=R/(id+'.mp4');piece=ROOT/row['piece'];assert src.with_suffix('.mp4.key').exists();input_hashes[str(src.relative_to(ROOT))]=sha(src);input_hashes[str(piece.relative_to(ROOT))]=sha(piece)
  header=(R/(id+'.ass')).read_text().split('[Events]')[0];ass=R/(id+'-header-fix.ass');label='研究試作・実ログ再生（未実装）';body=f'Dialogue: 1,0:00:00.00,{tm(ch["playDuration"])},Info,,0,0,0,,{{\\pos(320,71)\\fs18\\c&HFFFFFF&\\3c&H3E2936&}}{label}\n'
  if id=='lab-victory-b':body+=f'Dialogue: 1,0:00:00.00,{tm(ch["playDuration"])},Info,,0,0,0,,{{\\pos(850,235)\\fs22\\c&H5F4371&}}前半からの続き\n'
  ass.write_text(header+'[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'+body)
  out=R/(id+'-header-fixed.mp4');filter=f"[1:v]crop=486:54:0:0[h];[0:v][h]overlay=310:66:enable='lt(t,{ch['playDuration']})'[c];[c]ass={ass}[v]"
  ff('-i',src,'-i',piece,'-filter_complex',filter,'-map','[v]','-frames:v',round(ch['duration']*30),'-an','-c:v','libx264','-threads',2,'-preset','veryfast','-crf',28,'-pix_fmt','yuv420p',out)
  fixes[id]={'sourceChapterSha256':sha(src),'sourcePieceSha256':sha(piece),'assSha256':sha(ass),'output':str(out.relative_to(ROOT)),'outputSha256':sha(out),'frames':round(ch['duration']*30),'restoredNativeHeaderRect':[310,66,486,54],'preservedExcerptDisclosure':'Right diagram says 1–5R excerpt / full10R defeat'if id=='no-ruka'else'Continuation moved into right diagram'}
 segments=[]
 for c in n['chapters']:
  p=R/'op-video.mp4'if c['id']=='series-op'else ROOT/fixes[c['id']]['output']if c['id']in fixes else R/(c['id']+'.mp4');segments.append(p);input_hashes[str(p.relative_to(ROOT))]=sha(p)
 listing=R/'header-fixed.ffconcat';listing.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.resolve()}'\n"for p in segments));silent=R/'header-fixed-silent.mp4';ff('-safe',0,'-f','concat','-i',listing,'-c:v','copy','-an',silent)
 output=R/'header-fixed-final.mp4';ff('-i',silent,'-i',FINAL,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',output)
 decoded=pcm_digest(FINAL);packets=packet_digest(FINAL);assert pcm_digest(output)==decoded and packet_digest(output)==packets,'Audio must be exactly preserved, with no re-encoding or clock change'
 for p,h in input_hashes.items():assert sha(ROOT/p)==h,('Input changed during label repair',p)
 original=R/'pre-header-correction.mp4';assert not original.exists();FINAL.replace(original);output.replace(FINAL);input_hashes.pop(str(FINAL.relative_to(ROOT)));input_hashes[str(original.relative_to(ROOT))]=before
 report={'passed':True,'sourceFinishedSha256':before,'finishedSha256':sha(FINAL),'sourceMoviePreserved':str(original.relative_to(ROOT)),'processingSha256':sha(__file__),'inputHashes':input_hashes,'chapterRepairs':fixes,'audioDecodedSha256':decoded,'audioPacketSha256':packets,'audioPacketsAndDecodedSamplesUnchanged':True,'reason':'Long second label line overlapped the native LAB heading; use one short line and retain extra disclosures in the right diagram.','rule':'Only the two affected chapters are re-encoded. Other chapter streams and every AAC packet are copied. All final-file gates must run after this stage.'}
 (O/'post-header-fix.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('HEADER FIX READY',report['finishedSha256'],flush=True)
if __name__=='__main__':main()
