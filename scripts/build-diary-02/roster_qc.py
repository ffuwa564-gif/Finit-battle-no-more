"""Bind every visible roster ID, source illustration and gem to the distributed MP4."""
from pathlib import Path
from collections import defaultdict
import sys,json,subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-02';R=O/'render';MOV=O/'delivery/STILLVEIL-BuildResearchDiary-02.mp4'
sys.path.insert(0,str(ROOT/'tools/media-sync'));from media_sync import sha256
FPS=30

def frame(path,number):
 # Input-side accurate seeking decodes from the preceding keyframe. Frame times
 # are exact multiples of the final 30fps clock, independently for both files.
 raw=subprocess.run(['ffmpeg','-v','error','-ss',f'{number/FPS:.9f}','-i',str(path),'-frames:v','1','-an','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],stdout=subprocess.PIPE,check=True).stdout
 assert len(raw)==1920*1080*3,('Missing or malformed frame',str(path),number,len(raw))
 return np.frombuffer(raw,dtype=np.uint8).reshape(1080,1920,3)

def audit():
 registry=json.loads((O/'registry.json').read_text());metadata=json.loads((R/'roster-background.json').read_text());n=json.loads((O/'timeline-narration.json').read_text())
 expected={e['seriesId']:e for e in registry['entries']};checks=[];shown=[]
 def ck(kind,passed,**rest):checks.append({'type':kind,'passed':bool(passed),**rest})
 ck('exact_finalized_registry',registry['finalized'] and len(expected)==72)
 roster=n['chapters'][0];duration=roster['duration'];total=round(duration*FPS)
 ck('roster_is_first_complete_chapter',roster['id']=='roster' and roster['start']==0 and metadata['duration']==duration and metadata['frames']==total)
 ck('source_movie_sha256',sha256(R/'roster-background.mp4')==metadata['outputSha256'])
 ck('metadata_passed',metadata['passed'] and metadata['registryFinalized'])
 # Verify the producer's complete source chain, including registry, code, fonts
 # and every original illustration. No renderer module is imported for proof.
 for name,digest in metadata['inputs']['files'].items():
  path=Path(name);path=path if path.is_absolute()else ROOT/path
  ck('producer_input_unchanged',path.is_file() and sha256(path)==digest,path=name)
 ck('producer_registry_bound',metadata['inputs']['files'].get('artifacts/build-diary-02/registry.json')==sha256(O/'registry.json'))
 proof=metadata['visibility'];ids=[x['seriesId']for x in proof]
 ck('all_ids_once',len(ids)==72 and len(set(ids))==72 and set(ids)==set(expected))
 groups=defaultdict(list)
 for p in proof:
  id=p['seriesId'];e=expected.get(id)
  if e is None:ck('known_id',False,seriesId=id);continue
  i=list(expected).index(id);column=i%36;row=i//36;travel=35*270+250-1280
  # Independently enumerate every final-frame position; the producer's claimed
  # duration or first/last fields are never accepted as visibility evidence alone.
  valid=[]
  for f in range(total):
   offset=travel*min(1,max(0,(f/FPS-3)/(duration-6)))
   if -1e-6<=column*270-offset<=1280-250+1e-6:valid.append(f)
  continuous=bool(valid) and len(valid)==valid[-1]-valid[0]+1
  sample=p['sampleFrame'];offset=travel*min(1,max(0,(sample/FPS-3)/(duration-6)))
  rect=[320+round(column*270-offset),125+row*385,250,365]
  geometry=continuous and len(valid)>=90 and p['firstFullFrame']==valid[0] and p['lastFullFrame']==valid[-1] and p['fullFrames']==len(valid) and abs(p['fullSeconds']-len(valid)/FPS)<1e-8 and p['fullyVisibleStart']==valid[0]/FPS and p['fullyVisibleEnd']==(valid[-1]+1)/FPS and sample in valid and p['sampleTime']==sample/FPS and p['cardRect']==rect and p['row']==row
  x,y,w,h=rect;geometry=geometry and x>=320 and x+w<=1600 and y>=125 and y+h<=875
  ck('complete_visible_three_seconds',geometry,seriesId=id,fullSeconds=len(valid)/FPS,cardRect=rect,sampleFrame=sample)
  art=ROOT/'public'/e['artPath'];originalSha=sha256(art)
  chain=p['characterId']==e['characterId'] and p['artPath']==e['artPath'] and p['artSha256']==e['artSha256']==originalSha and metadata['inputs']['art'].get(e['artPath'])==originalSha and p['badge']==e['gems']['badge']
  ck('original_art_and_gem_chain',chain,seriesId=id,characterId=e['characterId'],badge=p['badge'],artSha256=originalSha)
  groups[sample].append((p,geometry and chain))
 # The two rows share frame times. Decode once per unique sample for each file.
 for number,items in sorted(groups.items()):
  original=frame(R/'roster-background.mp4',number);finished=frame(MOV,number)
  for p,logical in items:
   x,y,w,h=p['cardRect'];ref=original[y:y+h,x:x+w].astype(np.float32);actual=finished[y:y+h,x:x+w].astype(np.float32)
   rmse=float(np.sqrt(np.mean((ref-actual)**2)));passed=logical and rmse<=12
   ck('finished_card_pixels',passed,seriesId=p['seriesId'],sampleTime=number/FPS,cardRect=p['cardRect'],frameRMSE=rmse)
   if passed:shown.append(p['seriesId'])
 ck('finished_all_72_shown',set(shown)==set(expected) and len(shown)==72)
 report={'passed':all(x['passed']for x in checks),'finishedSha256':sha256(MOV),'registrySha256':sha256(O/'registry.json'),'sourceRosterSha256':sha256(R/'roster-background.mp4'),'sourceMetadataSha256':sha256(R/'roster-background.json'),'expectedSeriesIds':list(expected),'shownSeriesIds':sorted(shown),'checks':checks,'processingSha256':sha256(__file__),'uniqueFramePairs':len(groups),'method':'Independent 30fps full-card visibility enumeration and exact-time original/final RGB card comparison. Source art, registry, producer code and gem metadata hashes bound; actors/subtitles remain outside the card viewport.'}
 (O/'delivery/Roster-Coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));assert report['passed'],[x for x in checks if not x['passed']];print('FINISHED ROSTER COVERAGE PASSED',len(shown),len(groups))
if __name__=='__main__':audit()
