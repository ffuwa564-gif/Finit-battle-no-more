"""Finalize Part4 only after its registry, capture edits and research inputs are reviewed.

The episode-specific configuration is an artifact, not a fallback to Part3 edits.
"""
from pathlib import Path
import json,hashlib,math
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-04';EPISODE='BRD-004'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def build():
 config_path=O/'render-plan-config.json';assert config_path.exists(),'Await reviewed Part4 render-plan-config.json'
 cfg=json.loads(config_path.read_text());assert cfg.get('finalized')is True and cfg.get('episode')==EPISODE
 reg=json.loads((O/'registry.json').read_text());assert reg['finalized']and reg.get('episode')==EPISODE
 preview=reg['nextEpisodePreview'];assert preview['newCertificationGranted']is False
 specs=cfg['clips'];assert len(specs)==4,'Four major cuts are required'
 source_ids={v['sourceId']for v in specs.values()};assert len(source_ids)==3,'Use native, failure and shared success source'
 metas={name:json.loads((O/'capture'/f'{name}.json').read_text())for name in source_ids};clips={}
 for key,spec in specs.items():
  name=spec['sourceId'];m=metas[name];a,b=m['gameplayWindow'];start=spec.get('sourceStart',math.ceil(a*30)/30);end=spec.get('sourceEnd',math.floor(b*30)/30)
  for field in ['startRound','endRound']:
   if field in spec:
    time=next(v['time']-m['initialOffset']for v in m['marks']if v['kind']=='round'and v['round']==spec[field]);time=round(time*30)/30
    if field=='startRound':start=time
    else:end=time
  assert end>start>=0 and all(abs(t*30-round(t*30))<1e-5 for t in [start,end]),('Invalid frame-clock edit',key)
  lab=bool(spec.get('logPlayback'));label=spec.get('shortLabel','研究試作・実ログ再生'if lab else'最新版1.11・比較用所持データ');assert '\n'not in label
  clips[key]={**spec,'sourceStart':start,'sourceEnd':end,'sourceSha256':sha(O/'capture'/f'{name}.mov'),'shortLabel':label,'sourceApplicationSpeed':spec.get('sourceApplicationSpeed',1 if lab else m.get('applicationSpeed',2))}
 left,right=cfg.get('mainClipKeys',['lab-victory-a','lab-victory-b']);assert clips[left]['sourceId']==clips[right]['sourceId']and clips[left]['sourceEnd']<=clips[right]['sourceStart'],'Success excerpts must be chronological'
 main_gap=clips[right]['sourceStart']-clips[left]['sourceEnd']
 if main_gap>0:
  assert cfg.get('allowMainGap')is True and cfg.get('omittedRounds'),'Declare the omitted source interval'
  assert all('省略'in clips[key].get('disclosure','')for key in [left,right]),'Both success excerpts must disclose the omission'
 research_paths=cfg['researchPaths'];assert research_paths,'Enumerate the current evidence, review, mathematical and code inputs'
 research={name:sha(ROOT/name)for name in research_paths};inputs=[Path(__file__),config_path,O/'registry.json',O/'gem-audit.json',*[O/'capture'/f'{name}.json'for name in source_ids]]
 inputs.extend(ROOT/name for name in cfg.get('timingInputs',[]))
 plan={'finalized':True,'episode':EPISODE,'header':'#04 フィオ／その余りを、次の誰かへ。','subjectId':'fio','rosterTargetSeconds':55,'rosterHook':'余った回復は、どんな勝ち筋になる？','insertOpAfter':'roster','templateCommit':cfg['templateCommit'],'clips':clips,'lineOrder':cfg.get('lineOrder',{}),'chapterTargetSeconds':{'next-episode':cfg.get('previewTargetSeconds',37)},'nextEpisodePreview':{'chapter':'next-episode','characterId':preview['characterId'],'seriesId':preview['seriesId'],'status':'unverified','question':preview['question'],'newCertificationGranted':False},'reactions':cfg.get('reactions',[]),'eventLabels':cfg.get('eventLabels',[]),'requiredCoverage':{'gameCutCount':4,'gameAnchorsPerCut':3,'openingAnchors':3,'voiceSpeakers':['t','z','m'],'voiceAnchorsPerSpeaker':3,'musicAnchors':3,'rosterForms':72,'nextEpisodePreview':True},'researchInputs':research,'inputHashes':{str(p.relative_to(ROOT)):sha(p)for p in inputs},'mainSourceGapSeconds':main_gap,'omittedRounds':cfg.get('omittedRounds',[]),'editorialRule':'Each cut preserves the same native video/audio clock. Any gap between success excerpts is explicitly disclosed and the full source remains available. Exact event speech is used only with a natural prefix; other approved speech remains an explicit retrospective explanation.'}
 assert len(plan['reactions'])==3,'Declare three actual-event speech references'
 (O/'render-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2));print('PART4 PLAN READY',len(research),'reviewed inputs')
if __name__=='__main__':build()
