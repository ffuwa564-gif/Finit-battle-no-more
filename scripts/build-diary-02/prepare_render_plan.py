"""Bind reviewed episode excerpts and reactions to observed native log times."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-02'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def frame(t):return round(t*30)/30
def main():
 metas={s:read(O/'capture'/(s+'.json'))for s in ['live-neri','lab-victory','lab-counter']}
 for id,m in metas.items():assert m['calibration']['passed']and m['cleanSha256']==sha(O/'capture'/(id+'.mov'))
 def round_at(id,n):
  m=metas[id];return frame(next(v['time']-m['initialOffset']for v in m['marks']if v['kind']=='round'and v['round']==n))
 def event_at(id,needle,round):
  m=metas[id];return next(v['time']-m['initialOffset']for v in m['battleEvents']if v['round']==round and needle in v['event'].get('text',''))
 failure=read(O/'chapter-ready-failed-draft.json')['chapter'];prefix=sum(l['duration']for l in failure['lines'][:3]);leave=event_at('lab-counter','neriは過労で離脱',6)
 # Start within R5, with a natural one-second pause between the three setup lines.
 counter_start=frame(leave+.1-(.4+prefix+3));assert round_at('lab-counter',5)<=counter_start<round_at('lab-counter',6)
 def clip(id,chapter,start,end,disclosure,rounds,lab=True):return{'sourceId':id,'chapter':chapter,'sourceSha256':metas[id]['cleanSha256'],'sourceStart':frame(start),'sourceEnd':frame(end),'logPlayback':lab,'sourceApplicationSpeed':1 if lab else 2,'shortLabel':'研究試作・実ログ再生'if lab else'最新版1.11・比較用所持データ','disclosure':disclosure,'displayedRounds':rounds}
 win=metas['lab-victory'];live=metas['live-neri'];bad=metas['lab-counter']
 clips={'live-neri':clip('live-neri','neri-now',*live['gameplayWindow'],'現行1.11／研究用の比較所持データ・序盤3R',[1,3],False),'lab-never-self':clip('lab-counter','failed-draft',counter_start,bad['gameplayWindow'][1],'R5途中〜6抜粋／全記録12R・1人生存で護衛失敗',[5,6]),'lab-victory-a':clip('lab-victory','lab-victory-a',win['gameplayWindow'][0],round_at('lab-victory',6),'前半R1〜5／成功例seed1・T4',[1,5]),'lab-victory-b':clip('lab-victory','lab-victory-b',round_at('lab-victory',10),win['gameplayWindow'][1],'後半R10〜12抜粋／R6〜9を省略',[10,12])}
 coverage={'gameCutCount':4,'gameAnchorsPerCut':3,'openingAnchors':3,'voiceSpeakers':['t','z','m'],'voiceAnchorsPerSpeaker':3,'musicAnchors':3,'rosterForms':72}
 reactions=[{'chapter':'failed-draft','lineTextContains':'ここで、ネリが当番を降りる','event':{'textContains':'neriは過労で離脱','round':6},'offsetSeconds':.1,'maxPrefixSpacing':1.5},{'chapter':'lab-victory-a','lineTextContains':'ここが好きなんだ','event':{'textContains':'休番 — neri','round':5},'offsetSeconds':.1,'maxPrefixSpacing':1.5},{'chapter':'lab-victory-b','lineTextContains':'12ラウンドを終えて','event':{'textContains':'12Rの護衛任務を達成','round':12},'offsetSeconds':.1,'maxPrefixSpacing':1.5}]
 labels=[{'sourceId':'lab-counter','textContains':'neriは過労で離脱','round':6,'label':'ネリの休番が抜けていた'},{'sourceId':'lab-victory','textContains':'休番 — neri','label':'ネリにも、休む番'},{'sourceId':'lab-victory','textContains':'復帰 — neri','label':'ネリ、当番へ復帰'},{'sourceId':'lab-victory','textContains':'12Rの護衛任務を達成','round':12,'label':'12R・4人で帰還'}]
 plan={'finalized':True,'header':'#02 ネリ／休む順番を作戦に','subjectId':'neri','rosterTargetSeconds':55,'rosterHook':'Rの守り役に、代われない仕事を。','insertOpAfter':'roster','templateCommit':'209aad42ef6aa484cc52f44e9f3d3426eb8cf45c','clips':clips,'lineOrder':{},'reactions':reactions,'eventLabels':labels,'requiredCoverage':coverage,'editorialRule':'All twelve rounds remain in the source recording. The edited success sequence skipsR6–9 explicitly; no frozen gameplay tail. Source video and audio share each exact cut.','inputHashes':{str(p.relative_to(ROOT)):sha(p)for p in [Path(__file__),O/'chapter-ready-failed-draft.json',*[O/'capture'/(s+'.json')for s in metas]]}}
 (O/'render-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2));print('FINAL RENDER PLAN',[(k,v['sourceStart'],v['sourceEnd'])for k,v in clips.items()])
if __name__=='__main__':main()
