"""Package only the checked episode. Preserve calibrated PCM MOV bytes and split ZIPs below GitHub limits."""
from pathlib import Path
import argparse,csv,hashlib,json,math,shutil,subprocess,urllib.parse,zipfile
ROOT=Path(__file__).resolve().parents[2]
O=ROOT/'artifacts/build-diary-01';D=O/'delivery';SCRIPT=Path(__file__).resolve().parent
GAME='489d5a4b15f02385c7229a2b2ff29f76da0abf44'
REPO='ffuwa564-gif/Finit-battle-no-more'
MOV=D/'STILLVEIL-BuildResearchDiary-01.mp4'
LIMIT=100*1024*1024;ZIP_RAW_BUDGET=90*1024*1024
NAMES={'z':'ずんだもん','m':'四国めたん','t':'春日部つむぎ'}
FINAL_CHECKS=['Finished-Movie-Sync.json','Decode-Validation.json','Validation.json','Visual-QC.json','Manual-Visual-Review.json','Roster-Coverage.json']
RAW_ASSETS=['t-research-happy.png','t-research-think.png','t-research-determined.png','t-research-care.png','research-lab.png','thumbnail-original.png','z-happy.png','z-panic.png','m-happy.png','m-deadpan.png']

def sha(p):
 h=hashlib.sha256()
 with open(p,'rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def read(p):return json.loads(Path(p).read_text())
def write(p,data):Path(p).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def path(value):
 p=Path(value);p=p if p.is_absolute()else ROOT/p
 if p.is_relative_to(ROOT):return p
 for area in ['capture','render','speech','proofs','delivery']:
  physical=(O/area).resolve()
  if p.is_relative_to(physical):return O/area/p.relative_to(physical)
 raise ValueError('Input outside the project/task media roots: '+str(value))
def rel(p):return str(path(p).relative_to(ROOT))
def safe_file(p):
 p=path(p);assert p.is_file(),'Missing input: '+str(p)
 actual=p.resolve();allowed=[ROOT]+[(O/x).resolve()for x in ['capture','render','speech','proofs','delivery']]
 assert any(actual.is_relative_to(a)for a in allowed),'Unapproved source symlink: '+str(p)
 assert not any(x in p.parts for x in ['__pycache__','.git','node_modules'])
 return p

def stamp(t):
 n=int(t);return f'{n//60:02d}:{n%60:02d}'
def srt(t):
 n=round(t*1000);return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}'
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
def snapshot(files):return{rel(p):{'sha256':sha(p),'bytes':p.stat().st_size}for p in sorted(set(files))}

