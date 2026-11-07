"""Paired confirmatory statistics. Call only against the frozen hypothesis family.

Binomial intervals for discordant categories provide simultaneous conservative bounds;
zero discordance must never become a zero-width bootstrap interval.
"""
import math
import numpy as np
from scipy.stats import beta, binomtest, wilcoxon

def cp(k,n,alpha=.05):
 return [0.0 if k==0 else float(beta.ppf(alpha/2,k,n-k+1)),1.0 if k==n else float(beta.ppf(1-alpha/2,k+1,n-k))]
def paired(a,b,alpha=.05):
 assert len(a)==len(b)>0
 assert [x['seed']for x in a]==[x['seed']for x in b]
 n=len(a);p10=sum(x['win']and not y['win']for x,y in zip(a,b));p01=sum(y['win']and not x['win']for x,y in zip(a,b))
 # Bonferroni over two discordant-cell probabilities. Family multiplicity is supplied by caller.
 u=cp(p10,n,alpha/2);v=cp(p01,n,alpha/2);delta=(p10-p01)/n
 common=[(x,y)for x,y in zip(a,b)if x['win']and y['win']]
 rd=[x['rounds']-y['rounds']for x,y in common];cd=[x['cappedRounds']-y['cappedRounds']for x,y in zip(a,b)]
 def signed(values):
  if not values or not any(values):return 1.0
  return float(wilcoxon(values,zero_method='wilcox',alternative='two-sided',method='auto').pvalue)
 return {'n':n,'winsA':sum(x['win']for x in a),'winsB':sum(x['win']for x in b),'discordance':{'Aonly':p10,'Bonly':p01},'winDifference':delta,'conservativePairedDifferenceCI':[max(-1,u[0]-v[1]),min(1,u[1]-v[0])],'mcnemarExactP':float(binomtest(p10,p10+p01,.5).pvalue)if p10+p01 else 1.0,'commonVictories':len(common),'commonWinMeanRoundDifference':float(np.mean(rd))if rd else None,'commonWinSignedRankP':signed(rd),'failureCappedMeanRoundDifference':float(np.mean(cd)),'failureCappedSignedRankP':signed(cd),'meanPotionDifference':float(np.mean([x['potionsUsed']-y['potionsUsed']for x,y in zip(a,b)])),'allSurviveDifference':(sum(x['win']and x['survivors']==4 for x in a)-sum(x['win']and x['survivors']==4 for x in b))/n}
def holm(values):
 ordered=sorted(enumerate(values),key=lambda kv:kv[1]);out=[None]*len(values);high=0
 for rank,(i,p)in enumerate(ordered):high=max(high,min(1,p*(len(values)-rank)));out[i]=high
 return out
