"""Frozen two-process chapter scheduler; project renderer is unmodified."""
from pathlib import Path
import sys,json,hashlib,concurrent.futures,math
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/build-diary-03'))
import render as r

def worker(item):
 ch,row,assetnames=item
 r.render_chapter(ch,row,[ROOT/p for p in assetnames]);return ch['id']

def main():
 n,rows=r.prepare_timeline();roster=next(c for c in n['chapters']if c['id']=='roster');from roster import render_roster;render_roster(roster['duration'])
 prefile=r.R/'roster-prerender-chapter.json'
 if prefile.exists():assert json.loads(prefile.read_text())==roster,'Pre-rendered roster differs from final narration'
 from PIL import Image
 assets=[]
 for id in ['z-happy','z-panic','m-happy','m-deadpan','t-research-happy','t-research-think','t-research-determined','t-research-care']:
  p=r.O/'assets'/(id+'-avatar.png');r.avatar(id,p);assets.append(p)
 p=r.O/'assets/blank-avatar.png';Image.new('RGBA',(320,440)).save(p);assets.append(p)
 captures=sorted({ROOT/row['source']for row in rows})
 for source in captures:r.validate_capture(source)
 registry=json.loads((r.O/'registry.json').read_text());sources=[*r.CODE,ROOT/'scripts/build-diary-03/synth.py',ROOT/'scripts/build-diary-03/opening.py',ROOT/'scripts/build-diary-03/opening_visuals.py',r.O/'narration.json',r.O/'render-plan.json',r.O/'asset-reuse.json',r.O/'registry.json',r.O/'timeline-narration.json',r.O/'event-cues.json',ROOT/'public/audio/fjordnosundakaze.mp3',r.R/'opening/opening.mov',r.R/'opening/provenance.json',r.R/'roster-background.mp4',r.R/'roster-background.json',Path(__file__)]
 sources += [ROOT/l['wav']for c in n['chapters']for l in c['lines']]
 sources += [ROOT/'public'/e['artPath']for e in registry['entries']]
 sources += list((r.O/'assets').glob('*.png'))
 sources += [p for source in captures for p in [source,source.with_suffix('.json')]]
 sources += [ROOT/name for name in r.render_plan().get('inputHashes',{})]
 sources += [r.O/'roster-ready.json',r.O/'gem-audit.json',r.O/'assets/artwork-provenance.json',r.O/'assets/reused-artwork-provenance.json',r.O/'music-source.json',r.R/'opening/Opening-QC.json']
 # The finalized plan enumerates this episode's research and mathematical sidecars.
 research_inputs=r.render_plan().get('researchInputs',{})
 assert research_inputs,'Finalized Part3 plan must enumerate its reviewed researchInputs'
 for name,digest in research_inputs.items():
  p=ROOT/name;assert r.sha256(p)==digest,('Research proof changed',name);sources.append(p)
 sources += [r.O/'proofs/live-ione.json.gz',r.O/'research/independent-preview-review.json']
 for source in captures:
  meta=json.loads(source.with_suffix('.json').read_text())
  if meta.get('sourceLog'):sources.append(ROOT/meta['sourceLog'])
 assert all(p.exists()for p in sources),'A finalized source or research proof is missing'
 frozen={str(p):r.sha256(p)for p in sorted(set(sources))};manifest={'inputs':frozen,'codeHashes':r.CODE_HASHES,'timelineSha256':r.sha256(r.O/'timeline-narration.json'),'editConditions':rows,'frames':round(n['duration']*30),'duration':n['duration'],'workers':2,'rule':'Freeze before scheduling; workers edit only their distinct chapter outputs; build() joins only after all workers finish.'};(r.O/'render-input-freeze.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 by={v['chapter']:v for v in rows};assetnames=[str(p.relative_to(ROOT))for p in assets];jobs=[(ch,by.get(ch['id']),assetnames)for ch in n['chapters']if ch['id']!='series-op']
 print('FROZEN',n['duration'],'seconds',len(jobs),'chapters',len(frozen),'inputs',flush=True)
 with concurrent.futures.ProcessPoolExecutor(max_workers=2)as ex:
  for id in ex.map(worker,jobs):print('CHAPTER COMPLETE',id,flush=True)
 for p,h in frozen.items():assert r.sha256(p)==h,('Input changed before final mux',p)
 r.build()
 for p,h in frozen.items():assert r.sha256(p)==h,('Input changed during final mux',p)
 manifest['inputsUnchangedAfterRender']=True;manifest['finishedSha256']=r.sha256(r.O/'delivery/STILLVEIL-BuildResearchDiary-03.mp4');(r.O/'render-input-freeze.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print('FINAL INPUT FREEZE PASSED',manifest['finishedSha256'],flush=True)
if __name__=='__main__':main()