def validate_inputs():
 assert MOV.is_file(),'Finished movie is not ready';assert MOV.stat().st_size<LIMIT,'MP4 exceeds GitHub100MiB; re-export, then repeat every finished-file check'
 finished=sha(MOV);checks={}
 for name in FINAL_CHECKS:
  r=read(safe_file(D/name));assert r.get('passed')is True and r.get('finishedSha256')==finished,name+' must pass for this exact MP4';checks[name]=r
 registry=read(safe_file(O/'registry.json'));gems=read(safe_file(O/'gem-audit.json'))
 assert registry['finalized']and registry['evidenceCodeMatches']and registry['sourceTreeMatches']
 assert registry['sourceGameCommit']==GAME and registry['sourceAppVersion']=='1.11.0'
 assert gems['sourceGameCommit']==GAME and gems['evidenceCodeMatches']and gems['sourceTreeMatches']
 ids=[x['seriesId']for x in registry['entries']];assert len(ids)==len(set(ids))==registry['summary']['girlRegistrations']==72
 roster=checks['Roster-Coverage.json'];assert roster['registrySha256']==sha(O/'registry.json');assert set(roster['expectedSeriesIds'])==set(roster['shownSeriesIds'])==set(ids)
 assert not gems['liveCertifications'],'Episode1 does not claim live-game exclusive certification'
 for p in RAW_ASSETS:safe_file(O/'assets'/p)
 n=read(safe_file(O/'timeline-narration.json'));edits=read(safe_file(O/'edit-timeline.json'));safe_file(O/'mix-manifest.json');safe_file(O/'head-safety.json')
 assert n['sourceGameCommit']==GAME and n.get('appVersion','1.11.0')=='1.11.0'
 movie_probe=probe(MOV);v=next(x for x in movie_probe['streams']if x['codec_type']=='video');a=next(x for x in movie_probe['streams']if x['codec_type']=='audio')
 assert(v['width'],v['height'],v['r_frame_rate'])==(1920,1080,'30/1')and a['sample_rate']=='48000'
 assert abs(float(movie_probe['format']['duration'])-n['duration'])<.2
 for ch in n['chapters']:
  assert abs(ch['duration']*30-round(ch['duration']*30))<1e-5
  for line in ch['lines']:
   assert line['speaker']in NAMES and ch['start']-1e-5<=line['start']<line['end']<=ch['start']+ch['duration']+.02
   safe_file(path(line['wav']))
 manual=checks['Manual-Visual-Review.json'];assert manual.get('reviewer')and manual.get('reviewedAssets')and manual.get('contactSheetPaths')
 for p in manual['contactSheetPaths']:safe_file(path(p))
 source=read(safe_file(O/'research/source-game.json'));evidence=read(safe_file(O/'research/episode-evidence.json'))
 assert source['sourceGameCommit']==evidence['sourceMain']==GAME and source['appVersion']=='1.11.0'and evidence['passed']
 assert all(evidence['presentationChangeOnlyVerified'][k]for k in ['domainBehaviorFilesEqual','gameplayDefinitionsEqual','portraitHeadBoundsFitAllSupportedFrames'])
 for report_name in ['capture-source-qa.json','capture-cfr-normalization.json']:
  report=read(safe_file(O/'research'/report_name));assert report['passed'],report_name
  for capture in report['captures']:
   assert capture['passed']
   expected=capture.get('cleanSha256',capture.get('outputSha256'));assert expected==sha(safe_file(O/'capture'/(capture['id']+'.mov'))),report_name+' is stale'
 music=read(safe_file(O/'music-source.json'));assert sha(safe_file(O/'assets/opening-original.mp3'))==music['sha256']
 op=O/'render/opening';opinfo=read(safe_file(op/'provenance.json'));opqc=read(safe_file(op/'Opening-QC.json'));safe_file(op/'opening.mov')
 assert opinfo['passed']and opqc['passed']and opinfo['openingMovSha256']==opqc['openingMovSha256']==sha(op/'opening.mov')
 # Research media has no new gameplay changes in the working tree.
 assert subprocess.run(['git','diff','--quiet',GAME,'--','src'],cwd=ROOT).returncode==0,'Live src differs from the pinned portrait-fix release'
 return finished,n,edits,registry,gems,checks

def external_assets(registry):
 files={}
 for row in registry['entries']:
  name='public/'+row['artPath'];p=safe_file(ROOT/name);assert sha(p)==row['artSha256'],name
  entry=files.setdefault(name,{'path':name,'sha256':row['artSha256'],'url':f'https://raw.githubusercontent.com/{REPO}/{GAME}/'+urllib.parse.quote(name,safe='/'),'seriesIds':[]})
  assert entry['sha256']==row['artSha256'];entry['seriesIds'].append(row['seriesId'])
 body=safe_file(ROOT/'public/audio/fjordnosundakaze.mp3')
 return{'gameSourceCommit':GAME,'purpose':'Restore the72 original girl registrations without duplicating their game artwork in production ZIPs. Character forms may share a source file.','girlRegistrations':72,'artFiles':list(files.values()),'bodyMusic':{'path':'public/audio/fjordnosundakaze.mp3','sha256':sha(body),'obtainManually':True,'officialPage':'https://amachamusic.chagasi.com/music_fjordnosundakaze.html','reason':'Licensed source music and music-only episode mixes are deliberately excluded from the ZIP. Use the approved repository copy or obtain the track from its official distribution page.'}}

