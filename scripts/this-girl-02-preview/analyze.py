from pathlib import Path
import json,gzip,hashlib,math
import numpy as np
from scipy.stats import norm,binomtest
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/this-girl-02-preview/research';lock=json.loads((O/'confirmation-lock.json').read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();h=sha(O/'confirmation-lock.json');rng=np.random.default_rng(2026110402)
def wilson(k,n,alpha=.05):
 z=norm.ppf(1-alpha/2);p=k/n;den=1+z*z/n;mid=(p+z*z/(2*n))/den;r=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;return[max(0,mid-r),min(1,mid+r)]
def summary(rows):
 n=len(rows);return{'n':n,'wins':sum(r['win']for r in rows),'winRate':sum(r['win']for r in rows)/n,'winWilson95':wilson(sum(r['win']for r in rows),n),'meanCappedRounds':float(np.mean([r['cappedRounds']for r in rows])),'meanPotions':float(np.mean([r['pots']for r in rows])),'fourAliveWins':sum(r['fullAliveWin']for r in rows),'meanMendUses':float(np.mean([r['mendUses']for r in rows])),'meanMendHealing':float(np.mean([r['mendHealing']for r in rows])),'meanBarrierSpent':float(np.mean([r['mendBarrierSpent']for r in rows]))}
def compare(a,b):
 assert[a['seed']for a in a]==[b['seed']for b in b];n=len(a);aw=np.array([r['win']for r in a],int);bw=np.array([r['win']for r in b],int);onlya=int(((aw==1)&(bw==0)).sum());onlyb=int(((aw==0)&(bw==1)).sum());sa=summary(a);sb=summary(b);ciA=wilson(sa['wins'],n,.05/24);ciB=wilson(sb['wins'],n,.05/24);delta={}
 indices=rng.integers(0,n,(3000,n))
 for key in ['cappedRounds','pots','survivors']:
  d=np.array([x[key]-y[key]for x,y in zip(a,b)],float);samples=d[indices].mean(axis=1);delta[key]={'mean':float(d.mean()),'bootstrap95':[float(x)for x in np.quantile(samples,[.025,.975])]}
 return{'left':sa,'right':sb,'winDelta':float((aw-bw).mean()),'familyConservativeWinDeltaCI':[ciA[0]-ciB[1],ciA[1]-ciB[0]],'observedOnlyLeftWins':onlya,'observedOnlyRightWins':onlyb,'pairedWinP':float(binomtest(onlya,onlya+onlyb).pvalue)if onlya+onlyb else 1.,'delta':delta,'scope':'Paired256 seeds. Conservative simultaneous Wilson-envelope primary win interval. Secondary percentile bootstrap is descriptive, not a global superiority certificate.'}
cases=[];allInputs={}
for spec in lock['cases']:
 p=O/'confirmation'/(spec['id']+'.json.gz');d=json.loads(gzip.decompress(p.read_bytes()));assert d['lockSha']==h;arms=d['arms'];expected=[x['applicationSeed']for x in lock['seedMap']]
 for name,a in arms.items():
  rows=a['rows'];assert len(rows)==256 and[r['seed']for r in rows]==expected and len(set(expected))==256
  assert all(0<=r['pots']<=5 and 0<=r['survivors']<=4 and r['mendBarrierSpent']>=0 and r['mendHealing']>=0 for r in rows)
  if name=='E':assert all(r['mendUses']==r['mendHealing']==r['mendBarrierSpent']==0 for r in rows)
 c={**spec,'summaries':{k:summary(a['rows'])for k,a in arms.items()},'M-A':compare(arms['M']['rows'],arms['A']['rows']),'M-E':compare(arms['M']['rows'],arms['E']['rows']),'MF-AF':compare(arms['MF']['rows'],arms['AF']['rows'])};cases.append(c);allInputs[str(p.relative_to(ROOT))]=sha(p)
ps=sorted(enumerate([c['M-A']['pairedWinP']for c in cases]),key=lambda x:x[1]);running=0
for rank,(idx,p)in enumerate(ps):running=max(running,min(1,p*(12-rank)));cases[idx]['M-A']['holmPairedWinP']=running
result={'episode':'THIS-GIRL-002','passedDataValidation':True,'lockSha256':h,'inputs':allInputs,'cases':cases,'seedCountPerCondition':256,'distinctHeldoutSeeds':256,'independence':'Arms paired; same seed panel reused across cases, NOT15360 independent observations. Holm permits dependent primary tests.','secondaryIntervalPolicy':'Bootstrap secondary intervals are descriptive. No overall award based on exploratory metric selection.'};(O/'analysis').mkdir(exist_ok=True);(O/'analysis/main.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('CASE\tMwin\tAwin\tMmed\tAmed\tEwin\tEmed\tMrecycle')
for c in cases:
 s=c['summaries'];print(c['id'],s['M']['wins'],s['A']['wins'],round(s['M']['meanPotions'],3),round(s['A']['meanPotions'],3),s['E']['wins'],round(s['E']['meanPotions'],3),round(s['M']['meanMendUses'],2),sep='\t')
