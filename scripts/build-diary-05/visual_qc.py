"""Fail-closed portrait/caption/registry checks plus an explicit final-file manual review."""
import pathlib,json,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-05';sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import sha256
MOV=O/'delivery/STILLVEIL-BuildResearchDiary-05.mp4'
provenance=json.loads((O/'assets/artwork-provenance.json').read_text());rejected={PathEntry['retainedCopy'] for PathEntry in provenance['superseded']}
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
 for scene in v['scenes']:
  if scene.get('illustration'):check('active_illustration_only',str((O/'assets'/(scene['illustration']+'.png')).relative_to(ROOT))not in rejected,chapter=c['id'])
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
guidePath=ROOT/'docs/media/build-research-diary/visual-first-guide.md';visualFirst=review.get('visualFirstReview',{})
check('visual_first_policy_bound',visualFirst.get('guideSha256')==sha256(guidePath))
check('sampled_scenes_follow_visual_first_policy',all(visualFirst.get(k)is True for k in ['diagramsLeadExplanation','oneQuestionPerScene','sampledScenesAvoidDenseConcurrentText','conditionsDeferredToMaterials','noMeaninglessPadding']))
for file in review.get('contactSheetPaths',[]):check('review_contact_exists',(ROOT/file).is_file(),path=file)
seris=next(e for e in registry['entries']if e['characterId']=='seris');preview=review.get('nextEpisodePreview',{});nextChapter=n['chapters'][-1]
check('seris_existing_idea_only',seris['seriesId']=='BD003' and seris['status']=='idea' and seris['gems']['badge']=='outline-weak' and not registry['nextEpisodePreview']['newCertificationGranted'] and not any(e['canonicalGirlId']=='seris'for e in gems['prototypeCertifications']))
check('next_episode_final_chapter',nextChapter['id']==plan['nextEpisodePreview']['chapter'] and preview.get('chapter')==nextChapter['id'])
check('next_episode_actual_seris_original',preview.get('characterId')=='seris' and preview.get('seriesId')=='BD003' and str(preview.get('artPath','')).removeprefix('public/')==seris['artPath'] and preview.get('artSha256')==seris['artSha256']==sha256(ROOT/'public'/seris['artPath']))
layoutPath=O/'render/next-episode-preview.json';layout=json.loads(layoutPath.read_text());sx,sy,sw,sh=layout['artSlot'];x,y,w,h=layout['artRect'];ow,oh=layout['originalSize'];pad=layout['minimumInnerPadding']
check('next_episode_contain_geometry',layout['presentation']=='contain' and pad>=32 and x>=sx+pad and y>=sy+pad and x+w<=sx+sw-pad and y+h<=sy+sh-pad and layout['scaledSize']==[w,h] and abs(w*oh-h*ow)<=max(ow,oh))
check('next_episode_question_matches',layout['question']==registry['nextEpisodePreview']['question'])
check('next_episode_layout_original_bound',layout['characterId']=='seris' and layout['seriesId']=='BD003' and layout['artPath']==seris['artPath'] and layout['artSha256']==seris['artSha256'] and not layout['newCertification'] and layout['noNewGemClaim'])
check('next_episode_plate_unchanged',sha256(ROOT/layout['plate'])==layout['plateSha256'] and sha256(ROOT/'scripts/build-diary-05/visuals.py')==layout['processingSha256'])
check('next_episode_manual_full_head_name_id_unverified',all(preview.get(k)is True for k in ['fullHeadVisible','nameAndIdVisible','unverifiedLabelVisible','noNewGemClaim']))
check('next_episode_final_frame_evidence',bool(preview.get('samples')))
for sample in preview.get('samples',[]):
 path=ROOT/sample['path'];safe=path.is_file() and sha256(path)==sample['sha256'] and nextChapter['start']<=sample['timeSeconds']<nextChapter['start']+nextChapter['duration']
 check('next_episode_actual_final_chapter_sample',safe,path=sample['path'],time=sample['timeSeconds'])

r={'passed':all(c['passed']for c in checks),'checks':checks,'sourceHeadSafetySha256':sha256(O/'head-safety.json'),'sourceRegistrySha256':sha256(O/'registry.json'),'finishedSha256':finishedSha,'sourceNextEpisodeLayoutSha256':sha256(layoutPath),'processingSha256':sha256(__file__),'manualReview':review};(O/'delivery/Visual-QC.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));assert r['passed'],[c for c in checks if not c['passed']];print('VISUAL REGRESSIONS PASSED',len(checks))
