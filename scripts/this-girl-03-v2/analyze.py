from pathlib import Path
import json,gzip,hashlib,math
import numpy as np
from scipy.stats import norm,binomtest
ROOT=Path(__file__).resolve().parents[2];R=ROOT/'artifacts/this-girl-03-v2/research';lock=json.load(open(R/'confirmation-lock.json'));sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();digest=sha(R/'confirmation-lock.json');n=len(lock['seedMap']);rng=np.random.default_rng(202611040303)
def wilson(k,n,alpha=.05):
 z=norm.ppf(1-alpha/2);p=k/n;den=1+z*z/n;mid=(p+z*z/(2*n))/den;rad=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;return[max(0,mid-rad),min(1,mid+rad)]
def summary(rows):
 out={'n':len(rows),'wins':sum(x['win']for x in rows),'fourAliveWins':sum(x['fullAliveWin']for x in rows)};out.update(winRate=out['wins']/len(rows),winWilson95=wilson(out['wins'],len(rows)))
 for key,outkey in [('cappedRounds','meanCappedRounds'),('pots','meanPotions'),('survivors','meanSurvivors'),('jamUses','meanJamUses'),('jamExtended','meanJamExtended'),('diagnosisUses','meanDiagnosisUses'),('dampeningApplied','meanDampeningApplied'),('softenedAttacks','meanSoftenedAttacks'),('softenedHpDamage','meanSoftenedHpDamage'),('softenedAbsorbed','meanSoftenedAbsorbed')]:out[outkey]=float(np.mean([x[key]for x in rows]))
 return out
def compare(a,b,primary=False):
 assert[x['seed']for x in a]==[x['seed']for x in b];indices=rng.integers(0,len(a),(4000 if primary else 1200,len(a)));delta={}
 for key in ['win','fullAliveWin','cappedRounds','pots','survivors']:
  x=np.array([float(l[key])-float(r[key])for l,r in zip(a,b)]);means=x[indices].mean(axis=1);d={'mean':float(x.mean()),'bootstrap95':[float(x)for x in np.quantile(means,[.025,.975])]}
  if primary and key!='survivors':
   if key in ['win','fullAliveWin']:
    pos=int((x>0).sum());neg=int((x<0).sum());d['pairedP']=float(binomtest(pos,pos+neg).pvalue)if pos+neg else 1.;d['onlyLeft']=pos;d['onlyRight']=neg
   elif np.any(x):
    signs=rng.choice(np.array([-1,1],np.int8),size=(10000,len(a)));null=(signs@x)/len(a);d['pairedP']=float((1+np.sum(np.abs(null)>=abs(x.mean())-1e-12))/10001);d['method']='Two-sided paired sign-flip mean randomization;10000 deterministic MC draws.'
   else:d['pairedP']=1.
  delta[key]=d
 return{'delta':delta,'scope':'Paired common inputs; bootstrap intervals descriptive. C-B and C-X p values jointly corrected across12conditions x4metrics x2comparisons. Finite search, no global-optimality claim.'}
cases=[];inputs={};pool=[]
for spec in lock['cases']:
 p=R/'confirmation'/(spec['id']+'.json.gz');d=json.load(gzip.open(p));assert d['lockSha']==digest;arms=d['arms'];expected=[x['applicationSeed']for x in lock['seedMap']]
 for key,arm in arms.items():
  rows=arm['rows'];assert len(rows)==n and[x['seed']for x in rows]==expected;assert all(0<=x['pots']<=5 and 0<=x['survivors']<=4 and 0<=x['dampeningApplied']<=x['jamUses'] and x['softenedAttacks']>=0for x in rows)
  if key in ['B','X','E','J','A']:assert all(x['softenedAttacks']==0 for x in rows)
 assert arms['E']['rows']==arms['X']['rows'],'No-guard must match same-config public mechanism exactly'
 c={**spec,'summaries':{k:summary(v['rows'])for k,v in arms.items()},'C-B':compare(arms['C']['rows'],arms['B']['rows'],True)}
 for other in ['X','E','J','A',*(['G3','G4']if spec['tier']==6 else[])]:c['C-'+other]=compare(arms['C']['rows'],arms[other]['rows'],other=='X')
 for contrast in ['C-B','C-X']:
  for key in ['win','fullAliveWin','pots','cappedRounds']:pool.append((c[contrast]['delta'][key]['pairedP'],len(cases),contrast,key))
 cases.append(c);inputs[str(p.relative_to(ROOT))]=sha(p)
running=0
for i,(p,case,contrast,key)in enumerate(sorted(pool)):
 running=max(running,min(1,p*(len(pool)-i)));cases[case][contrast]['delta'][key]['holm96P']=running
def meaningful(d):
 safe=d['win']['mean']>=-.02 and d['fullAliveWin']['mean']>=-.05
 pot=safe and d['pots']['mean']<=-.15 and d['pots']['holm96P']<.05 and d['cappedRounds']['mean']<=1
 alive=d['win']['mean']>=-.02 and d['fullAliveWin']['mean']>=.05 and d['fullAliveWin']['holm96P']<.05 and d['pots']['mean']<=.5 and d['cappedRounds']['mean']<=2
 speed=safe and d['cappedRounds']['mean']<=-1 and d['cappedRounds']['holm96P']<.05 and d['pots']['mean']<=.2
 return {'potions':pot,'fourAlive':alive,'speed':speed}
witnesses=[]
for c in cases:
 practical=meaningful(c['C-B']['delta']);causal=meaningful(c['C-X']['delta'])
 if any(practical.values())and any(causal.values()):witnesses.append({'caseId':c['id'],**practical,'sameConfigCausalBenefits':causal})
regressions=[c['id']for c in cases if c['C-B']['delta']['win']['mean']<-.05];mechanism=sum(c['summaries']['C']['meanSoftenedAttacks']*n for c in cases)>0
adoption={'passed':bool(witnesses)and not regressions and mechanism,'status':'adopted-scoped'if witnesses and not regressions and mechanism else'development-required','witnesses':witnesses,'observedWinRegressionsOver5pp':regressions,'realSofteningObserved':mechanism,'endgameCertified':False,'scope':'Adoption of implemented research change in tested conditions; not noninferiority proof or all-character endgame certification.'}
out={'episode':'THIS-GIRL-003-V2','passedDataValidation':True,'lockSha256':digest,'inputs':inputs,'cases':cases,'seedCountPerCondition':n,'distinctHeldoutSeeds':n,'independence':'Same independent input panel reused across arms and conditions; total runs are not independent observations.','adoption':adoption};(R/'analysis').mkdir(exist_ok=True);(R/'analysis/main.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print('CASE Cwin Bwin Awin Calive Balive Cpot Bpot CR BR Csoftened')
for c in cases:
 s=c['summaries'];print(c['id'],s['C']['wins'],s['B']['wins'],s['A']['wins'],s['C']['fourAliveWins'],s['B']['fourAliveWins'],round(s['C']['meanPotions'],3),round(s['B']['meanPotions'],3),round(s['C']['meanCappedRounds'],3),round(s['B']['meanCappedRounds'],3),round(s['C']['meanSoftenedAttacks'],3))
print('ADOPTION',json.dumps(adoption,ensure_ascii=False))
