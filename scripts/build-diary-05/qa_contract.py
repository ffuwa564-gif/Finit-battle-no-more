"""Frozen, explicit episode coverage; never infer success from whatever cuts remain."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-05'
CLIP_CHAPTERS={'lab-failure':'failure','live-elaine':'elaine-now','lab-victory-a':'lab-victory-a','lab-victory-b':'lab-victory-b'}
def contract(n,rows,sha):
 plan=json.loads((O/'render-plan.json').read_text());assert plan.get('finalized')is True
 assert 480<=n['duration']<=660,'Part5 duration must follow the8–11minute visual-first format'
 assert n['renderPlanSha256']==sha(O/'render-plan.json'),'Render plan changed after timeline'
 coverage=plan['requiredCoverage']
 assert coverage['gameCutCount']==4 and coverage['gameAnchorsPerCut']==3 and coverage['openingAnchors']==3 and coverage['voiceAnchorsPerSpeaker']==3 and coverage['musicAnchors']==3 and coverage['rosterForms']==72
 assert len(coverage['voiceSpeakers'])==3 and set(coverage['voiceSpeakers'])=={'t','z','m'}
 clips=plan['clips'];assert len({x['sourceId']for x in clips.values()})==3,'Expected three declared capture sources'
 assert sum(not bool(x.get('logPlayback'))for x in clips.values())==1,'Exactly one live-app cut must remain'
 assert len(clips)==coverage['gameCutCount']==len(rows),'Missing or undeclared game cut'
 byChapter={x['chapter']:x for x in rows};assert len(byChapter)==len(rows)
 assert set(clips)==set(CLIP_CHAPTERS),'Required clip omitted or substituted'
 assert set(CLIP_CHAPTERS.values())==set(byChapter),'Required chapter omitted or substituted'
 for key,spec in clips.items():
  chapterId=CLIP_CHAPTERS[key]
  assert spec.get('chapter',chapterId)==chapterId,'Conflicting declared clip chapter'
  row=byChapter[chapterId];source=f"artifacts/build-diary-05/capture/{spec['sourceId']}.mov"
  assert row['source']==source and sha(ROOT/source)==spec['sourceSha256'],('Source footage changed',key)
  chapter=next(x for x in n['chapters']if x['id']==chapterId);assert chapter.get('clip')==key
  assert row['logPlayback']==bool(spec.get('logPlayback'))and chapter['logPlayback']==bool(spec.get('logPlayback'))
  assert row['gameRect']==[310,66,486,864] and row['rate']==1
  assert row['frames']==round(row['playDuration']*30) and row['frames']>=90
  assert sha(ROOT/row['piece'])==row['pieceHash']
 preview=plan['nextEpisodePreview'];assert preview['characterId']=='seris'and preview['seriesId']=='BD003'
 assert n['chapters'][-1]['id']==preview['chapter'],'NEXT EPISODE must be the independent final chapter'
 assert 30<=n['chapters'][-1]['duration']<=45,'NEXT EPISODE must preserve the30–45second original-art preview'
 assert not n['chapters'][-1].get('clip'),'Do not substitute a battle clip for the actual Seris preview'
 return plan,coverage