def source_media(edits):
 files={O/'render/opening/opening.mov'}
 for row in edits:
  src=safe_file(path(row['source']));assert src.is_relative_to(O/'capture')or src.is_relative_to(O/'render'),'Old-episode footage is not current1.11 capture';files.add(src)
 details=[]
 for src in sorted(files):
  p=probe(src);v=next(x for x in p['streams']if x['codec_type']=='video');assert v['r_frame_rate']=='30/1',str(src)
  audio=[x for x in p['streams']if x['codec_type']=='audio']
  if audio:assert all(x['sample_rate']=='48000'and x['codec_name'].startswith('pcm_')for x in audio),'Editing sources must retain48kHz PCM'
  d={'path':rel(src),'sha256':sha(src),'bytes':src.stat().st_size,'preservation':'Exact original bytes: no remux, re-encode or timebase change','streams':[{k:x.get(k)for k in ['codec_type','codec_name','r_frame_rate','sample_rate','channels','nb_frames','duration']}for x in p['streams']]}
  if src.is_relative_to(O/'capture'):
   meta=read(safe_file(src.with_suffix('.json')));assert meta['calibration']['passed']and meta['cleanSha256']==d['sha256'];assert meta.get('nativeBrowserVerified')or meta.get('nativeLogPlaybackVerified')
   d.update(kind='current-app'if meta.get('nativeBrowserVerified')else'LAB-log-playback',captureMetadata=rel(src.with_suffix('.json')));files.add(src.with_suffix('.json'))
  else:d['kind']='series-opening'if src.name=='opening.mov'else'generated-episode-component'
  details.append(d)
 normalization=read(safe_file(O/'research/capture-cfr-normalization.json'));assert normalization['passed']
 for item in normalization['captures']:
  for field in ['originalMovie','originalMetadata']:
   original=safe_file(path(item[field]));files.add(original)
   if field=='originalMovie':
    assert sha(original)==item['inputSha256'];details.append({'path':rel(original),'sha256':sha(original),'bytes':original.stat().st_size,'kind':'pre-normalization-original','preservation':'Original calibrated capture before CFR normalization; retained for complete processing provenance'})
 return sorted(files),details

