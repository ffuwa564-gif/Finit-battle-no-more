from pathlib import Path
import json,gzip,hashlib,math
import numpy as np
from scipy.stats import binomtest,norm
ROOT=Path(__file__).resolve().parents[2];R=ROOT/'artifacts/this-girl-05/research';lock=json.load(open(R/'confirmation-lock.json'));digest=hashlib.sha256((R/'confirmation-lock.json').read_bytes()).hexdigest();rng=np.random.default_rng(2026110505);cases=[];pool=[]
def summary(rows):
 n=len(rows);wins=sum(x['win']for x in rows);p=wins/n;z=1.96;mid=(p+z*z/(2*n))/(1+z*z/n);rad=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/(1+z*z/n)
 return dict(n=n,wins=wins,winRate=p,winWilson95=[max(0,mid-rad),min(1,mid+rad)],fourAliveWins=sum(x['fullAliveWin']for x in rows),**{out:float(np.mean([x[k]for x in rows]))for k,out in [('cappedRounds','meanCappedRounds'),('pots','meanPotions'),('survivors','meanSurvivors'),('strikes','meanStrikes'),('strikeDamage','meanStrikeDamage'),('dispelUses','meanDispelUses')]})
def compare(a,b,primary):
 assert[x['seed']for x in a]==[x['seed']for x in b];delta={};inds=rng.integers(0,len(a),(2400,len(a)))
 for key in ['win','fullAliveWin','cappedRounds','pots']:
  x=np.array([float(l[key])-float(r[key])for l,r in zip(a,b)]);v={'mean':float(x.mean()),'bootstrap95':[float(v)for v in np.quantile(x[inds].mean(axis=1),[.025,.975])]}
  if primary:
   if key in ['win','fullAliveWin']:
    p=int((x>0).sum());n=int((x<0).sum());v['pairedP']=float(binomtest(p,p+n).pvalue)if p+n else 1
   elif np.any(x):
    signs=rng.choice(np.array([-1,1],np.int8),size=(10000,len(x)));v['pairedP']=float((1+np.sum(np.abs((signs@x)/len(x))>=abs(x.mean())-1e-12))/10001)
   else:v['pairedP']=1
  delta[key]=v
 return{'delta':delta}
for spec in lock['cases']:
 d=json.load(gzip.open(R/'confirmation'/(spec['id']+'.json.gz')));assert d['lockSha']==digest;arms=d['arms'];expected=[x['applicationSeed']for x in lock['seedMap']]
 for name,a in arms.items():
  assert len(a['rows'])==256 and[x['seed']for x in a['rows']]==expected
  assert all(0<=x['pots']<=5 and 0<=x['survivors']<=4 and x['strikes']>=0 and x['strikeDamage']>=0 for x in a['rows'])
 assert arms['X']['rows']==arms['E']['rows'];assert all(x['strikes']==0 for name in ['B','X','E']for x in arms[name]['rows'])
 c={**spec,'summaries':{k:summary(a['rows'])for k,a in arms.items()}}
 for other in [k for k in arms if k!='C']:
  c['C-'+other]=compare(arms['C']['rows'],arms[other]['rows'],other in ['B','X'])
  if other in ['B','X']:
   for key,v in c['C-'+other]['delta'].items():pool.append((v['pairedP'],len(cases),'C-'+other,key))
 cases.append(c)
running=0
for i,(p,case,contrast,key)in enumerate(sorted(pool)):
 running=max(running,min(1,p*(len(pool)-i)));cases[case][contrast]['delta'][key]['holm144P']=running
witnesses=[]
for c in cases:
 reasons=[]
 for contrast in ['C-B','C-X']:
  d=c[contrast]['delta'];safe=d['win']['mean']>=-.02 and d['fullAliveWin']['mean']>=-.05
  good=[]
  if safe and d['cappedRounds']['mean']<=-.25 and d['cappedRounds']['holm144P']<.05 and d['pots']['mean']<=.2:good.append('rounds')
  if safe and d['pots']['mean']<=-.15 and d['pots']['holm144P']<.05 and d['cappedRounds']['mean']<=.5:good.append('medicine')
  if safe and d['fullAliveWin']['mean']>=.05 and d['fullAliveWin']['holm144P']<.05 and d['pots']['mean']<=.2 and d['cappedRounds']['mean']<=.5:good.append('survival')
  reasons.append(good)
 if all(reasons)and c['summaries']['C']['meanStrikes']>0:witnesses.append({'caseId':c['id'],'C-B':reasons[0],'C-X':reasons[1]})
report={'episode':'THIS-GIRL-005','passedDataValidation':True,'lockSha256':digest,'nPerCondition':256,'cases':cases,'adoption':{'passed':bool(witnesses),'scope':'Scoped conditional-counterblade adoption only; no all-roster/endgame certification','witnesses':witnesses},'statistics':'Paired common inputs. Descriptive bootstrap95. Holm144 over18conditions x2primarycontrasts x4metrics. Exact binary McNemar or deterministic10000draw paired sign-flip; observed effect size not a population lower bound.','uncertainty':'Finite selected configurations and alternatives; not global optimum. All observed regressions/inactive conditions retained.'};(R/'analysis').mkdir(exist_ok=True);(R/'analysis/main.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('ADOPTION',report['adoption'])
for c in cases:print(c['id'],{k:(a['wins'],round(a['meanCappedRounds'],3),round(a['meanPotions'],3),round(a['meanStrikeDamage'],1))for k,a in c['summaries'].items()if k in ['C','B','A','X']})
