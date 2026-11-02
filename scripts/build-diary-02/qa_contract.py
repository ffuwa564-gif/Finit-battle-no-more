"""Frozen, explicit episode coverage; never infer success from whatever cuts remain."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-02'
def contract(n,rows,sha):
 plan=json.loads((O/'render-plan.json').read_text());assert plan.get('finalized')is True
 assert n['renderPlanSha256']==sha(O/'render-plan.json'),'Render plan changed after timeline'
 coverage=plan['requiredCoverage']
 assert coverage['gameCutCount']>=4 and coverage['gameAnchorsPerCut']==3 and coverage['openingAnchors']==3 and coverage['voiceAnchorsPerSpeaker']==3 and coverage['musicAnchors']==3 and coverage['rosterForms']==72
 assert len(coverage['voiceSpeakers'])==3 and set(coverage['voiceSpeakers'])=={'t','z','m'}
 clips=plan['clips'];assert len({x['sourceId']for x in clips.values()})==3,'Expected three declared capture sources'
 assert sum(not bool(x.get('logPlayback'))for x in clips.values())==1,'Exactly one live-app cut must remain'
 assert len(clips)==coverage['gameCutCount']==len(rows),'Missing or undeclared game cut'
 byChapter={x['chapter']:x for x in rows};assert len(byChapter)==len(rows)
 assert {x['chapter']for x in clips.values()}==set(byChapter),'Required chapter omitted or substituted'
 for key,spec in clips.items():
  row=byChapter[spec['chapter']];source=f"artifacts/build-diary-02/capture/{spec['sourceId']}.mov"
  assert row['source']==source and sha(ROOT/source)==spec['sourceSha256'],('Source footage changed',key)
  chapter=next(x for x in n['chapters']if x['id']==spec['chapter']);assert chapter.get('clip')==key
  assert row['logPlayback']==bool(spec.get('logPlayback'))and chapter['logPlayback']==bool(spec.get('logPlayback'))
  assert row['gameRect']==[310,66,486,864] and row['rate']==1
  assert row['frames']==round(row['playDuration']*30) and row['frames']>=90
  assert sha(ROOT/row['piece'])==row['pieceHash']
 return plan,coverage
