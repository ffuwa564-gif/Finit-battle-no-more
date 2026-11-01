"""Assemble complete chapter timelines from cached speech without issuing synthesis requests."""
import hashlib,json,pathlib,wave
from dialogue import CHAPTERS
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/tower-builds'
def timeline():
 chapters=[];zero=0
 for ident,title,body in CHAPTERS:
  lines=[];start=zero+.55
  for line in body.strip().splitlines():
   sp,text=line.split('|',1);spoken=text.replace('T6','ティア六').replace('STILLVEIL','スティルヴェイル').replace('第一区画','第一層')
   key=hashlib.sha256(json.dumps([3 if sp=='z' else 2,spoken,1.10 if sp=='z' else 1.07],ensure_ascii=False).encode()).hexdigest()[:20];path=OUT/'speech'/(key+'.wav')
   if not path.exists():break
   try:
    with wave.open(str(path))as w:dur=w.getnframes()/w.getframerate()
   except (EOFError,wave.Error):break
   lines.append(dict(speaker=sp,text=text.replace('第一区画','第1層'),wav=str(path.relative_to(ROOT)),duration=dur,start=round(start,4),end=round(start+dur,4)));start+=dur+.16
  if len(lines)!=len(body.strip().splitlines()):break
  duration=round(start-zero+.55,4);chapters.append(dict(id=ident,title=title,start=round(zero,4),duration=duration,lines=lines));zero+=duration
 data=dict(duration=zero,chapters=chapters);(OUT/'narration-partial.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));return data
if __name__=='__main__':print([(c['id'],round(c['duration'],1))for c in timeline()['chapters']])
