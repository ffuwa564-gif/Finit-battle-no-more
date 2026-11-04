"""Promote already synthesized exact-text sources after the final factual/frame review.

This does not synthesize audio or relabel changed dialogue. Any changed utterance,
reading, parameters, engine binding or cache bytes requires synth.py again.
"""
from pathlib import Path
import hashlib,json
import synth
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 story_path=ROOT/'scripts/this-girl-02/editor/story.json';story=json.loads(story_path.read_text());draft_path=O/'narration-draft.json';draft=json.loads(draft_path.read_text())
 assert story['finalized']and story['episode']==draft['episode']=='THIS-GIRL-002'
 assert draft['engine']=='0.26.0'and draft['parameters']==synth.PARAMS and draft['codeSha256']==sha(synth.__file__)
 assert [c['id']for c in story['chapters']]==[c['id']for c in draft['chapters']]
 sources={};chapters=[]
 for chapter,voiced in zip(story['chapters'],draft['chapters']):
  assert len(chapter['lines'])==len(voiced['lines']);lines=[]
  for index,(line,old)in enumerate(zip(chapter['lines'],voiced['lines'])):
   assert line['text']==old['text']and synth.reading(line['text'])==old['ttsText'],'Changed words require synthesis, not promotion'
   assert old['lineId']==chapter['id']+f'-{index:02d}'and old['voiceId']==8
   for key,hash_key in [('file','sha256'),('queryFile','querySha256')]:
    p=ROOT/old[key];assert sha(p)==old[hash_key];sources[old[key]]=old[hash_key]
   marker=Path(ROOT/old['file']).with_suffix('.cache.json');cache=json.loads(marker.read_text())
   contract={'text':line['text'],'reading':old['ttsText'],'speaker':8,'parameters':synth.PARAMS,'engineVersion':draft['engine'],'codeSha256':draft['codeSha256']}
   expected=hashlib.sha256(json.dumps(contract,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
   assert cache['key']==expected and cache['sha256']==old['sha256']and cache['querySha256']==old['querySha256']
   lines.append({**line,**old})
  chapters.append({**chapter,'lines':lines})
 final={**draft,'finalized':True,'storySha256':sha(story_path),'chapters':chapters,'promotedFromExactTextDraftSha256':sha(draft_path),'finalizationCodeSha256':sha(__file__)}
 out=O/'narration.json';out.write_text(json.dumps(final,ensure_ascii=False,indent=2))
 (O/'research/narration-source-finalization.json').write_text(json.dumps({'passed':True,'draftSha256':sha(draft_path),'finalStorySha256':sha(story_path),'finalNarrationSha256':sha(out),'codeSha256':sha(__file__),'sourceHashes':sources,'scope':'Same verified words/readings/parameters/engine binding and immutable source audio/query cache. No new synthesis is claimed.'},ensure_ascii=False,indent=2))
 print('Promoted unchanged exact-text sources',sum(len(c['lines'])for c in chapters))
if __name__=='__main__':main()
