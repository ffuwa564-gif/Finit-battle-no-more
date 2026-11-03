"""Report final calibrated CFR sources, immutable source/input hashes and reviewed stills."""
from pathlib import Path
import hashlib,json,subprocess
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-05';C=O/'capture'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
review=json.loads((O/'research/source-still-review.json').read_text());assert review['passed'] and review['reviewer'] and len(review['images'])==6
reviewed={x['path']:x for x in review['images']};assert len(reviewed)==6
report={'passed':True,'scope':'Current production1.11 Elaine ordinary-healing excerpt and two explicitly labelled isolated native research-log playbacks. These are distinct comparison conditions.','captures':[],'manualVisualReview':review,'normalizationReport':'artifacts/build-diary-05/research/capture-cfr-normalization.json'}
for ident in['live-elaine','lab-victory','lab-counter']:
 m=json.loads((C/(ident+'.json')).read_text());movie=C/(ident+'.mov');norm=m['sourceNormalization'];assert norm['passed']and norm['pcmIdentical']and norm['fullDecodePassed'];actual=sha(movie);assert actual==m['cleanSha256']==norm['outputSha256'];assert m['calibration']['passed']
 b=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(movie)]));v=next(s for s in b['streams']if s['codec_type']=='video');a=next(s for s in b['streams']if s['codec_type']=='audio');assert v['avg_frame_rate']==v['r_frame_rate']=='30/1';assert a['sample_rate']=='48000'and a['codec_name']=='pcm_s16le';frames=int(v['nb_frames']);samples=int(a['duration_ts']);assert frames*1600==samples;assert float(v['start_time'])==float(a['start_time'])==0;assert m.get('runtimeErrors',[])==[]
 if m.get('nativeLogPlaybackVerified'):assert m['battleEvents'] and all(x.get('uiAudit',{}).get('passed') for x in m['battleEvents']),'Every recorded LAB event must pass numeric/stock layout audit'
 codechecks=[]
 for path,h in m.get('captureCodeHashes',{}).items():
  p=ROOT/path;assert p.exists()and sha(p)==h,(ident,path,'changed after capture');codechecks.append({'path':path,'sha256':h,'unchanged':True})
 images={}
 for tail in['start','result']:
  p=C/f'{ident}-{tail}.png';im=Image.open(p);assert im.size==(450,800);images[tail]={'path':str(p.relative_to(ROOT)),'size':list(im.size),'sha256':sha(p)}
  observation=reviewed[images[tail]['path']];assert observation['passed'] and observation['sha256']==sha(p),'Stale manual source still review'
 rec={'id':ident,'passed':True,'cleanSha256':actual,'duration':float(b['format']['duration']),'gameplayWindow':m['gameplayWindow'],'calibrationAnchors':len(m['calibration']['video']),'maximumCalibrationResidualMs':max(abs(x)for x in m['calibration']['encodedResidualMs']),'nativeBrowserVerified':m.get('nativeBrowserVerified',False),'nativeLogPlaybackVerified':m.get('nativeLogPlaybackVerified',False),'recordedRounds':m.get('recordedRounds'),'fullResult':m.get('fullResult'),'excerpt':m.get('excerpt'),'runtimeErrors':m.get('runtimeErrors'),'runtimeErrorMonitoringRecorded':('runtimeErrors'in m),'endPortraitHp':m.get('endPortraitHp'),'codeChecks':codechecks,'video':{'codec':v['codec_name'],'width':v['width'],'height':v['height'],'frameRate':v['r_frame_rate'],'averageFrameRate':v['avg_frame_rate'],'frames':frames},'audio':{'codec':a['codec_name'],'sampleRate':a['sample_rate'],'channels':a['channels'],'samples':samples},'wholeFrameSampleClock':{'passed':True,'samplesPerFrame':1600,'frames':frames,'samples':samples},'images':images,'normalization':norm,'fullDecode':{'passed':True,'command':'ffmpeg -v error -xerror -threads 2 -i source.mov -f null -','exitCode':0}}
 report['captures'].append(rec)
(O/'research/capture-source-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('ALL3 CAPTURE QA PASSED')
