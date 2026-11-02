"""Regression checks for safe heads, correctly assigned speaking portraits and readable subtitle paging."""
import pathlib,json,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-retrospective';sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import sha256
n=json.loads((O/'timeline-narration.json').read_text());head=json.loads((O/'head-safety.json').read_text());checks=[]
for name,(x,y,r,b)in head['opaqueBounds'].items():
 safe=x>=30 and y>=30 and r<=290 and b<=410
 for px,py in head['placements']:safe=safe and px+x>=0 and py+y-3>=0 and px+r<=1920 and py+b+3<935
 checks.append({'type':'head_safe_at_all_bob_extremes','asset':name,'passed':safe})
for c in n['chapters']:
 if c['id']=='series-op':continue
 v=json.loads((O/'render'/f"{c['id']}-visual.json").read_text())
 for a in v['actors']:
  valid=a['left'].startswith('z-')or a['left']=='blank'
  if a['speaker']in['m','t']:valid=valid and(a['right']=='blank'or a['right'].startswith(a['speaker']+'-'))
  checks.append({'type':'speaking_portrait','chapter':c['id'],'start':a['start'],'passed':valid})
 ass=(O/'render'/f"{c['id']}.ass").read_text()
 for line in ass.splitlines():
  if line.startswith('Dialogue: 3,'):checks.append({'type':'caption_max_two_lines','chapter':c['id'],'passed':line.count('\\N')<=1})
 # Every chapter is made of whole final video frames.
 checks.append({'type':'whole_frame_chapter','chapter':c['id'],'passed':abs(c['duration']*30-round(c['duration']*30))<1e-6})
r={'passed':all(c['passed']for c in checks),'checks':checks,'sourceHeadSafetySha256':sha256(O/'head-safety.json'),'finishedSha256':sha256(O/'delivery/STILLVEIL-TowerDiary-Retrospective.mp4'),'processingSha256':sha256(__file__),'manualReview':'All six approved expression originals, the new reflection illustration, the approved other cutaways and distributed-movie contact sheet reviewed for complete ears, hats and heads. Contain is used for game illustrations.'};(O/'delivery/Visual-QC.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));assert r['passed'],[c for c in checks if not c['passed']];print('VISUAL REGRESSIONS PASSED',len(checks))
