"""Fail-closed portrait/caption/registry checks plus an explicit final-file manual review."""
import pathlib,json,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-02';sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import sha256
MOV=O/'delivery/STILLVEIL-BuildResearchDiary-02.mp4'
n=json.loads((O/'timeline-narration.json').read_text());head=json.loads((O/'head-safety.json').read_text());checks=[]
def check(kind,passed,**info):checks.append({'type':kind,'passed':bool(passed),**info})
check('safe_portrait_contract',head['avatarCanvas']==[320,440] and head['placements']==[[0,470],[1600,470]] and head['bobMaxPixels']<=3 and head['minimumInnerPadding']>=30)
for name,(x,y,r,b)in head['opaqueBounds'].items():
 safe=x>=30 and y>=30 and r<=290 and b<=410
 for px,py in head['placements']:safe=safe and px+x>=0 and py+y-3>=0 and px+r<=1920 and py+b+3<935
 check('head_safe_at_all_bob_extremes',safe,asset=name)
for c in n['chapters']:
 check('whole_frame_chapter',abs(c['duration']*30-round(c['duration']*30))<1e-6,chapter=c['id'])
 if c['id']=='series-op':continue
 v=json.loads((O/'render'/f"{c['id']}-visual.json").read_text())
 check('actor_coverage',bool(v['actors']) and v['actors'][0]['start']==0 and abs(v['actors'][-1]['end']-c['duration'])<1/30,chapter=c['id'])
 for a in v['actors']:
  valid=a['left'].startswith('t-research-')or a['left']=='blank'
  valid=valid and(a['right']=='blank'or a['right'].startswith(('z-','m-')))
  if a['speaker']in['z','m']:valid=valid and(a['right']=='blank'or a['right'].startswith(a['speaker']+'-'))
  if a['speaker']=='t':valid=valid and(a['left']=='blank'or a['left'].startswith('t-research-'))
  check('speaking_portrait',valid,chapter=c['id'],start=a['start'])
 ass=(O/'render'/f"{c['id']}.ass").read_text()
 for line in ass.splitlines():
  if line.startswith('Dialogue: 3,'):check('caption_max_two_lines',line.count('\\N')<=1,chapter=c['id'])
 if c.get('clip'):check('honest_capture_label',bool(c.get('clipLabel')) and '\n'not in c['clipLabel'] and c['clipLabel']in ass and bool(c.get('clipDisclosure')),chapter=c['id'])
check('roster_then_opening',n['chapters'][0]['id']=='roster' and n['chapters'][1]['id']=='series-op' and n['commonOpening']['start']==n['chapters'][0]['duration'] and n['chapters'][1]['duration']==25.6)
registry=json.loads((O/'registry.json').read_text())
check('current_registry_finalized',registry['finalized'] and registry['sourceAppVersion']=='1.11.0' and registry['sourceGameCommit']=='489d5a4b15f02385c7229a2b2ff29f76da0abf44')
gems=json.loads((O/'gem-audit.json').read_text())
check('no_unproven_live_certificates',registry['summary']['liveCertifiedGirls']==0 and not gems['liveCertifications'] and registry['summary']['prototypeCertifiedGirls']==len(gems['prototypeCertifications']))
rows=json.loads((O/'edit-timeline.json').read_text());from qa_contract import contract
plan,coverage=contract(n,rows,sha256)
check('all_girl_forms_retained',len(registry['entries'])==72 and len({e['seriesId']for e in registry['entries']})==72)
reviewPath=O/'delivery/Manual-Visual-Review.json';review=json.loads(reviewPath.read_text())if reviewPath.exists()else{}
finishedSha=sha256(MOV)
check('manual_review_exact_finished_file',review.get('passed')is True and review.get('finishedSha256')==finishedSha and bool(review.get('reviewer')) and bool(review.get('reviewedAssets')) and bool(review.get('contactSheetPaths')))
for file in review.get('contactSheetPaths',[]):check('review_contact_exists',(ROOT/file).is_file(),path=file)
r={'passed':all(c['passed']for c in checks),'checks':checks,'sourceHeadSafetySha256':sha256(O/'head-safety.json'),'sourceRegistrySha256':sha256(O/'registry.json'),'finishedSha256':finishedSha,'processingSha256':sha256(__file__),'manualReview':review};(O/'delivery/Visual-QC.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));assert r['passed'],[c for c in checks if not c['passed']];print('VISUAL REGRESSIONS PASSED',len(checks))