def write_editorial(n,registry):
 lines=[l for c in n['chapters']for l in c['lines']];chapters='\n'.join(stamp(c['start'])+' '+c['title']for c in n['chapters'])+'\n'
 (D/'Script.md').write_text('# ビルド研究日誌 #01 — みんなが輝くRPGを！\n\n'+'\n\n'.join('## '+c['title']+'\n\n'+'\n\n'.join(NAMES[l['speaker']]+'：'+l['text']for l in c['lines'])for c in n['chapters']))
 (D/'Subtitles-ja.srt').write_text('\n\n'.join(f"{i+1}\n{srt(l['start'])} --> {srt(l['end'])}\n{l['text']}"for i,l in enumerate(lines))+'\n');(D/'Chapters.txt').write_text(chapters)
 for src,dst in [('registry.json','Character-Registry.json'),('gem-audit.json','Gem-Audit.json'),('timeline-narration.json','Narration-Timeline.json'),('edit-timeline.json','Edit-Timeline.json'),('mix-manifest.json','Mix-Manifest.json'),('head-safety.json','Head-Safety.json'),('music-source.json','Music-Source.json')]:shutil.copy2(O/src,D/dst)
 shutil.copy2(O/'assets/artwork-provenance.json',D/'Artwork-Provenance.json');shutil.copy2(O/'research/source-game.json',D/'Game-Source.json');shutil.copy2(O/'research/episode-evidence.json',D/'Evidence-Review.json')
 for name in ['Credits','Methods','Reproduce']:(D/(name+'.md')).write_text((SCRIPT/'delivery-templates'/(name+'.txt')).read_text())
 summary=registry['summary'];description=(SCRIPT/'delivery-templates/YouTube-Description.txt').read_text();description=description.replace('@@CHAPTERS@@',chapters).replace('@@GIRL_FORMS@@',str(summary['girlRegistrations'])).replace('@@CANONICAL_GIRLS@@',str(summary['canonicalGirls']))
 assert '@@'not in description;(D/'YouTube-Description.txt').write_text(description)
 from PIL import Image,ImageOps
 im=Image.open(O/'assets/thumbnail-original.png').convert('RGB');thumb=Image.new('RGB',(1280,720),'#fffaf4');im=ImageOps.contain(im,(1280,720),Image.Resampling.LANCZOS);thumb.paste(im,((1280-im.width)//2,(720-im.height)//2));thumb.save(D/'Thumbnail-BuildResearchDiary-01.jpg',quality=95)


def production_files(n,manual):
 files=set()
 for folder in [SCRIPT,ROOT/'scripts/ruka-build-research',ROOT/'docs/media/build-research-diary',ROOT/'docs/research/ruka-exclusive-build',ROOT/'tools/media-sync']:
  for p in folder.rglob('*'):
   if p.is_file()and'__pycache__'not in p.parts and p.suffix not in ['.pyc','.log']:files.add(p)
 for name in ['core.ts','native.ts']:files.add(ROOT/'scripts/diary-part3'/name)
 for name in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','AGENTS.md','docs/media-sync.md']:files.add(ROOT/name)
 files.update(O.glob('*.json'));files.update(O.glob('*.csv'));files.update((O/'research').glob('*.json'));files.update((O/'proofs').glob('*'))
 for p in(O/'assets').iterdir():
  if p.is_file()and p.suffix.lower()in['.png','.jpg','.jpeg','.webp','.json','.txt']:files.add(p)
 files.add(O/'assets/opening-original.mp3')
 for c in n['chapters']:
  for l in c['lines']:
   p=safe_file(path(l['wav']));files.add(p)
   key=p.with_suffix('.key')
   if key.exists():files.add(key)
 for pattern in ['*-scene-*.png','*.ass','*-visual.json']:
  files.update((O/'render').glob(pattern))
 for folder in ['charts','figures']:
  if(O/folder).exists():files.update(p for p in(O/folder).rglob('*')if p.is_file())
 for p in(O/'render/opening').glob('*.json'):files.add(p)
 # Older paths used by a frozen OP remain exact dependencies, even when the main edit uses the new assets folder.
 for name in read(O/'render/opening/provenance.json').get('inputs',{}):
  p=Path(name)
  if not p.is_absolute()and name.startswith('artifacts/')and p.suffix.lower()in['.png','.jpg','.webp','.json']:files.add(ROOT/p)
 for p in manual['contactSheetPaths']:files.add(path(p))
 # Public editorial/QC metadata is also available inside the production archive.
 for p in D.iterdir():
  if p.is_file()and p.suffix in['.json','.md','.txt','.srt','.csv']and p.name not in['SHA256SUMS.txt','Packaging-Manifest.json','Material-Archives.json','Production-Inputs.json','README.md']:files.add(p)
 return sorted(safe_file(p)for p in files if p.is_file())

def split_archives(prefix,files):
 entries=[(p,rel(p))for p in sorted(set(files))];groups=[];group=[];size=0
 for p,name in entries:
  weight=p.stat().st_size+512+len(name.encode())*2
  assert weight<ZIP_RAW_BUDGET,'Single source exceeds90MiB ZIP budget: '+str(p)
  if group and size+weight>ZIP_RAW_BUDGET:groups.append(group);group=[];size=0
  group.append((p,name));size+=weight
 if group:groups.append(group)
 assert groups,prefix+' has no inputs';outputs=[]
 for index,group in enumerate(groups):
  name=prefix+('.zip'if len(groups)==1 else f'-{index+1:02d}.zip');out=D/name;partial=out.with_suffix('.zip.partial')
  with zipfile.ZipFile(partial,'w',zipfile.ZIP_DEFLATED,compresslevel=3)as z:
   for p,arc in group:z.write(p,arc)
  with zipfile.ZipFile(partial)as z:assert z.testzip()is None
  assert partial.stat().st_size<LIMIT,name+' exceeds GitHub100MiB';partial.replace(out)
  outputs.append({'file':name,'bytes':out.stat().st_size,'sha256':sha(out),'members':[arc for p,arc in group]})
 return outputs

def pack(check_only=False):
 finished,n,edits,registry,gems,checks=validate_inputs()
 code_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
 if check_only:print('PACKAGE INPUTS VALID',finished);return
 D.mkdir(exist_ok=True);external=external_assets(registry);write(D/'External-Assets.json',external);write_editorial(n,registry)
 recordings,recordingInfo=source_media(edits);write(D/'Recording-Sources.json',{'format':'Original calibrated PCM MOV and generated sources, exact bytes','sources':recordingInfo})
 sources=production_files(n,checks['Manual-Visual-Review.json']);inputs=snapshot([MOV,*sources,*recordings]);write(D/'Production-Inputs.json',{'finishedSha256':finished,'sourceCodeCommit':code_commit,'inputs':inputs,'restoration':'Extract every Production-Materials*.zip and Recording-Sources*.zip into the source-branch repository root.'});sources.append(D/'Production-Inputs.json')
 # Remove only archives recorded as outputs of a previous invocation of this task.
 prior=D/'Material-Archives.json'
 if prior.exists():
  for a in read(prior)['archives']:
   p=D/a['file'];assert p.name.startswith(('Production-Materials','Recording-Sources'))and p.suffix=='.zip'
   if p.exists():assert sha(p)==a['sha256'],'Previous archive was edited: '+p.name;p.unlink()
 archives=split_archives('Production-Materials',sources)+split_archives('Recording-Sources',recordings)
 assert inputs==snapshot([path(p)for p in inputs]),'Inputs changed during packaging; regenerate from the final frozen inputs'
 write(D/'Material-Archives.json',{'archives':archives,'note':'Every ZIP is below100MiB. Extract ALL parts into the same repository root; these are separate whole-file archives, not byte-split segments.'})
 links='\n'.join(f"- [{a['file']}]({a['file']}) ({a['bytes']/1048576:.1f} MiB)"for a in archives)
 readme=(SCRIPT/'delivery-templates/README.txt').read_text().replace('@@DURATION@@',stamp(n['duration'])).replace('@@CODE_COMMIT@@',code_commit).replace('@@ARCHIVES@@',links);assert '@@'not in readme;(D/'README.md').write_text(readme)
 files=[p.name for p in D.iterdir()if p.is_file()and not p.name.endswith('.partial')];public=sorted(set(files+['Packaging-Manifest.json','SHA256SUMS.txt']))
 write(D/'Packaging-Manifest.json',{'passed':True,'finishedSha256':finished,'sourceGameCommit':GAME,'sourceCodeCommit':code_commit,'sourceBranch':'video/build-research-diary-01','mediaBranch':'downloads/build-research-diary-01','inputs':inputs,'archives':archives,'publicFiles':public,'gameSrcUnchangedFromPinnedRelease':True})
 assert all((D/name).stat().st_size<LIMIT for name in public if name!='SHA256SUMS.txt')
 (D/'SHA256SUMS.txt').write_text(''.join(sha(D/name)+'  '+name+'\n'for name in public if name!='SHA256SUMS.txt'))
 print('PACKAGED',stamp(n['duration']),finished,[(x['file'],round(x['bytes']/1048576,2))for x in archives])

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check-inputs',action='store_true');args=parser.parse_args();pack(args.check_inputs)
